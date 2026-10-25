# AgriRent Demo Accounts & Pune Cluster Architecture Guide

**Environment**: Production & Local  
**Region**: Pune, Maharashtra, India  
**Authentication Standard**: Supabase Auth (`auth.users`) + Django REST Framework (`api_user`)  
**Shared Demo Password**: `Demo@AgriRent2026`  

---

## 1. 15 Identifiable Demo Accounts (Grouped by Role)

All 15 accounts have been seeded into both **Supabase PostgreSQL (`api_user`, `auth.users`, `api_operatorprofile`, `api_equipment`)** and the **Client-Side Mock/Offline State Engine**.

### A. Five Farmer Accounts (Pune Agricultural Landholders)

| # | Username | Email | Phone Number | Farm Location (Pune) | Land Size & Crop Specialization | Password |
|---|---|---|---|---|---|---|
| 1 | `farmer_suresh` | `farmer.suresh@agrirent.demo` | `+919822011001` | Maan, Hinjawadi (`18.5912, 73.7389`) | 14.5 Acres (Sugarcane / Paddy) | `Demo@AgriRent2026` |
| 2 | `farmer_anita` | `farmer.anita@agrirent.demo` | `+919822011002` | Kaspate Wasti, Wakad (`18.5987, 73.7656`) | 8.2 Acres (Wheat / Seasonal Vegetables) | `Demo@AgriRent2026` |
| 3 | `farmer_vikram` | `farmer.vikram@agrirent.demo` | `+919822011003` | Sus Road, Baner (`18.5590, 73.7868`) | 22.0 Acres (Soybean / Gram Pulse) | `Demo@AgriRent2026` |
| 4 | `farmer_priya` | `farmer.priya@agrirent.demo` | `+919822011004` | Manjari, Hadapsar (`18.5089, 73.9259`) | 6.5 Acres (Floriculture / Polyhouse) | `Demo@AgriRent2026` |
| 5 | `farmer_ramesh` | `farmer.ramesh@agrirent.demo` | `+919822011005` | Bakori Road, Wagholi (`18.5808, 73.9787`) | 18.0 Acres (Sugarcane / Hybrid Bajra) | `Demo@AgriRent2026` |

---

### B. Five Operator Accounts (Certified Agricultural Pilots)

| # | Username | Email | Phone Number | Operating Hub (Pune) | Experience & Skills | Supported Machinery | Status (Online / Avail) | Rate |
|---|---|---|---|---|---|---|---|---|
| 1 | `operator_rajesh` | `operator.rajesh@agrirent.demo` | `+919822022001` | Hinjawadi (`18.5912, 73.7389`) | 8 Yrs (Deep Ploughing, Paddy Puddling) | `Tractor`, `Plough`, `Rotavator` | **Online / Available** | ₹300/hr |
| 2 | `operator_sunil` | `operator.sunil@agrirent.demo` | `+919822022002` | Wakad (`18.5987, 73.7656`) | 6 Yrs (Multi-crop Combine Harvester) | `Harvester`, `Tractor`, `Rotavator` | **Online / Available** | ₹350/hr |
| 3 | `operator_amit` | `operator.amit@agrirent.demo` | `+919822022003` | Baner (`18.5590, 73.7868`) | 5 Yrs (Precision Seed Drilling, Tillage) | `Rotavator`, `Seed Drill`, `Cultivator` | **Online / Available** | ₹280/hr |
| 4 | `operator_ganesh` | `operator.ganesh@agrirent.demo` | `+919822022004` | Hadapsar (`18.5089, 73.9259`) | 9 Yrs (Sugarcane Harvester, Subsoiler) | `Harvester`, `Tractor`, `Cultivator` | **Online / Busy** | ₹320/hr |
| 5 | `operator_sachin` | `operator.sachin@agrirent.demo` | `+919822022005` | Wagholi (`18.5808, 73.9787`) | 4 Yrs (Orchard Boom Sprayer, Knapsack) | `Sprayer`, `Tractor`, `Cultivator` | **Offline / Unavailable** | ₹250/hr |

---

### C. Five Machine Owner Accounts (Fleet & Machinery Listings)

| # | Username | Email | Phone Number | Fleet Location (Pune) | Active Machinery Listings | Daily / Hourly Rates |
|---|---|---|---|---|---|---|
| 1 | `owner_balasaheb` | `owner.balasaheb@agrirent.demo` | `+919822033001` | Hinjawadi Phase 1 (`18.5912, 73.7389`) | 1. John Deere 5310 PowerTech 55HP Tractor<br>2. Shaktiman Semi-Champion Rotavator 7ft | ₹850/hr (₹6,800/day)<br>₹450/hr (₹3,600/day) |
| 2 | `owner_kavita` | `owner.kavita@agrirent.demo` | `+919822033002` | Datta Mandir, Wakad (`18.5987, 73.7656`) | 1. Kubota DC-68G Multi-Crop Harvester<br>2. Lemken Opal 090 Reversible Plough | ₹2,200/hr (₹17,600/day)<br>₹500/hr (₹4,000/day) |
| 3 | `owner_dattatray` | `owner.dattatray@agrirent.demo` | `+919822033003` | Baner Hill Road (`18.5590, 73.7868`) | 1. National Agro Precision Seed Drill<br>2. Mahindra Spring Loaded 9-Tyne Cultivator | ₹480/hr (₹3,840/day)<br>₹400/hr (₹3,200/day) |
| 4 | `owner_meena` | `owner.meena@agrirent.demo` | `+919822033004` | Saswad Road, Hadapsar (`18.5089, 73.9259`) | 1. Mahindra Arjun Novo 605 DI-i 60HP Tractor<br>2. Aspee Tractor-Mounted Boom Sprayer 600L | ₹950/hr (₹7,600/day)<br>₹600/hr (₹4,800/day) |
| 5 | `owner_sanjay` | `owner.sanjay@agrirent.demo` | `+919822033005` | Nagar Road, Wagholi (`18.5808, 73.9787`) | 1. Kartar 4000 Self-Propelled Harvester<br>2. Fieldking Heavy-Duty Rotary Tiller 6ft | ₹2,400/hr (₹19,200/day)<br>₹460/hr (₹3,680/day) |

---

## 2. Repeatable Database Seeding Script

The repeatable seeding script is located at `backend/seed_demo_accounts.py`.

### Execution Command:
```bash
cd backend
python seed_demo_accounts.py
```

### Safety & Idempotency Features:
1. **Zero Destructive Overwrites**: Uses Django's `update_or_create()` with exact usernames and emails. Never deletes existing users or production records.
2. **Dual-Layer Auth Hashing**: Automatically hashes passwords using Django's PBKDF2-SHA256 (`api_user`) and synchronizes with Supabase Auth BCrypt (`auth.users` and `auth.identities`).
3. **Sequence Alignment**: Resets PostgreSQL primary key sequences (`api_user_id_seq`, `api_equipment_id_seq`, etc.) to prevent primary key collision upon future signups.

---

## 3. End-to-End Workflow Verification Results

| Workflow | Stage | Description | Executed API Endpoints | Result | Evidence |
|---|---|---|---|---|---|
| **Workflow A** | Farmer Discovery & Booking | `farmer_suresh` logs in, searches nearby machinery in Hinjawadi, books John Deere 5310 Tractor with `requires_operator=True`. | `POST /api/auth/login/`<br>`GET /api/equipment/nearby/?lat=18.5912&lng=73.7389`<br>`POST /api/bookings/` | **PASS (100%)** | 9 nearby machines found; Booking created in Supabase DB. |
| **Workflow B** | Operator Status & Matching | Operators `operator_rajesh`, `operator_sunil`, `operator_amit` listed online. AI Matcher scores candidates using Haversine distance, machinery skills, and reliability. | `GET /api/operator/match/<booking_id>/` | **PASS (100%)** | `operator_rajesh` matched top rank (Score: 99.6, Distance: 0.0 km). `operator_ganesh` (Busy) and `operator_sachin` (Offline) properly excluded. |
| **Workflow C** | Machine Owner Dispatch | Machine Owner `owner_balasaheb` requests operator dispatch for the booking. Creates assignment in `REQUESTED` state. | `POST /api/operator/request/<booking_id>/` | **PASS (100%)** | Assignment created. Duplicate dispatch attempts safely blocked. |
| **Workflow D** | Field Execution & Tracking | `operator_rajesh` accepts job and executes all 7 operational milestones with live GPS telemetry. | `POST /api/operator/jobs/<id>/accept/`<br>`PATCH /api/operator/jobs/<id>/status/`<br>`GET /api/operator/jobs/<id>/tracking/` | **PASS (100%)** | Milestones progressed: `TRAVELLING_TO_PICKUP` -> `ARRIVED_AT_PICKUP` -> `MACHINE_COLLECTED` -> `TRAVELLING_TO_FARM` -> `ARRIVED_AT_FARM` -> `IN_PROGRESS` -> `COMPLETED`. |
| **Workflow E** | Edge Cases & Concurrency | 1. Operator job rejection.<br>2. Operator offline toggle.<br>3. Concurrency guard (second operator blocked from accepting).<br>4. Owner cancellation. | `POST /api/operator/jobs/<id>/reject/`<br>`PATCH /api/operator/availability/`<br>`POST /api/operator/jobs/<id>/accept/` (duplicate) | **PASS (100%)** | Concurrency rejects with HTTP 403; rejection reason logged; offline toggle functions cleanly. |

---

## 4. Live Production URLs & Instructions

- **Live Deployed Frontend (Production)**: [https://agrirent-frontend-sandy.vercel.app](https://agrirent-frontend-sandy.vercel.app)
- **Preview Deployment**: [https://agrirent-frontend-mxezskhnz-as-projects-1fb4e3ca.vercel.app](https://agrirent-frontend-mxezskhnz-as-projects-1fb4e3ca.vercel.app)
- **Supabase Backend Services**: Project `dtunlnhcxpvtyvumswwk` in `ap-south-1`.

### Demo Login Quick-Start:
1. Open the [AgriRent Login Page](https://agrirent-frontend-sandy.vercel.app).
2. Click any of the **Quick Demo Account** buttons:
   - 🌾 **Farmer (Suresh)**: Auto-fills `farmer_suresh`
   - 🚜 **Operator (Rajesh)**: Auto-fills `operator_rajesh`
   - 🏢 **Owner (Balasaheb)**: Auto-fills `owner_balasaheb`
3. Click **Login** (Password `Demo@AgriRent2026` is pre-configured).
