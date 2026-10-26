#!/bin/sh
set -e

# Change directory to the Django project directory (where manage.py resides)
if [ -f "/app/manage.py" ]; then
    cd /app
elif [ -f "./backend/manage.py" ]; then
    cd ./backend
fi

echo "==> Running database migrations..."
# Attempt normal migration; if inconsistent history is encountered, sync with fake-initial
if ! python manage.py migrate --noinput; then
    echo "==> Resolving migration dependencies with fake-initial..."
    python manage.py migrate auth --fake || true
    python manage.py migrate contenttypes --fake || true
    python manage.py migrate admin --fake || true
    python manage.py migrate sessions --fake || true
    python manage.py migrate api --fake-initial || true
    python manage.py migrate --noinput || true
fi

echo "==> Collecting static files..."
python manage.py collectstatic --noinput

PORT="${PORT:-8000}"
WORKERS="${WEB_CONCURRENCY:-2}"
echo "==> Starting Gunicorn on 0.0.0.0:${PORT} with ${WORKERS} worker(s)..."
exec gunicorn agrirent.wsgi:application \
    --bind "0.0.0.0:${PORT}" \
    --workers "${WORKERS}" \
    --threads 4 \
    --timeout 120
