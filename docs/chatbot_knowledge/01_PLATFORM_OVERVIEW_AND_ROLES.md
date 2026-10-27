# 01. Platform Overview, Roles, and Authentication

## 1. System Mission & Value Proposition
AgriRent is a production-grade, AI-powered agricultural machinery sharing and automated field logistics platform designed for Indian smallholder and commercial farmers. 

The platform resolves three critical agricultural challenges:
1. **High Capital Expenditure Barrier**: Smallholder farmers cannot afford expensive modern machinery (50+ HP tractors, combine harvesters, boom sprayers). AgriRent allows hourly and daily rentals with transparent pricing and zero hidden fees.
2. **Machinery Under-utilization**: Equipment owners have idle machinery during post-sowing and mid-season periods. AgriRent helps owners monetize idle capital with escrow-guaranteed payments.
3. **Skilled Operator Shortage**: Modern precision equipment requires trained operators. AgriRent provides AI-driven proximity dispatch to match certified local tractor/harvester drivers to field jobs.

---

## 2. User Roles & Role-Based Access Control (RBAC)

AgriRent enforces strict backend authorization across 4 distinct user roles:

### A. Farmer (`role: 'Farmer'`)
- **Primary Job**: Discovers nearby agricultural equipment, runs AI crop suitability advisor, reserves machinery, requests certified machine operators, pre-authorizes escrow payments, tracks machinery transit via GPS, messages owners/drivers, and confirms job completion.
- **Allowed Pages**: `LandingPage`, `FarmerDashboard`, `SupportCenter`.
- **Restricted Access**: Cannot access Owner inventory controls, Operator dispatch queues, or Admin KYC portals.

### B. Equipment Owner (`role: 'Owner'`)
- **Primary Job**: Lists agricultural machinery (tractors, rotavators, harvesters, seeders, sprayers) with hourly/daily rates, uploads specs/images, sets operational coordinates, approves or declines incoming booking requests, requests nearby operators for machines, reviews IoT machine diagnostics, receives notifications, and manages escrow earnings and bank payouts.
- **Allowed Pages**: `LandingPage`, `OwnerDashboard`, `SupportCenter`.
- **Restricted Access**: Cannot book their own machines as a farmer; cannot approve KYC verification certificates.

### C. Machinery Operator / Driver (`role: 'Operator'`)
- **Primary Job**: Certified heavy agricultural machinery drivers. Toggles live Online/Offline status, transmits live GPS coordinates, receives AI-dispatched field job offers, accepts or declines assignments, follows turn-by-turn route statuses (Travelling to Pickup $\to$ Machine Collected $\to$ En Route to Farm $\to$ Work Started $\to$ Completed), messages owners and farmers, and tracks wage payout ledgers.
- **Allowed Pages**: `LandingPage`, `OperatorDashboard`, `SupportCenter`.
- **Restricted Access**: Cannot approve farmer bookings or alter equipment catalog listings.

### D. Platform Administrator (`role: 'Admin'`)
- **Primary Job**: Platform governance. Audits user verification, inspects machinery documents (RC, registration certificates), approves or rejects Operator Aadhaar and driving certifications, oversees platform-wide revenue telemetry, monitors dispute tickets, and manages escrow settlement releases.
- **Allowed Pages**: `AdminDashboard`, `FarmerDashboard`, `OwnerDashboard`, `OperatorDashboard`, `SupportCenter`.

---

## 3. Seeded Demo Accounts (Pune Rural Cluster)

For fast verification, testing, and live inspection, AgriRent includes 15 seeded accounts in the Pune agricultural cluster. All demo accounts share the standard password:
**`Demo@AgriRent2026`**

### Farmer Demo Accounts
| Username | Email | Phone | Location | Description |
| :--- | :--- | :--- | :--- | :--- |
| `farmer_suresh` | `farmer.suresh@agrirent.demo` | `+91 98220 11001` | Baramati, Pune | 5 Acres Sugarcane & Wheat |
| `farmer_anita` | `farmer.anita@agrirent.demo` | `+91 98220 11002` | Shirur, Pune | 3.5 Acres Paddy & Vegetables |
| `farmer_vikram` | `farmer.vikram@agrirent.demo` | `+91 98220 11003` | Daund, Pune | 8 Acres Maize & Cotton |
| `farmer_priya` | `farmer.priya@agrirent.demo` | `+91 98220 11004` | Junnar, Pune | 4 Acres Vegetables & Onion |
| `farmer_ramesh` | `farmer.ramesh@agrirent.demo` | `+91 98220 11005` | Indapur, Pune | 6 Acres Sugarcane |

### Operator / Driver Demo Accounts
| Username | Email | Status | Skills & Machinery |
| :--- | :--- | :--- | :--- |
| `operator_rajesh` | `operator.rajesh@agrirent.demo` | Online, Available | Tractor, Rotavator, Ploughing (8 yrs exp) |
| `operator_sunil` | `operator.sunil@agrirent.demo` | Online, Available | Combine Harvester, Threshing (6 yrs exp) |
| `operator_amit` | `operator.amit@agrirent.demo` | Online, Available | Tractor, Boom Sprayer, Seed Drill (5 yrs exp) |
| `operator_ganesh` | `operator.ganesh@agrirent.demo` | Online, Busy | Rotavator, Laser Leveler (4 yrs exp) |
| `operator_sachin` | `operator.sachin@agrirent.demo` | Offline | Harvester, Heavy Tillage (7 yrs exp) |

### Equipment Owner Demo Accounts
| Username | Email | Seeded Machinery Listings |
| :--- | :--- | :--- |
| `owner_balasaheb` | `owner.balasaheb@agrirent.demo` | John Deere 5310 Tractor (55 HP), Shaktiman Rotavator 7ft |
| `owner_kavita` | `owner.kavita@agrirent.demo` | Kubota DC-68G Harvester, Lemken 3-Furrow Hydraulic Plough |
| `owner_dattatray` | `owner.dattatray@agrirent.demo` | National Agro Precision Seed Drill, Mahindra 9-Tyne Cultivator |
| `owner_meena` | `owner.meena@agrirent.demo` | Mahindra Arjun Novo 605 Tractor (60 HP), Aspee Boom Sprayer 600L |
| `owner_sanjay` | `owner.sanjay@agrirent.demo` | Kartar 4000 Combine Harvester, Fieldking Rotary Tiller 6ft |

### Platform Administrator Account
- **Username**: `admin`
- **Email**: `admin@agrirent.com`
- **Password**: `Demo@AgriRent2026`

---

## 4. Authentication Architecture & Security Rules

1. **Dual Identifier Login**: The login endpoint (`/api/auth/login/`) accepts either `username` or `email` along with `password`.
2. **JWT Security**: Issues cryptographically signed JSON Web Tokens (`access` with 15-minute expiration, `refresh` with 7-day expiration). Blacklisting is enabled via `rest_framework_simplejwt.token_blacklist`.
3. **Offline Mock Fallback Isolation**: Authentication endpoints strictly require live backend connection. If the backend is unreachable during registration, verification, or login, the client surfaces a clear network error rather than generating false credentials.
4. **Zero Shared Master Bypass**: Passwords are individually hashed using PBKDF2 with SHA-256 salts. No universal `123456` or master bypass exists.
