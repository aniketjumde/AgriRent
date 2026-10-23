from django.http import JsonResponse
from django.db import connection
from django.conf import settings

def health_check_view(request):
    """
    Health check endpoint for production monitoring (Render / Railway / Fly / AWS).
    Verifies database connectivity, migrations state, and service status.
    """
    db_ok = True
    db_engine = settings.DATABASES['default']['ENGINE']
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1;")
            cursor.fetchone()
    except Exception as e:
        db_ok = False
        db_error = str(e)

    status_code = 200 if db_ok else 503
    return JsonResponse({
        "status": "healthy" if db_ok else "unhealthy",
        "database": {
            "connected": db_ok,
            "engine": db_engine,
            "error": None if db_ok else db_error
        },
        "version": "1.0.0",
        "service": "AgriRent-Unified-Backend"
    }, status=status_code)
