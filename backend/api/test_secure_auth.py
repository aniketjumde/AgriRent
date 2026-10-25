from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
from rest_framework_simplejwt.tokens import RefreshToken, OutstandingToken, BlacklistedToken
from api.models import User, OperatorProfile
from api.auth_utils import hash_token

class SecureAuthTestSuite(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.strong_password = "SecurePassword@2026"
        
        # Pre-seed verified user
        self.verified_user = User.objects.create_user(
            username="verified_farmer",
            email="verified.farmer@agrirent.demo",
            role="Farmer",
            is_verified=True,
            is_email_verified=True
        )
        self.verified_user.set_password(self.strong_password)
        self.verified_user.save()

        # Pre-seed unverified user
        self.unverified_user = User.objects.create_user(
            username="unverified_farmer",
            email="unverified.farmer@agrirent.demo",
            role="Farmer",
            is_verified=False,
            is_email_verified=False
        )
        self.unverified_user.set_password(self.strong_password)
        self.raw_verify_token = "482910"
        self.unverified_user.email_verification_token = hash_token(self.raw_verify_token)
        self.unverified_user.email_verification_sent_at = timezone.now()
        self.unverified_user.save()

    # --- 1. REGISTRATION TESTS ---

    def test_successful_registration(self):
        res = self.client.post('/api/auth/register/', {
            'username': 'ram_patil',
            'email': 'ram.patil@agrirent.demo',
            'password': 'StrongPassword#2026',
            'role': 'Farmer',
            'phone_number': '+919822998877'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertFalse(res.data['is_email_verified'])
        self.assertNotIn('password', res.data)
        
        # Check DB
        user = User.objects.get(username='ram_patil')
        self.assertFalse(user.is_email_verified)
        self.assertFalse(user.is_verified)
        self.assertTrue(user.email_verification_token is not None)
        self.assertTrue(user.check_password('StrongPassword#2026'))

    def test_duplicate_email_rejected_case_insensitive(self):
        res = self.client.post('/api/auth/register/', {
            'username': 'another_farmer',
            'email': 'VERIFIED.FARMER@agrirent.demo',  # Upper-case variant
            'password': 'StrongPassword#2026',
            'role': 'Farmer'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', res.data)

    def test_duplicate_username_rejected(self):
        res = self.client.post('/api/auth/register/', {
            'username': 'verified_farmer',
            'email': 'new.different@agrirent.demo',
            'password': 'StrongPassword#2026',
            'role': 'Farmer'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('username', res.data)

    def test_email_as_username_rejected(self):
        res = self.client.post('/api/auth/register/', {
            'username': 'user@domain.com',
            'email': 'user@domain.com',
            'password': 'StrongPassword#2026',
            'role': 'Farmer'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('username', res.data)

    def test_phone_number_validation(self):
        # Valid Indian 10 digits
        res = self.client.post('/api/auth/register/', {
            'username': 'phone_test_1',
            'email': 'phone1@agrirent.demo',
            'password': 'StrongPassword#2026',
            'phone_number': '9822123456',
            'role': 'Farmer'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        u = User.objects.get(username='phone_test_1')
        self.assertEqual(u.phone_number, '+919822123456')

        # Invalid phone format
        res2 = self.client.post('/api/auth/register/', {
            'username': 'phone_test_2',
            'email': 'phone2@agrirent.demo',
            'password': 'StrongPassword#2026',
            'phone_number': '12345',
            'role': 'Farmer'
        }, format='json')
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('phone_number', res2.data)

    def test_weak_password_rejected(self):
        res = self.client.post('/api/auth/register/', {
            'username': 'weak_user',
            'email': 'weak.user@agrirent.demo',
            'password': 'short',  # < 12 chars
            'role': 'Farmer'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', res.data)

    def test_unauthorized_admin_registration_rejected(self):
        res = self.client.post('/api/auth/register/', {
            'username': 'evil_admin',
            'email': 'evil.admin@agrirent.demo',
            'password': 'StrongPassword#2026',
            'role': 'Admin'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('role', res.data)

    def test_operator_registration_creates_profile(self):
        res = self.client.post('/api/auth/register/', {
            'username': 'certified_operator',
            'email': 'certified.op@agrirent.demo',
            'password': 'StrongPassword#2026',
            'role': 'Operator',
            'phone_number': '+919822112233'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(username='certified_operator')
        self.assertTrue(OperatorProfile.objects.filter(user=user).exists())

    # --- 2. EMAIL VERIFICATION & RESEND TESTS ---

    def test_successful_email_verification(self):
        res = self.client.post('/api/auth/verify-email/', {
            'email': 'unverified.farmer@agrirent.demo',
            'token': self.raw_verify_token
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('token', res.data)
        self.assertIn('access', res.data['token'])
        
        user = User.objects.get(username='unverified_farmer')
        self.assertTrue(user.is_email_verified)
        self.assertTrue(user.is_verified)
        self.assertIsNone(user.email_verification_token)  # Consumed

    def test_universal_bypass_123456_rejected(self):
        res = self.client.post('/api/auth/verify-email/', {
            'email': 'unverified.farmer@agrirent.demo',
            'token': '123456'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        user = User.objects.get(username='unverified_farmer')
        self.assertFalse(user.is_email_verified)

    def test_expired_verification_token_rejected(self):
        self.unverified_user.email_verification_sent_at = timezone.now() - timedelta(minutes=6)
        self.unverified_user.save()
        
        res = self.client.post('/api/auth/verify-email/', {
            'email': 'unverified.farmer@agrirent.demo',
            'token': self.raw_verify_token
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('expired', res.data['error'].lower())

    def test_token_reuse_rejected(self):
        # 1st attempt succeeds
        self.client.post('/api/auth/verify-email/', {
            'email': 'unverified.farmer@agrirent.demo',
            'token': self.raw_verify_token
        }, format='json')
        # 2nd attempt must fail
        res = self.client.post('/api/auth/verify-email/', {
            'email': 'unverified.farmer@agrirent.demo',
            'token': self.raw_verify_token
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_resend_verification_code_and_cooldown(self):
        # Initial resend right after creation should enforce 60s cooldown
        cooldown_res = self.client.post('/api/auth/resend-code/', {
            'email': 'unverified.farmer@agrirent.demo'
        }, format='json')
        self.assertEqual(cooldown_res.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertIn('wait', cooldown_res.data['error'].lower())

        # Fast forward time past 60 seconds
        self.unverified_user.email_verification_sent_at = timezone.now() - timedelta(seconds=65)
        self.unverified_user.save()

        success_res = self.client.post('/api/auth/resend-code/', {
            'email': 'unverified.farmer@agrirent.demo'
        }, format='json')
        self.assertEqual(success_res.status_code, status.HTTP_200_OK)
        self.assertIn('fresh', success_res.data['message'].lower())

    # --- 3. LOGIN TESTS ---

    def test_login_with_email_and_password(self):
        res = self.client.post('/api/auth/login/', {
            'email': 'verified.farmer@agrirent.demo',
            'password': self.strong_password
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('token', res.data)
        self.assertIn('access', res.data['token'])
        self.assertIn('refresh', res.data['token'])
        self.assertEqual(res.data['user']['email'], 'verified.farmer@agrirent.demo')

    def test_login_with_incorrect_password_fails(self):
        res = self.client.post('/api/auth/login/', {
            'email': 'verified.farmer@agrirent.demo',
            'password': 'WrongPasswordXYZ123'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_unverified_account_login_rejected(self):
        res = self.client.post('/api/auth/login/', {
            'email': 'unverified.farmer@agrirent.demo',
            'password': self.strong_password
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(res.data['is_email_verified'])

    def test_inactive_account_login_rejected(self):
        self.verified_user.is_active = False
        self.verified_user.save()
        res = self.client.post('/api/auth/login/', {
            'email': 'verified.farmer@agrirent.demo',
            'password': self.strong_password
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    # --- 4. SESSION & REFRESH TOKEN ROTATION & LOGOUT TESTS ---

    def test_refresh_token_rotation_and_blacklisting(self):
        # 1. Login
        login_res = self.client.post('/api/auth/login/', {
            'email': 'verified.farmer@agrirent.demo',
            'password': self.strong_password
        }, format='json')
        refresh_token_1 = login_res.data['token']['refresh']

        # 2. Refresh token
        refresh_res = self.client.post('/api/auth/refresh/', {
            'refresh': refresh_token_1
        }, format='json')
        self.assertEqual(refresh_res.status_code, status.HTTP_200_OK)
        refresh_token_2 = refresh_res.data.get('refresh')
        self.assertIsNotNone(refresh_token_2)
        self.assertNotEqual(refresh_token_1, refresh_token_2)

        # 3. Old refresh token reuse MUST fail because it was blacklisted
        reuse_res = self.client.post('/api/auth/refresh/', {
            'refresh': refresh_token_1
        }, format='json')
        self.assertEqual(reuse_res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_revokes_refresh_token(self):
        # Login
        login_res = self.client.post('/api/auth/login/', {
            'email': 'verified.farmer@agrirent.demo',
            'password': self.strong_password
        }, format='json')
        access_token = login_res.data['token']['access']
        refresh_token = login_res.data['token']['refresh']

        # Logout with auth header
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        logout_res = self.client.post('/api/auth/logout/', {
            'refresh': refresh_token
        }, format='json')
        self.assertEqual(logout_res.status_code, status.HTTP_200_OK)

        # Attempt to use blacklisted refresh token
        retry_res = self.client.post('/api/auth/refresh/', {
            'refresh': refresh_token
        }, format='json')
        self.assertEqual(retry_res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_me_protected_endpoint(self):
        # Unauthenticated request fails
        unauth_res = self.client.get('/api/auth/me/')
        self.assertEqual(unauth_res.status_code, status.HTTP_401_UNAUTHORIZED)

        # Authenticated succeeds
        login_res = self.client.post('/api/auth/login/', {
            'email': 'verified.farmer@agrirent.demo',
            'password': self.strong_password
        }, format='json')
        access_token = login_res.data['token']['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        
        me_res = self.client.get('/api/auth/me/')
        self.assertEqual(me_res.status_code, status.HTTP_200_OK)
        self.assertEqual(me_res.data['email'], 'verified.farmer@agrirent.demo')

    # --- 5. PASSWORD RESET LIFECYCLE TESTS ---

    def test_forgot_password_generic_response(self):
        # Account exists
        res = self.client.post('/api/auth/forgot-password/', {
            'email': 'verified.farmer@agrirent.demo'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # Non-existent account returns the SAME response to prevent enumeration
        res_fake = self.client.post('/api/auth/forgot-password/', {
            'email': 'does.not.exist@agrirent.demo'
        }, format='json')
        self.assertEqual(res_fake.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['message'], res_fake.data['message'])

    def test_password_reset_flow(self):
        # In unit test, manually set token
        raw_reset_token = "valid-secret-reset-token-789"
        self.verified_user.password_reset_token = hash_token(raw_reset_token)
        self.verified_user.password_reset_sent_at = timezone.now()
        self.verified_user.save()

        # Execute reset
        new_pass = "BrandNewSecurePassword#2026"
        reset_res = self.client.post('/api/auth/reset-password/', {
            'email': 'verified.farmer@agrirent.demo',
            'token': raw_reset_token,
            'new_password': new_pass
        }, format='json')
        self.assertEqual(reset_res.status_code, status.HTTP_200_OK)

        # Old password no longer works
        old_login = self.client.post('/api/auth/login/', {
            'email': 'verified.farmer@agrirent.demo',
            'password': self.strong_password
        }, format='json')
        self.assertEqual(old_login.status_code, status.HTTP_401_UNAUTHORIZED)

        # New password works
        new_login = self.client.post('/api/auth/login/', {
            'email': 'verified.farmer@agrirent.demo',
            'password': new_pass
        }, format='json')
        self.assertEqual(new_login.status_code, status.HTTP_200_OK)
