import os
import urllib.parse
from pathlib import Path
from datetime import timedelta

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Quick-start development settings - unsuitable for production
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'django-insecure-agrirent-ai-secret-key-123456')

DEBUG = os.environ.get('DEBUG', 'True').lower() in ('true', '1', 't')

allowed_hosts_env = os.environ.get('ALLOWED_HOSTS', '*')
if allowed_hosts_env == '*':
    ALLOWED_HOSTS = ['*']
else:
    ALLOWED_HOSTS = [h.strip() for h in allowed_hosts_env.split(',') if h.strip()]

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third-party apps
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    
    # Local apps
    'api',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware', # Put at the top
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'agrirent.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'agrirent.wsgi.application'

# Database configuration: Local PostgreSQL or local SQLite
DATABASE_URL = os.environ.get('DATABASE_URL')
DB_NAME = os.environ.get('DB_NAME', '')
DB_USER = os.environ.get('DB_USER', '')
DB_PASSWORD = os.environ.get('DB_PASSWORD', '')
DB_HOST = os.environ.get('DB_HOST', '')
DB_PORT = os.environ.get('DB_PORT', '')


def is_placeholder_database_url(url):
    if not url:
        return True
    lower = url.lower()
    placeholders = (
        'yourprojectref',
        'your-db-password',
        'replace-with-a-cryptographically',
        'postgres.yourprojectref',
        'supabase.com',
    )
    return any(item in lower for item in placeholders)


if DATABASE_URL and not is_placeholder_database_url(DATABASE_URL):
    parsed_db = urllib.parse.urlparse(DATABASE_URL)
    query_params = urllib.parse.parse_qs(parsed_db.query)
    ssl_mode = os.environ.get(
        'DB_SSLMODE',
        query_params.get('sslmode', ['prefer'])[0]
    )
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': parsed_db.path.lstrip('/'),
            'USER': parsed_db.username or '',
            'PASSWORD': urllib.parse.unquote(parsed_db.password or ''),
            'HOST': parsed_db.hostname or '',
            'PORT': parsed_db.port or 5432,
            'OPTIONS': {
                'sslmode': ssl_mode,
            },
            'CONN_MAX_AGE': int(os.environ.get('CONN_MAX_AGE', 600)),
        }
    }
elif DB_NAME and DB_USER and not is_placeholder_database_url(DB_NAME):
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': DB_NAME,
            'USER': DB_USER,
            'PASSWORD': DB_PASSWORD,
            'HOST': DB_HOST,
            'PORT': DB_PORT or '5432',
            'OPTIONS': {
                'sslmode': os.environ.get('DB_SSLMODE', 'prefer'),
            },
            'CONN_MAX_AGE': int(os.environ.get('CONN_MAX_AGE', 600)),
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {
            'min_length': 12,
        }
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Authentication Backends: Email-first backend with username fallback
AUTHENTICATION_BACKENDS = [
    'api.backends.EmailOrUsernameBackend',
    'django.contrib.auth.backends.ModelBackend',
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Custom User Model
AUTH_USER_MODEL = 'api.User'

# REST Framework configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
        'rest_framework.throttling.ScopedRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/day',
        'user': '1000/day',
        'auth_login': '15/minute',
        'auth_register': '10/minute',
        'auth_reset': '5/minute',
        'auth_verify': '10/minute',
    }
}

# SimpleJWT configuration
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# Email Configuration (Console fallback in DEBUG or local SMTP)
EMAIL_BACKEND = os.environ.get('EMAIL_BACKEND', 'django.core.mail.backends.console.EmailBackend' if DEBUG else 'django.core.mail.backends.smtp.EmailBackend')
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'localhost')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', 587))
EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'False').lower() in ('true', '1', 't')
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'AgriRent Support <noreply@agrirent.local>')
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173')

# CORS Configuration
cors_origins_env = os.environ.get('CORS_ALLOWED_ORIGINS')
if cors_origins_env:
    CORS_ALLOWED_ORIGINS = [orig.strip() for orig in cors_origins_env.split(',') if orig.strip()]
    CORS_ALLOW_ALL_ORIGINS = False
else:
    CORS_ALLOW_ALL_ORIGINS = True

CORS_ALLOW_CREDENTIALS = True

csrf_trusted_env = os.environ.get('CSRF_TRUSTED_ORIGINS')
if csrf_trusted_env:
    CSRF_TRUSTED_ORIGINS = [orig.strip() for orig in csrf_trusted_env.split(',') if orig.strip()]
else:
    CSRF_TRUSTED_ORIGINS = [
        'http://localhost:5173',
        'http://localhost:3000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:3000',
    ]

# Razorpay Configuration (Test Mode credentials configurable via environment)
RAZORPAY_KEY_ID = os.environ.get('RAZORPAY_KEY_ID', 'rzp_test_AgriRentDemoKey123')
RAZORPAY_KEY_SECRET = os.environ.get('RAZORPAY_KEY_SECRET', 'AgriRentDemoKeySecretXYZ456')
RAZORPAY_WEBHOOK_SECRET = os.environ.get('RAZORPAY_WEBHOOK_SECRET', 'whsec_AgriRentTestWebhook789')
