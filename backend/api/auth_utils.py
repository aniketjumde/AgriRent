import secrets
import hashlib
from datetime import timedelta
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings

def generate_secure_token():
    """Generates a cryptographically secure 64-char URL-safe token."""
    return secrets.token_urlsafe(48)

def hash_token(raw_token: str) -> str:
    """Hashes a verification/reset token with SHA-256 for secure DB persistence."""
    return hashlib.sha256(raw_token.strip().encode('utf-8')).hexdigest()

def send_verification_email(user, raw_token: str):
    """Dispatches a secure email verification link to user's registered address."""
    verification_url = f"{settings.FRONTEND_URL}/verify-email?token={raw_token}&email={user.email}"
    subject = "Verify your AgriRent Account"
    message = (
        f"Hello {user.username},\n\n"
        f"Thank you for registering on AgriRent. Please verify your email address by clicking the link below:\n\n"
        f"{verification_url}\n\n"
        f"Or use your secure verification code in the app:\n{raw_token}\n\n"
        f"This link and code will expire in 24 hours.\n\n"
        f"If you did not create this account, please ignore this email.\n\n"
        f"— The AgriRent Security Team"
    )
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False
        )
    except Exception as e:
        # In DEBUG, failures can be caught while development console prints the output
        if settings.DEBUG:
            print(f"[AgriRent Auth] Email dispatch simulation for {user.email}: {verification_url}")
        else:
            raise e

def send_password_reset_email(user, raw_token: str):
    """Dispatches a secure single-use password reset token."""
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={raw_token}&email={user.email}"
    subject = "AgriRent Password Reset Request"
    message = (
        f"Hello {user.username},\n\n"
        f"We received a request to reset your password on AgriRent. Use the link below or enter the reset token:\n\n"
        f"{reset_url}\n\n"
        f"Reset Token:\n{raw_token}\n\n"
        f"This token is valid for 1 hour and can only be used once.\n\n"
        f"If you did not request a password reset, please ignore this email immediately.\n\n"
        f"— The AgriRent Security Team"
    )
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False
        )
    except Exception as e:
        if settings.DEBUG:
            print(f"[AgriRent Auth] Password reset simulation for {user.email}: {reset_url}")
        else:
            raise e
