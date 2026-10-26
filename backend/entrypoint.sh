#!/bin/sh
set -e

# Change directory to the Django project directory (where manage.py resides)
if [ -f "/app/manage.py" ]; then
    cd /app
elif [ -f "./backend/manage.py" ]; then
    cd ./backend
fi

echo "==> Running database migrations..."
python manage.py migrate --noinput

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
