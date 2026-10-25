import json
from datetime import datetime, timedelta
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient
from api.models import Equipment, Booking, PaymentTransaction, OperatorProfile, OperatorJobAssignment

User = get_user_model()

class FarmerPricingDashboardTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.farmer = User.objects.create_user(
            username='farmer_test',
            email='farmer.test@agrirent.demo',
            password='Password@123456',
            role='Farmer',
            is_active=True,
            is_verified=True,
            is_email_verified=True
        )
        self.owner = User.objects.create_user(
            username='owner_test',
            email='owner.test@agrirent.demo',
            password='Password@123456',
            role='Owner',
            is_active=True,
            is_verified=True,
            is_email_verified=True
        )
        self.equipment = Equipment.objects.create(
            title='John Deere 5310 Tractor',
            category='Tractor',
            description='Heavy-duty agricultural tractor',
            rental_price_per_hour=850.00,
            location_latitude=18.5204,
            location_longitude=73.8567,
            address='Hadapsar, Pune, Maharashtra',
            owner=self.owner,
            is_available=True,
            is_verified=True
        )
        self.client.force_authenticate(user=self.farmer)

    def test_nearby_equipment_api_with_pricing_factors(self):
        response = self.client.get('/api/equipment/nearby/?lat=18.5204&lng=73.8567&radius=50')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data['total_found'], 1)
        first_item = response.data['results'][0]
        self.assertIn('pricing_factors', first_item)
        self.assertIn('seasonal_factor', first_item['pricing_factors'])
        self.assertIn('demand_factor', first_item['pricing_factors'])
        self.assertEqual(first_item['rental_price_per_day'], 6800.0)

    def test_pricing_quote_calculation(self):
        payload = {
            'equipment_id': self.equipment.id,
            'farmer_lat': 18.5300,
            'farmer_lng': 73.8600,
            'rental_type': 'hourly',
            'duration': 5.0,
            'acreage': 3.0,
            'farming_operation': 'Plowing',
            'requires_operator': True,
            'delivery_option': 'Delivery'
        }
        response = self.client.post('/api/pricing/quote/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('quote_id', response.data)
        self.assertIn('quote_expires_at', response.data)
        breakdown = response.data['pricing_breakdown']
        self.assertGreater(breakdown['raw_base_rental'], 0)
        self.assertGreater(breakdown['estimated_total'], 0)
        self.assertGreater(breakdown['operator_charges'], 0)
        self.assertGreater(breakdown['transport_charges'], 0)
        self.assertEqual(breakdown['gst_tax_rate_pct'], 5)

    def test_cart_validation_with_pricing_engine(self):
        payload = {
            'farmer_lat': 18.5204,
            'farmer_lng': 73.8567,
            'items': [{
                'equipment_id': self.equipment.id,
                'rental_type': 'daily',
                'duration': 3.0,
                'acreage': 4.0,
                'farming_operation': 'Soil Prep',
                'requires_operator': False,
                'delivery_option': 'Pickup'
            }]
        }
        response = self.client.post('/api/cart/validate/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['valid'])
        self.assertEqual(len(response.data['items']), 1)
        self.assertIn('duration_discount_amount', response.data['items'][0])

    def test_booking_creation_with_authoritative_price_lock(self):
        now = timezone.now()
        start = (now + timedelta(hours=2)).isoformat()
        end = (now + timedelta(hours=6)).isoformat()
        payload = {
            'equipment': self.equipment.id,
            'start_date': start,
            'end_date': end,
            'rental_type': 'hourly',
            'duration': 4.0,
            'acreage': 2.5,
            'farming_operation': 'Land Preparation',
            'requires_operator': True,
            'delivery_option': 'Delivery',
            'farmer_lat': 18.5204,
            'farmer_lng': 73.8567
        }
        response = self.client.post('/api/bookings/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        booking_id = response.data['id']
        booking = Booking.objects.get(pk=booking_id)
        self.assertEqual(booking.status, 'Pending')
        self.assertGreater(booking.total_cost, 0)
        self.assertIn('[Price Lock]', booking.notes)

    def test_farmer_dashboard_analytics(self):
        response = self.client.get('/api/dashboard/farmer/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_bookings', response.data)
        self.assertIn('active_rentals', response.data)
        self.assertIn('pending_bookings', response.data)
        self.assertIn('completed_rentals', response.data)
        self.assertIn('total_spent', response.data)
        self.assertIn('nearby_available_equipment', response.data)
        self.assertIn('recent_payments', response.data)
