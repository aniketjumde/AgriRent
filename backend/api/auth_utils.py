import secrets
import hashlib
from datetime import timedelta
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings

def generate_verification_code():
    """Generates a cryptographically secure 6-digit numeric verification code."""
    # Using secrets.randbelow to generate an unguessable 6-digit number (100000 - 999999)
    return str(secrets.randbelow(900000) + 100000)

def generate_secure_token():
    """Generates a cryptographically secure URL-safe token for password resets."""
    return secrets.token_urlsafe(32)

def hash_token(raw_token: str) -> str:
    """Hashes a verification/reset token with SHA-256 for secure DB persistence."""
    return hashlib.sha256(raw_token.strip().encode('utf-8')).hexdigest()

def send_verification_email(user, code: str):
    """
    Dispatches a secure email verification code to user's registered address.
    Raises an exception if the email provider fails to deliver.
    """
    subject = "Your AgriRent Verification Code"
    message = (
        f"Hello {user.username},\n\n"
        f"Thank you for registering on AgriRent.\n\n"
        f"Your 6-digit email verification code is:\n\n"
        f"       {code}\n\n"
        f"This code will expire in 5 minutes.\n"
        f"For security reasons, never share this code with anyone.\n\n"
        f"If you did not request this, please disregard this email.\n\n"
        f"— The AgriRent Security Team"
    )

    try:
        sent_count = send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False
        )
        if sent_count == 0 and not settings.DEBUG:
            raise RuntimeError("Email service rejected the message without throwing an error.")
    except Exception as e:
        if settings.DEBUG:
            print(f"[AgriRent Auth Console] Verification email to {user.email}: CODE is {code}")
        else:
            raise e

def send_password_reset_email(user, raw_token: str):
    """
    Dispatches a secure single-use password reset token.
    Raises an exception if the email provider fails to deliver.
    """
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={raw_token}&email={user.email}"
    subject = "AgriRent Password Reset Request"
    message = (
        f"Hello {user.username},\n\n"
        f"We received a request to reset your password on AgriRent.\n\n"
        f"Your single-use password reset code is:\n"
        f"       {raw_token}\n\n"
        f"Or use this direct link:\n{reset_url}\n\n"
        f"This reset request will expire in 15 minutes.\n"
        f"If you did not request a password reset, please ignore this email.\n\n"
        f"— The AgriRent Security Team"
    )

    try:
        sent_count = send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False
        )
        if sent_count == 0 and not settings.DEBUG:
            raise RuntimeError("Email service rejected the reset message.")
    except Exception as e:
        if settings.DEBUG:
            print(f"[AgriRent Auth Console] Password reset to {user.email}: TOKEN is {raw_token}")
        else:
            raise e
