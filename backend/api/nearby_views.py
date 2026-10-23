import math
from datetime import datetime
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.db.models import Avg, Q

from .models import Equipment, Booking, OperatorProfile
from .serializers import EquipmentSerializer


def haversine_distance(lat1, lon1, lat2, lon2):
    """
    Computes great-circle distance between two points on the Earth in kilometers.
    """
    try:
        lat1, lon1, lat2, lon2 = map(float, [lat1, lon1, lat2, lon2])
    except (ValueError, TypeError):
        return 99999.0

    R = 6371.0  # Earth's radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2.0) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 2)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def nearby_equipment_view(request):
    """
    Returns agricultural equipment filtered by:
    - GPS location & radius (5, 10, 25, 50, or custom km)
    - Category
    - Price range (max_price)
    - Availability status
    - Slot booking conflicts for given start_date & end_date
    - Sorting by distance, price, or rating
    """
    try:
        farmer_lat = float(request.query_params.get('lat', 11.0168))
        farmer_lng = float(request.query_params.get('lng', 76.9558))
    except (ValueError, TypeError):
        farmer_lat, farmer_lng = 11.0168, 76.9558

    radius_km = float(request.query_params.get('radius', 50))
    category = request.query_params.get('category', '').strip()
    max_price = request.query_params.get('max_price')
    availability = request.query_params.get('availability', 'all')  # all, available, busy
    search = request.query_params.get('search', '').strip().lower()
    sort_by = request.query_params.get('sort_by', 'distance')  # distance, price_low, price_high, rating
    start_date_str = request.query_params.get('start_date')
    end_date_str = request.query_params.get('end_date')

    # Date range parsing for conflict checks
    start_date = None
    end_date = None
    if start_date_str and end_date_str:
        try:
            start_date = datetime.fromisoformat(start_date_str.replace('Z', '+00:00'))
            end_date = datetime.fromisoformat(end_date_str.replace('Z', '+00:00'))
        except (ValueError, TypeError):
            pass

    queryset = Equipment.objects.all().select_related('owner')

    # Check category
    if category and category.lower() != 'all':
        queryset = queryset.filter(category__iexact=category)

    # Search filter
    if search:
        queryset = queryset.filter(
            Q(title__icontains=search) |
            Q(description__icontains=search) |
            Q(category__icontains=search) |
            Q(address__icontains=search)
        )

    # Max price filter
    if max_price:
        try:
            queryset = queryset.filter(rental_price_per_hour__lte=float(max_price))
        except ValueError:
            pass

    results = []

    # Check for available operators in the area
    online_operators_count = OperatorProfile.objects.filter(
        is_online=True,
        verification_status='Verified'
    ).count()

    for eq in queryset:
        dist = haversine_distance(farmer_lat, farmer_lng, eq.location_latitude, eq.location_longitude)
        if radius_km and dist > radius_km:
            continue

        # Check booking slot conflicts
        is_slot_conflicted = False
        if start_date and end_date:
            conflicts = Booking.objects.filter(
                equipment=eq,
                status__in=['Pending', 'Approved', 'In Progress'],
                start_date__lt=end_date,
                end_date__gt=start_date
            ).exists()
            if conflicts:
                is_slot_conflicted = True

        effective_available = eq.is_available and not is_slot_conflicted

        if availability == 'available' and not effective_available:
            continue
        elif availability == 'busy' and effective_available:
            continue

        # Equipment serialization details
        data = EquipmentSerializer(eq).data
        data['distance_km'] = dist
        data['is_slot_conflicted'] = is_slot_conflicted
        data['effective_available'] = effective_available
        data['rental_price_per_day'] = round(float(eq.rental_price_per_hour) * 8.0, 2)  # Standard 8-hr farm shift
        data['operator_available'] = (online_operators_count > 0)
        data['operator_charge_per_day'] = 350.0  # Standard daily operator wage
        data['delivery_charge_estimate'] = round(max(150.0, dist * 18.0), 2)  # ₹18/km transport

        results.append(data)

    # Sorting
    if sort_by == 'price_low':
        results.sort(key=lambda x: float(x.get('rental_price_per_hour', 0)))
    elif sort_by == 'price_high':
        results.sort(key=lambda x: float(x.get('rental_price_per_hour', 0)), reverse=True)
    elif sort_by == 'rating':
        results.sort(key=lambda x: float(x.get('average_rating', 0) or 0), reverse=True)
    else:  # default 'distance'
        results.sort(key=lambda x: x.get('distance_km', 99999))

    return Response({
        "farmer_location": {
            "latitude": farmer_lat,
            "longitude": farmer_lng,
            "radius_km": radius_km
        },
        "total_found": len(results),
        "results": results
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def validate_cart_booking_view(request):
    """
    Validates an agricultural equipment booking item or entire cart:
    - Calculates server-side verified rental cost breakdown
    - Validates machine existence, maintenance & availability
    - Validates no overlapping bookings
    - Computes operator charges, transportation/delivery fee, insurance, taxes
    """
    items = request.data.get('items', [])
    if not items and request.data.get('equipment_id'):
        items = [request.data]

    if not items:
        return Response({"error": "No booking items provided to validate."}, status=status.HTTP_400_BAD_REQUEST)

    validated_items = []
    total_cart_amount = 0.0
    has_conflicts = False

    farmer_lat = request.data.get('farmer_lat', 11.0168)
    farmer_lng = request.data.get('farmer_lng', 76.9558)

    for item in items:
        eq_id = item.get('equipment_id') or item.get('equipment')
        start_date_str = item.get('start_date')
        end_date_str = item.get('end_date')
        acreage = float(item.get('acreage', 2.0))
        farming_operation = item.get('farming_operation', 'Land Preparation')
        rental_type = item.get('rental_type', 'hourly')  # 'hourly' or 'daily'
        duration_val = float(item.get('duration', 4.0))  # hours or days
        requires_operator = bool(item.get('requires_operator', False))
        delivery_option = item.get('delivery_option', 'Pickup')  # 'Pickup' or 'Delivery'
        insurance_opt_in = bool(item.get('insurance_opt_in', False))

        try:
            equipment = Equipment.objects.select_related('owner').get(pk=eq_id)
        except Equipment.DoesNotExist:
            return Response({"error": f"Equipment #{eq_id} not found."}, status=status.HTTP_404_NOT_FOUND)

        # Distance calculation
        dist_km = haversine_distance(farmer_lat, farmer_lng, equipment.location_latitude, equipment.location_longitude)

        # Check conflicts
        conflict = False
        if start_date_str and end_date_str:
            try:
                s_dt = datetime.fromisoformat(start_date_str.replace('Z', '+00:00'))
                e_dt = datetime.fromisoformat(end_date_str.replace('Z', '+00:00'))
                conflict = Booking.objects.filter(
                    equipment=equipment,
                    status__in=['Pending', 'Approved', 'In Progress'],
                    start_date__lt=e_dt,
                    end_date__gt=s_dt
                ).exists()
            except Exception:
                pass

        if conflict:
            has_conflicts = True

        # Server-side authoritative calculation
        hourly_rate = float(equipment.rental_price_per_hour)
        daily_rate = round(hourly_rate * 8.0, 2)

        if rental_type == 'daily':
            rental_base = round(daily_rate * duration_val, 2)
            est_hours = duration_val * 8.0
        else:
            rental_base = round(hourly_rate * duration_val, 2)
            est_hours = duration_val

        # Operator charge
        operator_charge = (350.0 * max(1, int(est_hours / 8.0))) if requires_operator else 0.0

        # Transportation / Delivery charge
        delivery_charge = round(max(150.0, dist_km * 18.0), 2) if delivery_option == 'Delivery' else 0.0

        # Optional insurance: flat ₹150 per day
        insurance_charge = (150.0 * max(1, int(est_hours / 24.0))) if insurance_opt_in else 0.0

        subtotal = rental_base + operator_charge + delivery_charge + insurance_charge
        gst_tax = round(subtotal * 0.05, 2)  # 5% Agricultural equipment rental GST
        item_total = round(subtotal + gst_tax, 2)

        total_cart_amount += item_total

        validated_items.append({
            "equipment_id": equipment.id,
            "equipment_title": equipment.title,
            "equipment_category": equipment.category,
            "equipment_image": equipment.image_url,
            "owner_id": equipment.owner.id,
            "owner_name": equipment.owner.username,
            "distance_km": dist_km,
            "farming_operation": farming_operation,
            "acreage": acreage,
            "start_date": start_date_str,
            "end_date": end_date_str,
            "rental_type": rental_type,
            "duration": duration_val,
            "hourly_rate": hourly_rate,
            "daily_rate": daily_rate,
            "rental_base_amount": rental_base,
            "requires_operator": requires_operator,
            "operator_charge": operator_charge,
            "delivery_option": delivery_option,
            "delivery_charge": delivery_charge,
            "insurance_opt_in": insurance_opt_in,
            "insurance_charge": insurance_charge,
            "gst_tax": gst_tax,
            "item_total": item_total,
            "is_available": equipment.is_available and not conflict,
            "conflict_warning": "Selected time slot conflicts with another active reservation" if conflict else None
        })

    return Response({
        "valid": not has_conflicts,
        "items": validated_items,
        "total_cart_amount": round(total_cart_amount, 2),
        "currency": "INR",
        "has_conflicts": has_conflicts
    })
