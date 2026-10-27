# 02. Page-by-Page UI, Navigation, and Interactive Controls

This document details every screen, navigation link, button, drawer, and modal across AgriRent.

---

## 1. Global Navigation & Top Bar (`App.jsx`)

The top bar is rendered on all authenticated pages.

- **Logo / Brand (`Tractor` icon + "AgriRent AI")**:
  - *Action*: Clicking navigates to the user's role-specific `/dashboard`.
- **Dashboard Button (`LayoutDashboard` icon)**:
  - *Action*: Navigates back to the main workspace overview.
- **Support Button (`HelpCircle` icon)**:
  - *Action*: Switches view to `SupportCenter.jsx` (`/support`).
- **Language Selector Dropdown (`Globe` icon)**:
  - *Options*: English (`en`), தமிழ் (`ta`), हिन्दी (`hi`).
  - *Action*: Switches dynamic locale across the application without reloading the page.
- **Theme Toggle Button (`Sun` / `Moon` icon)**:
  - *Action*: Toggles between light theme and high-contrast dark theme.
- **Logout Button (`LogOut` icon)**:
  - *Action*: Clears JWT tokens, invalidates local session, and redirects to `LandingPage.jsx` (`/`).
- **Floating AI Assistant Bubble (`AIChatBot.jsx`)**:
  - *Action*: Positioned fixed at the bottom right. Clicking expands the multi-lingual interactive chatbot assistant.

---

## 2. Public Landing Page (`frontend/src/pages/LandingPage.jsx`)

### Key Controls & Buttons:
- **"Log In" button**: Navigates to `/login`.
- **"Sign Up" button**: Navigates to `/signup`.
- **"Try Voice Booking" button (`Mic` icon)**:
  - *Action*: Opens `VoiceBookingModal.jsx` enabling speech recognition in English, Tamil, or Hindi.
- **"Explore Platform Features" button**:
  - *Action*: Smoothly scrolls the viewport to `#interactive-demo`.
- **Machinery Category Filter Pills**:
  - *Options*: `Show All Listings`, `Tractor`, `Harvester`, `Rotavator`, `Seeder`, `Sprayer`, `Crop Protection Equipment`.
  - *Action*: Filters the active machinery listings rendered on the map and card list.
- **Interactive Equipment Map (`MapComponent.jsx`)**:
  - Draggable Farm Pin: Farmers can drag their farm marker to any location. Distance is recalculated live.
- **Listing Card "Book" button**:
  - *Action*: Prompts guest user to register or log in before reserving.
- **AI Equipment Suitability Engine Form**:
  - *Inputs*: Crop Type (`Paddy`, `Wheat`, `Cotton`, `Sugarcane`, `Maize`, `Vegetables`), Land Size (Acres), Task Type (`Harvesting`, `Tilling`, `Sowing`, `Spraying`).
  - *Submit Button*: `"Get AI Suitability Recommendation"` triggers suitability calculation and cost estimation.
- **Smart Rental Price Prediction Form**:
  - *Inputs*: Equipment Type, Demand Curve (`Low`, `Medium`, `High`), Season (`Sowing`, `Harvesting`, `Off-season`).
  - *Submit Button*: `"Predict Optimal Rent Pricing"` renders Min, Recommended, and Max price bounds.

---

## 3. Login & Signup Portals

### `LoginPage.jsx`
- **Username or Email Address field**: Dual-identifier support.
- **Password field & Show/Hide Eye button**: Toggles clear-text visibility.
- **"Log In" button**: Submits credentials to `POST /api/auth/login/`.
- **"Don't have an account? Sign Up" link**: Switches view to `/signup`.
- **Quick Demo Account Selector**:
  - *Buttons*: `🌾 Farmer (Suresh)`, `🚜 Operator (Rajesh)`, `🏢 Owner (Balasaheb)`.
  - *Action*: Instantly populates credentials and executes login.
  - *Expander*: `"View all 15 demo accounts (Pune)"` provides one-click credentials for all 15 demo accounts.

### `SignupPage.jsx`
- **Fields**: Username, Email Address, Phone Number (optional), Password (min 12 characters), Confirm Password.
- **Role Selection Buttons**: `Farmer`, `Owner`, `Operator`.
- **"Sign Up" button**: Submits registration to `POST /api/auth/register/`.

---

## 4. Farmer Dashboard (`frontend/src/pages/FarmerDashboard.jsx`)

The Farmer Dashboard contains 9 dedicated tabs:

### Sub-Tab Navigation Header
1. **"Machinery Catalog & Discovery" (`listings`)**:
   - Machinery search input (live title, category, and village filtering).
   - Category filter pills.
   - Radius filter buttons: `5 km`, `10 km`, `25 km`, `50 km`, `100 km`.
   - Radius slider: Fine-grained selection from 1 to 100 km.
   - Farm Location Pin / Geolocation: `"Detect GPS"` button updates user coordinates via HTML5 browser geolocation.
   - 5-Day Weather & Sowing Advisory Card: Displays precipitation risk, sowing feasibility, temperature, and farm advisory.
   - Equipment Cards:
     - Machine photo, Title, Category, Rating, Hourly/Daily Price.
     - `"View Details & Reserve"`: Opens `EquipmentDetailDrawer.jsx`.
     - `"Quick Add to Cart"`: Adds reservation to `SmartBookingCart.jsx`.
2. **"AI Match Engine" (`ai-recs-history`)**:
   - Triggers `backend/ai/equipment_matcher.py` multi-factor analysis.
   - Renders explainable score breakdown (Base Match, Proximity Score, Operator Match, Reliability Score).
   - `"Review & Book"` button: Directly opens `BookingReviewModal.jsx` (Step 8 pre-authorization).
3. **"My Bookings" (`my-bookings`)**:
   - Booking filter tabs: `All`, `Active`, `Pending`, `Completed`, `Cancelled`.
   - Detailed Booking Card:
     - 12-Step Lifecycle Status Stepper (visual progress bar).
     - Delivery Mode Badge (`Self-Pickup` or `Field Delivery`).
     - Cost breakdown and escrow status (`Held in Escrow`, `Released`, `Refunded`).
     - `"Cancel Rent"` button: Available during `Pending` and `Approved` states. Triggers confirmation prompt and releases availability.
     - `"Acknowledge & Close"` button: Closes finished rentals.
     - `"Chat"` button (`MessageCircle` icon): Opens the universal equipment messaging window with the owner and driver.
4. **"Live Mission & Delivery GPS" (`live-mission`)**:
   - Displays real-time map with live machinery position, pickup origin, farm field destination, and driver ETA.
5. **"Escrow & Payments" (`payments`)**:
   - Lists transaction IDs, payment methods (Razorpay, UPI, Escrow Pre-Auth), amounts, and invoice receipts.
6. **"Subsidies & Govt Schemes" (`govt-schemes`)**:
   - Lists eligible national and state subsidies (SMAM, PM-KUSUM, Sub-Mission on Agricultural Mechanization).
7. **"Notifications" (`notifications`)**:
   - Shows chronological alerts for booking approvals, driver arrival, work completion, and messages.
   - `"Mark All as Read"` button: Sets `is_read=True` via `PATCH /api/notifications/`.
8. **"Voice Queries History" (`voice-queries-history`)**:
   - Displays transcripts of past Tamil/English/Hindi voice bookings.
9. **"Farmer Profile" (`profile`)**:
   - Farm acreage, primary crops, address, and contact details.

---

## 5. Equipment Owner Dashboard (`frontend/src/pages/OwnerDashboard.jsx`)

### Key Controls & Actions:
- **Header Actions**:
  - **Notification Bell Button (`Bell` icon)**:
    - Displays active unread counter badge.
    - Clicking toggles the **Owner Notification Panel** showing live booking requests, driver dispatch updates, and farmer messages. Automatically marks notifications as read.
  - **"Add New Listing" button (`Plus` icon)**:
    - Opens the machinery creation modal.
  - **"Refresh" button (`RefreshCw` icon)**:
    - Reloads live listings, bookings, and revenue telemetry.
- **Top Metrics Ribbon**:
  - Total Revenue, Equipment Utilization Rate (circular gauge), Pending Reservations count, Verified Machinery count.
- **Main Tabs**:
  1. **"🚜 Inventory & Bookings" (`inventory`)**:
     - **Pending Booking Requests Section**:
       - `"Approve"` button (`Check` icon): Approves booking (sets status to `Approved`). If farmer requested an operator, automatically triggers AI operator proximity dispatch.
       - `"Reject"` button (`X` icon): Declines booking with optional reason and marks escrow as `Refunded`.
       - `"Chat"` button: Launches multi-party messaging window with the farmer.
     - **Active Rentals & Booking Tracking Section**:
       - Lists approved, in-transit, and active field jobs.
       - `"🚜 Request Operator"` button: Manually triggers automated operator dispatch (`POST /api/operator/request/:id/`) if no driver has been assigned.
       - `"Start Rental"` button: Transitions booking status to `In Progress`.
       - `"Complete Rental"` button: Transitions booking to `Completed` and releases escrow funds.
       - `"Chat"` button: Opens multi-party equipment messaging window.
     - **My Equipment Inventory Section**:
       - Equipment list cards with image, category, and hourly rate.
       - `"Availability Toggle"`: Switches machine between `Available` (green) and `Rented/Busy` (grey).
       - `"Edit Details"` button (`Edit2` icon): Opens modal to modify title, category, address, or hourly rates.
       - Real-time IoT Predictive Diagnostics: Core engine temperature, vibration metrics, and fluid health.
  2. **"💳 Earnings & Bank Payouts" (`escrow`)**:
     - Revenue breakdown table with Transaction ID, Booking ID, Farmer Name, Gross Amount, Platform Fee (5%), Net Owner Payout, and Bank Transfer Status.

---

## 6. Operator / Driver Dashboard (`frontend/src/pages/OperatorDashboard.jsx`)

Dedicated workspace for agricultural machinery drivers and tractor operators.

### Key Controls & Actions:
- **Availability Beacon Banner**:
  - Online/Offline Toggle (`Activity` icon):
    - When switched to **Online**: Broadcasts active GPS coordinates and enables automatic assignment in AI job dispatch.
    - When switched to **Offline**: Suspends new job dispatches while preserving existing active tasks.
- **Turn-by-Turn Mission Action Buttons**:
  - Once an assignment is accepted, step buttons guide the operator:
    1. `"1. Start Travel to Pickup"`: Transitions status to `TRAVELLING_TO_PICKUP`.
    2. `"2. Mark Arrived at Pickup"`: Transitions status to `ARRIVED_AT_PICKUP`.
    3. `"3. Confirm Machine Collected"`: Transitions status to `MACHINE_COLLECTED`.
    4. `"4. Start Travel to Farmer"`: Transitions status to `TRAVELLING_TO_FARM`.
    5. `"5. Mark Arrived at Farm"`: Transitions status to `ARRIVED_AT_FARM`.
    6. `"6. Start Work"`: Transitions status to `IN_PROGRESS`.
    7. `"7. Complete Job"`: Transitions status to `COMPLETED` and credits driver compensation.
- **"Message Farmer & Owner" button (`MessageCircle` icon)**:
  - Accessible on active tracking and upcoming schedule cards.
  - Opens the universal messaging window with the machine owner and the farmer.
- **Pending Job Requests Section**:
  - Displays machine title, photo, distance (km), farmer field address, and guaranteed compensation payout (₹).
  - `"Accept Job"` button: Accepts assignment and awards task.
  - `"Decline"` button: Rejects assignment and automatically reroutes job offer to the next best nearby operator.

---

## 7. Platform Administration (`frontend/src/pages/AdminDashboard.jsx`)

- **Top Metrics**: Total Platform Revenue, User Census (Farmers, Owners, Operators), Pending Verifications count.
- **Equipment Verification Queue**:
  - Lists unverified machinery uploaded by owners.
  - `"Approve"` button: Marks machine verified and enables public discovery.
- **Operator Certification Queue**:
  - Audits driver license, Aadhaar documents, and experience history.
  - Approves or rejects operator verification.
- **Customer Support Tickets & Disputes**:
  - Lists open tickets with priority badges (`High`, `Medium`, `Low`).
  - Allows status updates: `Open` $\to$ `In Progress` $\to$ `Resolved`.

---

## 8. Central Support Center (`frontend/src/pages/SupportCenter.jsx`)

- **Interactive FAQ Accordion**: Expandable common questions and answers.
- **Ticket Submission Form**:
  - Subject, Priority Level (`Low`, `Medium`, `High`), and Message.
  - Submit button creates ticket via `POST /api/support/tickets/`.
- **Live Support Chat Box**:
  - Simulated instant support agent ("Jeevan") for booking, dispute, and payment inquiries.
- **Ticket Status Feed**:
  - Chronological list of user's filed tickets and live resolution status.
