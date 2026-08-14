import os
import numpy as np

# Training dataset of historical recommendations
HISTORICAL_DATA = [
    # (Crop, LandSize, Task) -> (RecommendedCategory, Confidence, BaseHoursPerAcre, BasePricePerHour)
    ("Paddy", 5.0, "Harvesting", "Harvester", 0.95, 1.5, 2000),
    ("Paddy", 2.0, "Tilling", "Rotavator", 0.90, 1.2, 1000),
    ("Paddy", 10.0, "Tilling", "Tractor", 0.88, 1.0, 700),
    ("Wheat", 4.0, "Sowing", "Seeder", 0.92, 1.0, 800),
    ("Wheat", 1.5, "Spraying", "Sprayer", 0.85, 0.5, 400),
    ("Cotton", 8.0, "Harvesting", "Harvester", 0.89, 2.0, 2200),
    ("Cotton", 3.0, "Tilling", "Rotavator", 0.91, 1.5, 900),
    ("Sugarcane", 12.0, "Harvesting", "Other Agricultural Machinery", 0.87, 3.0, 2500),
    ("Sugarcane", 5.0, "Sowing", "Seeder", 0.86, 1.8, 850),
    ("Maize", 6.0, "Harvesting", "Harvester", 0.93, 1.8, 1800),
    ("Maize", 2.0, "Spraying", "Crop Protection Equipment", 0.88, 0.6, 500),
    ("Vegetables", 1.0, "Tilling", "Rotavator", 0.94, 1.0, 950),
    ("Vegetables", 0.5, "Spraying", "Sprayer", 0.90, 0.8, 350),
]


def train_and_recommend(crop_type, land_size, task_type):
    """
    Recommendation model using K-Nearest Neighbors logic.
    If scikit-learn is available, uses KNN classifier for category and regressor for duration/cost.
    Otherwise, uses custom python similarity metric matching.
    """
    try:
        from sklearn.neighbors import KNeighborsClassifier, KNeighborsRegressor
        from sklearn.preprocessing import OneHotEncoder
        
        # Prepare training data
        crops = [d[0] for d in HISTORICAL_DATA]
        sizes = [d[1] for d in HISTORICAL_DATA]
        tasks = [d[2] for d in HISTORICAL_DATA]
        categories = [d[3] for d in HISTORICAL_DATA]
        confidences = [d[4] for d in HISTORICAL_DATA]
        hours = [d[5] for d in HISTORICAL_DATA]
        prices = [d[6] for d in HISTORICAL_DATA]

        # Encode categorical variables
        enc = OneHotEncoder(sparse_output=False, handle_unknown='ignore')
        cat_features = np.array(list(zip(crops, tasks)))
        enc.fit(cat_features)
        X_cat = enc.transform(cat_features)
        
        # Combine land size and encoded categorical features
        X = np.hstack((np.array(sizes).reshape(-1, 1), X_cat))
        
        # Fit KNN model
        knn_cat = KNeighborsClassifier(n_neighbors=2)
        knn_cat.fit(X, categories)
        
        knn_conf = KNeighborsRegressor(n_neighbors=2)
        knn_conf.fit(X, confidences)
        
        knn_hours = KNeighborsRegressor(n_neighbors=2)
        knn_hours.fit(X, hours)
        
        knn_price = KNeighborsRegressor(n_neighbors=2)
        knn_price.fit(X, prices)
        
        # Transform inputs for prediction
        input_cat = np.array([[crop_type, task_type]])
        input_cat_encoded = enc.transform(input_cat)
        input_X = np.hstack((np.array([[float(land_size)]]), input_cat_encoded))
        
        pred_category = knn_cat.predict(input_X)[0]
        pred_confidence = float(knn_conf.predict(input_X)[0])
        pred_hours = float(knn_hours.predict(input_X)[0])
        pred_price = float(knn_price.predict(input_X)[0])
        
        total_hours = max(1.0, pred_hours * float(land_size))
        estimated_cost = round(total_hours * pred_price)
        
        return {
            "recommended_category": pred_category,
            "confidence_score": min(0.99, round(pred_confidence, 2)),
            "estimated_hours": round(total_hours, 1),
            "estimated_rental_cost": estimated_cost
        }
        
    except Exception as e:
        # Robust pure-Python fallback (Heuristic Similarity Engine)
        best_match = None
        min_distance = float('inf')
        
        # Match using features: task_type, crop_type, and land_size
        for h_crop, h_size, h_task, h_cat, h_conf, h_hours, h_price in HISTORICAL_DATA:
            task_diff = 0 if h_task.lower() == task_type.lower() else 2
            crop_diff = 0 if h_crop.lower() == crop_type.lower() else 1
            size_diff = abs(h_size - float(land_size)) / 5.0
            
            distance = task_diff + crop_diff + size_diff
            if distance < min_distance:
                min_distance = distance
                best_match = (h_cat, h_conf, h_hours, h_price)
                
        if not best_match:
            # Absolute default fallback
            best_match = ("Tractor", 0.75, 1.5, 600)
            
        category, confidence, base_hours, price = best_match
        
        # Adjust confidence slightly based on similarity
        final_conf = max(0.6, confidence - (min_distance * 0.05))
        total_hours = max(1.0, base_hours * float(land_size))
        estimated_cost = round(total_hours * price)
        
        return {
            "recommended_category": category,
            "confidence_score": min(0.99, round(final_conf, 2)),
            "estimated_hours": round(total_hours, 1),
            "estimated_rental_cost": estimated_cost
        }
