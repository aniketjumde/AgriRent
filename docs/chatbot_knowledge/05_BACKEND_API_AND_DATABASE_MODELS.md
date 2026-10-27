# 05. Backend Architecture, Database Schema, and REST APIs

This manual describes the data layer and REST endpoints for AgriRent.

---

## 1. Database Schema (`backend/api/models.py`)

### `User` (extends Django `AbstractUser`)
- **`role`**: Choice: `'Farmer'`, `'Owner'`, `'Operator'`, `'Admin'`. Default: `'Farmer'`.
- **`phone_number`**: CharField (e.g. `+91 98220 11001`).
- **`is_verified`**: Boolean (phone/identity verification status).
- **`is_email_verified`**: Boolean.
- **`reliability_score`**: FloatField (default 5.0, range 1.0 to 5.0).
- **`aadhaar_kyc_status`**: Choice: `'Pending'`, `'Verified'`, `'Rejected'`.
- **`aadhaar_number_masked`**: CharField (e.g. `XXXX-XXXX-1234`).

### `Equipment`
- **`owner`**: ForeignKey to `User` (related_name `'equipment_listings'`).
- **`title`**: CharField (e.g. `"John Deere 5050D Tractor"`).
- **`category`**: Choice: `'Tractor'`, `'Harvester'`, `'Rotavator'`, `'Seeder'`, `'Sprayer'`, `'Crop Protection Equipment'`, `'Other Agricultural Machinery'`.
- **`description`**: TextField.
- **`rental_price_per_hour`**: DecimalField (e.g. `1500.00`).
- **`location_latitude` / `location_longitude`**: DecimalField (GPS coordinates).
- **`address`**: CharField (e.g. `"Baramati, Pune, Maharashtra"`).
- **`image_url`**: URL or local media path.
- **`is_available`**: Boolean. Toggled to `False` when actively reserved or rented.
- **`is_verified`**: Boolean. Admin approval flag.

### `Booking`
- **`equipment`**: ForeignKey to `Equipment`.
- **`farmer`**: ForeignKey to `User`.
- **`start_date` / `end_date`**: DateTimeField.
- **`total_cost`**: DecimalField.
- **`status`**: Choice: `'Pending'`, `'Approved'`, `'Awaiting Dispatch'`, `'In Transit'`, `'Arrived'`, `'In Progress'`, `'Completed'`, `'Closed'`, `'Rejected'`, `'Cancelled'`.
- **`escrow_status`**: Choice: `'Pending'`, `'Held'`, `'Released'`, `'Refunded'`.
- **`delivery_option`**: Choice: `'Pickup'`, `'Delivery'`.
- **`requires_operator`**: Boolean.
- **`operator_assigned`**: ForeignKey to `User` (null=True).
- **`notes`**: Audit notes & status history timeline.

### `OperatorProfile`
- **`user`**: OneToOneField to `User`.
- **`is_online`**: Boolean (live radar beacon).
- **`is_available`**: Boolean (ready to accept new dispatch offers).
- **`current_work_status`**: Choice: `'Available'`, `'On Job'`, `'Offline'`.
- **`current_latitude` / `current_longitude`**: Live GPS position.
- **`service_radius_km`**: Operational radius (default 25 km).
- **`supported_machinery`**: JSONField list of machine categories.
- **`skills`**: JSONField list of agricultural proficiencies.
- **`hourly_compensation_rate`**: DecimalField (e.g. `250.00`).
- **`verification_status`**: Choice: `'Pending'`, `'Verified'`, `'Rejected'`.

### `OperatorJobAssignment`
- **`booking`**: ForeignKey to `Booking`.
- **`operator`**: ForeignKey to `OperatorProfile`.
- **`status`**: Choice: `'REQUESTED'`, `'ACCEPTED'`, `'TRAVELLING_TO_PICKUP'`, `'ARRIVED_AT_PICKUP'`, `'MACHINE_COLLECTED'`, `'TRAVELLING_TO_FARM'`, `'ARRIVED_AT_FARM'`, `'IN_PROGRESS'`, `'COMPLETED'`, `'REJECTED'`, `'CANCELLED'`.
- **`compensation_amount`**: DecimalField.
- **`pickup_latitude` / `pickup_longitude` / `pickup_address`**: Machine yard origin.
- **`destination_latitude` / `destination_longitude` / `destination_address`**: Farm target.
- **`estimated_travel_distance_km`**: Distance.
- **`estimated_arrival_minutes`**: Travel time.
- **`status_notes`**: Transition audit trail.

### `Message` & `Notification`
- **`Message`**: Multi-party chat tied to `booking`, `sender`, `content`, `timestamp`.
- **`Notification`**: Real-time push alert tied to `user`, `content`, `is_read`, `created_at`.

---

## 2. Core REST API Endpoints

### Authentication
- `POST /api/auth/register/`: Create new user with role.
- `POST /api/auth/login/`: Authenticate via username/email + password. Returns JWT pair.
- `GET /api/auth/user/`: Returns profile of the authenticated user.
- `POST /api/auth/logout/`: Invalidates refresh token.

### Equipment & Discovery
- `GET /api/equipment/`: List verified available equipment. Supports search & category query params.
- `POST /api/equipment/`: Create new machinery listing (Owner role required).
- `GET /api/equipment/<id>/`: Retrieve full specs of a single machine.
- `PUT /api/equipment/<id>/`: Update machinery listing.
- `POST /api/equipment/<id>/verify/`: Approve machinery listing (Admin only).
- `GET /api/nearby/`: Proximity equipment search with latitude, longitude, and radius filters.

### Bookings & Lifecycle
- `GET /api/bookings/`: List bookings for authenticated user.
- `POST /api/bookings/`: Create booking reservation.
- `PATCH /api/bookings/<id>/status/`: Advance booking state (e.g. `Approved`, `In Progress`, `Completed`, `Cancelled`).
- `GET /api/bookings/<id>/messages/`: Retrieve chat message history.
- `POST /api/bookings/<id>/messages/`: Send message to counterparties (Farmer, Owner, Operator).

### AI & Predictive Services
- `POST /api/ai/match/`: Multi-factor AI suitability match engine.
- `POST /api/ai/recommend/`: Crop & acreage machinery recommender.
- `POST /api/ai/predict-price/`: Dynamic rental rate calculator.
- `POST /api/ai/chat/`: Interactive conversational NLP assistant endpoint.
- `POST /api/ai/voice/parse/`: Speech-to-booking intent parser.

### Operator Dispatch
- `GET /api/operator/dashboard/`: Job assignments, earnings, and schedule.
- `POST /api/operator/availability/`: Update online beacon and GPS coordinates.
- `POST /api/operator/jobs/<id>/accept/`: Driver accepts field job.
- `POST /api/operator/jobs/<id>/reject/`: Driver declines job; initiates auto-reroute.
- `PATCH /api/operator/jobs/<id>/status/`: Advance turn-by-turn mission state.
- `POST /api/operator/request/<booking_id>/`: Owner triggers AI operator proximity dispatch.
