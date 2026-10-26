from datetime import datetime, timedelta
from django.utils import timezone
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from api.models import User, Equipment, Booking, OperatorProfile, OperatorJobAssignment
from ai.equipment_matcher import find_and_rank_equipment_and_operators, check_equipment_schedule_availability

class AIMatchingAndWorkflowTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # 1. Create Users
        self.farmer_user = User.objects.create_user(
            username='test_farmer',
            email='test_farmer@agrirent.local',
            password='TestPassword123!',
            role='Farmer',
            is_verified=True,
            reliability_score=4.9
        )

        self.owner_user = User.objects.create_user(
            username='test_owner',
            email='test_owner@agrirent.local',
            password='TestPassword123!',
            role='Owner',
            is_verified=True,
            reliability_score=4.8
        )

        self.operator_user = User.objects.create_user(
            username='test_operator',
            email='test_operator@agrirent.local',
            password='TestPassword123!',
            role='Operator',
            is_verified=True,
            reliability_score=4.7
        )

        # 2. Operator Profile
        self.operator_profile = OperatorProfile.objects.create(
            user=self.operator_user,
            full_name='Ramesh Operator',
            phone='+919876543210',
            experience_years=6,
            skills=['Plowing', 'Harvesting', 'Tilling'],
            supported_machinery=['Tractor', 'Harvester', 'Rotavator'],
            service_area='Pune Rural',
            service_radius_km=35.0,
            current_latitude=18.5204,
            current_longitude=73.8567,
            is_available=True,
            is_online=True,
            verification_status='Verified',
            hourly_compensation_rate=250.00
        )

        # 3. Create Available Equipment
        self.equipment = Equipment.objects.create(
            title='Mahindra 575 DI Tractor',
            category='Tractor',
            description='High performance 45 HP Tractor with rotavator attachment.',
            rental_price_per_hour=650.00,
            location_latitude=18.5300,
            location_longitude=73.8500,
            address='Shivajinagar, Pune',
            owner=self.owner_user,
            is_available=True,
            is_verified=True
        )

        # 4. Create Ineligible / Maintenance Equipment
        self.maintenance_equipment = Equipment.objects.create(
            title='John Deere Harvester In Maintenance',
            category='Harvester',
            description='Undergoing scheduled oil change',
            rental_price_per_hour=2200.00,
            location_latitude=18.5200,
            location_longitude=73.8500,
            address='Hadapsar, Pune',
            owner=self.owner_user,
            is_available=False,
            is_verified=True
        )

    def test_unauthenticated_cannot_call_ai_match(self):
        """Test 1: Only authenticated farmers can initiate AI matching."""
        response = self.client.post('/api/ai/match/', {
            'farming_operation': 'Land Preparation',
            'latitude': 18.5204,
            'longitude': 73.8567
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_unavailable_equipment_excluded_from_matching(self):
        """Test 2: Unavailable or maintenance equipment is excluded from matching candidates."""
        now = timezone.now()
        start = (now + timedelta(days=2)).isoformat()
        end = (now + timedelta(days=2, hours=4)).isoformat()

        res = find_and_rank_equipment_and_operators(
            farming_operation='Land Preparation',
            farmer_lat=18.5204,
            farmer_lng=73.8567,
            start_date_str=start,
            end_date_str=end,
            requires_operator=True
        )

        equip_ids = [r['equipment']['id'] for r in res['recommendations']]
        self.assertIn(self.equipment.id, equip_ids)
        self.assertNotIn(self.maintenance_equipment.id, equip_ids)

    def test_schedule_conflict_detection(self):
        """Test 3: Overlapping booking excludes equipment from schedule matching."""
        now = timezone.now()
        start_dt = now + timedelta(days=5)
        end_dt = start_dt + timedelta(hours=6)

        # Create active overlapping booking
        Booking.objects.create(
            equipment=self.equipment,
            farmer=self.farmer_user,
            start_date=start_dt,
            end_date=end_dt,
            total_cost=3900.0,
            status='Approved'
        )

        # Check availability for conflicting window
        is_avail, reason, conflicts = check_equipment_schedule_availability(
            self.equipment,
            start_dt + timedelta(hours=1),
            end_dt - timedelta(hours=1)
        )
        self.assertFalse(is_avail)
        self.assertEqual(len(conflicts), 1)

    def test_ai_matching_algorithm_scoring_and_explanations(self):
        """Test 4 & 5: AI matching ranks suitable machines and operators with explainable metrics."""
        self.client.force_authenticate(user=self.farmer_user)
        response = self.client.post('/api/ai/match/', {
            'farming_operation': 'Ploughing',
            'farmer_lat': 18.5204,
            'farmer_lng': 73.8567,
            'land_size': 3.0,
            'duration_hours': 5.0,
            'requires_operator': True
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        self.assertGreaterEqual(data['eligible_count'], 1)
        
        top_rec = data['recommendations'][0]
        self.assertEqual(top_rec['equipment']['id'], self.equipment.id)
        self.assertIn('overall_score', top_rec['match_metrics'])
        self.assertIn('recommendation_reasons', top_rec)
        self.assertGreater(len(top_rec['recommendation_reasons']), 0)
        self.assertEqual(top_rec['operator']['operator_id'], self.operator_profile.id)

    def test_strict_workflow_state_machine_transitions(self):
        """Test 14 & 15: Valid and invalid state transitions enforcement."""
        now = timezone.now()
        booking = Booking.objects.create(
            equipment=self.equipment,
            farmer=self.farmer_user,
            start_date=now + timedelta(days=1),
            end_date=now + timedelta(days=1, hours=4),
            total_cost=2600.0,
            status='Pending'
        )

        # Unauthorized actor cannot approve
        self.client.force_authenticate(user=self.farmer_user)
        bad_res = self.client.patch(f'/api/bookings/{booking.id}/status/', {
            'status': 'Approved'
        }, format='json')
        self.assertEqual(bad_res.status_code, status.HTTP_403_FORBIDDEN)

        # Owner approves
        self.client.force_authenticate(user=self.owner_user)
        appr_res = self.client.patch(f'/api/bookings/{booking.id}/status/', {
            'status': 'Approved'
        }, format='json')
        self.assertEqual(appr_res.status_code, status.HTTP_200_OK)
        booking.refresh_from_db()
        self.assertEqual(booking.status, 'Approved')

        # Invalid skipped transition: Approved -> Closed directly should be rejected
        skip_res = self.client.patch(f'/api/bookings/{booking.id}/status/', {
            'status': 'Closed'
        }, format='json')
        self.assertEqual(skip_res.status_code, status.HTTP_400_BAD_REQUEST)

        # Valid transition sequence: Approved -> In Transit -> Arrived -> In Progress -> Completed -> Closed
        self.client.patch(f'/api/bookings/{booking.id}/status/', {'status': 'In Transit'}, format='json')
        self.client.patch(f'/api/bookings/{booking.id}/status/', {'status': 'Arrived'}, format='json')
        self.client.patch(f'/api/bookings/{booking.id}/status/', {'status': 'In Progress'}, format='json')
        self.client.patch(f'/api/bookings/{booking.id}/status/', {'status': 'Completed'}, format='json')
        close_res = self.client.patch(f'/api/bookings/{booking.id}/status/', {'status': 'Closed'}, format='json')
        self.assertEqual(close_res.status_code, status.HTTP_200_OK)

        booking.refresh_from_db()
        self.assertEqual(booking.status, 'Closed')
        self.assertTrue(booking.equipment.is_available)
