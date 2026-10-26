from datetime import datetime, timedelta
from django.test import TestCase
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from api.models import Equipment, Booking, Notification

User = get_user_model()

class BookingLifecycleTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.farmer = User.objects.create_user(
            username='pune_farmer',
            email='farmer@example.com',
            password='Password123!',
            role='Farmer'
        )
        self.owner = User.objects.create_user(
            username='pune_owner',
            email='owner@example.com',
            password='Password123!',
            role='Owner'
        )
        self.other_farmer = User.objects.create_user(
            username='other_farmer',
            email='other@example.com',
            password='Password123!',
            role='Farmer'
        )
        self.equipment = Equipment.objects.create(
            title='Mahindra 575 DI Tractor',
            category='Tractor',
            description='Standard farm tractor',
            owner=self.owner,
            address='Pune, Maharashtra',
            rental_price_per_hour=450.0,
            is_available=True
        )

    def test_booking_cancellation_by_farmer(self):
        start = datetime.now() + timedelta(days=2)
        end = start + timedelta(hours=8)
        booking = Booking.objects.create(
            equipment=self.equipment,
            farmer=self.farmer,
            start_date=start,
            end_date=end,
            total_cost=3600.0,
            status='Pending',
            escrow_status='Held'
        )

        # Authenticate as farmer
        self.client.force_authenticate(user=self.farmer)
        response = self.client.patch(f'/api/bookings/{booking.id}/status/', {'status': 'Cancelled'}, format='json')
        self.assertEqual(response.status_code, 200)
        
        booking.refresh_from_db()
        self.assertEqual(booking.status, 'Cancelled')
        self.assertEqual(booking.escrow_status, 'Refunded')
        self.assertTrue(booking.equipment.is_available)

    def test_booking_cancellation_unauthorized_user(self):
        start = datetime.now() + timedelta(days=2)
        end = start + timedelta(hours=8)
        booking = Booking.objects.create(
            equipment=self.equipment,
            farmer=self.farmer,
            start_date=start,
            end_date=end,
            total_cost=3600.0,
            status='Pending',
            escrow_status='Held'
        )

        # Authenticate as another farmer
        self.client.force_authenticate(user=self.other_farmer)
        response = self.client.patch(f'/api/bookings/{booking.id}/status/', {'status': 'Cancelled'}, format='json')
        self.assertEqual(response.status_code, 403)

    def test_owner_approval_and_rejection(self):
        start = datetime.now() + timedelta(days=3)
        end = start + timedelta(hours=8)
        booking = Booking.objects.create(
            equipment=self.equipment,
            farmer=self.farmer,
            start_date=start,
            end_date=end,
            total_cost=3600.0,
            status='Pending',
            escrow_status='Held'
        )

        # Owner approves
        self.client.force_authenticate(user=self.owner)
        res = self.client.patch(f'/api/bookings/{booking.id}/status/', {'status': 'Approved'}, format='json')
        self.assertEqual(res.status_code, 200)
        booking.refresh_from_db()
        self.assertEqual(booking.status, 'Approved')
        self.assertFalse(booking.equipment.is_available)

        # Farmer cannot reject, only owner/admin
        self.client.force_authenticate(user=self.farmer)
        res_fail = self.client.patch(f'/api/bookings/{booking.id}/status/', {'status': 'Rejected'}, format='json')
        self.assertEqual(res_fail.status_code, 403)

        # Farmer can cancel an approved booking before it starts
        res_cancel = self.client.patch(f'/api/bookings/{booking.id}/status/', {'status': 'Cancelled'}, format='json')
        self.assertEqual(res_cancel.status_code, 200)
        booking.refresh_from_db()
        self.assertEqual(booking.status, 'Cancelled')
        self.assertTrue(booking.equipment.is_available)
        self.assertEqual(booking.escrow_status, 'Refunded')
