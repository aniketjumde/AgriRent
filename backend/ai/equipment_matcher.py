import math
from datetime import datetime
from django.utils import timezone
from django.db.models import Q
from api.models import Equipment, Booking, OperatorProfile, OperatorJobAssignment
from .job_matcher import haversine_distance

# Agricultural task suitability matrix (Category -> supported tasks & score multiplier)
TASK_CATEGORY_MATRIX = {
    'Ploughing': {'Tractor': 1.0, 'Rotavator': 0.85, 'Other Agricultural Machinery': 0.6},
    'Deep Ploughing': {'Tractor': 1.0, 'Other Agricultural Machinery': 0.7},
    'Tilling': {'Rotavator': 1.0, 'Tractor': 0.9, 'Other Agricultural Machinery': 0.6},
    'Land Preparation': {'Tractor': 1.0, 'Rotavator': 0.95, 'Seeder': 0.5, 'Other Agricultural Machinery': 0.6},
    'Sowing': {'Seeder': 1.0, 'Tractor': 0.8, 'Rotavator': 0.4},
    'Planting': {'Seeder': 1.0, 'Tractor': 0.8},
    'Spraying': {'Sprayer': 1.0, 'Crop Protection Equipment': 0.95, 'Tractor': 0.5},
    'Crop Protection': {'Crop Protection Equipment': 1.0, 'Sprayer': 0.95, 'Tractor': 0.5},
    'Harvesting': {'Harvester': 1.0, 'Other Agricultural Machinery': 0.7, 'Tractor': 0.4},
    'Paddy Harvesting': {'Harvester': 1.0, 'Other Agricultural Machinery': 0.7},
    'Grain Harvesting': {'Harvester': 1.0, 'Other Agricultural Machinery': 0.7},
    'Threshing': {'Harvester': 0.9, 'Other Agricultural Machinery': 0.8, 'Tractor': 0.6},
}

DEFAULT_TASK_WEIGHTS = {
    'task_suitability': 30.0,
    'spec_condition': 15.0,
    'equipment_proximity': 20.0,
    'operator_match': 20.0,
    'cost_budget_fit': 15.0,
}


def check_equipment_schedule_availability(equipment, start_dt, end_dt):
    """
    Step 5: Verify real machinery availability and overlapping bookings.
    Returns: (is_available, conflict_reason, overlapping_records)
    """
    if not equipment.is_available:
        return False, "Equipment is marked unavailable or undergoing maintenance.", []

    overlapping = Booking.objects.filter(
        equipment=equipment,
        status__in=['Pending', 'Approved', 'In Progress'],
        start_date__lt=end_dt,
        end_date__gt=start_dt
    ).select_related('farmer')

    if overlapping.exists():
        records = [
            {
                'booking_id': b.id,
                'status': b.status,
                'start_date': b.start_date.isoformat(),
                'end_date': b.end_date.isoformat(),
                'farmer': b.farmer.username
            } for b in overlapping
        ]
        return False, f"Schedule overlaps with {overlapping.count()} active booking(s).", records

    return True, "Fully available for requested dates.", []


def find_and_rank_equipment_and_operators(
    farming_operation="Land Preparation",
    farmer_lat=18.5204,
    farmer_lng=73.8567,
    start_date_str=None,
    end_date_str=None,
    crop_type=None,
    land_size_acres=2.0,
    duration_hours=4.0,
    preferred_category=None,
    requires_operator=True,
    max_budget=None,
    max_radius_km=100.0,
    weights=None
):
    """
    Step 6: AI-Powered Equipment and Operator Matching Engine.
    Hard eligibility filters first -> explainable weighted ranking.
    Derives explainable suitability scores, operator assignments, and itemized cost breakdown.
    """
    w = weights or DEFAULT_TASK_WEIGHTS
    now = timezone.now()

    # Parse schedule
    start_dt = None
    end_dt = None
    if start_date_str and end_date_str:
        try:
            start_dt = datetime.fromisoformat(str(start_date_str).replace('Z', '+00:00'))
            end_dt = datetime.fromisoformat(str(end_date_str).replace('Z', '+00:00'))
            if timezone.is_naive(start_dt):
                start_dt = timezone.make_aware(start_dt)
            if timezone.is_naive(end_dt):
                end_dt = timezone.make_aware(end_dt)
        except Exception:
            start_dt = now + timezone.timedelta(hours=2)
            end_dt = start_dt + timezone.timedelta(hours=float(duration_hours or 4.0))
    else:
        start_dt = now + timezone.timedelta(hours=2)
        end_dt = start_dt + timezone.timedelta(hours=float(duration_hours or 4.0))

    # Base candidate pool from actual database
    queryset = Equipment.objects.select_related('owner').filter(is_available=True)

    if preferred_category and preferred_category.lower() != 'all':
        queryset = queryset.filter(category__iexact=preferred_category)

    # 1. Retrieve all candidates and perform Hard Eligibility Checks
    eligible_candidates = []
    task_rules = TASK_CATEGORY_MATRIX.get(farming_operation, {})

    for equip in queryset:
        # Check actual availability for requested schedule
        is_avail, reason, conflicts = check_equipment_schedule_availability(equip, start_dt, end_dt)
        if not is_avail:
            continue

        # Check distance feasibility if coordinates exist
        dist_km = haversine_distance(
            farmer_lat, farmer_lng,
            float(equip.location_latitude), float(equip.location_longitude)
        )
        if max_radius_km and dist_km > max_radius_km:
            continue

        # Task suitability factor: default 0.6 if operation is not specifically mapped
        suitability_factor = task_rules.get(equip.category, 0.6 if not task_rules else task_rules.get(equip.category, 0.3))
        if suitability_factor < 0.2:
            # Completely incompatible equipment for this task
            continue

        eligible_candidates.append({
            'equipment': equip,
            'dist_km': dist_km,
            'suitability_factor': suitability_factor
        })

    # 2. Retrieve eligible operators
    operator_candidates = []
    if requires_operator:
        ops = OperatorProfile.objects.select_related('user').filter(
            verification_status='Verified',
            is_available=True,
            is_online=True,
            user__is_active=True
        )
        for op in ops:
            # Check for overlapping busy jobs
            busy = OperatorJobAssignment.objects.filter(
                operator=op,
                status__in=['ACCEPTED', 'TRAVELLING_TO_PICKUP', 'ARRIVED_AT_PICKUP', 
                            'MACHINE_COLLECTED', 'TRAVELLING_TO_FARM', 'ARRIVED_AT_FARM', 'IN_PROGRESS']
            ).filter(
                Q(booking__start_date__lt=end_dt, booking__end_date__gt=start_dt)
            ).exists()
            if not busy:
                operator_candidates.append(op)

    # 3. Calculate Explainable Multidimensional Match Scores
    recommendations = []

    for item in eligible_candidates:
        equip = item['equipment']
        dist_km = item['dist_km']
        task_factor = item['suitability_factor']

        # A. Task Suitability Score (0 to 30)
        score_task = round(w['task_suitability'] * task_factor, 1)

        # B. Equipment Specification & Condition Score (0 to 15)
        # Assessed from verified status, fuel efficiency, and sensor health
        condition_pts = 8.0
        if equip.is_verified:
            condition_pts += 3.0
        if equip.sensor_vibration == 'Normal':
            condition_pts += 2.0
        if equip.sensor_oil_level == 'Optimal':
            condition_pts += 2.0
        score_condition = min(w['spec_condition'], condition_pts)

        # C. Proximity / Location Relevance Score (0 to 20)
        # Closer machines save transport costs and time
        proximity_ratio = max(0.0, 1.0 - (dist_km / max(50.0, max_radius_km)))
        score_proximity = round(w['equipment_proximity'] * proximity_ratio, 1)

        # D. Match & Rank Qualified Operator (0 to 20)
        matched_operator_info = None
        score_operator = 0.0

        if requires_operator:
            best_op = None
            best_op_score = -1.0
            best_op_dist = 9999.0

            for op in operator_candidates:
                # Does operator support this machine category?
                supported = op.supported_machinery or []
                mach_match = (equip.category in supported) or (len(supported) == 0)
                
                # Distance from operator to equipment pickup point
                op_dist = haversine_distance(
                    float(op.current_latitude), float(op.current_longitude),
                    float(equip.location_latitude), float(equip.location_longitude)
                )

                if op_dist > (op.service_radius_km * 1.5):
                    continue

                op_pts = (10.0 if mach_match else 4.0)
                op_pts += max(0.0, 5.0 - (op_dist * 0.15))
                op_pts += min(5.0, (op.experience_years * 0.8))

                if op_pts > best_op_score:
                    best_op_score = op_pts
                    best_op = op
                    best_op_dist = op_dist

            if best_op:
                score_operator = round(min(w['operator_match'], best_op_score), 1)
                matched_operator_info = {
                    'operator_id': best_op.id,
                    'user_id': best_op.user.id,
                    'full_name': best_op.full_name or best_op.user.username,
                    'username': best_op.user.username,
                    'phone': best_op.phone or best_op.user.phone_number,
                    'experience_years': best_op.experience_years,
                    'supported_machinery': best_op.supported_machinery,
                    'reliability_score': best_op.user.reliability_score,
                    'hourly_rate': float(best_op.hourly_compensation_rate or 250.0),
                    'distance_to_pickup_km': round(best_op_dist, 1),
                    'suitability_score': score_operator,
                    'status': 'Eligible and Available'
                }
            else:
                score_operator = 0.0
                matched_operator_info = {
                    'status': 'Incomplete: No verified operator in radius',
                    'operator_id': None,
                    'suitability_score': 0.0
                }
        else:
            # Operator not requested; give full neutral score
            score_operator = w['operator_match']

        # E. Estimated Rental Cost & Budget Fit Score (0 to 15)
        hourly_rate = float(equip.rental_price_per_hour)
        duration = float(duration_hours or 4.0)
        base_cost = hourly_rate * duration
        operator_cost = (float(matched_operator_info.get('hourly_rate', 250.0)) * duration) if (requires_operator and matched_operator_info and matched_operator_info.get('operator_id')) else 0.0
        transport_cost = round(max(200.0, dist_km * 20.0), 2)
        total_estimate = round(base_cost + operator_cost + transport_cost, 2)

        if max_budget and max_budget > 0:
            if total_estimate <= max_budget:
                budget_ratio = 1.0
            else:
                over = total_estimate - max_budget
                budget_ratio = max(0.0, 1.0 - (over / max_budget))
        else:
            budget_ratio = 0.9 # Good default
        score_budget = round(w['cost_budget_fit'] * budget_ratio, 1)

        # F. Overall Total Match Score (out of 100)
        overall_score = round(score_task + score_condition + score_proximity + score_operator + score_budget, 1)

        # Build explainable recommendation reason tags
        reasons = []
        if task_factor >= 0.9:
            reasons.append(f"Optimal match for {farming_operation} fieldwork")
        if dist_km <= 15.0:
            reasons.append(f"Nearby machine ({round(dist_km, 1)} km away; low transport cost)")
        if equip.is_verified:
            reasons.append("Verified machine with optimal IoT sensor health")
        if matched_operator_info and matched_operator_info.get('operator_id'):
            reasons.append(f"Qualified operator {matched_operator_info['full_name']} available ({matched_operator_info['experience_years']} yrs exp)")
        elif requires_operator:
            reasons.append("Self-drive or alternative operator selection required")

        recommendations.append({
            'equipment': {
                'id': equip.id,
                'title': equip.title,
                'category': equip.category,
                'description': equip.description,
                'rental_price_per_hour': float(equip.rental_price_per_hour),
                'location_latitude': float(equip.location_latitude),
                'location_longitude': float(equip.location_longitude),
                'address': equip.address,
                'image_url': equip.image_url,
                'is_verified': equip.is_verified,
                'fuel_efficiency': equip.fuel_efficiency,
                'sensor_health': {
                    'temperature': equip.sensor_temperature,
                    'vibration': equip.sensor_vibration,
                    'oil_level': equip.sensor_oil_level
                },
                'owner': {
                    'id': equip.owner.id,
                    'username': equip.owner.username,
                    'phone': equip.owner.phone_number,
                    'reliability_score': equip.owner.reliability_score
                }
            },
            'operator': matched_operator_info,
            'match_metrics': {
                'overall_score': overall_score,
                'task_score': score_task,
                'condition_score': score_condition,
                'proximity_score': score_proximity,
                'operator_score': score_operator,
                'budget_score': score_budget,
                'suitability_label': 'High Match' if overall_score >= 80 else ('Good Match' if overall_score >= 65 else 'Moderate Match')
            },
            'estimated_costs': {
                'base_rental': base_cost,
                'operator_charges': operator_cost,
                'transport_charges': transport_cost,
                'total_estimated_cost': total_estimate,
                'currency': 'INR'
            },
            'distance_km': round(dist_km, 1),
            'start_date': start_dt.isoformat(),
            'end_date': end_dt.isoformat(),
            'recommendation_reasons': reasons
        })

    # Sort descending by match score
    recommendations.sort(key=lambda x: x['match_metrics']['overall_score'], reverse=True)

    return {
        'total_evaluated': queryset.count(),
        'eligible_count': len(recommendations),
        'farming_operation': farming_operation,
        'crop_type': crop_type,
        'land_size_acres': land_size_acres,
        'duration_hours': duration_hours,
        'requires_operator': requires_operator,
        'recommendations': recommendations
    }
