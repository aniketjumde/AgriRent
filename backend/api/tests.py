import json
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from api.models import User, Equipment, Booking, OperatorProfile, OperatorJobAssignment, JobStatusHistory

class OperatorModuleTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create Farmer
        self.farmer = User.objects.create_user(
            username='test_farmer', email='farmer@test.com', password='password123',
            role='Farmer', phone_number='+919876543211', is_verified=True
        )

        # Create Owner
        self.owner = User.objects.create_user(
            username='test_owner', email='owner@test.com', password='password123',
            role='Owner', phone_number='+919876543212', is_verified=True
        )

        # Create Operator
        self.operator_user = User.objects.create_user(
            username='test_operator', email='operator@test.com', password='password123',
            role='Operator', phone_number='+919876543213', is_verified=True, reliability_score=4.9
        )
        self.operator_profile = OperatorProfile.objects.create(
            user=self.operator_user,
            full_name='Ramesh Kumar',
            phone='+919876543213',
            experience_years=5,
            skills=['Tractor Operation', 'Harvester Operation'],
            supported_machinery=['Tractor', 'Harvester'],
            service_area='Coimbatore',
            service_radius_km=30.0,
            current_latitude=11.0168,
            current_longitude=76.9558,
            is_available=True,
            current_work_status='Available',
            verification_status='Verified',
            hourly_compensation_rate=250.00
        )

        # Create Equipment
        self.equipment = Equipment.objects.create(
            title='Mahindra 575 DI Tractor',
            category='Tractor',
            description='Reliable 45 HP farm tractor',
            rental_price_per_hour=600.00,
            location_latitude=11.0180,
            location_longitude=76.9560,
            address='Coimbatore Central',
            owner=self.owner,
            is_available=True,
            is_verified=True
        )

    def test_operator_registration_creates_profile(self):
        reg_response = self.client.post('/api/auth/register/', {
            'username': 'new_operator',
            'email': 'new_op@agrirent.com',
            'password': 'password123',
            'role': 'Operator',
            'phone_number': '+919876540000'
        }, format='json')
        self.assertEqual(reg_response.status_code, status.HTTP_201_CREATED)
        new_user = User.objects.get(username='new_operator')
        self.assertEqual(new_user.role, 'Operator')
        self.assertTrue(OperatorProfile.objects.filter(user=new_user).exists())
        profile = new_user.operator_profile
        self.assertEqual(profile.verification_status, 'Pending')

    def test_operator_profile_update(self):
        self.client.force_authenticate(user=self.operator_user)
        response = self.client.put('/api/operator/profile/', {
            'full_name': 'Ramesh K. Master Operator',
            'experience_years': 7,
            'service_radius_km': 40.0
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.operator_profile.refresh_from_db()
        self.assertEqual(self.operator_profile.full_name, 'Ramesh K. Master Operator')
        self.assertEqual(self.operator_profile.experience_years, 7)

    def test_job_dispatch_matching_and_acceptance(self):
        # 1. Farmer creates booking with requires_operator=True
        self.client.force_authenticate(user=self.farmer)
        now = timezone.now()
        start = now + timezone.timedelta(days=1)
        end = now + timezone.timedelta(days=2)

        booking_res = self.client.post('/api/bookings/', {
            'equipment': self.equipment.id,
            'start_date': start.isoformat(),
            'end_date': end.isoformat(),
            'delivery_option': 'Pickup',
            'requires_operator': True,
            'notes': 'Need skilled operator for 2 acres plowing'
        }, format='json')
        self.assertEqual(booking_res.status_code, status.HTTP_201_CREATED)
        booking_id = booking_res.data['id']
        booking = Booking.objects.get(id=booking_id)
        self.assertTrue(booking.requires_operator)

        # 2. Owner approves booking -> triggers automatic operator dispatch
        self.client.force_authenticate(user=self.owner)
        approve_res = self.client.patch(f'/api/bookings/{booking_id}/status/', {'status': 'Approved'}, format='json')
        self.assertEqual(approve_res.status_code, status.HTTP_200_OK)

        # Verify job assignment created for our matching verified operator
        assignment = OperatorJobAssignment.objects.filter(booking_id=booking_id).first()
        self.assertIsNotNone(assignment)
        self.assertEqual(assignment.status, 'REQUESTED')
        self.assertEqual(assignment.operator, self.operator_profile)

        # 3. Operator views dashboard
        self.client.force_authenticate(user=self.operator_user)
        dash_res = self.client.get('/api/operator/dashboard/')
        self.assertEqual(dash_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(dash_res.data['new_requests']), 1)

        # 4. Operator accepts job
        accept_res = self.client.post(f'/api/operator/jobs/{assignment.id}/accept/')
        self.assertEqual(accept_res.status_code, status.HTTP_200_OK)
        assignment.refresh_from_db()
        booking.refresh_from_db()
        self.assertEqual(assignment.status, 'ACCEPTED')
        self.assertEqual(booking.operator_assigned, self.operator_user)
        self.assertEqual(assignment.operator.current_work_status, 'On Job')

        # 5. Live GPS updates
        loc_res = self.client.post(f'/api/operator/jobs/{assignment.id}/location/', {
            'latitude': 11.0175,
            'longitude': 76.9559
        }, format='json')
        self.assertEqual(loc_res.status_code, status.HTTP_200_OK)

        # 6. Step 1 -> TRAVELLING_TO_PICKUP
        step1 = self.client.post(f'/api/operator/jobs/{assignment.id}/status/', {'status': 'TRAVELLING_TO_PICKUP'})
        self.assertEqual(step1.status_code, status.HTTP_200_OK)

        # Step 2 -> ARRIVED_AT_PICKUP & MACHINE_COLLECTED
        step2 = self.client.post(f'/api/operator/jobs/{assignment.id}/status/', {'status': 'ARRIVED_AT_PICKUP'})
        self.assertEqual(step2.status_code, status.HTTP_200_OK)
        step3 = self.client.post(f'/api/operator/jobs/{assignment.id}/status/', {'status': 'MACHINE_COLLECTED'})
        self.assertEqual(step3.status_code, status.HTTP_200_OK)

        # Step 3 -> TRAVELLING_TO_FARM & ARRIVED_AT_FARM
        step4 = self.client.post(f'/api/operator/jobs/{assignment.id}/status/', {'status': 'TRAVELLING_TO_FARM'})
        self.assertEqual(step4.status_code, status.HTTP_200_OK)
        step5 = self.client.post(f'/api/operator/jobs/{assignment.id}/status/', {'status': 'ARRIVED_AT_FARM'})
        self.assertEqual(step5.status_code, status.HTTP_200_OK)

        # Step 4 -> IN_PROGRESS & COMPLETED
        step6 = self.client.post(f'/api/operator/jobs/{assignment.id}/status/', {'status': 'IN_PROGRESS'})
        self.assertEqual(step6.status_code, status.HTTP_200_OK)
        booking.refresh_from_db()
        self.assertEqual(booking.status, 'In Progress')

        step7 = self.client.post(f'/api/operator/jobs/{assignment.id}/status/', {'status': 'COMPLETED'})
        self.assertEqual(step7.status_code, status.HTTP_200_OK)
        booking.refresh_from_db()
        self.assertEqual(booking.status, 'Completed')
        self.assertEqual(booking.escrow_status, 'Released')
        self.assertTrue(booking.equipment.is_available)

    def test_prevent_duplicate_acceptance_and_invalid_transition(self):
        # Create an assignment already in COMPLETED status
        assignment = OperatorJobAssignment.objects.create(
            booking=Booking.objects.create(
                equipment=self.equipment, farmer=self.farmer,
                start_date=timezone.now(), end_date=timezone.now() + timezone.timedelta(days=1),
                total_cost=600.0, status='Completed'
            ),
            operator=self.operator_profile,
            status='COMPLETED'
        )
        self.client.force_authenticate(user=self.operator_user)
        # Attempt illegal transition backwards to REQUESTED
        res = self.client.post(f'/api/operator/jobs/{assignment.id}/status/', {'status': 'REQUESTED'})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
