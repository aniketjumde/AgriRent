import math
from datetime import datetime
from django.utils import timezone
from api.models import OperatorProfile, OperatorJobAssignment

def haversine_distance(lat1, lon1, lat2, lon2):
    """
    Calculate the great circle distance in kilometers between two points 
    on the earth (specified in decimal degrees).
    """
    try:
        lat1, lon1, lat2, lon2 = float(lat1), float(lon1), float(lat2), float(lon2)
    except (ValueError, TypeError):
        return 9999.0

    R = 6371.0 # Earth's radius in kilometers
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2))
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


def rank_matching_operators_for_booking(booking, max_results=5):
    """
    Rank available verified operators for a specific booking using a weighted scoring model.
    Weights:
      - Machinery match (Required / High priority): 30 pts
      - Distance to pickup location (Proximity): 35 pts
      - Experience & Rating: 20 pts
      - Current Workload / Availability: 15 pts
    """
    equipment = booking.equipment
    pickup_lat = float(equipment.location_latitude)
    pickup_lng = float(equipment.location_longitude)
    machinery_type = equipment.category

    # Eligible operators: verified, active, available AND online
    candidates = OperatorProfile.objects.select_related('user').filter(
        verification_status='Verified',
        is_available=True,
        is_online=True,
        user__is_active=True
    )

    scored_operators = []

    for op in candidates:
        # Check active overlapping assignments
        overlapping = OperatorJobAssignment.objects.filter(
            operator=op,
            status__in=['ACCEPTED', 'TRAVELLING_TO_PICKUP', 'ARRIVED_AT_PICKUP', 
                        'MACHINE_COLLECTED', 'TRAVELLING_TO_FARM', 'ARRIVED_AT_FARM', 'IN_PROGRESS']
        ).exclude(booking=booking).exists()

        if overlapping:
            # Operator is actively busy on another field job
            continue

        # 1. Machinery Match
        supported = op.supported_machinery or []
        if machinery_type in supported:
            machinery_score = 30.0
        elif len(supported) == 0:
            machinery_score = 15.0
        else:
            machinery_score = 0.0

        # 2. Distance to pickup location
        dist_km = haversine_distance(op.current_latitude, op.current_longitude, pickup_lat, pickup_lng)
        if dist_km > op.service_radius_km * 1.5:
            # Exceeds operational radius significantly
            continue

        # Closer gets higher score, up to 35 pts
        dist_score = max(0.0, 35.0 - (dist_km * 0.7))

        # 3. Experience & Reliability Score
        exp_score = min(10.0, float(op.experience_years) * 1.5)
        rel_score = float(getattr(op, 'reliability_score', 4.8) or 4.8) * 2.0 # out of 10
        quality_score = exp_score + rel_score

        # 4. Workload bonus (available now gets full 15 pts)
        workload_score = 15.0

        total_score = round(machinery_score + dist_score + quality_score + workload_score, 1)

        scored_operators.append({
            'operator': op,
            'distance_km': round(dist_km, 1),
            'estimated_travel_minutes': max(5, int(dist_km * 3)), # approx 20 km/h rural speed
            'score': total_score,
            'machinery_match': (machinery_type in supported)
        })

    # Sort descending by score
    scored_operators.sort(key=lambda x: x['score'], reverse=True)
    return scored_operators[:max_results]
