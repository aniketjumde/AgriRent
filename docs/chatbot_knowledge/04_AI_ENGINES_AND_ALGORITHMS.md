# 04. AI Engines, Predictive Models, and Proximity Dispatch

AgriRent incorporates four specialized AI and heuristics engines to streamline agricultural equipment allocation:

---

## 1. AI Equipment Suitability & Match Engine (`backend/ai/equipment_matcher.py`)

The Match Engine (`POST /api/ai/match/`) analyzes farmer field requirements and returns explainable recommendations combining equipment and certified operators.

### Multi-Factor Scoring Formula (Total: 100 Points)

$$Score = S_{crop} + S_{task} + S_{dist} + S_{op} + S_{rel} + S_{cost}$$

1. **Crop Suitability Match ($S_{crop}$, 25 Pts)**:
   - Validates if the machinery model matches crop requirements (e.g. Paddy vs Sugarcane vs Wheat).
2. **Task Alignment ($S_{task}$, 20 Pts)**:
   - Matches field operation phase: Tilling, Sowing, Spraying, or Harvesting.
3. **Proximity & Distance ($S_{dist}$, 20 Pts)**:
   - Computes Haversine distance between equipment origin and farm field coordinates.
   - Machinery within 10 km earns maximum points; machines beyond service radius receive penalties.
4. **Operator Proximity & Certification ($S_{op}$, 15 Pts)**:
   - Matches nearby verified drivers who possess certification for the specific machinery category.
5. **Reliability & Review Score ($S_{rel}$, 10 Pts)**:
   - Historical completion rate, equipment maintenance index, and farmer ratings (up to 5.0).
6. **Cost Optimization ($S_{cost}$, 10 Pts)**:
   - Compares listing rate against regional dynamic pricing medians.

---

## 2. Dynamic Rental Price Predictor (`backend/ai/price_predictor.py`)

Provides authoritative price guidance based on seasonal crop cycles and village demand indices.

### Base Hourly Rates (INR)
- **Tractor (45-55 HP)**: ₹600.00 / hour
- **Combine Harvester**: ₹2,000.00 / hour
- **Rotavator (6-7 ft)**: ₹1,000.00 / hour
- **Precision Seed Drill**: ₹800.00 / hour
- **Boom Sprayer / Mist Blower**: ₹400.00 / hour
- **Heavy Machinery**: ₹1,200.00 / hour

### Multipliers
- **Seasonal Demand**:
  - `Harvesting`: $1.25\times$
  - `Sowing`: $1.15\times$
  - `Off-season`: $0.85\times$
- **Market Demand Curve**:
  - `High`: $1.25\times$
  - `Medium`: $1.00\times$
  - `Low`: $0.85\times$

### Output Format
- **Minimum Price**: $0.85 \times \text{Recommended}$
- **Recommended Price**: $\text{Base} \times \text{SeasonMultiplier} \times \text{DemandMultiplier}$
- **Maximum Price**: $1.20 \times \text{Recommended}$

---

## 3. Automated Operator Proximity Dispatch (`backend/ai/job_matcher.py`)

When an owner approves a booking with `requires_operator = True`, the dispatch engine queries available certified drivers:
- **Filtering**: `verification_status == 'Verified'`, `is_online == True`, `is_available == True`, and no active overlapping assignments.
- **Scoring**:
  - Machinery match: 30 pts.
  - Proximity to pickup location: up to 35 pts (evaluated via Haversine great-circle formula).
  - Experience and reliability score: 20 pts.
  - Workload readiness: 15 pts.
- **Dispatch**: The top-ranked driver receives an immediate notification with guaranteed wage compensation. If declined, the engine automatically reroutes the offer to the second best candidate.

---

## 4. Multilingual Voice Assistant & NLP Parser (`backend/ai/voice_parser.py`)

Enables speech-based booking in rural dialect patterns across **Tamil**, **Hindi**, and **English**.

### Intent Extraction Capabilities:
- **Equipment Identification**: Detects terms like *tractor*, *harvester*, *rotavator*, *டிராக்டர்*, *அறுவடை*, *ट्रैक्टर*, *हल*.
- **Temporal Parsing**: Extracts keywords like *today*, *tomorrow*, *next week*, *naalaiku* (நாளைக்கு), *inniku* (இன்னிக்கு), *kal* (कल), *parso* (परसों).
- **Acreage & Numeric Parsing**: Identifies land size (e.g. "5 acres", "10 ஏக்கர்", "3 एकड़").
- **Location Extraction**: Extracts village/district names (e.g. Pune, Baramati, Coimbatore, Salem, Erode).
