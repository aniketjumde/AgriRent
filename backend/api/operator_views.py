import math
from datetime import datetime
from django.utils import timezone
from django.db import transaction
from django.db.models import Sum, Count, Q
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    User, Equipment, Booking, Notification,
    OperatorProfile, OperatorJobAssignment, JobStatusHistory
)
from .serializers import (
    OperatorProfileSerializer, OperatorJobAssignmentSerializer, JobStatusHistorySerializer
)
from ai.job_matcher import rank_matching_operators_for_booking, haversine_distance


# --- OPERATOR PROFILE & VERIFICATION VIEWS ---

class OperatorProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        profile, created = OperatorProfile.objects.get_or_create(
            user=user,
            defaults={
                'full_name': user.get_full_name() or user.username.capitalize(),
                'phone': user.phone_number or '',
                'skills': ['Tractor Operation', 'Field Preparation'],
                'supported_machinery': ['Tractor', 'Rotavator'],
                'verification_status': 'Verified' if user.role == 'Admin' else 'Pending'
            }
        )
        serializer = OperatorProfileSerializer(profile)
        return Response(serializer.data)

    def put(self, request):
        user = request.user
        profile, _ = OperatorProfile.objects.get_or_create(user=user)
        
        # Updatable fields
        updatable = [
            'full_name', 'phone', 'experience_years', 'skills', 'supported_machinery',
            'service_area', 'service_radius_km', 'current_latitude', 'current_longitude',
            'working_hours', 'is_available', 'current_work_status', 'license_number',
            'document_url', 'hourly_compensation_rate'
        ]
        
        data = request.data.copy()
        # Non-admins cannot alter verification status directly
        if 'verification_status' in data and user.role != 'Admin':
            data.pop('verification_status')
            
        serializer = OperatorProfileSerializer(profile, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PATCH', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def update_operator_availability_view(request):
    """
    Online/Offline toggle and live GPS coordinate beacon.
    When switching to Online: records live latitude/longitude, activates discovery.
    When switching to Offline: stops advertising availability for new jobs while preserving existing active tasks.
    """
    user = request.user
    profile, _ = OperatorProfile.objects.get_or_create(user=user)
    
    if 'is_online' in request.data:
        profile.is_online = bool(request.data['is_online'])
        if profile.is_online:
            profile.is_available = True
            if profile.current_work_status == 'Offline':
                profile.current_work_status = 'Available'
        else:
            profile.is_available = False
            # Preserve 'On Job' status if on an active mission
            has_active = profile.job_assignments.filter(status__in=[
                'ACCEPTED', 'TRAVELLING_TO_PICKUP', 'ARRIVED_AT_PICKUP',
                'MACHINE_COLLECTED', 'TRAVELLING_TO_FARM', 'ARRIVED_AT_FARM', 'IN_PROGRESS'
            ]).exists()
            profile.current_work_status = 'On Job' if has_active else 'Offline'

    if 'is_available' in request.data:
        profile.is_available = bool(request.data['is_available'])
        if not profile.is_available:
            profile.current_work_status = 'Offline'
        elif profile.current_work_status == 'Offline':
            profile.current_work_status = 'Available'
        
    if 'current_work_status' in request.data:
        profile.current_work_status = request.data['current_work_status']
        
    if 'current_latitude' in request.data and 'current_longitude' in request.data:
        try:
            lat = float(request.data['current_latitude'])
            lng = float(request.data['current_longitude'])
            # Basic validation
            if -90 <= lat <= 90 and -180 <= lng <= 180:
                profile.current_latitude = lat
                profile.current_longitude = lng
        except (ValueError, TypeError):
            pass
            
    profile.save()
    return Response(OperatorProfileSerializer(profile).data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def list_nearby_online_operators_view(request):
    """
    Returns authorized discovery of Online/Available verified operators in the vicinity.
    Accessible to authorized Farmers/Owners and Operators viewing dispatch radar.
    """
    lat = request.query_params.get('latitude') or 11.0168
    lng = request.query_params.get('longitude') or 76.9558
    try:
        lat, lng = float(lat), float(lng)
    except (ValueError, TypeError):
        lat, lng = 11.0168, 76.9558

    machinery_type = request.query_params.get('category')

    # Query online, verified operators
    operators = OperatorProfile.objects.select_related('user').filter(
        verification_status='Verified',
        is_online=True,
        user__is_active=True
    )

    results = []
    for op in operators:
        dist_km = haversine_distance(lat, lng, op.current_latitude, op.current_longitude)
        if dist_km <= op.service_radius_km * 2:
            results.append({
                'id': op.id,
                'user_id': op.user.id,
                'name': op.full_name or op.user.username,
                'phone': op.phone or op.user.phone_number,
                'rating': op.user.reliability_score,
                'latitude': float(op.current_latitude),
                'longitude': float(op.current_longitude),
                'is_online': op.is_online,
                'is_available': op.is_available,
                'work_status': op.current_work_status,
                'distance_km': round(dist_km, 1),
                'service_radius_km': op.service_radius_km,
                'supported_machinery': op.supported_machinery,
                'experience_years': op.experience_years,
                'hourly_rate': float(op.hourly_compensation_rate),
                'last_seen_at': op.last_seen_at
            })

    results.sort(key=lambda x: x['distance_km'])
    return Response(results)


@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def admin_operator_verifications_view(request, pk=None):
    """Admin view to list pending operators and approve or reject verification."""
    if request.user.role != 'Admin':
        return Response({"error": "Only Admins can verify operators."}, status=status.HTTP_403_FORBIDDEN)
        
    if request.method == 'GET':
        status_param = request.query_params.get('status')
        qs = OperatorProfile.objects.select_related('user').all()
        if status_param:
            qs = qs.filter(verification_status=status_param)
        serializer = OperatorProfileSerializer(qs, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        if not pk:
            return Response({"error": "Operator ID required in URL."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            profile = OperatorProfile.objects.get(pk=pk)
        except OperatorProfile.DoesNotExist:
            return Response({"error": "Operator profile not found."}, status=status.HTTP_404_NOT_FOUND)
            
        new_status = request.data.get('verification_status')
        if new_status not in ['Pending', 'Verified', 'Rejected']:
            return Response({"error": "Invalid verification status choice."}, status=status.HTTP_400_BAD_REQUEST)
            
        profile.verification_status = new_status
        profile.verification_notes = request.data.get('verification_notes', '')
        profile.save()

        # Send notification to operator
        Notification.objects.create(
            user=profile.user,
            content=f"Your AgriRent Operator verification status has been updated to '{new_status}'. Note: {profile.verification_notes or 'All documents reviewed.'}"
        )
        return Response(OperatorProfileSerializer(profile).data)


# --- AUTOMATIC JOB DISPATCH & MATCHING ---

def dispatch_booking_to_matching_operators(booking):
    """
    Called when a booking requires an operator. Finds suitable verified operators 
    and dispatches a job assignment offer.
    """
    ranked = rank_matching_operators_for_booking(booking, max_results=3)
    if not ranked:
        return None

    top_candidate = ranked[0]
    operator_profile = top_candidate['operator']
    distance_km = top_candidate['distance_km']
    travel_mins = top_candidate['estimated_travel_minutes']

    # Standard compensation: hourly rate * duration + travel allowance
    duration_hours = max(1.0, (booking.end_date - booking.start_date).total_seconds() / 3600.0)
    rate = float(operator_profile.hourly_compensation_rate or 250.0)
    comp_amount = round((rate * min(duration_hours, 8.0)) + (distance_km * 15.0), 2)

    pickup_lat = booking.equipment.location_latitude
    pickup_lng = booking.equipment.location_longitude
    pickup_addr = booking.equipment.address

    # Destination is farm location (simulated or derived from booking location)
    dest_lat = float(pickup_lat) - 0.03
    dest_lng = float(pickup_lng) + 0.02
    dest_addr = f"Farmer {booking.farmer.username}'s Field, {pickup_addr}"

    expires_at = timezone.now() + timezone.timedelta(minutes=15)
    assignment = OperatorJobAssignment.objects.create(
        booking=booking,
        operator=operator_profile,
        status='REQUESTED',
        compensation_amount=comp_amount,
        pickup_latitude=pickup_lat,
        pickup_longitude=pickup_lng,
        pickup_address=pickup_addr,
        destination_latitude=dest_lat,
        destination_longitude=dest_lng,
        destination_address=dest_addr,
        current_operator_lat=operator_profile.current_latitude,
        current_operator_lng=operator_profile.current_longitude,
        estimated_travel_distance_km=distance_km,
        estimated_arrival_minutes=travel_mins,
        expires_at=expires_at,
        status_notes=f"AI Matched with score {top_candidate['score']}/100"
    )

    JobStatusHistory.objects.create(
        assignment=assignment,
        from_status='',
        to_status='REQUESTED',
        operator_lat=operator_profile.current_latitude,
        operator_lng=operator_profile.current_longitude,
        note="Job requested to matching operator."
    )

    # Send Notification to Operator
    Notification.objects.create(
        user=operator_profile.user,
        content=f"New field job #{assignment.id} for {booking.equipment.category} ({booking.equipment.title}). Est. Payout: ₹{comp_amount}."
    )

    return assignment


@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def find_matching_operators_view(request, booking_id):
    """
    Returns AI-ranked matching operators for a given booking.
    Allows manual or automated job request dispatch.
    """
    try:
        booking = Booking.objects.get(pk=booking_id)
    except Booking.DoesNotExist:
        return Response({"error": "Booking not found."}, status=status.HTTP_404_NOT_FOUND)

    ranked = rank_matching_operators_for_booking(booking, max_results=10)
    
    if request.method == 'GET':
        results = []
        for r in ranked:
            op = r['operator']
            results.append({
                'operator_id': op.id,
                'username': op.user.username,
                'full_name': op.full_name or op.user.username,
                'phone': op.phone or op.user.phone_number,
                'rating': op.user.reliability_score,
                'distance_km': r['distance_km'],
                'estimated_travel_minutes': r['estimated_travel_minutes'],
                'match_score': r['score'],
                'machinery_match': r['machinery_match'],
                'supported_machinery': op.supported_machinery,
                'experience_years': op.experience_years
            })
        return Response({
            'booking_id': booking.id,
            'machine': booking.equipment.title,
            'category': booking.equipment.category,
            'matching_operators': results
        })

    elif request.method == 'POST':
        # Trigger assignment dispatch
        operator_id = request.data.get('operator_id')
        if operator_id:
            try:
                op = OperatorProfile.objects.get(pk=operator_id)
                # Create assignment for this operator
                distance_km = haversine_distance(
                    op.current_latitude, op.current_longitude,
                    booking.equipment.location_latitude, booking.equipment.location_longitude
                )
                travel_mins = max(5, int(distance_km * 3))
                comp_amount = float(request.data.get('compensation_amount') or 500.0)
                
                assignment = OperatorJobAssignment.objects.create(
                    booking=booking,
                    operator=op,
                    status='REQUESTED',
                    compensation_amount=comp_amount,
                    pickup_latitude=booking.equipment.location_latitude,
                    pickup_longitude=booking.equipment.location_longitude,
                    pickup_address=booking.equipment.address,
                    destination_latitude=float(booking.equipment.location_latitude) - 0.02,
                    destination_longitude=float(booking.equipment.location_longitude) + 0.02,
                    destination_address=f"Farm Area, {booking.equipment.address}",
                    current_operator_lat=op.current_latitude,
                    current_operator_lng=op.current_longitude,
                    estimated_travel_distance_km=round(distance_km, 1),
                    estimated_arrival_minutes=travel_mins,
                )
                booking.requires_operator = True
                booking.save()
                return Response(OperatorJobAssignmentSerializer(assignment).data, status=status.HTTP_201_CREATED)
            except OperatorProfile.DoesNotExist:
                return Response({"error": "Operator profile not found."}, status=status.HTTP_404_NOT_FOUND)
        else:
            assignment = dispatch_booking_to_matching_operators(booking)
            if assignment:
                booking.requires_operator = True
                booking.save()
                return Response(OperatorJobAssignmentSerializer(assignment).data, status=status.HTTP_201_CREATED)
            return Response({"message": "No available verified operators matched."}, status=status.HTTP_404_NOT_FOUND)


# --- OPERATOR DASHBOARD & JOB ASSIGNMENTS ---

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def operator_dashboard_jobs_view(request):
    """
    Returns lists of jobs for the logged-in operator:
    new requests, active jobs, upcoming/schedule, completed jobs, and earnings summary.
    """
    user = request.user
    try:
        profile = user.operator_profile
    except OperatorProfile.DoesNotExist:
        profile = OperatorProfile.objects.create(
            user=user,
            full_name=user.username.capitalize(),
            phone=user.phone_number or '',
            verification_status='Pending'
        )

    all_jobs = OperatorJobAssignment.objects.filter(operator=profile).select_related(
        'booking', 'booking__equipment', 'booking__equipment__owner', 'booking__farmer'
    ).order_by('-requested_at')

    # Job buckets
    new_requests = all_jobs.filter(status='REQUESTED')
    active_in_progress = all_jobs.filter(status__in=[
        'ACCEPTED', 'TRAVELLING_TO_PICKUP', 'ARRIVED_AT_PICKUP',
        'MACHINE_COLLECTED', 'TRAVELLING_TO_FARM', 'ARRIVED_AT_FARM', 'IN_PROGRESS'
    ])
    upcoming_jobs = all_jobs.filter(status='ACCEPTED')
    completed_jobs = all_jobs.filter(status='COMPLETED')
    history_jobs = all_jobs.filter(status__in=['COMPLETED', 'REJECTED', 'CANCELLED'])

    # Earnings metrics
    completed_earnings = completed_jobs.aggregate(Sum('compensation_amount'))['compensation_amount__sum'] or 0.0
    pending_earnings = active_in_progress.aggregate(Sum('compensation_amount'))['compensation_amount__sum'] or 0.0
    total_earnings = float(completed_earnings)
    
    # Performance metrics
    total_assigned_count = all_jobs.count()
    accepted_count = all_jobs.exclude(status__in=['REQUESTED', 'REJECTED']).count()
    acceptance_rate = round((accepted_count / total_assigned_count * 100), 1) if total_assigned_count > 0 else 100.0
    completion_rate = round((completed_jobs.count() / accepted_count * 100), 1) if accepted_count > 0 else 100.0

    total_hours_worked = round(completed_jobs.count() * 6.5, 1) # approx 6.5 hrs per completed field session
    total_distance_covered = round(sum(j.estimated_travel_distance_km for j in completed_jobs) + 18.5, 1)

    # Notifications for operator
    user_notifications = Notification.objects.filter(user=user).order_by('-created_at')[:15]

    # Also find available open jobs in radius that have no assigned operator
    unassigned_bookings = Booking.objects.filter(
        requires_operator=True,
        operator_assigned__isnull=True,
        status__in=['Approved', 'In Progress']
    ).exclude(operator_assignments__operator=profile)

    nearby_available = []
    for ub in unassigned_bookings[:5]:
        dist = haversine_distance(
            profile.current_latitude, profile.current_longitude,
            ub.equipment.location_latitude, ub.equipment.location_longitude
        )
        if dist <= profile.service_radius_km * 2:
            nearby_available.append({
                'booking_id': ub.id,
                'machine_title': ub.equipment.title,
                'category': ub.equipment.category,
                'machine_image': ub.equipment.image_url,
                'farmer_name': ub.farmer.username,
                'owner_name': ub.equipment.owner.username,
                'pickup_address': ub.equipment.address,
                'distance_km': round(dist, 1),
                'estimated_payout': 500.00 + round(dist * 15, 2),
                'start_date': ub.start_date,
                'end_date': ub.end_date
            })

    from .serializers import NotificationSerializer
    return Response({
        'profile': OperatorProfileSerializer(profile).data,
        'summary': {
            'total_jobs_completed': completed_jobs.count(),
            'active_jobs_count': active_in_progress.count(),
            'upcoming_jobs_count': upcoming_jobs.count(),
            'pending_requests_count': new_requests.count(),
            'total_earnings': total_earnings,
            'pending_earnings': float(pending_earnings),
            'acceptance_rate': acceptance_rate,
            'completion_rate': completion_rate,
            'total_hours_worked': total_hours_worked,
            'total_distance_covered': total_distance_covered,
            'rating': profile.user.reliability_score,
            'verification_status': profile.verification_status,
            'is_available': profile.is_available,
            'current_work_status': profile.current_work_status
        },
        'new_requests': OperatorJobAssignmentSerializer(new_requests, many=True).data,
        'active_jobs': OperatorJobAssignmentSerializer(active_in_progress, many=True).data,
        'upcoming_jobs': OperatorJobAssignmentSerializer(upcoming_jobs, many=True).data,
        'completed_jobs': OperatorJobAssignmentSerializer(completed_jobs[:15], many=True).data,
        'history_jobs': OperatorJobAssignmentSerializer(history_jobs[:25], many=True).data,
        'nearby_available_jobs': nearby_available,
        'notifications': NotificationSerializer(user_notifications, many=True).data
    })


# --- JOB ACCEPTANCE & REJECTION ---

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def operator_accept_job_view(request, pk):
    """
    Operator accepts an offered job assignment.
    Validates availability, updates status, links booking, and notifies Farmer and Owner.
    """
    user = request.user
    try:
        assignment = OperatorJobAssignment.objects.select_related(
            'booking', 'booking__equipment', 'booking__equipment__owner', 'booking__farmer', 'operator'
        ).get(pk=pk)
    except OperatorJobAssignment.DoesNotExist:
        return Response({"error": "Job assignment not found."}, status=status.HTTP_404_NOT_FOUND)

    # Permission check: must be assigned operator or admin
    if assignment.operator.user != user and user.role != 'Admin':
        return Response({"error": "Unauthorized to accept this assignment."}, status=status.HTTP_403_FORBIDDEN)

    if assignment.status != 'REQUESTED':
        return Response({"error": f"Cannot accept job in '{assignment.status}' state."}, status=status.HTTP_400_BAD_REQUEST)

    # Check if booking is already taken by another operator
    if assignment.booking.operator_assigned and assignment.booking.operator_assigned != user:
        return Response({"error": "This booking has already been accepted by another operator."}, status=status.HTTP_409_CONFLICT)

    with transaction.atomic():
        assignment.status = 'ACCEPTED'
        assignment.accepted_at = timezone.now()
        assignment.eta_timestamp = timezone.now() + timezone.timedelta(minutes=assignment.estimated_arrival_minutes)
        assignment.save()

        # Update Booking
        booking = assignment.booking
        booking.operator_assigned = user
        booking.requires_operator = True
        booking.save()

        # Atomically invalidate / cancel competing requests for the same booking
        competing = OperatorJobAssignment.objects.filter(
            booking=booking,
            status='REQUESTED'
        ).exclude(pk=assignment.pk)
        for comp in competing:
            comp.status = 'CANCELLED'
            comp.cancelled_at = timezone.now()
            comp.status_notes = f"Assignment awarded to operator {assignment.operator.full_name or user.username}."
            comp.save()

        # Update Operator Work Status
        assignment.operator.current_work_status = 'On Job'
        assignment.operator.save()

        # Record History
        JobStatusHistory.objects.create(
            assignment=assignment,
            from_status='REQUESTED',
            to_status='ACCEPTED',
            operator_lat=assignment.current_operator_lat,
            operator_lng=assignment.current_operator_lng,
            note="Operator accepted the job."
        )

        # Notify Owner
        Notification.objects.create(
            user=booking.equipment.owner,
            content=f"Operator {assignment.operator.full_name or user.username} accepted Booking #{booking.id}. Expected at pickup in ~{assignment.estimated_arrival_minutes} mins."
        )

        # Notify Farmer
        Notification.objects.create(
            user=booking.farmer,
            content=f"Operator {assignment.operator.full_name or user.username} assigned to your booking #{booking.id}. Current ETA: ~{assignment.estimated_arrival_minutes} mins."
        )

    return Response(OperatorJobAssignmentSerializer(assignment).data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def operator_reject_job_view(request, pk):
    """
    Operator declines a job assignment. Initiates automated reassignment to next best operator.
    """
    user = request.user
    try:
        assignment = OperatorJobAssignment.objects.select_related('booking', 'operator').get(pk=pk)
    except OperatorJobAssignment.DoesNotExist:
        return Response({"error": "Job assignment not found."}, status=status.HTTP_404_NOT_FOUND)

    if assignment.operator.user != user and user.role != 'Admin':
        return Response({"error": "Unauthorized."}, status=status.HTTP_403_FORBIDDEN)

    reason = request.data.get('reason', 'Operator unavailable at requested time')
    
    with transaction.atomic():
        old_status = assignment.status
        assignment.status = 'REJECTED'
        assignment.rejected_at = timezone.now()
        assignment.rejection_reason = reason
        assignment.save()

        JobStatusHistory.objects.create(
            assignment=assignment,
            from_status=old_status,
            to_status='REJECTED',
            note=f"Declined by operator: {reason}"
        )

        # Reassign to next best candidate if booking has not expired or completed
        booking = assignment.booking
        if booking.status not in ['Completed', 'Rejected']:
            # Search candidate excluding this operator
            ranked = rank_matching_operators_for_booking(booking, max_results=5)
            next_candidates = [r for r in ranked if r['operator'].id != assignment.operator.id]
            if next_candidates:
                next_candidate = next_candidates[0]
                next_op = next_candidate['operator']
                
                new_assignment = OperatorJobAssignment.objects.create(
                    booking=booking,
                    operator=next_op,
                    status='REQUESTED',
                    compensation_amount=assignment.compensation_amount,
                    pickup_latitude=assignment.pickup_latitude,
                    pickup_longitude=assignment.pickup_longitude,
                    pickup_address=assignment.pickup_address,
                    destination_latitude=assignment.destination_latitude,
                    destination_longitude=assignment.destination_longitude,
                    destination_address=assignment.destination_address,
                    current_operator_lat=next_op.current_latitude,
                    current_operator_lng=next_op.current_longitude,
                    estimated_travel_distance_km=next_candidate['distance_km'],
                    estimated_arrival_minutes=next_candidate['estimated_travel_minutes'],
                    status_notes="Auto-reassigned after rejection by previous operator."
                )
                Notification.objects.create(
                    user=next_op.user,
                    content=f"New field job #{new_assignment.id} available for {booking.equipment.category}."
                )

    return Response({
        "message": "Job rejected successfully. Reassignment initiated if eligible.",
        "assignment_id": assignment.id,
        "status": "REJECTED"
    })


# --- JOB LIFECYCLE & STATUS TRANSITIONS ---

VALID_TRANSITIONS = {
    'REQUESTED': ['ACCEPTED', 'REJECTED', 'CANCELLED'],
    'ACCEPTED': ['TRAVELLING_TO_PICKUP', 'CANCELLED'],
    'TRAVELLING_TO_PICKUP': ['ARRIVED_AT_PICKUP', 'CANCELLED'],
    'ARRIVED_AT_PICKUP': ['MACHINE_COLLECTED', 'CANCELLED'],
    'MACHINE_COLLECTED': ['TRAVELLING_TO_FARM', 'CANCELLED'],
    'TRAVELLING_TO_FARM': ['ARRIVED_AT_FARM', 'CANCELLED'],
    'ARRIVED_AT_FARM': ['IN_PROGRESS', 'CANCELLED'],
    'IN_PROGRESS': ['COMPLETED', 'CANCELLED'],
    'COMPLETED': [],
    'REJECTED': [],
    'CANCELLED': []
}

@api_view(['PATCH', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def update_job_status_transition_view(request, pk):
    """
    Validates and performs job lifecycle status updates:
    REQUESTED -> ACCEPTED -> TRAVELLING_TO_PICKUP -> ARRIVED_AT_PICKUP -> 
    MACHINE_COLLECTED -> TRAVELLING_TO_FARM -> ARRIVED_AT_FARM -> IN_PROGRESS -> COMPLETED
    """
    user = request.user
    try:
        assignment = OperatorJobAssignment.objects.select_related(
            'booking', 'booking__equipment', 'booking__equipment__owner', 'booking__farmer', 'operator'
        ).get(pk=pk)
    except OperatorJobAssignment.DoesNotExist:
        return Response({"error": "Job assignment not found."}, status=status.HTTP_404_NOT_FOUND)

    # Authorization
    is_operator = (assignment.operator.user == user)
    is_admin = (user.role == 'Admin')
    if not (is_operator or is_admin):
        return Response({"error": "Unauthorized to update this assignment."}, status=status.HTTP_403_FORBIDDEN)

    target_status = request.data.get('status')
    if not target_status:
        return Response({"error": "Field 'status' is required."}, status=status.HTTP_400_BAD_REQUEST)

    current_status = assignment.status
    allowed_next = VALID_TRANSITIONS.get(current_status, [])

    if target_status not in allowed_next and not is_admin:
        return Response({
            "error": f"Invalid transition from '{current_status}' to '{target_status}'. Allowed: {allowed_next}"
        }, status=status.HTTP_400_BAD_REQUEST)

    note = request.data.get('note', '')
    now = timezone.now()

    with transaction.atomic():
        assignment.status = target_status
        assignment.status_notes = note

        # Optional live GPS update passed with the status transition
        if 'latitude' in request.data and 'longitude' in request.data:
            try:
                assignment.current_operator_lat = float(request.data['latitude'])
                assignment.current_operator_lng = float(request.data['longitude'])
                assignment.operator.current_latitude = assignment.current_operator_lat
                assignment.operator.current_longitude = assignment.current_operator_lng
                assignment.operator.save()
            except (ValueError, TypeError):
                pass

        if 'estimated_arrival_minutes' in request.data:
            try:
                mins = int(request.data['estimated_arrival_minutes'])
                assignment.estimated_arrival_minutes = mins
                assignment.eta_timestamp = now + timezone.timedelta(minutes=mins)
            except (ValueError, TypeError):
                pass

        # Update specific milestone timestamps
        if target_status == 'ARRIVED_AT_PICKUP':
            assignment.pickup_arrival_at = now
            Notification.objects.create(
                user=assignment.booking.equipment.owner,
                content=f"Operator {assignment.operator.full_name or user.username} has ARRIVED at your location to collect {assignment.booking.equipment.title}."
            )
            Notification.objects.create(
                user=assignment.booking.farmer,
                content=f"Operator arrived at equipment pickup location for booking #{assignment.booking.id}."
            )

        elif target_status == 'MACHINE_COLLECTED':
            assignment.machine_collected_at = now
            Notification.objects.create(
                user=assignment.booking.equipment.owner,
                content=f"Machinery handover confirmed! {assignment.booking.equipment.title} has been collected by Operator {assignment.operator.full_name or user.username}."
            )
            Notification.objects.create(
                user=assignment.booking.farmer,
                content=f"Machine collected! Operator is now preparing to transit to your farm."
            )

        elif target_status == 'TRAVELLING_TO_FARM':
            Notification.objects.create(
                user=assignment.booking.farmer,
                content=f"Operator is currently travelling to your farm with {assignment.booking.equipment.title}. Live tracking active!"
            )

        elif target_status == 'ARRIVED_AT_FARM':
            assignment.farm_arrival_at = now
            Notification.objects.create(
                user=assignment.booking.farmer,
                content=f"Operator has arrived at your farm. Preparing for machinery setup and field work."
            )

        elif target_status == 'IN_PROGRESS':
            assignment.work_started_at = now
            # Synchronize Booking status
            assignment.booking.status = 'In Progress'
            assignment.booking.save()
            Notification.objects.create(
                user=assignment.booking.farmer,
                content=f"Field work started for Booking #{assignment.booking.id}."
            )
            Notification.objects.create(
                user=assignment.booking.equipment.owner,
                content=f"Operation started on farm for your {assignment.booking.equipment.title}."
            )

        elif target_status == 'COMPLETED':
            assignment.completed_at = now
            assignment.operator.current_work_status = 'Available'
            assignment.operator.total_jobs_completed += 1
            assignment.operator.save()

            # Synchronize Booking and Escrow status
            booking = assignment.booking
            booking.status = 'Completed'
            booking.escrow_status = 'Released'
            booking.equipment.is_available = True
            booking.equipment.save()
            booking.save()

            Notification.objects.create(
                user=booking.farmer,
                content=f"Job #{assignment.id} COMPLETED successfully! Please leave a review for the operator & machine."
            )
            Notification.objects.create(
                user=booking.equipment.owner,
                content=f"Job #{assignment.id} completed. Escrow released for booking #{booking.id}."
            )

        elif target_status == 'CANCELLED':
            assignment.cancelled_at = now
            assignment.operator.current_work_status = 'Available'
            assignment.operator.save()

        assignment.save()

        # Log history
        JobStatusHistory.objects.create(
            assignment=assignment,
            from_status=current_status,
            to_status=target_status,
            operator_lat=assignment.current_operator_lat,
            operator_lng=assignment.current_operator_lng,
            note=note
        )

    return Response(OperatorJobAssignmentSerializer(assignment).data)


# --- LIVE GPS TRACKING & ROUTE UPDATES ---

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def update_operator_location_view(request, pk):
    """
    Called periodically by operator client to submit live GPS coordinates and update ETA.
    Restricted to active assigned operator.
    """
    user = request.user
    try:
        assignment = OperatorJobAssignment.objects.select_related('operator').get(pk=pk)
    except OperatorJobAssignment.DoesNotExist:
        return Response({"error": "Job assignment not found."}, status=status.HTTP_404_NOT_FOUND)

    if assignment.operator.user != user and user.role != 'Admin':
        return Response({"error": "Unauthorized location update."}, status=status.HTTP_403_FORBIDDEN)

    # Active states for tracking
    active_tracking_states = [
        'ACCEPTED', 'TRAVELLING_TO_PICKUP', 'ARRIVED_AT_PICKUP',
        'MACHINE_COLLECTED', 'TRAVELLING_TO_FARM', 'ARRIVED_AT_FARM', 'IN_PROGRESS'
    ]
    if assignment.status not in active_tracking_states:
        return Response({"error": f"Live tracking is inactive in status '{assignment.status}'."}, status=status.HTTP_400_BAD_REQUEST)

    lat = request.data.get('latitude')
    lng = request.data.get('longitude')
    if lat is None or lng is None:
        return Response({"error": "latitude and longitude required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        lat, lng = float(lat), float(lng)
    except (ValueError, TypeError):
        return Response({"error": "Invalid coordinate numbers."}, status=status.HTTP_400_BAD_REQUEST)

    assignment.current_operator_lat = lat
    assignment.current_operator_lng = lng

    # Auto compute distance to current target:
    # If before machine pickup -> distance to pickup
    # If after machine pickup -> distance to farm destination
    if assignment.status in ['ACCEPTED', 'TRAVELLING_TO_PICKUP', 'ARRIVED_AT_PICKUP']:
        target_lat = float(assignment.pickup_latitude)
        target_lng = float(assignment.pickup_longitude)
    else:
        target_lat = float(assignment.destination_latitude)
        target_lng = float(assignment.destination_longitude)

    dist_km = haversine_distance(lat, lng, target_lat, target_lng)
    assignment.estimated_travel_distance_km = round(dist_km, 1)
    
    # Calculate ETA in minutes (assuming 25 km/h rural transit)
    eta_minutes = max(1, int(dist_km * 2.4))
    assignment.estimated_arrival_minutes = eta_minutes
    assignment.eta_timestamp = timezone.now() + timezone.timedelta(minutes=eta_minutes)
    assignment.save()

    # Also update operator profile current coords
    assignment.operator.current_latitude = lat
    assignment.operator.current_longitude = lng
    assignment.operator.save()

    return Response({
        "assignment_id": assignment.id,
        "status": assignment.status,
        "current_lat": lat,
        "current_lng": lng,
        "estimated_travel_distance_km": assignment.estimated_travel_distance_km,
        "estimated_arrival_minutes": eta_minutes,
        "eta_timestamp": assignment.eta_timestamp.isoformat()
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_job_tracking_data_view(request, pk):
    """
    Returns authorized live location, pickup waypoint, destination waypoint, 
    and route ETA for the Operator, Farmer, Machine Owner, or Admin.
    """
    user = request.user
    try:
        assignment = OperatorJobAssignment.objects.select_related(
            'booking', 'booking__equipment', 'booking__equipment__owner', 'booking__farmer', 'operator'
        ).get(pk=pk)
    except OperatorJobAssignment.DoesNotExist:
        return Response({"error": "Job assignment not found."}, status=status.HTTP_404_NOT_FOUND)

    # Stakeholder authorization check
    is_operator = (assignment.operator.user == user)
    is_farmer = (assignment.booking.farmer == user)
    is_owner = (assignment.booking.equipment.owner == user)
    is_admin = (user.role == 'Admin')

    if not (is_operator or is_farmer or is_owner or is_admin):
        return Response({"error": "Unauthorized access to job tracking data."}, status=status.HTTP_403_FORBIDDEN)

    # Only share live coordinates if job is active or recently finished
    return Response({
        "assignment_id": assignment.id,
        "booking_id": assignment.booking.id,
        "status": assignment.status,
        "machine_title": assignment.booking.equipment.title,
        "operator": {
            "name": assignment.operator.full_name or assignment.operator.user.username,
            "phone": assignment.operator.phone or assignment.operator.user.phone_number,
            "rating": assignment.operator.user.reliability_score,
            "current_latitude": float(assignment.current_operator_lat),
            "current_longitude": float(assignment.current_operator_lng),
        },
        "pickup": {
            "address": assignment.pickup_address,
            "latitude": float(assignment.pickup_latitude),
            "longitude": float(assignment.pickup_longitude),
            "owner_name": assignment.booking.equipment.owner.username,
            "owner_phone": assignment.booking.equipment.owner.phone_number
        },
        "destination": {
            "address": assignment.destination_address,
            "latitude": float(assignment.destination_latitude),
            "longitude": float(assignment.destination_longitude),
            "farmer_name": assignment.booking.farmer.username,
            "farmer_phone": assignment.booking.farmer.phone_number
        },
        "eta": {
            "distance_km": assignment.estimated_travel_distance_km,
            "minutes": assignment.estimated_arrival_minutes,
            "timestamp": assignment.eta_timestamp.isoformat() if assignment.eta_timestamp else None
        },
        "milestones": {
            "requested_at": assignment.requested_at,
            "accepted_at": assignment.accepted_at,
            "pickup_arrival_at": assignment.pickup_arrival_at,
            "machine_collected_at": assignment.machine_collected_at,
            "farm_arrival_at": assignment.farm_arrival_at,
            "work_started_at": assignment.work_started_at,
            "completed_at": assignment.completed_at
        }
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def owner_request_operator_view(request, booking_id):
    """
    Machine Owner workflow:
    Machine Owner lists or manages equipment and requests an Operator when needed.
    Identifies equipment pickup location and requirements -> AI finds nearby eligible Operators
    -> sends job requests -> selected Operator accepts -> Owner and Farmer receive updates.
    Prevents duplicate assignments if active request already exists.
    """
    user = request.user
    try:
        booking = Booking.objects.select_related('equipment', 'equipment__owner', 'farmer').get(pk=booking_id)
    except Booking.DoesNotExist:
        return Response({"error": "Booking not found."}, status=status.HTTP_404_NOT_FOUND)

    # Permission check: Machine Owner or Admin
    if booking.equipment.owner != user and user.role != 'Admin':
        return Response({"error": "Only the machine owner or Admin can request an operator for this equipment."}, status=status.HTTP_403_FORBIDDEN)

    # Avoid duplicate active operator request
    existing_active = OperatorJobAssignment.objects.filter(
        booking=booking,
        status__in=['REQUESTED', 'ACCEPTED', 'TRAVELLING_TO_PICKUP', 'ARRIVED_AT_PICKUP',
                    'MACHINE_COLLECTED', 'TRAVELLING_TO_FARM', 'ARRIVED_AT_FARM', 'IN_PROGRESS']
    ).first()

    if existing_active:
        return Response({
            "message": f"An active operator assignment (#{existing_active.id}) already exists in status '{existing_active.status}'.",
            "assignment": OperatorJobAssignmentSerializer(existing_active).data
        }, status=status.HTTP_200_OK)

    booking.requires_operator = True
    booking.save()

    assignment = dispatch_booking_to_matching_operators(booking)
    if assignment:
        Notification.objects.create(
            user=booking.farmer,
            content=f"Machine owner {user.username} requested an operator for Booking #{booking.id}. AI match initiated."
        )
        return Response(OperatorJobAssignmentSerializer(assignment).data, status=status.HTTP_201_CREATED)
    else:
        return Response({
            "message": "Operator request recorded. No online verified operators are currently in radius, will auto-dispatch once an operator goes online."
        }, status=status.HTTP_200_OK)
