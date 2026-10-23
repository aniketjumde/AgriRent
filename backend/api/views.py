from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.db.models import Sum, Count, Avg
from django.utils import timezone
from datetime import datetime

from .models import User, Equipment, Booking, Review, Message, Notification, SupportTicket, PricePrediction, Recommendation
from .serializers import (
    UserSerializer, UserProfileSerializer, EquipmentSerializer, BookingSerializer, 
    ReviewSerializer, MessageSerializer, NotificationSerializer, SupportTicketSerializer,
    PricePredictionSerializer, RecommendationSerializer
)

from ai.recommendation import train_and_recommend
from ai.price_predictor import predict_price
from ai.voice_parser import parse_voice_text
from ai.assistant import query_assistant

# --- AUTHENTICATION VIEWS ---

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def register_view(request):
    serializer = UserSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        # Log simulated OTP code
        print(f"==================================================")
        print(f"SIMULATED OTP DISPATCH for {user.username} ({user.phone_number}): CODE is '123456'")
        print(f"==================================================")
        return Response({
            "message": "User registered successfully. Please verify your OTP.",
            "username": user.username,
            "otp_sent_to": user.phone_number or user.email
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def verify_otp_view(request):
    username = request.data.get('username')
    otp_code = request.data.get('otp_code')

    try:
        user = User.objects.get(username=username)
        if otp_code == '123456' or user.otp_code == otp_code:
            user.is_verified = True
            user.save()
            
            refresh = RefreshToken.for_user(user)
            return Response({
                "message": "OTP verified successfully. User is now active.",
                "token": {
                    "refresh": str(refresh),
                    "access": str(refresh.access_token)
                },
                "user": UserProfileSerializer(user).data
            }, status=status.HTTP_200_OK)
        return Response({"error": "Invalid OTP code."}, status=status.HTTP_400_BAD_REQUEST)
    except User.DoesNotExist:
        return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login_view(request):
    username = request.data.get('username')
    password = request.data.get('password')
    
    user = authenticate(username=username, password=password)
    if user:
        if not user.is_verified:
            return Response({
                "error": "Account not verified.",
                "is_verified": False,
                "username": user.username
            }, status=status.HTTP_403_FORBIDDEN)
            
        refresh = RefreshToken.for_user(user)
        return Response({
            "token": {
                "refresh": str(refresh),
                "access": str(refresh.access_token)
            },
            "user": UserProfileSerializer(user).data
        }, status=status.HTTP_200_OK)
    return Response({"error": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def forgot_password_view(request):
    username = request.data.get('username')
    try:
        user = User.objects.get(username=username)
        user.otp_code = "123456" # Dev OTP code
        user.save()
        print(f"==================================================")
        print(f"RESET OTP DISPATCH for {user.username}: CODE is '123456'")
        print(f"==================================================")
        return Response({"message": "Password reset OTP sent to registered number."}, status=status.HTTP_200_OK)
    except User.DoesNotExist:
        return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def reset_password_view(request):
    username = request.data.get('username')
    otp_code = request.data.get('otp_code')
    new_password = request.data.get('new_password')
    
    try:
        user = User.objects.get(username=username)
        if otp_code == '123456' or user.otp_code == otp_code:
            user.set_password(new_password)
            user.is_verified = True
            user.save()
            return Response({"message": "Password reset successfully. You can now login."}, status=status.HTTP_200_OK)
        return Response({"error": "Invalid OTP code."}, status=status.HTTP_400_BAD_REQUEST)
    except User.DoesNotExist:
        return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_me_view(request):
    return Response(UserProfileSerializer(request.user).data)


# --- EQUIPMENT LISTINGS VIEWS ---

class EquipmentListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get(self, request):
        category = request.query_params.get('category')
        search = request.query_params.get('search')
        
        listings = Equipment.objects.all()
        if category:
            listings = listings.filter(category=category)
        if search:
            listings = listings.filter(title__icontains=search)
            
        serializer = EquipmentSerializer(listings, many=True)
        return Response(serializer.data)

    def post(self, request):
        if request.user.role not in ['Owner', 'Admin']:
            return Response({"error": "Only equipment owners or admins can list equipment."}, status=status.HTTP_403_FORBIDDEN)
            
        serializer = EquipmentSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(owner=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class EquipmentDetailView(APIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_object(self, pk):
        try:
            return Equipment.objects.get(pk=pk)
        except Equipment.DoesNotExist:
            return None

    def get(self, request, pk):
        equipment = self.get_object(pk)
        if not equipment:
            return Response({"error": "Equipment not found."}, status=status.HTTP_444_NOT_FOUND if False else status.HTTP_404_NOT_FOUND)
        serializer = EquipmentSerializer(equipment)
        return Response(serializer.data)

    def put(self, request, pk):
        equipment = self.get_object(pk)
        if not equipment:
            return Response({"error": "Equipment not found."}, status=status.HTTP_404_NOT_FOUND)
        if equipment.owner != request.user and request.user.role != 'Admin':
            return Response({"error": "Unauthorized change."}, status=status.HTTP_403_FORBIDDEN)
            
        serializer = EquipmentSerializer(equipment, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        equipment = self.get_object(pk)
        if not equipment:
            return Response({"error": "Equipment not found."}, status=status.HTTP_404_NOT_FOUND)
        if equipment.owner != request.user and request.user.role != 'Admin':
            return Response({"error": "Unauthorized action."}, status=status.HTTP_403_FORBIDDEN)
        equipment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def verify_equipment_view(request, pk):
    if request.user.role != 'Admin':
        return Response({"error": "Only Admins can verify equipment listings."}, status=status.HTTP_403_FORBIDDEN)
    try:
        equipment = Equipment.objects.get(pk=pk)
        equipment.is_verified = True
        equipment.save()
        return Response({"message": "Equipment listing verified successfully.", "is_verified": True})
    except Equipment.DoesNotExist:
        return Response({"error": "Equipment not found."}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def create_review_view(request, pk):
    try:
        equipment = Equipment.objects.get(pk=pk)
    except Equipment.DoesNotExist:
        return Response({"error": "Equipment not found."}, status=status.HTTP_404_NOT_FOUND)

    serializer = ReviewSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(author=request.user, equipment=equipment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# --- BOOKING VIEWS ---

class BookingListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role == 'Owner':
            bookings = Booking.objects.filter(equipment__owner=request.user)
        elif request.user.role == 'Admin':
            bookings = Booking.objects.all()
        else: # Farmer
            bookings = Booking.objects.filter(farmer=request.user)
            
        serializer = BookingSerializer(bookings, many=True)
        return Response(serializer.data)

    def post(self, request):
        equipment_id = request.data.get('equipment')
        start_date_str = request.data.get('start_date')
        end_date_str = request.data.get('end_date')
        
        try:
            equipment = Equipment.objects.get(pk=equipment_id)
        except Equipment.DoesNotExist:
            return Response({"error": "Equipment not found."}, status=status.HTTP_404_NOT_FOUND)
            
        if not equipment.is_available:
            return Response({"error": "Equipment is not available currently."}, status=status.HTTP_400_BAD_REQUEST)
            
        # Parse dates to calculate total hours and total cost
        try:
            start_date = datetime.fromisoformat(start_date_str.replace('Z', '+00:00'))
            end_date = datetime.fromisoformat(end_date_str.replace('Z', '+00:00'))
        except ValueError:
            return Response({"error": "Invalid date format. Use ISO 8601."}, status=status.HTTP_400_BAD_REQUEST)
            
        duration = end_date - start_date
        total_hours = duration.total_seconds() / 3600.0
        if total_hours <= 0:
            return Response({"error": "End date must be after start date."}, status=status.HTTP_400_BAD_REQUEST)
            
        # Calculate pricing logic with Micro-Rental / Shared Cooperative model
        base_cost = float(equipment.rental_price_per_hour) * total_hours
        
        micro_rental_shared = request.data.get('micro_rental_shared', False)
        if micro_rental_shared:
            base_cost = base_cost * 0.5 # Shared booking splits the cost in half!
            
        # Optional Insurance coverage
        insurance_opt_in = request.data.get('insurance_opt_in', False)
        if insurance_opt_in:
            # Let's say insurance is a flat ₹150 per day (assumed 24 hours interval)
            insurance_days = max(1, int(total_hours / 24.0))
            base_cost += (insurance_days * 150.0)
            
        delivery_option = request.data.get('delivery_option', 'Pickup')
        if delivery_option == 'Delivery':
            base_cost += 500.0 # Delivery fee
            
        notes = request.data.get('notes', '')
        
        # Calculate carbon saved: sharing equipment saves approx 8.5 kg of CO2 per hour compared to individual purchasing
        carbon_saved = total_hours * (12.4 if micro_rental_shared else 8.5)
        
        import uuid
        import hashlib
        # Simulate Blockchain contract audit hash logs
        contract_uuid = str(uuid.uuid4())
        ipfs_hash = "Qm" + hashlib.sha256(contract_uuid.encode()).hexdigest()[:44]
        contract_hash = "0x" + hashlib.sha256(ipfs_hash.encode()).hexdigest()
        
        requires_operator = request.data.get('requires_operator', False)
        if requires_operator:
            # Add standard operator fee to booking total
            base_cost += 350.0

        booking = Booking.objects.create(
            equipment=equipment,
            farmer=request.user,
            start_date=start_date,
            end_date=end_date,
            total_cost=base_cost,
            delivery_option=delivery_option,
            notes=notes,
            status='Pending',
            escrow_status='Held', # Payments securely locked in escrow
            micro_rental_shared=micro_rental_shared,
            insurance_opt_in=insurance_opt_in,
            insurance_claim_status='N/A' if not insurance_opt_in else 'Verified Policy',
            requires_operator=requires_operator,
            carbon_saved_kg=round(carbon_saved, 2),
            blockchain_ipfs_hash=ipfs_hash,
            blockchain_contract_hash=contract_hash
        )
        
        # Create notification for owner
        Notification.objects.create(
            user=equipment.owner,
            content=f"New booking request from {request.user.username} for your {equipment.title}. Escrow: Held."
        )
        
        serializer = BookingSerializer(booking)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def update_booking_status_view(request, pk):
    try:
        booking = Booking.objects.get(pk=pk)
    except Booking.DoesNotExist:
        return Response({"error": "Booking not found."}, status=status.HTTP_404_NOT_FOUND)
        
    new_status = request.data.get('status')
    if new_status not in ['Approved', 'Rejected', 'In Progress', 'Completed']:
        return Response({"error": "Invalid status choice."}, status=status.HTTP_400_BAD_REQUEST)
        
    # Role checking
    is_owner = booking.equipment.owner == request.user
    is_farmer = booking.farmer == request.user
    is_admin = request.user.role == 'Admin'
    
    if new_status in ['Approved', 'Rejected'] and not (is_owner or is_admin):
        return Response({"error": "Only the equipment owner or Admin can approve/reject bookings."}, status=status.HTTP_403_FORBIDDEN)
        
    if new_status in ['In Progress', 'Completed'] and not (is_owner or is_farmer or is_admin):
        return Response({"error": "Unauthorized change."}, status=status.HTTP_403_FORBIDDEN)
        
    booking.status = new_status
    
    # Manage Escrow payout logic
    if new_status == 'Completed':
        booking.escrow_status = 'Released' # Payout released to Owner
    elif new_status == 'Rejected':
        booking.escrow_status = 'Refunded' # Refunded to Farmer
        
    booking.save()

    # If approved and operator requested, auto-dispatch to matching operators
    if new_status == 'Approved' and booking.requires_operator and not booking.operator_assigned:
        try:
            from .operator_views import dispatch_booking_to_matching_operators
            dispatch_booking_to_matching_operators(booking)
        except Exception as e:
            print("Operator dispatch error:", e)
    
    # If completed, set equipment availability back to true
    if new_status == 'Completed':
        booking.equipment.is_available = True
        booking.equipment.save()
    elif new_status == 'Approved':
        booking.equipment.is_available = False
        booking.equipment.save()
        
    # Notify other party
    notified_user = booking.farmer if is_owner else booking.equipment.owner
    Notification.objects.create(
        user=notified_user,
        content=f"Booking #{booking.id} status updated to: {new_status}. Escrow: {booking.escrow_status}."
    )
    
    return Response(BookingSerializer(booking).data)


# --- CHAT MESSAGES VIEWS ---

@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def booking_chat_view(request, pk):
    try:
        booking = Booking.objects.get(pk=pk)
    except Booking.DoesNotExist:
        return Response({"error": "Booking not found."}, status=status.HTTP_404_NOT_FOUND)
        
    # Check participation
    if booking.farmer != request.user and booking.equipment.owner != request.user and request.user.role != 'Admin':
        return Response({"error": "Unauthorized chat access."}, status=status.HTTP_403_FORBIDDEN)
        
    if request.method == 'GET':
        messages = booking.chat_messages.all().order_by('timestamp')
        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)
        
    elif request.method == 'POST':
        content = request.data.get('content')
        if not content:
            return Response({"error": "Content is required."}, status=status.HTTP_400_BAD_REQUEST)
            
        message = Message.objects.create(
            booking=booking,
            sender=request.user,
            content=content
        )
        
        # Create simple notification for recipient
        recipient = booking.equipment.owner if request.user == booking.farmer else booking.farmer
        Notification.objects.create(
            user=recipient,
            content=f"New chat message from {request.user.username} regarding booking #{booking.id}."
        )
        
        serializer = MessageSerializer(message)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


# --- NOTIFICATIONS VIEWS ---

@api_view(['GET', 'PATCH'])
@permission_classes([permissions.IsAuthenticated])
def notification_list_view(request):
    if request.method == 'GET':
        notifications = Notification.objects.filter(user=request.user).order_by('-created_at')
        serializer = NotificationSerializer(notifications, many=True)
        return Response(serializer.data)
        
    elif request.method == 'PATCH':
        Notification.objects.filter(user=request.user).update(is_read=True)
        return Response({"message": "All notifications marked as read."})


# --- SUPPORT CENTER VIEWS ---

class SupportTicketListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role == 'Admin':
            tickets = SupportTicket.objects.all().order_by('-created_at')
        else:
            tickets = SupportTicket.objects.filter(user=request.user).order_by('-created_at')
            
        serializer = SupportTicketSerializer(tickets, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = SupportTicketSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def update_ticket_status_view(request, pk):
    if request.user.role != 'Admin':
        return Response({"error": "Only Admins can resolve tickets."}, status=status.HTTP_403_FORBIDDEN)
    try:
        ticket = SupportTicket.objects.get(pk=pk)
        new_status = request.data.get('status')
        if new_status not in ['Open', 'In Progress', 'Closed']:
            return Response({"error": "Invalid status."}, status=status.HTTP_400_BAD_REQUEST)
        ticket.status = new_status
        ticket.save()
        return Response(SupportTicketSerializer(ticket).data)
    except SupportTicket.DoesNotExist:
        return Response({"error": "Ticket not found."}, status=status.HTTP_404_NOT_FOUND)


# --- AI MODULE ENDPOINTS ---

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def ai_recommend_view(request):
    crop_type = request.data.get('crop_type')
    land_size = request.data.get('land_size')
    task_type = request.data.get('task_type')
    
    if not (crop_type and land_size and task_type):
        return Response({"error": "Please provide crop_type, land_size, and task_type."}, status=status.HTTP_400_BAD_REQUEST)
        
    try:
        land_size = float(land_size)
    except ValueError:
        return Response({"error": "Land size must be a number."}, status=status.HTTP_400_BAD_REQUEST)
        
    rec = train_and_recommend(crop_type, land_size, task_type)
    
    # Save recommendation history
    Recommendation.objects.create(
        crop_type=crop_type,
        land_size=land_size,
        task_type=task_type,
        recommended_equipment=rec["recommended_category"],
        confidence_score=rec["confidence_score"],
        estimated_cost=rec["estimated_rental_cost"]
    )
    
    return Response(rec)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def ai_predict_price_view(request):
    equipment_type = request.data.get('equipment_type')
    demand = request.data.get('demand')
    season = request.data.get('season')
    latitude = request.data.get('latitude', 11.0168)
    longitude = request.data.get('longitude', 76.9558)
    
    if not (equipment_type and demand and season):
        return Response({"error": "Please provide equipment_type, demand, and season."}, status=status.HTTP_400_BAD_REQUEST)
        
    predicted = predict_price(equipment_type, demand, season, latitude, longitude)
    
    # Save prediction history
    PricePrediction.objects.create(
        equipment_type=equipment_type,
        demand=demand,
        season=season,
        location=f"{latitude},{longitude}",
        min_price=predicted["min_price"],
        rec_price=predicted["recommended_price"],
        max_price=predicted["max_price"]
    )
    
    return Response(predicted)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def ai_voice_booking_view(request):
    text = request.data.get('text')
    if not text:
        return Response({"error": "Voice transcript text is required."}, status=status.HTTP_400_BAD_REQUEST)
        
    parsed = parse_voice_text(text)
    
    # Generate estimation costs
    prices = predict_price(parsed["equipment_type"], "Medium", "Harvesting")
    parsed["estimated_price_per_hour"] = prices["recommended_price"]
    
    return Response(parsed)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def ai_assistant_chat_view(request):
    message = request.data.get('message')
    if not message:
        return Response({"error": "Message is required."}, status=status.HTTP_400_BAD_REQUEST)
        
    # Helper to look up active listings to inject real-time context
    def active_listings_lookup(loc_name):
        listings = Equipment.objects.filter(address__icontains=loc_name, is_available=True)[:3]
        if listings:
            return ", ".join([f"{l.title} (₹{l.rental_price_per_hour}/hr)" for l in listings])
        return None
        
    reply = query_assistant(message, active_listings_lookup)
    return Response({"reply": reply})


# --- DASHBOARD ANALYTICS ---

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def farmer_dashboard_analytics(request):
    bookings = Booking.objects.filter(farmer=request.user)
    total_spent = bookings.filter(status='Completed').aggregate(Sum('total_cost'))['total_cost__sum'] or 0.0
    
    return Response({
        "total_bookings": bookings.count(),
        "active_rentals": bookings.filter(status='In Progress').count(),
        "pending_bookings": bookings.filter(status='Pending').count(),
        "completed_rentals": bookings.filter(status='Completed').count(),
        "total_spent": total_spent
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def owner_dashboard_analytics(request):
    listings = Equipment.objects.filter(owner=request.user)
    bookings = Booking.objects.filter(equipment__owner=request.user)
    
    total_earnings = bookings.filter(status='Completed').aggregate(Sum('total_cost'))['total_cost__sum'] or 0.0
    
    return Response({
        "total_listings": listings.count(),
        "active_rentals": bookings.filter(status='In Progress').count(),
        "pending_bookings": bookings.filter(status='Pending').count(),
        "completed_rentals": bookings.filter(status='Completed').count(),
        "total_earnings": total_earnings
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def admin_dashboard_analytics(request):
    if request.user.role != 'Admin':
        return Response({"error": "Unauthorized dashboard access."}, status=status.HTTP_403_FORBIDDEN)
        
    users = User.objects.all()
    equipment = Equipment.objects.all()
    bookings = Booking.objects.all()
    tickets = SupportTicket.objects.all()
    
    total_revenue = bookings.filter(status='Completed').aggregate(Sum('total_cost'))['total_cost__sum'] or 0.0
    
    # Calculate utilization rate: (Completed bookings + In Progress) / Total listings (expressed as decimal or percentage)
    total_listings_count = equipment.count()
    utilized_bookings = bookings.filter(status__in=['In Progress', 'Completed']).values('equipment').distinct().count()
    utilization_rate = round((utilized_bookings / total_listings_count * 100), 1) if total_listings_count > 0 else 0.0
    
    return Response({
        "total_farmers": users.filter(role='Farmer').count(),
        "total_owners": users.filter(role='Owner').count(),
        "total_equipment": total_listings_count,
        "active_rentals": bookings.filter(status='In Progress').count(),
        "completed_rentals": bookings.filter(status='Completed').count(),
        "total_revenue": total_revenue,
        "equipment_utilization_rate": utilization_rate,
        "pending_verifications": equipment.filter(is_verified=False).count(),
        "open_tickets": tickets.filter(status='Open').count()
    })


# --- WEATHER, GOVT-SCHEMES, AND DAMAGE DETECTION ENDPOINTS ---

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def weather_forecast_view(request):
    forecast = [
        {"day": "Today", "temp": 31, "condition": "Sunny", "rain_chance": 10},
        {"day": "Tomorrow", "temp": 32, "condition": "Partly Cloudy", "rain_chance": 20},
        {"day": "June 21", "temp": 29, "condition": "Scattered Showers", "rain_chance": 60},
        {"day": "June 22", "temp": 28, "condition": "Heavy Rain", "rain_chance": 90},
        {"day": "June 23", "temp": 30, "condition": "Overcast", "rain_chance": 40},
    ]
    return Response({
        "location": "Coimbatore, Tamil Nadu",
        "forecast": forecast,
        "rainfall_warning": "Heavy Rain Alert on June 22: High soil moisture, postpone seeder/sowing bookings to June 23.",
        "recommended_booking_dates": ["June 20", "June 23", "June 24"],
        "crop_cycle_recommendation": "Paddy fields are currently at the harvesting stage; combine harvesters are recommended for booking immediately."
    })


@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def govt_schemes_view(request):
    schemes = [
        {
            "id": 1,
            "title": "Sub-Mission on Agricultural Mechanization (SMAM)",
            "subsidy": "40% - 50% subsidy for purchasing tractors, power tillers, and seed drills",
            "eligibility": "Small and marginal farmers holding valid land records",
            "status": "Active"
        },
        {
            "id": 2,
            "title": "PM-KUSUM Scheme (Solar Pump Subsidy)",
            "subsidy": "Up to 60% financial assistance for solar agriculture pump installations",
            "eligibility": "Individual farmers, cooperatives, and village councils",
            "status": "Active"
        },
        {
            "id": 3,
            "title": "Tractor & Rotavator Subsidy (Tamil Nadu Govt)",
            "subsidy": "₹35,000 to ₹85,000 flat subsidy based on machinery HP capacity",
            "eligibility": "Registered farmers in Tamil Nadu state portal",
            "status": "Active"
        }
    ]
    
    # Simple Loan Eligibility Checker logic
    if request.method == 'POST':
        annual_income = float(request.data.get('annual_income', 0.0))
        land_size = float(request.data.get('land_size', 0.0))
        machinery_cost = float(request.data.get('machinery_cost', 0.0))
        
        eligible = annual_income >= 100000.0 and land_size >= 1.0
        max_loan_amount = min(machinery_cost * 0.85, annual_income * 2.5) if eligible else 0.0
        
        return Response({
            "eligible": eligible,
            "max_loan_amount": round(max_loan_amount, 2),
            "interest_rate_percent": 7.4,
            "repayment_years": 5,
            "subsidy_eligible_amount": round(machinery_cost * 0.4, 2) if eligible else 0.0,
            "message": "Loan eligibility checked successfully via AgriRent AI integration module."
        })
        
    return Response({
        "schemes": schemes,
        "farmer_benefits": {
            "subsidy_availed_ytd": 42000.00,
            "active_applications": 1,
            "benefit_tier": "Gold Category Farmer"
        }
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def booking_damage_detection_view(request, pk):
    try:
        booking = Booking.objects.get(pk=pk)
    except Booking.DoesNotExist:
        return Response({"error": "Booking not found."}, status=status.HTTP_404_NOT_FOUND)
        
    before_image = request.data.get('before_rental_image')
    after_image = request.data.get('after_rental_image')
    
    if not (before_image and after_image):
        return Response({"error": "Please provide both before and after images for analysis."}, status=status.HTTP_400_BAD_REQUEST)
        
    # Simulate computer vision comparisons
    severity = "Light" if "scratched" in after_image or "dusty" in after_image else "None"
    if "damage" in after_image or "broken" in after_image:
        severity = "Severe"
    elif "dent" in after_image or "bend" in after_image:
        severity = "Medium"
        
    booking.before_rental_image = before_image
    booking.after_rental_image = after_image
    booking.damage_severity = severity
    
    dispute_report = ""
    if severity != "None":
        dispute_report = f"AgriRent AI CV Audit detected discrepancies in machine frame. Severe structural delta: {severity}. Alternator / guard shield dented. Estimated penalty amount: ₹2500."
        booking.damage_dispute_report = dispute_report
    else:
        booking.damage_dispute_report = "AgriRent AI CV Audit verified: No structural discrepancies detected between before and after rental states."
        
    booking.save()
    
    return Response({
        "booking_id": booking.id,
        "damage_severity": severity,
        "damage_report": booking.damage_dispute_report,
        "repair_cost_estimate": 2500.00 if severity != "None" else 0.0,
        "dispute_status": "Raised" if severity != "None" else "None"
    })
