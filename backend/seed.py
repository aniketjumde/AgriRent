import os
import django
import sys
from datetime import datetime, timedelta

# Set up Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'agrirent.settings')
django.setup()

from django.utils import timezone
from api.models import User, Equipment, Booking, Review, Message, Notification, SupportTicket

def seed_db():
    print("Starting database seeding...")
    
    # 1. Clear existing database entries
    User.objects.all().delete()
    Equipment.objects.all().delete()
    Booking.objects.all().delete()
    Review.objects.all().delete()
    Message.objects.all().delete()
    Notification.objects.all().delete()
    SupportTicket.objects.all().delete()
    
    print("Cleared existing models.")

    # 2. Create Users
    admin_user = User.objects.create_superuser(
        username='admin',
        email='admin@agrirent.com',
        role='Admin',
        phone_number='+919876543210',
        is_verified=True
    )
    admin_user.set_password('password123')
    admin_user.save()
    
    farmer_user = User.objects.create_user(
        username='farmer',
        email='farmer@agrirent.com',
        role='Farmer',
        phone_number='+919876543211',
        is_verified=True,
        reliability_score=4.9,
        aadhaar_kyc_status='Verified',
        aadhaar_number_masked='XXXX-XXXX-8843'
    )
    farmer_user.set_password('password123')
    farmer_user.save()
    
    owner_user = User.objects.create_user(
        username='owner',
        email='owner@agrirent.com',
        role='Owner',
        phone_number='+919876543212',
        is_verified=True,
        reliability_score=4.7,
        aadhaar_kyc_status='Verified',
        aadhaar_number_masked='XXXX-XXXX-9912'
    )
    owner_user.set_password('password123')
    owner_user.save()

    owners = [owner_user]
    for idx in range(1, 11):
        u = User.objects.create_user(
            username=f'owner{idx}',
            email=f'owner{idx}@agrirent.com',
            role='Owner',
            phone_number=f'+9198765433{10+idx}',
            is_verified=True,
            reliability_score=4.5 + (idx % 5) * 0.1,
            aadhaar_kyc_status='Verified' if idx % 4 != 0 else 'Pending',
            aadhaar_number_masked=f'XXXX-XXXX-93{10+idx}'
        )
        u.set_password('password123')
        u.save()
        owners.append(u)

    farmers = [farmer_user]
    for idx in range(1, 21):
        u = User.objects.create_user(
            username=f'farmer{idx}',
            email=f'farmer{idx}@agrirent.com',
            role='Farmer',
            phone_number=f'+9198765432{10+idx}',
            is_verified=True,
            reliability_score=4.6 + (idx % 4) * 0.1,
            aadhaar_kyc_status='Verified' if idx % 3 != 0 else 'Pending',
            aadhaar_number_masked=f'XXXX-XXXX-82{10+idx}'
        )
        u.set_password('password123')
        u.save()
        farmers.append(u)

    print("Created users: admin/password123 (Admin), farmer/password123 (Farmer), owner/password123 (Owner), and 10 extra owners + 20 extra farmers.")

    # 3. Create Equipment Listings
    listings_data = [
        # Tractor (8)
        {
            "title": "John Deere 5050D Tractor",
            "category": "Tractor",
            "description": "50 HP heavy-duty tractor, ideal for tilling, ploughing, and heavy carting.",
            "rental_price_per_hour": 1500.00,
            "latitude": 11.0168,
            "longitude": 76.9558,
            "address": "Coimbatore, Tamil Nadu",
            "image_url": "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=600"
        },
        {
            "title": "Mahindra Arjun Novo 605 Tractor",
            "category": "Tractor",
            "description": "57 HP advanced tractor with precision hydraulics. Ideal for heavy load cultivation.",
            "rental_price_per_hour": 1600.00,
            "latitude": 11.3410,
            "longitude": 77.7172,
            "address": "Erode, Tamil Nadu",
            "image_url": "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=600"
        },
        {
            "title": "Kubota MU4501 Tractor",
            "category": "Tractor",
            "description": "45 HP Japanese technology engine, environment friendly, low noise level and highly durable.",
            "rental_price_per_hour": 1400.00,
            "latitude": 11.6643,
            "longitude": 78.1460,
            "address": "Salem, Tamil Nadu",
            "image_url": "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=600"
        },
        {
            "title": "Sonalika Tiger 50 Tractor",
            "category": "Tractor",
            "description": "52 HP European-designed tractor with spacious operator platform and high torque.",
            "rental_price_per_hour": 1450.00,
            "latitude": 11.2189,
            "longitude": 78.1672,
            "address": "Namakkal, Tamil Nadu",
            "image_url": "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=600"
        },
        {
            "title": "Swaraj 744 XT Tractor",
            "category": "Tractor",
            "description": "48 HP robust tractor, legendary Swaraj design, extremely durable for multi-crop utility.",
            "rental_price_per_hour": 1350.00,
            "latitude": 11.1085,
            "longitude": 77.3411,
            "address": "Tiruppur, Tamil Nadu",
            "image_url": "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=600"
        },
        {
            "title": "New Holland 3630 TX Tractor",
            "category": "Tractor",
            "description": "55 HP powerful tractor with double clutch, perfect for deep ploughing and harvesting auxiliary.",
            "rental_price_per_hour": 1550.00,
            "latitude": 10.9601,
            "longitude": 78.0766,
            "address": "Karur, Tamil Nadu",
            "image_url": "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=600"
        },
        {
            "title": "TAFE 5900 DI Tractor",
            "category": "Tractor",
            "description": "56 HP tractor, built for long-duration operation and heavy trailer haulage in rural farms.",
            "rental_price_per_hour": 1500.00,
            "latitude": 11.7480,
            "longitude": 79.7714,
            "address": "Cuddalore, Tamil Nadu",
            "image_url": "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=600"
        },
        {
            "title": "VST Shakti MT270 Tractor",
            "category": "Tractor",
            "description": "27 HP compact mini tractor, ideal for orchards, vineyard inter-cultivation, and small fields.",
            "rental_price_per_hour": 950.00,
            "latitude": 11.9398,
            "longitude": 79.4897,
            "address": "Villupuram, Tamil Nadu",
            "image_url": "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=600"
        },
        # Harvester (5)
        {
            "title": "Kubota Harvester DC-68G",
            "category": "Harvester",
            "description": "Premium combine harvester, Japanese engineered for smooth rice and grain cutting.",
            "rental_price_per_hour": 2200.00,
            "latitude": 11.0168,
            "longitude": 76.9558,
            "address": "Coimbatore, Tamil Nadu",
            "image_url": "https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=600"
        },
        {
            "title": "John Deere W70 Harvester",
            "category": "Harvester",
            "description": "Multi-crop combine harvester with self-propelled drive, high grain purity, and minimal losses.",
            "rental_price_per_hour": 2400.00,
            "latitude": 11.3410,
            "longitude": 77.7172,
            "address": "Erode, Tamil Nadu",
            "image_url": "https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=600"
        },
        {
            "title": "Mahindra Arjun Combine Harvester",
            "category": "Harvester",
            "description": "Highly durable field harvester for wheat, paddy, and soy crops, low operating costs.",
            "rental_price_per_hour": 2300.00,
            "latitude": 11.6643,
            "longitude": 78.1460,
            "address": "Salem, Tamil Nadu",
            "image_url": "https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=600"
        },
        {
            "title": "Sonalika Challenger Harvester",
            "category": "Harvester",
            "description": "Engineered for high moisture crops, equipped with large straw walkers for grain separation.",
            "rental_price_per_hour": 2150.00,
            "latitude": 11.2189,
            "longitude": 78.1672,
            "address": "Namakkal, Tamil Nadu",
            "image_url": "https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=600"
        },
        {
            "title": "New Holland TC5.30 Harvester",
            "category": "Harvester",
            "description": "5-walker combine harvester with rotary separator technology, maximum harvest efficiency.",
            "rental_price_per_hour": 2500.00,
            "latitude": 11.1085,
            "longitude": 77.3411,
            "address": "Tiruppur, Tamil Nadu",
            "image_url": "https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=600"
        },
        # Rotavator (4)
        {
            "title": "Sonalika Rotavator 6 Feet",
            "category": "Rotavator",
            "description": "Heavy duty tilling rotavator, prepares seedbeds in a single pass with multi-speed gearboxes.",
            "rental_price_per_hour": 900.00,
            "latitude": 11.0168,
            "longitude": 76.9558,
            "address": "Coimbatore, Tamil Nadu",
            "image_url": "https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&q=80&w=600"
        },
        {
            "title": "Mahindra Gyrovator ZXX",
            "category": "Rotavator",
            "description": "Sturdy rotary tiller for secondary soil tillage, breaks up tough soil clods efficiently.",
            "rental_price_per_hour": 850.00,
            "latitude": 11.3410,
            "longitude": 77.7172,
            "address": "Erode, Tamil Nadu",
            "image_url": "https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&q=80&w=600"
        },
        {
            "title": "Swaraj Gyrovator SLX",
            "category": "Rotavator",
            "description": "Specially designed for wet puddling and dry land operations in medium to heavy soils.",
            "rental_price_per_hour": 880.00,
            "latitude": 11.6643,
            "longitude": 78.1460,
            "address": "Salem, Tamil Nadu",
            "image_url": "https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&q=80&w=600"
        },
        {
            "title": "Kubota Rotary Tiller",
            "category": "Rotavator",
            "description": "Japanese standard tiller, operates smoothly behind 40-55 HP tractors, long-lasting blades.",
            "rental_price_per_hour": 950.00,
            "latitude": 11.2189,
            "longitude": 78.1672,
            "address": "Namakkal, Tamil Nadu",
            "image_url": "https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&q=80&w=600"
        },
        # Seeder (4)
        {
            "title": "Mahindra Seeder Machine",
            "category": "Seeder",
            "description": "Automatic seed drilling machine. Ensures uniform sowing depth and optimal crop yield.",
            "rental_price_per_hour": 750.00,
            "latitude": 11.1085,
            "longitude": 77.3411,
            "address": "Tiruppur, Tamil Nadu",
            "image_url": "https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&q=80&w=600"
        },
        {
            "title": "John Deere Seed Drill",
            "category": "Seeder",
            "description": "Precision mechanical seed drill, handles multiple grain sizes with automatic soil covers.",
            "rental_price_per_hour": 800.00,
            "latitude": 10.9601,
            "longitude": 78.0766,
            "address": "Karur, Tamil Nadu",
            "image_url": "https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&q=80&w=600"
        },
        {
            "title": "Sonalika Super Seeder",
            "category": "Seeder",
            "description": "Super seeder for paddy residue management and direct wheat sowing in one single operation.",
            "rental_price_per_hour": 850.00,
            "latitude": 11.7480,
            "longitude": 79.7714,
            "address": "Cuddalore, Tamil Nadu",
            "image_url": "https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&q=80&w=600"
        },
        {
            "title": "Swaraj Pneumatic Planter",
            "category": "Seeder",
            "description": "Vacuum-based precision planter for maize, cotton, and oilseeds, guarantees seed spacing.",
            "rental_price_per_hour": 900.00,
            "latitude": 11.9398,
            "longitude": 79.4897,
            "address": "Villupuram, Tamil Nadu",
            "image_url": "https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&q=80&w=600"
        },
        # Sprayer (4)
        {
            "title": "Stihl Power Sprayer SG-20",
            "category": "Sprayer",
            "description": "Backpack motor sprayer for quick pesticide and liquid fertilizer spraying.",
            "rental_price_per_hour": 350.00,
            "latitude": 11.6643,
            "longitude": 78.1460,
            "address": "Salem, Tamil Nadu",
            "image_url": "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?auto=format&fit=crop&q=80&w=600"
        },
        {
            "title": "Mahindra Tractor Mounted Sprayer",
            "category": "Sprayer",
            "description": "Tractor PTO-driven sprayer with 400-litre tank capacity, ideal for cotton and sugarcane.",
            "rental_price_per_hour": 550.00,
            "latitude": 11.0168,
            "longitude": 76.9558,
            "address": "Coimbatore, Tamil Nadu",
            "image_url": "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?auto=format&fit=crop&q=80&w=600"
        },
        {
            "title": "VST Shakti Orchard Sprayer",
            "category": "Sprayer",
            "description": "Compact crop sprayer, designed for narrow orchards, vineyards, and plantations.",
            "rental_price_per_hour": 450.00,
            "latitude": 11.3410,
            "longitude": 77.7172,
            "address": "Erode, Tamil Nadu",
            "image_url": "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?auto=format&fit=crop&q=80&w=600"
        },
        {
            "title": "Escorts Power Sprayer",
            "category": "Sprayer",
            "description": "2-stroke engine high-pressure sprayer, adjustable nozzle and extended spray range.",
            "rental_price_per_hour": 380.00,
            "latitude": 11.6643,
            "longitude": 78.1460,
            "address": "Salem, Tamil Nadu",
            "image_url": "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?auto=format&fit=crop&q=80&w=600"
        },
        # Crop Protection Equipment (5)
        {
            "title": "Sonalika Crop Shield Boom Sprayer",
            "category": "Crop Protection Equipment",
            "description": "Hydraulic boom sprayer with drift-free nozzles for wide coverage chemical application.",
            "rental_price_per_hour": 600.00,
            "latitude": 11.2189,
            "longitude": 78.1672,
            "address": "Namakkal, Tamil Nadu",
            "image_url": "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=600"
        },
        {
            "title": "Mahindra Crop Protection Blower",
            "category": "Crop Protection Equipment",
            "description": "High velocity dusting blower for powder fungicides, designed for vineyards and tall crops.",
            "rental_price_per_hour": 580.00,
            "latitude": 11.1085,
            "longitude": 77.3411,
            "address": "Tiruppur, Tamil Nadu",
            "image_url": "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=600"
        },
        {
            "title": "Kubota Insecticide Sprayer",
            "category": "Crop Protection Equipment",
            "description": "Quiet motor sprayer, ultra-low volume nozzle technology for pest eradication.",
            "rental_price_per_hour": 550.00,
            "latitude": 10.9601,
            "longitude": 78.0766,
            "address": "Karur, Tamil Nadu",
            "image_url": "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=600"
        },
        {
            "title": "New Holland Crop Protection Shield",
            "category": "Crop Protection Equipment",
            "description": "Semi-automatic duster, optimized for biological pest control distributions.",
            "rental_price_per_hour": 650.00,
            "latitude": 11.7480,
            "longitude": 79.7714,
            "address": "Cuddalore, Tamil Nadu",
            "image_url": "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=600"
        },
        {
            "title": "TAFE Crop Safeguard Duster",
            "category": "Crop Protection Equipment",
            "description": "High output mist blower with ergonomic backpack straps, ideal for hilly turmeric farms.",
            "rental_price_per_hour": 480.00,
            "latitude": 11.9398,
            "longitude": 79.4897,
            "address": "Villupuram, Tamil Nadu",
            "image_url": "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=600"
        }
    ]

    created_listings = []
    import json
    for i, data in enumerate(listings_data):
        # Health Passport JSON templates
        service_logs = [
            {"date": "2026-02-15", "type": "Engine Oil Change", "cost": 1500, "status": "Completed"},
            {"date": "2026-05-10", "type": "Filter Replacement", "cost": 800, "status": "Completed"}
        ]
        maintenance_logs = [
            {"date": "2026-03-01", "description": "Tire pressure calibration & battery load test", "technician": "Govind Machinery Servicing"},
            {"date": "2026-06-05", "description": "Hydraulic seal inspection", "technician": "AgriRent Field Team"}
        ]
        breakdown_logs = [
            {"date": "2026-01-20", "reason": "Alternator belt slip", "resolution": "Replaced belt", "downtime": "4 hours"}
        ] if i % 2 == 0 else []

        eq = Equipment.objects.create(
            title=data["title"],
            category=data["category"],
            description=data["description"],
            rental_price_per_hour=data["rental_price_per_hour"],
            location_latitude=data["latitude"],
            location_longitude=data["longitude"],
            address=data["address"],
            owner=owners[i % len(owners)],
            image_url=data["image_url"],
            is_available=True,
            is_verified=True,
            service_history=json.dumps(service_logs),
            maintenance_records=json.dumps(maintenance_logs),
            breakdown_history=json.dumps(breakdown_logs),
            fuel_efficiency="4.2 Litres/Hour" if data["category"] == "Tractor" else "5.8 Litres/Hour",
            qr_code_data=f"AGRIRENT-EQUIP-{i+1}-HEALTHPASSPORT",
            sensor_temperature=76.2 + (i * 2.5),
            sensor_vibration="Normal" if i % 3 != 0 else "Slight Vibration",
            sensor_oil_level="Optimal" if i % 4 != 0 else "Low Warning"
        )
        created_listings.append(eq)
        
    print(f"Listed {len(created_listings)} agricultural equipment models.")

    # 4. Create Reviews
    Review.objects.create(
        equipment=created_listings[0], # John Deere
        author=farmer_user,
        rating=5,
        comment="Excellent tractor! Ploughed 4 acres in no time. The driver was very helpful."
    )
    Review.objects.create(
        equipment=created_listings[0],
        author=admin_user,
        rating=4,
        comment="Well maintained engine. Price is reasonable."
    )
    Review.objects.create(
        equipment=created_listings[1], # Kubota
        author=farmer_user,
        rating=5,
        comment="Harvested paddy effortlessly. Saves huge manual labor cost. Highly recommended!"
    )
    
    print("Created reviews.")

    # 5. Create Bookings (Pending, In Progress, Completed, Rejected)
    now = timezone.now()
    
    # Completed Booking
    b1 = Booking.objects.create(
        equipment=created_listings[0],
        farmer=farmer_user,
        start_date=now - timedelta(days=5, hours=4),
        end_date=now - timedelta(days=5),
        status='Completed',
        total_cost=2600.00 # 4 hours * 650
    )
    
    # In Progress Booking (Tractor is currently busy)
    b2 = Booking.objects.create(
        equipment=created_listings[1],
        farmer=farmer_user,
        start_date=now - timedelta(hours=2),
        end_date=now + timedelta(hours=4),
        status='In Progress',
        total_cost=13200.00 # 6 hours * 2200
    )
    created_listings[1].is_available = False
    created_listings[1].save()
    
    # Pending Booking
    b3 = Booking.objects.create(
        equipment=created_listings[2],
        farmer=farmer_user,
        start_date=now + timedelta(days=1),
        end_date=now + timedelta(days=1, hours=3),
        status='Pending',
        total_cost=2700.00 # 3 hours * 900
    )
    
    print("Created sample bookings.")

    # 6. Create Messages inside Bookings
    Message.objects.create(
        booking=b2,
        sender=farmer_user,
        content="Hello, is the harvester driver arriving on time?"
    )
    Message.objects.create(
        booking=b2,
        sender=owner_user,
        content="Yes, he is starting now. Should reach your farm in 15 minutes."
    )
    
    print("Created booking chat logs.")

    # 7. Create Support Tickets
    SupportTicket.objects.create(
        user=farmer_user,
        subject="Issue with Booking Payment",
        message="I tried making a payment for the Rotavator booking, but the transaction was pending. Please check.",
        status='Open',
        priority='High'
    )
    SupportTicket.objects.create(
        user=owner_user,
        subject="How to verify my Tractor?",
        message="I uploaded my tractor RC book, but it still says 'verification pending'. How long does it take?",
        status='In Progress',
        priority='Medium'
    )
    
    print("Created support tickets.")

    # 8. Create Notifications
    Notification.objects.create(
        user=owner_user,
        content="You have a new booking request for your Rotavator.",
        is_read=False
    )
    Notification.objects.create(
        user=farmer_user,
        content="Your booking for John Deere Tractor has been completed. Leave a review!",
        is_read=True
    )
    
    print("Created notifications.")
    print("Database seeding completed successfully!")


if __name__ == '__main__':
    seed_db()

    # 9. Create Operator User & Profile
    operator_user, created = User.objects.get_or_create(
        username='operator',
        defaults={
            'email': 'operator@agrirent.com',
            'role': 'Operator',
            'phone_number': '+919876543213',
            'is_verified': True,
            'reliability_score': 4.9,
            'aadhaar_kyc_status': 'Verified',
            'aadhaar_number_masked': 'XXXX-XXXX-8899'
        }
    )
    if created:
        operator_user.set_password('password123')
        operator_user.save()

    from api.models import OperatorProfile, OperatorJobAssignment, JobStatusHistory
    op_profile, _ = OperatorProfile.objects.get_or_create(
        user=operator_user,
        defaults={
            'full_name': 'Ramesh Kumar',
            'phone': '+919876543213',
            'experience_years': 6,
            'skills': ['Tractor Operation', 'Harvester Operation', 'Rotary Tillage', 'Paddy Puddling'],
            'supported_machinery': ['Tractor', 'Harvester', 'Rotavator', 'Seeder', 'Sprayer'],
            'service_area': 'Coimbatore & Tiruppur Rural',
            'service_radius_km': 35.0,
            'current_latitude': 11.0250,
            'current_longitude': 76.9620,
            'working_hours': '06:00 AM - 07:30 PM',
            'is_available': True,
            'current_work_status': 'Available',
            'verification_status': 'Verified',
            'license_number': 'DL-TN-38-20180092',
            'hourly_compensation_rate': 280.00,
            'total_jobs_completed': 14
        }
    )
    print("Created operator seed user and verified profile.")
