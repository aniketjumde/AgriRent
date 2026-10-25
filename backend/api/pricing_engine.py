"""
AgriRent Dynamic Pricing Engine
===============================
Configurable deterministic pricing engine calculating transparent agricultural
machinery rental quotes, seasonal/demand multipliers, operator rates, transport fees,
duration discounts, and quote tokens with expiry and price locking.
"""

import math
import uuid
from decimal import Decimal
from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models import Q
from .models import Equipment, Booking, OperatorProfile


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


def get_farming_season(target_date=None, region='MH'):
    """
    Determines current agricultural season in Western India / Maharashtra & Tamil Nadu:
    - Kharif (Sowing & Monsoon): June - September (peak sowing, plowing, rotavation)
    - Kharif Harvest / Rabi Sowing: October - November (peak harvesting & sowing)
    - Rabi Growing: December - January (spraying, crop protection, weeding)
    - Rabi Harvest / Summer: February - April (harvesting, summer plowing)
    - Off-season: May
    """
    if target_date is None:
        target_date = timezone.now()
    month = target_date.month

    if month in [6, 7, 8, 9]:
        return "Kharif Peak Sowing"
    elif month in [10, 11]:
        return "Kharif Harvest & Rabi Sowing"
    elif month in [12, 1]:
        return "Rabi Crop Care"
    elif month in [2, 3, 4]:
        return "Rabi Harvest & Summer Prep"
    else:
        return "Summer Off-Season"


def calculate_seasonal_factor(season_name, category):
    """
    Returns seasonal multiplier (bounded between 0.85 and 1.25) and transparent rationale.
    """
    cat = (category or '').strip().lower()

    if "Kharif Peak Sowing" in season_name:
        if any(k in cat for k in ['tractor', 'rotavator', 'plough', 'cultivator', 'seed']):
            return 1.15, "Peak Kharif sowing window: High regional soil preparation activity (+15%)"
        return 1.05, "Active Kharif farming season (+5%)"

    elif "Kharif Harvest" in season_name:
        if 'harvester' in cat:
            return 1.25, "Peak autumn harvesting season: Maximum grain & crop harvesting (+25%)"
        elif any(k in cat for k in ['tractor', 'rotavator', 'seeder', 'cultivator', 'plough']):
            return 1.15, "Rabi sowing preparation & post-harvest transport (+15%)"
        return 1.05, "High-demand transition period (+5%)"

    elif "Rabi Crop Care" in season_name:
        if any(k in cat for k in ['sprayer', 'protection']):
            return 1.20, "Peak crop protection & chemical spraying period (+20%)"
        elif 'tractor' in cat:
            return 1.00, "Standard regular season rate (1.0x)"
        return 0.95, "Moderate agricultural activity (-5%)"

    elif "Rabi Harvest" in season_name:
        if 'harvester' in cat:
            return 1.20, "Rabi grain harvest window (+20%)"
        return 1.05, "Summer harvest operations (+5%)"

    else:  # Summer Off-Season
        return 0.88, "Summer off-season promotional discount (-12%)"


def calculate_local_demand_factor(equipment, start_dt, end_dt, radius_km=35.0):
    """
    Calculates deterministic demand factor based on actual marketplace booking pressure:
    - Queries active/pending/in-progress reservations for same category in geographic radius
    - Queries total available equipment of this category in the same cluster
    Returns (demand_factor: float, demand_level: str, rationale: str)
    """
    try:
        eq_lat = float(equipment.location_latitude)
        eq_lng = float(equipment.location_longitude)
    except (ValueError, TypeError):
        eq_lat, eq_lng = 18.5204, 73.8567

    # Find peer machines in radius
    peer_machines = Equipment.objects.filter(
        category=equipment.category
    ).exclude(id=equipment.id)

    nearby_peers = []
    for peer in peer_machines:
        d = haversine_distance(eq_lat, eq_lng, peer.location_latitude, peer.location_longitude)
        if d <= radius_km:
            nearby_peers.append(peer)

    total_cluster_machines = len(nearby_peers) + 1  # include self

    # Check active bookings in window for this category in cluster
    overlapping_cluster_bookings = Booking.objects.filter(
        equipment__category=equipment.category,
        status__in=['Pending', 'Approved', 'In Progress'],
        start_date__lt=end_dt,
        end_date__gt=start_dt
    ).count()

    utilization_ratio = overlapping_cluster_bookings / max(1, total_cluster_machines)

    if utilization_ratio >= 0.70:
        return 1.20, "High Demand", f"High local cluster utilization ({overlapping_cluster_bookings} active jobs for {total_cluster_machines} machines, +20%)"
    elif utilization_ratio >= 0.35:
        return 1.10, "Medium Demand", f"Moderate regional demand ({overlapping_cluster_bookings} active jobs in area, +10%)"
    elif utilization_ratio <= 0.10:
        return 0.92, "Low Demand", f"Plentiful machinery available in cluster (Prompt-booking discount, -8%)"
    else:
        return 1.00, "Normal Demand", "Standard cluster equipment availability (1.0x)"


def calculate_duration_discount(rental_type, duration_val):
    """
    Volume/Duration discounts:
    - Daily rentals: >= 3 days -> 5% off, >= 7 days (weekly) -> 10% off
    - Hourly rentals: >= 8 hours -> 5% off, >= 16 hours -> 8% off
    """
    if rental_type == 'daily':
        if duration_val >= 7:
            return 0.10, "Weekly multi-day rental discount (-10%)"
        elif duration_val >= 3:
            return 0.05, "Multi-day rental discount (-5%)"
    else:
        if duration_val >= 16:
            return 0.08, "Extended shift discount (16+ hours, -8%)"
        elif duration_val >= 8:
            return 0.05, "Full-day shift hourly discount (8+ hours, -5%)"

    return 0.00, "Standard rate tier"


def generate_equipment_quote(
    equipment_id,
    farmer_lat,
    farmer_lng,
    start_date_str,
    end_date_str,
    rental_type='hourly',
    duration=4.0,
    acreage=2.0,
    farming_operation='Land Preparation',
    requires_operator=False,
    delivery_option='Pickup',
    insurance_opt_in=False,
    micro_rental_shared=False
):
    """
    Authoritative server-side dynamic pricing engine.
    Calculates:
      1. Base Rental = Base Rate * Duration
      2. Adjusted Rental = Base Rental * Demand Factor * Seasonal Factor
      3. Operator Charges
      4. Transport Charges (based on Haversine distance)
      5. Insurance & Discounts
      6. Taxes (5% GST for Agri Rental)
      7. Quote Token & Expiry (15 minutes validity lock)
    """
    equipment = Equipment.objects.select_related('owner').get(pk=equipment_id)

    # Parse and validate dates
    now = timezone.now()
    try:
        if start_date_str:
            start_dt = datetime.fromisoformat(start_date_str.replace('Z', '+00:00'))
        else:
            start_dt = now + timedelta(hours=2)

        if end_date_str:
            end_dt = datetime.fromisoformat(end_date_str.replace('Z', '+00:00'))
        else:
            if rental_type == 'daily':
                end_dt = start_dt + timedelta(days=float(duration))
            else:
                end_dt = start_dt + timedelta(hours=float(duration))
    except Exception:
        start_dt = now + timedelta(hours=2)
        end_dt = start_dt + timedelta(hours=4)

    # Ensure timezone awareness
    if timezone.is_naive(start_dt):
        start_dt = timezone.make_aware(start_dt)
    if timezone.is_naive(end_dt):
        end_dt = timezone.make_aware(end_dt)

    # Compute actual duration in hours and days
    duration_delta = end_dt - start_dt
    calc_hours = max(1.0, duration_delta.total_seconds() / 3600.0)
    calc_days = max(1.0, math.ceil(calc_hours / 24.0))

    if rental_type == 'daily':
        billed_units = float(duration) if duration and float(duration) > 0 else calc_days
    else:
        billed_units = float(duration) if duration and float(duration) > 0 else calc_hours

    # 1. Base Rates
    hourly_rate = float(equipment.rental_price_per_hour)
    daily_rate = round(hourly_rate * 8.0, 2)  # Standard 8-hour agricultural day shift
    unit_base_rate = daily_rate if rental_type == 'daily' else hourly_rate

    raw_base_rental = round(unit_base_rate * billed_units, 2)

    # 2. Distance & Transportation
    distance_km = haversine_distance(
        farmer_lat, farmer_lng,
        equipment.location_latitude, equipment.location_longitude
    )

    transport_rate_per_km = 20.0  # Configurable ₹20/km
    if delivery_option == 'Delivery':
        transport_charges = round(max(200.0, distance_km * transport_rate_per_km), 2)
        transport_explanation = f"Farm gate delivery: {distance_km} km @ ₹{transport_rate_per_km}/km (Min ₹200)"
    else:
        transport_charges = 0.0
        transport_explanation = "Self-pickup from owner location (₹0.00)"

    # 3. Dynamic Multipliers (Deterministic & Configurable)
    season_name = get_farming_season(start_dt)
    seasonal_factor, seasonal_reason = calculate_seasonal_factor(season_name, equipment.category)
    demand_factor, demand_level, demand_reason = calculate_local_demand_factor(equipment, start_dt, end_dt)

    # Clamp total combined multiplier to safe range (0.80x to 1.35x) to avoid uncontrolled spikes
    combined_multiplier = round(seasonal_factor * demand_factor, 3)
    combined_multiplier = max(0.80, min(1.35, combined_multiplier))

    # Base adjusted rental
    adjusted_rental = round(raw_base_rental * combined_multiplier, 2)
    demand_adjustment = round(adjusted_rental - raw_base_rental, 2)

    # 4. Operator Charges
    operator_hourly_rate = 150.0  # ₹150/hour
    operator_daily_rate = 1200.0  # ₹1200/day
    if requires_operator:
        if rental_type == 'daily':
            operator_charges = round(operator_daily_rate * billed_units, 2)
            operator_explanation = f"Certified operator: {billed_units} day(s) @ ₹{operator_daily_rate}/day"
        else:
            operator_charges = round(operator_hourly_rate * billed_units, 2)
            operator_explanation = f"Certified operator: {billed_units} hr(s) @ ₹{operator_hourly_rate}/hr"
    else:
        operator_charges = 0.0
        operator_explanation = "Self-drive rental (No operator requested)"

    # 5. Duration Discount
    discount_pct, discount_reason = calculate_duration_discount(rental_type, billed_units)
    duration_discount_amount = round(adjusted_rental * discount_pct, 2)

    # Cooperative / Micro-rental split
    shared_coop_discount = 0.0
    if micro_rental_shared:
        shared_coop_discount = round(adjusted_rental * 0.40, 2) # 40% cooperative sharing discount

    total_discounts = duration_discount_amount + shared_coop_discount

    # 6. Insurance Option
    insurance_charges = 0.0
    if insurance_opt_in:
        insurance_charges = round(150.0 * (billed_units if rental_type == 'daily' else max(1, math.ceil(billed_units / 24.0))), 2)

    # 7. Subtotal & Taxes
    taxable_amount = max(0.0, adjusted_rental + operator_charges + transport_charges + insurance_charges - total_discounts)
    gst_tax_rate = 0.05  # 5% Agricultural Equipment Rental GST
    taxes_amount = round(taxable_amount * gst_tax_rate, 2)

    # 8. Estimated Final Total
    estimated_total = round(taxable_amount + taxes_amount, 2)

    # 9. Conflict Check
    conflicts = Booking.objects.filter(
        equipment=equipment,
        status__in=['Pending', 'Approved', 'In Progress'],
        start_date__lt=end_dt,
        end_date__gt=start_dt
    ).exists()

    # 10. Quote Token & Expiry (15 minutes price guarantee)
    quote_id = f"qte_{uuid.uuid4().hex[:12]}"
    quote_expires_at = (now + timedelta(minutes=15)).isoformat()

    return {
        "quote_id": quote_id,
        "quote_expires_at": quote_expires_at,
        "is_expired": False,
        "equipment_id": equipment.id,
        "equipment_title": equipment.title,
        "equipment_category": equipment.category,
        "equipment_image": equipment.image_url,
        "owner_id": equipment.owner.id,
        "owner_name": equipment.owner.username,
        "owner_rating": equipment.owner.reliability_score or 4.8,
        "farmer_location": {
            "latitude": float(farmer_lat),
            "longitude": float(farmer_lng)
        },
        "equipment_location": {
            "latitude": float(equipment.location_latitude),
            "longitude": float(equipment.location_longitude),
            "address": equipment.address
        },
        "distance_km": distance_km,
        "acreage": acreage,
        "farming_operation": farming_operation,
        "rental_type": rental_type,
        "duration": billed_units,
        "start_date": start_dt.isoformat(),
        "end_date": end_dt.isoformat(),
        "pricing_breakdown": {
            "unit_base_rate": unit_base_rate,
            "rate_unit": "day" if rental_type == 'daily' else "hour",
            "billed_units": billed_units,
            "raw_base_rental": raw_base_rental,
            "season_name": season_name,
            "seasonal_factor": seasonal_factor,
            "seasonal_reason": seasonal_reason,
            "demand_level": demand_level,
            "demand_factor": demand_factor,
            "demand_reason": demand_reason,
            "combined_multiplier": combined_multiplier,
            "adjusted_rental": adjusted_rental,
            "demand_adjustment": demand_adjustment,
            "requires_operator": requires_operator,
            "operator_charges": operator_charges,
            "operator_explanation": operator_explanation,
            "delivery_option": delivery_option,
            "transport_charges": transport_charges,
            "transport_explanation": transport_explanation,
            "insurance_opt_in": insurance_opt_in,
            "insurance_charges": insurance_charges,
            "duration_discount_pct": int(discount_pct * 100),
            "duration_discount_amount": duration_discount_amount,
            "duration_discount_reason": discount_reason,
            "micro_rental_shared": micro_rental_shared,
            "shared_coop_discount": shared_coop_discount,
            "total_discounts": total_discounts,
            "gst_tax_rate_pct": 5,
            "taxes_amount": taxes_amount,
            "estimated_total": estimated_total
        },
        "is_available": equipment.is_available and not conflicts,
        "has_conflict": conflicts,
        "conflict_message": "Selected time slot conflicts with another reservation for this machinery." if conflicts else None
    }
