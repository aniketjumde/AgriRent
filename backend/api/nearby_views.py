import math
from datetime import datetime
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.db.models import Avg, Q

from .models import Equipment, Booking, OperatorProfile
from .serializers import EquipmentSerializer
from .pricing_engine import (
    haversine_distance,
    generate_equipment_quote,
    get_farming_season,
    calculate_seasonal_factor,
    calculate_local_demand_factor
)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def nearby_equipment_view(request):
    """
    Returns agricultural equipment filtered by:
    - GPS location & radius (5, 10, 25, 50, or custom km)
    - Category (Tractor, Harvester, Rotavator, Seeder, Sprayer, etc.)
    - Price range (max_price)
    - Availability status (available, busy, all)
    - Slot booking conflicts for given start_date & end_date
    - Sorting by distance, price, or rating
    - Dynamic live pricing estimate and operator availability in the cluster
    """
    try:
        farmer_lat = float(request.query_params.get('lat', 18.5204))
        farmer_lng = float(request.query_params.get('lng', 73.8567))
    except (ValueError, TypeError):
        farmer_lat, farmer_lng = 18.5204, 73.8567

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

    season_name = get_farming_season(start_date)

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

        # Dynamic pricing preview parameters
        seasonal_factor, seasonal_reason = calculate_seasonal_factor(season_name, eq.category)
        demand_factor, demand_level, demand_reason = calculate_local_demand_factor(
            eq, start_date or datetime.now(), end_date or datetime.now()
        )

        hourly_rate = float(eq.rental_price_per_hour)
        daily_rate = round(hourly_rate * 8.0, 2)

        # Equipment serialization details
        data = EquipmentSerializer(eq).data
        data['distance_km'] = dist
        data['is_slot_conflicted'] = is_slot_conflicted
        data['effective_available'] = effective_available
        data['rental_price_per_day'] = daily_rate
        data['operator_available'] = (online_operators_count > 0)
        data['operator_charge_per_hour'] = 150.0
        data['operator_charge_per_day'] = 1200.0
        data['delivery_charge_estimate'] = round(max(200.0, dist * 20.0), 2)  # ₹20/km transport
        data['pricing_factors'] = {
            'season_name': season_name,
            'seasonal_factor': seasonal_factor,
            'seasonal_reason': seasonal_reason,
            'demand_level': demand_level,
            'demand_factor': demand_factor,
            'demand_reason': demand_reason
        }

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
def calculate_price_quote_view(request):
    """
    Computes an itemized authoritative pricing quote for an equipment rental request:
    - Base rate * duration
    - Demand factor & seasonal factor with explanations
    - Operator charges
    - Distance-based transport charges
    - Multi-day / volume discounts
    - Applicable taxes (5% GST)
    - Returns quote_id and quote_expires_at (15-min lock)
    """
    equipment_id = request.data.get('equipment_id') or request.data.get('equipment')
    if not equipment_id:
        return Response({"error": "equipment_id is required."}, status=status.HTTP_400_BAD_REQUEST)

    farmer_lat = float(request.data.get('farmer_lat', 18.5204))
    farmer_lng = float(request.data.get('farmer_lng', 73.8567))
    start_date_str = request.data.get('start_date')
    end_date_str = request.data.get('end_date')
    rental_type = request.data.get('rental_type', 'hourly')
    duration = float(request.data.get('duration', 4.0))
    acreage = float(request.data.get('acreage', 2.0))
    farming_operation = request.data.get('farming_operation', 'Land Preparation')
    requires_operator = bool(request.data.get('requires_operator', False))
    delivery_option = request.data.get('delivery_option', 'Pickup')
    insurance_opt_in = bool(request.data.get('insurance_opt_in', False))
    micro_rental_shared = bool(request.data.get('micro_rental_shared', False))

    try:
        quote = generate_equipment_quote(
            equipment_id=equipment_id,
            farmer_lat=farmer_lat,
            farmer_lng=farmer_lng,
            start_date_str=start_date_str,
            end_date_str=end_date_str,
            rental_type=rental_type,
            duration=duration,
            acreage=acreage,
            farming_operation=farming_operation,
            requires_operator=requires_operator,
            delivery_option=delivery_option,
            insurance_opt_in=insurance_opt_in,
            micro_rental_shared=micro_rental_shared
        )
        return Response(quote, status=status.HTTP_200_OK)
    except Equipment.DoesNotExist:
        return Response({"error": f"Equipment #{equipment_id} not found."}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({"error": f"Failed to compute price quote: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def validate_cart_booking_view(request):
    """
    Validates an agricultural equipment booking item or entire cart using the Dynamic Pricing Engine:
    - Calculates server-side verified rental cost breakdown per item
    - Detects time slot conflicts with active bookings
    - Computes demand factor, seasonal factor, operator wages, transport fees, taxes
    - Returns comprehensive itemized breakdown and cart total
    """
    items = request.data.get('items', [])
    if not items and request.data.get('equipment_id'):
        items = [request.data]

    if not items:
        return Response({"error": "No booking items provided to validate."}, status=status.HTTP_400_BAD_REQUEST)

    validated_items = []
    total_cart_amount = 0.0
    has_conflicts = False

    farmer_lat = float(request.data.get('farmer_lat', 18.5204))
    farmer_lng = float(request.data.get('farmer_lng', 73.8567))

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
        micro_rental_shared = bool(item.get('micro_rental_shared', False))

        try:
            quote = generate_equipment_quote(
                equipment_id=eq_id,
                farmer_lat=farmer_lat,
                farmer_lng=farmer_lng,
                start_date_str=start_date_str,
                end_date_str=end_date_str,
                rental_type=rental_type,
                duration=duration_val,
                acreage=acreage,
                farming_operation=farming_operation,
                requires_operator=requires_operator,
                delivery_option=delivery_option,
                insurance_opt_in=insurance_opt_in,
                micro_rental_shared=micro_rental_shared
            )
        except Equipment.DoesNotExist:
            return Response({"error": f"Equipment #{eq_id} not found."}, status=status.HTTP_404_NOT_FOUND)

        if quote.get('has_conflict'):
            has_conflicts = True

        bd = quote['pricing_breakdown']
        total_cart_amount += bd['estimated_total']

        validated_items.append({
            "quote_id": quote['quote_id'],
            "quote_expires_at": quote['quote_expires_at'],
            "equipment_id": quote['equipment_id'],
            "equipment_title": quote['equipment_title'],
            "equipment_category": quote['equipment_category'],
            "equipment_image": quote['equipment_image'],
            "owner_id": quote['owner_id'],
            "owner_name": quote['owner_name'],
            "distance_km": quote['distance_km'],
            "farming_operation": farming_operation,
            "acreage": acreage,
            "start_date": quote['start_date'],
            "end_date": quote['end_date'],
            "rental_type": rental_type,
            "duration": quote['duration'],
            "hourly_rate": bd['unit_base_rate'] if rental_type == 'hourly' else round(bd['unit_base_rate'] / 8.0, 2),
            "daily_rate": bd['unit_base_rate'] if rental_type == 'daily' else round(bd['unit_base_rate'] * 8.0, 2),
            "rental_base_amount": bd['raw_base_rental'],
            "season_name": bd['season_name'],
            "seasonal_factor": bd['seasonal_factor'],
            "seasonal_reason": bd['seasonal_reason'],
            "demand_level": bd['demand_level'],
            "demand_factor": bd['demand_factor'],
            "demand_reason": bd['demand_reason'],
            "adjusted_rental": bd['adjusted_rental'],
            "demand_adjustment": bd['demand_adjustment'],
            "requires_operator": requires_operator,
            "operator_charges": bd['operator_charges'],
            "operator_explanation": bd['operator_explanation'],
            "delivery_option": delivery_option,
            "transport_charges": bd['transport_charges'],
            "transport_explanation": bd['transport_explanation'],
            "insurance_opt_in": insurance_opt_in,
            "insurance_charges": bd['insurance_charges'],
            "duration_discount_amount": bd['duration_discount_amount'],
            "duration_discount_reason": bd['duration_discount_reason'],
            "micro_rental_shared": micro_rental_shared,
            "shared_coop_discount": bd['shared_coop_discount'],
            "total_discounts": bd['total_discounts'],
            "gst_tax": bd['taxes_amount'],
            "item_total": bd['estimated_total'],
            "is_available": quote['is_available'],
            "has_conflict": quote['has_conflict'],
            "conflict_warning": quote['conflict_message']
        })

    return Response({
        "valid": not has_conflicts,
        "items": validated_items,
        "total_cart_amount": round(total_cart_amount, 2),
        "currency": "INR",
        "has_conflicts": has_conflicts
    })
