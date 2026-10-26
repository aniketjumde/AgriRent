# AgriRent Local Development & Deployment Guide

This document provides complete instructions for running AgriRent entirely on your local machine using standard Django REST Framework and Vite (React).

---

## 1. System Architecture

AgriRent is structured into two main components:
- **Backend**: Django 5.0 REST Framework with SQLite (default) or local PostgreSQL.
  - Authentication: JWT (SimpleJWT) with access and refresh tokens.
  - Razorpay payment gateway integration for equipment rentals.
  - Machine learning & AI algorithms: Equipment recommendations, dynamic price quotes, and operator matching.
  - Media & image storage: Django's default local file storage (`MEDIA_ROOT = backend/media/`).
- **Frontend**: React 19 SPA built with Vite, Tailwind CSS, Leaflet, and Lucide React.
  - Connects to local Django backend via `http://127.0.0.1:8000` (or configured `VITE_API_BASE_URL`).

---

## 2. Quick Local Setup

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### Backend Setup
1. Open a terminal and navigate to the backend:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run migrations:
   ```bash
   python manage.py migrate
   ```
5. Seed demo accounts (optional):
   ```bash
   python seed_demo_accounts.py
   ```
6. Start the Django development server:
   ```bash
   python manage.py runserver 127.0.0.1:8000
   ```
   The backend API is now accessible at `http://127.0.0.1:8000/api/` (Health check: `http://127.0.0.1:8000/api/health/`).

### Frontend Setup
1. In a separate terminal, navigate to the frontend:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment (optional, defaults to `http://127.0.0.1:8000`):
   ```bash
   cp .env.example .env
   ```
4. Start Vite development server:
   ```bash
   npm run dev
   ```
   The application will be live at `http://localhost:5173`.

---

## 3. Docker Compose (Alternative Local Setup)

To run the entire stack with containerized PostgreSQL, Django, and frontend:
```bash
docker compose up --build
```
- Frontend: `http://localhost:80`
- Backend API: `http://localhost:8000/api/`
- Local PostgreSQL: `localhost:5432` (user: `agrirent_user`, database: `agrirent`)
