# AgriRent AI Assistant Knowledge Base & Platform Reference

This directory contains the comprehensive, authoritative, single-source-of-truth reference manuals for the **AgriRent** intelligent agricultural machinery rental and field dispatch platform.

These documents are explicitly structured and indexed so that the **AgriRent AI Chatbot** (`frontend/src/components/AIChatBot.jsx` and `backend/ai/assistant.py`), customer support staff, and platform users can rapidly resolve any question regarding:
- Every page, button, modal, drawer, and tab in the application.
- The 12-step booking and escrow lifecycle state machine.
- User roles, credentials, permissions, and security policies.
- AI suitability, dynamic pricing, and operator dispatch engines.
- REST API endpoints and data model definitions.

---

## Knowledge Index

| Document | Focus Area | Description |
| :--- | :--- | :--- |
| **`01_PLATFORM_OVERVIEW_AND_ROLES.md`** | System & RBAC | Platform mission, the 4 user roles (Farmer, Owner, Operator, Admin), demo accounts, and auth flow. |
| **`02_PAGE_BY_PAGE_UI_AND_BUTTONS.md`** | UI & Interactive Controls | Exhaustive analysis of every page, button, form, filter, tab, drawer, and modal across the frontend. |
| **`03_12_STEP_BOOKING_LIFECYCLE.md`** | State Machine & Escrow | Complete walkthrough of Steps 1 through 12, statuses, transitions, cancellations, and refunds. |
| **`04_AI_ENGINES_AND_ALGORITHMS.md`** | AI & Machine Learning | Equipment suitability matcher, dynamic pricing model, operator dispatch radar, and voice parser. |
| **`05_BACKEND_API_AND_DATABASE_MODELS.md`** | Architecture & APIs | Django models, SQLite/PostgreSQL schema, endpoints, status codes, and mock fallback router. |
| **`06_FREQUENTLY_ASKED_QUESTIONS.md`** | Chatbot FAQ Corpus | Multilingual (English, Tamil, Hindi) conversational Q&A corpus indexed for immediate query matching. |

---

## How the Chatbot Refers to This Knowledge Base

1. **Direct Intent Lookup**: When a user asks about buttons or page actions (e.g. *"How do I approve a booking?"* or *"Where is the operator notification button?"*), the assistant consults `02_PAGE_BY_PAGE_UI_AND_BUTTONS.md`.
2. **Booking Status Inquiries**: Questions regarding rental statuses, cancellations, or escrow refunds map directly to `03_12_STEP_BOOKING_LIFECYCLE.md`.
3. **Price & Crop Suitability Inquiries**: Crop acreage, task-specific machinery matching, and pricing bounds map to `04_AI_ENGINES_AND_ALGORITHMS.md`.
4. **General & Multilingual Questions**: Queries in Tamil, Hindi, or English match entries in `06_FREQUENTLY_ASKED_QUESTIONS.md`.
