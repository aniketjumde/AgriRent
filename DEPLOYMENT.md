# AgriRent Deployment & Integration Guide: Supabase + Vercel + Django

This document provides complete instructions for running AgriRent in local development and deploying production builds with **Vercel** (Frontend), **Supabase** (Managed PostgreSQL Database, Storage & RLS), and **Django REST Framework** (Backend API).

---

## 1. Architecture Overview

- **Frontend**: React 19 + Vite + Tailwind CSS + Leaflet Maps + Lucide Icons.
  - Hosted on: **Vercel**
  - Features: Client-side routing with SPA fallback (`rewrites`), dynamic backend endpoint configuration via `VITE_API_BASE_URL`, direct Supabase Storage upload client (`frontend/src/lib/supabaseClient.js`), and Razorpay checkout.
- **Backend**: Python 3.11 + Django 5.0 + Django REST Framework + SimpleJWT + WhiteNoise.
  - Recommended Hosting: **Render**, **Railway**, **Fly.io**, or **AWS ECS/EC2**.
  - Features: Supabase PostgreSQL connector with connection pooling (`aws-0-ap-south-1.pooler.supabase.com:6543`), Supabase Storage REST client, automated database migrations with Row Level Security (RLS), and `/api/health/` monitoring endpoint.
- **Database & Storage**: **Supabase**
  - Managed PostgreSQL with SSL requirement (`sslmode=require`).
  - Supabase Storage bucket (`equipment-images`) for machinery photos and verification documents.
  - Migration `0007_supabase_rls_policies` for PostgreSQL Row Level Security.
- **Local Dev**: Docker Compose (`docker-compose.yml`) supporting both local containerized PostgreSQL and remote Supabase connections.

---

## 2. Environment Variables Specification

### Frontend (`frontend/.env` / Vercel Environment Variables)

| Variable Name | Required | Description | Example Value |
|---|---|---|---|
| `VITE_API_BASE_URL` | Yes (in Prod) | URL of deployed Django backend (no trailing slash) | `https://agrirent-api.onrender.com` |
| `VITE_SUPABASE_URL` | Optional | Supabase Project URL | `https://your-project.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Optional | Supabase Anonymous Public Key | `eyJhbGciOi...` |
| `VITE_SUPABASE_STORAGE_BUCKET` | Optional | Supabase Storage bucket name | `equipment-images` |

### Backend (`backend/.env` / Host Environment Variables)

| Variable Name | Required | Description | Example Value |
|---|---|---|---|
| `DJANGO_SECRET_KEY` | Yes | High-entropy random secret key | `django-insecure-production-random-key-xyz` |
| `DEBUG` | Yes | Debug mode (`False` in production) | `False` |
| `ALLOWED_HOSTS` | Yes | Comma-separated allowed domain hosts | `localhost,127.0.0.1,agrirent-api.onrender.com,.vercel.app` |
| `DATABASE_URL` | Yes | Supabase PostgreSQL Connection String (Transaction Pooler or Session) | `postgresql://postgres.your-ref:your-db-pass@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require` |
| `CORS_ALLOWED_ORIGINS` | Yes | Comma-separated list of allowed frontend URLs | `https://agrirent.vercel.app,http://localhost:5173` |
| `CSRF_TRUSTED_ORIGINS` | Yes | Comma-separated list of trusted origins | `https://agrirent.vercel.app,https://*.vercel.app` |
| `SUPABASE_URL` | Optional | Supabase Project URL for storage | `https://your-project.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | Supabase Service Role Key (Backend only, never expose to frontend) | `eyJhbGciOi...` |
| `SUPABASE_STORAGE_BUCKET` | Optional | Supabase Storage bucket name | `equipment-images` |
| `RAZORPAY_KEY_ID` | Optional | Razorpay Test Key ID | `rzp_test_AgriRentDemoKey123` |
| `RAZORPAY_KEY_SECRET` | Optional | Razorpay Test Key Secret | `AgriRentDemoKeySecretXYZ456` |
| `RAZORPAY_WEBHOOK_SECRET` | Optional | Razorpay Webhook Secret | `whsec_AgriRentTestWebhook789` |

---

## 3. Supabase Configuration & Migration Steps

### Step 3.1: Create a Supabase Project
1. Log in to [Supabase Dashboard](https://supabase.com/dashboard) and click **New Project**.
2. Set Project Name to `AgriRent`, select region (e.g., `ap-south-1 Mumbai`), and generate a strong Database Password.

### Step 3.2: Get Connection String
1. In Supabase Dashboard, navigate to **Project Settings** > **Database**.
2. Locate **Connection string** > **URI**.
3. Choose **Connection Pooling** (Mode: Transaction, Port: 6543) for serverless/containerized deployments or direct port 5432:
   ```text
   postgresql://postgres.[project-ref]:[password]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require
   ```
4. Set this as `DATABASE_URL` in your backend environment.

### Step 3.3: Set Up Supabase Storage
1. Navigate to **Storage** in the Supabase Dashboard.
2. Click **Create new bucket**:
   - Bucket Name: `equipment-images`
   - Public Bucket: **Enabled** (for public equipment catalog viewing)
   - Allowed MIME Types: `image/jpeg, image/png, image/webp`
   - Maximum File Size: `5MB`

### Step 3.4: Run Database Migrations to Supabase
Run migrations against the Supabase database:
```bash
cd backend
export DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require"
python manage.py migrate
python seed.py
```
This automatically applies all 7 database migrations, creates the custom `User`, `Equipment`, `Booking`, `OperatorProfile`, `PaymentTransaction` tables, and configures Row Level Security (`0007_supabase_rls_policies`).

---

## 4. Vercel Deployment (Frontend)

The frontend is fully configured for Vercel with SPA routing rewrite rules in `frontend/vercel.json`.

### Option A: Via Vercel Web Dashboard (Recommended)
1. Push your repository to GitHub.
2. Go to [Vercel Dashboard](https://vercel.com/new).
3. Select your repository `AgriRent`.
4. In **Project Settings**:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Under **Environment Variables**, add:
   - `VITE_API_BASE_URL` = `https://<your-deployed-django-backend>.onrender.com`
   - `VITE_SUPABASE_URL` = `https://<your-project>.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `<your-supabase-anon-key>`
   - `VITE_SUPABASE_STORAGE_BUCKET` = `equipment-images`
6. Click **Deploy**.

### Option B: Via Vercel CLI
```bash
cd frontend
vercel
# When prompted:
# Set root directory to current (./frontend)
# Framework: Vite
vercel --prod
```

---

## 5. Recommended Django Backend Hosting (Render / Railway)

Because Django is a long-running WSGI application, hosting it on a specialized Python/Docker PaaS (such as Render or Railway) provides always-on reliability, automated SSL, worker process management, and connection to Supabase.

### Deploying on Render (Step-by-Step):
1. Create a free account at [Render.com](https://render.com).
2. Click **New +** > **Web Service**.
3. Connect your GitHub repository.
4. Settings:
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate`
   - **Start Command**: `gunicorn agrirent.wsgi:application --bind 0.0.0.0:$PORT`
   - **Health Check Path**: `/api/health/`
5. In **Environment Variables**, set:
   - `DJANGO_SECRET_KEY`: `<generate-random-secret>`
   - `DEBUG`: `False`
   - `ALLOWED_HOSTS`: `*`
   - `DATABASE_URL`: `<your-supabase-db-url-with-sslmode=require>`
   - `CORS_ALLOWED_ORIGINS`: `https://<your-app>.vercel.app`
   - `CSRF_TRUSTED_ORIGINS`: `https://<your-app>.vercel.app`
   - `SUPABASE_URL`: `https://<your-project>.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY`: `<your-service-role-key>`

---

## 6. Local Development Instructions

### Running with Docker Compose (Recommended)
```bash
# Start all services (local postgres, backend gunicorn/django, frontend nginx)
docker-compose up --build

# Access:
# Frontend: http://localhost:80
# Backend API: http://localhost:8000
# Health Check: http://localhost:8000/api/health/
```

### Running Locally without Docker
**1. Backend:**
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt
cd backend
python manage.py migrate
python seed.py
python manage.py runserver 0.0.0.0:8000
```

**2. Frontend:**
```bash
cd frontend
npm install
npm run dev
# Access at http://localhost:5173
```

---

## 7. Automated Verification Commands

Run unit tests and verify build status:

```bash
# Run Django backend test suite (All 10 tests including health & storage)
cd backend && python manage.py test api

# Run production frontend build
cd frontend && npm run build
```
