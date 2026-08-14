import numpy as np

# Base hourly rates for equipment categories
BASE_RATES = {
    "Tractor": 600,
    "Harvester": 2000,
    "Rotavator": 1000,
    "Seeder": 800,
    "Sprayer": 400,
    "Crop Protection Equipment": 450,
    "Other Agricultural Machinery": 1200
}


def predict_price(equipment_type, demand, season, latitude=11.0168, longitude=76.9558):
    """
    Predict optimal rental prices using a combination of base rates,
    demand modifiers, seasonal factors, and geospatial adjustments.
    
    Returns:
        dict: {
            "min_price": int,
            "recommended_price": int,
            "max_price": int
        }
    """
    # Fetch base rate
    base_price = BASE_RATES.get(equipment_type, 700)
    
    # Demand multiplier
    demand_multipliers = {
        "Low": 0.85,
        "Medium": 1.0,
        "High": 1.25
    }
    demand_mult = demand_multipliers.get(demand, 1.0)
    
    # Seasonal multipliers
    season_mult = 1.0
    if season == "Sowing":
        if equipment_type in ["Seeder", "Rotavator"]:
            season_mult = 1.25
        elif equipment_type in ["Tractor"]:
            season_mult = 1.10
        else:
            season_mult = 0.95
    elif season == "Harvesting":
        if equipment_type == "Harvester":
            season_mult = 1.40
        elif equipment_type in ["Tractor"]:
            season_mult = 1.15
        else:
            season_mult = 0.90
    elif season == "Off-season":
        season_mult = 0.80
        
    # Geospatial modifier (mock distance to high demand centers)
    # Coimbatore (11.0168, 76.9558) acts as high demand center.
    # The closer, the slightly higher the demand/price.
    coimbatore_lat, coimbatore_lon = 11.0168, 76.9558
    distance = np.sqrt((float(latitude) - coimbatore_lat)**2 + (float(longitude) - coimbatore_lon)**2)
    geo_mult = max(0.9, 1.15 - (distance * 0.05)) # max 15% increase near Coimbatore, min 10% decrease far away
    
    # Calculate recommended price
    recommended = base_price * demand_mult * season_mult * geo_mult
    
    # Dynamic price ranges
    min_price = recommended * 0.85
    max_price = recommended * 1.20
    
    # Apply rounding
    return {
        "min_price": int(round(min_price / 10.0) * 10),
        "recommended_price": int(round(recommended / 10.0) * 10),
        "max_price": int(round(max_price / 10.0) * 10)
    }
