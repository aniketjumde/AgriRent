"""
AgriRent Demo Seeding Script
============================
Creates 15 identifiable demo accounts (5 Farmers, 5 Operators, 5 Machine Owners)
with realistic Pune, Maharashtra locations, machinery listings, and verified operator profiles.

Safe & Repeatable: Uses update_or_create to prevent duplicates and never deletes real user data.
"""

import os
import sys
import django
from decimal import Decimal
from django.utils import timezone

# Configure Django Environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'agrirent.settings')
django.setup()

from django.contrib.auth import get_user_model
from api.models import Equipment, OperatorProfile, Booking, OperatorJobAssignment, PaymentTransaction

User = get_user_model()
DEMO_PASSWORD = os.environ.get('DEMO_PASSWORD', 'Demo@AgriRent2026')


def seed_demo_accounts():
    print("🌱 [AgriRent] Starting Repeatable Demo Account Seeding...")

    # -------------------------------------------------------------
    # 1. FIVE FARMER ACCOUNTS (Pune Locations)
    # -------------------------------------------------------------
    farmers_data = [
        {
            'username': 'farmer_suresh',
            'email': 'farmer.suresh@agrirent.demo',
            'first_name': 'Suresh',
            'last_name': 'Patil',
            'phone_number': '+919822011001',
            'role': 'Farmer'
        },
        {
            'username': 'farmer_anita',
            'email': 'farmer.anita@agrirent.demo',
            'first_name': 'Anita',
            'last_name': 'Deshmukh',
            'phone_number': '+919822011002',
            'role': 'Farmer'
        },
        {
            'username': 'farmer_vikram',
            'email': 'farmer.vikram@agrirent.demo',
            'first_name': 'Vikram',
            'last_name': 'Shinde',
            'phone_number': '+919822011003',
            'role': 'Farmer'
        },
        {
            'username': 'farmer_priya',
            'email': 'farmer.priya@agrirent.demo',
            'first_name': 'Priya',
            'last_name': 'Kadam',
            'phone_number': '+919822011004',
            'role': 'Farmer'
        },
        {
            'username': 'farmer_ramesh',
            'email': 'farmer.ramesh@agrirent.demo',
            'first_name': 'Ramesh',
            'last_name': 'Jadhav',
            'phone_number': '+919822011005',
            'role': 'Farmer'
        }
    ]

    for f_data in farmers_data:
        user, created = User.objects.update_or_create(
            username=f_data['username'],
            defaults={
                'email': f_data['email'],
                'first_name': f_data['first_name'],
                'last_name': f_data['last_name'],
                'phone_number': f_data['phone_number'],
                'role': f_data['role'],
                'is_verified': True,
                'is_active': True,
                'otp_code': '123456'
            }
        )
        user.set_password(DEMO_PASSWORD)
        user.save()
        status_str = "Created" if created else "Updated"
        print(f"  [Farmer] {status_str}: {user.username} ({user.email})")

    # -------------------------------------------------------------
    # 2. FIVE OPERATOR ACCOUNTS & PROFILES (Pune Locations)
    # -------------------------------------------------------------
    operators_data = [
        {
            'username': 'operator_rajesh',
            'email': 'operator.rajesh@agrirent.demo',
            'first_name': 'Rajesh',
            'last_name': 'Pawar',
            'phone_number': '+919822022001',
            'full_name': 'Rajesh Pawar',
            'license_number': 'MH-12-OP-2018-001',
            'experience_years': 8,
            'skills': ['Tractor Operation', 'Deep Ploughing', 'Paddy Puddling', 'Laser Levelling'],
            'supported_machinery': ['Tractor', 'Plough', 'Rotavator'],
            'service_area': 'Hinjawadi, Maan & Marunji Rural, Pune',
            'service_radius_km': Decimal('30.0'),
            'current_latitude': Decimal('18.5912'),
            'current_longitude': Decimal('73.7389'),
            'is_available': True,
            'is_online': True,
            'current_work_status': 'Available',
            'hourly_compensation_rate': Decimal('300.0'),
            'reliability_score': Decimal('4.9'),
            'total_jobs_completed': 48,
            'verification_status': 'Verified'
        },
        {
            'username': 'operator_sunil',
            'email': 'operator.sunil@agrirent.demo',
            'first_name': 'Sunil',
            'last_name': 'Gaikwad',
            'phone_number': '+919822022002',
            'full_name': 'Sunil Gaikwad',
            'license_number': 'MH-12-OP-2019-002',
            'experience_years': 6,
            'skills': ['Multi-Crop Combine Harvester', 'Crop Threshing', 'Straw Management'],
            'supported_machinery': ['Harvester', 'Tractor', 'Rotavator'],
            'service_area': 'Wakad, Thergaon & Punawale, Pune',
            'service_radius_km': Decimal('35.0'),
            'current_latitude': Decimal('18.5987'),
            'current_longitude': Decimal('73.7656'),
            'is_available': True,
            'is_online': True,
            'current_work_status': 'Available',
            'hourly_compensation_rate': Decimal('350.0'),
            'reliability_score': Decimal('4.8'),
            'total_jobs_completed': 36,
            'verification_status': 'Verified'
        },
        {
            'username': 'operator_amit',
            'email': 'operator.amit@agrirent.demo',
            'first_name': 'Amit',
            'last_name': 'Bhosale',
            'phone_number': '+919822022003',
            'full_name': 'Amit Bhosale',
            'license_number': 'MH-12-OP-2020-003',
            'experience_years': 5,
            'skills': ['Precision Seed Drilling', 'Rotavator Tillage', 'Bed Making'],
            'supported_machinery': ['Rotavator', 'Seed Drill', 'Cultivator'],
            'service_area': 'Baner, Balewadi & Sus, Pune',
            'service_radius_km': Decimal('25.0'),
            'current_latitude': Decimal('18.5590'),
            'current_longitude': Decimal('73.7868'),
            'is_available': True,
            'is_online': True,
            'current_work_status': 'Available',
            'hourly_compensation_rate': Decimal('280.0'),
            'reliability_score': Decimal('4.7'),
            'total_jobs_completed': 29,
            'verification_status': 'Verified'
        },
        {
            'username': 'operator_ganesh',
            'email': 'operator.ganesh@agrirent.demo',
            'first_name': 'Ganesh',
            'last_name': 'More',
            'phone_number': '+919822022004',
            'full_name': 'Ganesh More',
            'license_number': 'MH-12-OP-2017-004',
            'experience_years': 9,
            'skills': ['Sugarcane Heavy Harvester', 'Subsoiler', 'Heavy Tractor Cultivation'],
            'supported_machinery': ['Harvester', 'Tractor', 'Cultivator', 'Rotavator'],
            'service_area': 'Hadapsar, Manjari & Phursungi, Pune',
            'service_radius_km': Decimal('40.0'),
            'current_latitude': Decimal('18.5089'),
            'current_longitude': Decimal('73.9259'),
            'is_available': False,
            'is_online': True,
            'current_work_status': 'Busy',
            'hourly_compensation_rate': Decimal('320.0'),
            'reliability_score': Decimal('4.95'),
            'total_jobs_completed': 62,
            'verification_status': 'Verified'
        },
        {
            'username': 'operator_sachin',
            'email': 'operator.sachin@agrirent.demo',
            'first_name': 'Sachin',
            'last_name': 'Chavan',
            'phone_number': '+919822022005',
            'full_name': 'Sachin Chavan',
            'license_number': 'MH-12-OP-2021-005',
            'experience_years': 4,
            'skills': ['Orchard Boom Sprayer', 'Knapsack Power Sprayer', 'Pest Control'],
            'supported_machinery': ['Sprayer', 'Tractor', 'Cultivator'],
            'service_area': 'Wagholi, Lonikand & Bakori, Pune',
            'service_radius_km': Decimal('25.0'),
            'current_latitude': Decimal('18.5808'),
            'current_longitude': Decimal('73.9787'),
            'is_available': False,
            'is_online': False,
            'current_work_status': 'Offline',
            'hourly_compensation_rate': Decimal('250.0'),
            'reliability_score': Decimal('4.6'),
            'total_jobs_completed': 18,
            'verification_status': 'Verified'
        }
    ]

    for op_data in operators_data:
        user, created = User.objects.update_or_create(
            username=op_data['username'],
            defaults={
                'email': op_data['email'],
                'first_name': op_data['first_name'],
                'last_name': op_data['last_name'],
                'phone_number': op_data['phone_number'],
                'role': 'Operator',
                'is_verified': True,
                'is_active': True,
                'otp_code': '123456'
            }
        )
        user.set_password(DEMO_PASSWORD)
        user.save()

        profile, p_created = OperatorProfile.objects.update_or_create(
            user=user,
            defaults={
                'full_name': op_data['full_name'],
                'phone': op_data['phone_number'],
                'license_number': op_data['license_number'],
                'experience_years': op_data['experience_years'],
                'skills': op_data['skills'],
                'supported_machinery': op_data['supported_machinery'],
                'service_area': op_data['service_area'],
                'service_radius_km': float(op_data['service_radius_km']),
                'current_latitude': op_data['current_latitude'],
                'current_longitude': op_data['current_longitude'],
                'is_available': op_data['is_available'],
                'is_online': op_data['is_online'],
                'current_work_status': op_data['current_work_status'],
                'hourly_compensation_rate': op_data['hourly_compensation_rate'],
                'total_jobs_completed': op_data['total_jobs_completed'],
                'verification_status': op_data['verification_status']
            }
        )
        status_str = "Created" if created else "Updated"
        print(f"  [Operator] {status_str}: {user.username} (Online={profile.is_online}, Avail={profile.is_available})")

    # -------------------------------------------------------------
    # 3. FIVE MACHINE OWNER ACCOUNTS & EQUIPMENT LISTINGS (Pune)
    # -------------------------------------------------------------
    owners_data = [
        {
            'username': 'owner_balasaheb',
            'email': 'owner.balasaheb@agrirent.demo',
            'first_name': 'Balasaheb',
            'last_name': 'Thorat',
            'phone_number': '+919822033001',
            'equipment': [
                {
                    'title': 'John Deere 5310 PowerTech 55HP Tractor',
                    'category': 'Tractor',
                    'description': 'High-torque 55 HP utility tractor with 4WD, power steering, and heavy hydraulic lift for deep soil inversion and tilling.',
                    'rental_price_per_hour': Decimal('850.00'),
                    'location_latitude': Decimal('18.5912'),
                    'location_longitude': Decimal('73.7389'),
                    'address': 'Phase 1 Agro Hub, Hinjawadi, Pune, Maharashtra 411057',
                    'image_url': 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=800'
                },
                {
                    'title': 'Shaktiman Semi-Champion Rotavator 7 Feet',
                    'category': 'Rotavator',
                    'description': 'Boron steel blades, multi-speed gearbox, excellent soil pulverized seedbed preparation in a single pass.',
                    'rental_price_per_hour': Decimal('450.00'),
                    'location_latitude': Decimal('18.5925'),
                    'location_longitude': Decimal('73.7350'),
                    'address': 'Maan Village Road, Hinjawadi, Pune, Maharashtra 411057',
                    'image_url': 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&q=80&w=800'
                }
            ]
        },
        {
            'username': 'owner_kavita',
            'email': 'owner.kavita@agrirent.demo',
            'first_name': 'Kavita',
            'last_name': 'Jagatap',
            'phone_number': '+919822033002',
            'equipment': [
                {
                    'title': 'Kubota DC-68G Multi-Crop Combine Harvester',
                    'category': 'Harvester',
                    'description': 'Paddy and soybean combine harvester with high ground clearance, grain tank capacity of 1200L, and rapid straw separation.',
                    'rental_price_per_hour': Decimal('2200.00'),
                    'location_latitude': Decimal('18.5987'),
                    'location_longitude': Decimal('73.7656'),
                    'address': 'Datta Mandir Road, Wakad, Pune, Maharashtra 411057',
                    'image_url': 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=800'
                },
                {
                    'title': 'Lemken Opal 090 3-Furrow Hydraulic Reversible Plough',
                    'category': 'Plough',
                    'description': 'Heavy duty reversible disc plough for breaking hardpan soil layers up to 14 inches deep.',
                    'rental_price_per_hour': Decimal('500.00'),
                    'location_latitude': Decimal('18.6010'),
                    'location_longitude': Decimal('73.7620'),
                    'address': 'Kaspate Vasti, Wakad, Pune, Maharashtra 411057',
                    'image_url': 'https://images.unsplash.com/photo-1592878904946-b3cd8ae243d0?auto=format&fit=crop&q=80&w=800'
                }
            ]
        },
        {
            'username': 'owner_dattatray',
            'email': 'owner.dattatray@agrirent.demo',
            'first_name': 'Dattatray',
            'last_name': 'Kulkarni',
            'phone_number': '+919822033003',
            'equipment': [
                {
                    'title': 'National Agro Multi-Crop Precision Seed Drill',
                    'category': 'Seed Drill',
                    'description': '11-tyne automated seed and fertilizer drill with adjustable depth wheels and seed metering mechanisms.',
                    'rental_price_per_hour': Decimal('480.00'),
                    'location_latitude': Decimal('18.5590'),
                    'location_longitude': Decimal('73.7868'),
                    'address': 'Baner Hill Road, Baner, Pune, Maharashtra 411045',
                    'image_url': 'https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&q=80&w=800'
                },
                {
                    'title': 'Mahindra Spring Loaded 9-Tyne Cultivator',
                    'category': 'Cultivator',
                    'description': 'Durable carbon spring tynes designed for aerating soil, weed uprooting, and seedbed levelling.',
                    'rental_price_per_hour': Decimal('400.00'),
                    'location_latitude': Decimal('18.5550'),
                    'location_longitude': Decimal('73.7910'),
                    'address': 'Pan Card Club Road, Baner, Pune, Maharashtra 411045',
                    'image_url': 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=800'
                }
            ]
        },
        {
            'username': 'owner_meena',
            'email': 'owner.meena@agrirent.demo',
            'first_name': 'Meena',
            'last_name': 'Wagh',
            'phone_number': '+919822033004',
            'equipment': [
                {
                    'title': 'Mahindra Arjun Novo 605 DI-i 60HP Tractor',
                    'category': 'Tractor',
                    'description': 'Heavy-duty 60 HP tractor fitted with front ballast weights and high lift capacity for sugar cane transport.',
                    'rental_price_per_hour': Decimal('950.00'),
                    'location_latitude': Decimal('18.5089'),
                    'location_longitude': Decimal('73.9259'),
                    'address': 'Saswad Road Farm Gate, Hadapsar, Pune, Maharashtra 411028',
                    'image_url': 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=800'
                },
                {
                    'title': 'Aspee Tractor-Mounted Boom Sprayer 600L',
                    'category': 'Sprayer',
                    'description': 'High pressure mist sprayer with 12m folding boom and stainless steel chemical resistant nozzles.',
                    'rental_price_per_hour': Decimal('600.00'),
                    'location_latitude': Decimal('18.5120'),
                    'location_longitude': Decimal('73.9300'),
                    'address': 'Manjari Farm Road, Hadapsar, Pune, Maharashtra 411028',
                    'image_url': 'https://images.unsplash.com/photo-1599940824399-b87987ceb72a?auto=format&fit=crop&q=80&w=800'
                }
            ]
        },
        {
            'username': 'owner_sanjay',
            'email': 'owner.sanjay@agrirent.demo',
            'first_name': 'Sanjay',
            'last_name': 'Raut',
            'phone_number': '+919822033005',
            'equipment': [
                {
                    'title': 'Kartar 4000 Self-Propelled Combine Harvester',
                    'category': 'Harvester',
                    'description': 'Heavy duty combine harvester suitable for wheat, soybean, gram, and mustard harvesting with air-conditioned cabin.',
                    'rental_price_per_hour': Decimal('2400.00'),
                    'location_latitude': Decimal('18.5808'),
                    'location_longitude': Decimal('73.9787'),
                    'address': 'Nagar Road Agricultural Yard, Wagholi, Pune, Maharashtra 412207',
                    'image_url': 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=800'
                },
                {
                    'title': 'Fieldking Heavy-Duty Rotary Tiller 6 Feet',
                    'category': 'Rotavator',
                    'description': 'Multi-speed side gear drive rotary tiller for heavy black clay soils of eastern Pune.',
                    'rental_price_per_hour': Decimal('460.00'),
                    'location_latitude': Decimal('18.5830'),
                    'location_longitude': Decimal('73.9750'),
                    'address': 'Bakori Road, Wagholi, Pune, Maharashtra 412207',
                    'image_url': 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&q=80&w=800'
                }
            ]
        }
    ]

    for ow_data in owners_data:
        user, created = User.objects.update_or_create(
            username=ow_data['username'],
            defaults={
                'email': ow_data['email'],
                'first_name': ow_data['first_name'],
                'last_name': ow_data['last_name'],
                'phone_number': ow_data['phone_number'],
                'role': 'Owner',
                'is_verified': True,
                'is_active': True,
                'otp_code': '123456'
            }
        )
        user.set_password(DEMO_PASSWORD)
        user.save()
        status_str = "Created" if created else "Updated"
        print(f"  [Owner] {status_str}: {user.username} ({user.email})")

        for eq in ow_data['equipment']:
            item, eq_created = Equipment.objects.update_or_create(
                owner=user,
                title=eq['title'],
                defaults={
                    'category': eq['category'],
                    'description': eq['description'],
                    'rental_price_per_hour': eq['rental_price_per_hour'],
                    'location_latitude': eq['location_latitude'],
                    'location_longitude': eq['location_longitude'],
                    'address': eq['address'],
                    'image_url': eq['image_url'],
                    'is_available': True,
                    'is_verified': True
                }
            )
            eq_status = "Added" if eq_created else "Refreshed"
            print(f"    -> Equipment {eq_status}: {item.title} (₹{item.rental_price_per_hour}/hr)")

    print("\n✅ [AgriRent] Successfully seeded all 15 Pune demo accounts and equipment listings.")


if __name__ == '__main__':
    seed_demo_accounts()
