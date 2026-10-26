from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from ai.equipment_matcher import find_and_rank_equipment_and_operators

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def ai_match_equipment_and_operator_view(request):
    """
    Step 6: AI-Powered Equipment and Operator Matching Endpoint.
    Validates farmer requirements:
      - Farming operation (Ploughing, Sowing, Spraying, Harvesting, Tilling, etc.)
      - Farm location (latitude, longitude)
      - Requested schedule (start_date, end_date, duration_hours)
      - Crop type and land size
      - Operator requirement and budget constraints
    Performs hard eligibility filters, verifies actual availability,
    scores candidates with an explainable algorithm, and returns ranked recommendations.
    """
    data = request.data
    farming_operation = data.get('farming_operation', 'Land Preparation')
    crop_type = data.get('crop_type')
    land_size = float(data.get('land_size', data.get('land_size_acres', 2.0)))
    duration_hours = float(data.get('duration_hours', data.get('duration', 4.0)))
    requires_operator = bool(data.get('requires_operator', True))
    preferred_category = data.get('preferred_category') or data.get('category')
    max_budget = float(data.get('max_budget')) if data.get('max_budget') else None
    max_radius_km = float(data.get('max_radius_km', 100.0))

    try:
        farmer_lat = float(data.get('farmer_lat', data.get('latitude', 18.5204)))
        farmer_lng = float(data.get('farmer_lng', data.get('longitude', 73.8567)))
    except (ValueError, TypeError):
        farmer_lat, farmer_lng = 18.5204, 73.8567

    start_date_str = data.get('start_date')
    end_date_str = data.get('end_date')

    # Execute modular AI matching service
    result = find_and_rank_equipment_and_operators(
        farming_operation=farming_operation,
        farmer_lat=farmer_lat,
        farmer_lng=farmer_lng,
        start_date_str=start_date_str,
        end_date_str=end_date_str,
        crop_type=crop_type,
        land_size_acres=land_size,
        duration_hours=duration_hours,
        preferred_category=preferred_category,
        requires_operator=requires_operator,
        max_budget=max_budget,
        max_radius_km=max_radius_km
    )

    return Response(result, status=status.HTTP_200_OK)
