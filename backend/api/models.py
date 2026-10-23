from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    ROLE_CHOICES = (
        ('Farmer', 'Farmer'),
        ('Owner', 'Owner'),
        ('Operator', 'Operator'),
        ('Admin', 'Admin'),
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='Farmer')
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    otp_code = models.CharField(max_length=6, blank=True, null=True)
    is_verified = models.BooleanField(default=False)
    
    # Farmer & Owner & Operator Trust Score fields
    reliability_score = models.FloatField(default=4.8)
    aadhaar_kyc_status = models.CharField(max_length=20, default='Verified') # Verified, Pending, Not Started
    aadhaar_number_masked = models.CharField(max_length=15, default='XXXX-XXXX-1234')

    def __str__(self):
        return f"{self.username} ({self.role})"


class OperatorProfile(models.Model):
    VERIFICATION_CHOICES = (
        ('Pending', 'Pending'),
        ('Verified', 'Verified'),
        ('Rejected', 'Rejected'),
    )
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='operator_profile')
    full_name = models.CharField(max_length=120, blank=True, default='')
    phone = models.CharField(max_length=20, blank=True, default='')
    experience_years = models.PositiveIntegerField(default=3)
    skills = models.JSONField(default=list, blank=True) # list of skills: ['Deep Plowing', 'Paddy Harvesting', 'Laser Leveling']
    supported_machinery = models.JSONField(default=list, blank=True) # ['Tractor', 'Harvester', 'Rotavator']
    service_area = models.CharField(max_length=150, default='Coimbatore & Surrounding Taluks')
    service_radius_km = models.FloatField(default=25.0)
    current_latitude = models.DecimalField(max_digits=9, decimal_places=6, default=11.0168)
    current_longitude = models.DecimalField(max_digits=9, decimal_places=6, default=76.9558)
    working_hours = models.CharField(max_length=100, default='06:00 AM - 08:00 PM')
    is_available = models.BooleanField(default=True)
    current_work_status = models.CharField(max_length=50, default='Available') # Available, On Job, Offline
    verification_status = models.CharField(max_length=20, choices=VERIFICATION_CHOICES, default='Pending')
    verification_notes = models.TextField(blank=True, default='')
    license_number = models.CharField(max_length=50, blank=True, default='DL-TN-37-20210048')
    document_url = models.TextField(blank=True, default='') # link/base64 to driving license / operator certificate
    hourly_compensation_rate = models.DecimalField(max_digits=8, decimal_places=2, default=250.00)
    total_jobs_completed = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Operator: {self.user.username} [{self.verification_status}]"


class Equipment(models.Model):
    CATEGORY_CHOICES = (
        ('Tractor', 'Tractor'),
        ('Harvester', 'Harvester'),
        ('Rotavator', 'Rotavator'),
        ('Seeder', 'Seeder'),
        ('Sprayer', 'Sprayer'),
        ('Crop Protection Equipment', 'Crop Protection Equipment'),
        ('Other Agricultural Machinery', 'Other Agricultural Machinery'),
    )
    title = models.CharField(max_length=150)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    description = models.TextField()
    rental_price_per_hour = models.DecimalField(max_digits=10, decimal_places=2) # also serves as daily rate if we scale it
    location_latitude = models.DecimalField(max_digits=9, decimal_places=6, default=11.0168)
    location_longitude = models.DecimalField(max_digits=9, decimal_places=6, default=76.9558)
    address = models.CharField(max_length=255, default='Coimbatore, Tamil Nadu')
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='equipment_listings')
    image_url = models.TextField(blank=True, null=True) # supports external URLs or base64 images
    is_available = models.BooleanField(default=True)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Machine Health Passport fields
    service_history = models.TextField(default='[]') # JSON String
    maintenance_records = models.TextField(default='[]') # JSON String
    purchase_details = models.TextField(default='{"year": 2024, "warranty": "2 years"}') # JSON String
    fuel_efficiency = models.CharField(max_length=50, default='4.5 Litres/Hour')
    breakdown_history = models.TextField(default='[]') # JSON String
    qr_code_data = models.TextField(blank=True, null=True)
    
    # IoT Predictive Sensor Simulation fields
    sensor_temperature = models.FloatField(default=78.5)
    sensor_vibration = models.CharField(max_length=20, default='Normal')
    sensor_oil_level = models.CharField(max_length=20, default='Optimal')
    last_sensor_update = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} - {self.category}"


class Booking(models.Model):
    STATUS_CHOICES = (
        ('Pending', 'Pending'),
        ('Approved', 'Approved'),
        ('Rejected', 'Rejected'),
        ('In Progress', 'In Progress'),
        ('Completed', 'Completed'),
    )
    equipment = models.ForeignKey(Equipment, on_delete=models.CASCADE, related_name='bookings')
    farmer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bookings_made')
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    total_cost = models.DecimalField(max_digits=10, decimal_places=2)
    delivery_option = models.CharField(max_length=50, default='Pickup') # Pickup or Delivery
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Advanced features fields
    escrow_status = models.CharField(max_length=30, default='N/A') # N/A, Held, Released, Refunded
    micro_rental_shared = models.BooleanField(default=False)
    insurance_opt_in = models.BooleanField(default=False)
    insurance_claim_status = models.CharField(max_length=30, default='N/A') # N/A, Submitted, Under Review, Paid, Denied
    
    # Operator requirement
    requires_operator = models.BooleanField(default=False)
    operator_assigned = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_bookings'
    )
    
    # Damage Detection
    before_rental_image = models.TextField(blank=True, null=True)
    after_rental_image = models.TextField(blank=True, null=True)
    damage_severity = models.CharField(max_length=20, default='N/A') # N/A, None, Light, Medium, Severe
    damage_dispute_report = models.TextField(blank=True, null=True)
    
    # Blockchain Audit hash logs
    blockchain_contract_hash = models.CharField(max_length=66, blank=True, null=True)
    blockchain_ipfs_hash = models.CharField(max_length=46, blank=True, null=True)
    
    # Sustainability metrics
    carbon_saved_kg = models.FloatField(default=0.0)

    def __str__(self):
        return f"Booking #{self.id}: {self.farmer.username} -> {self.equipment.title} ({self.status})"


class OperatorJobAssignment(models.Model):
    JOB_STATUS_CHOICES = (
        ('REQUESTED', 'REQUESTED'),
        ('ACCEPTED', 'ACCEPTED'),
        ('TRAVELLING_TO_PICKUP', 'TRAVELLING_TO_PICKUP'),
        ('ARRIVED_AT_PICKUP', 'ARRIVED_AT_PICKUP'),
        ('MACHINE_COLLECTED', 'MACHINE_COLLECTED'),
        ('TRAVELLING_TO_FARM', 'TRAVELLING_TO_FARM'),
        ('ARRIVED_AT_FARM', 'ARRIVED_AT_FARM'),
        ('IN_PROGRESS', 'IN_PROGRESS'),
        ('COMPLETED', 'COMPLETED'),
        ('REJECTED', 'REJECTED'),
        ('CANCELLED', 'CANCELLED'),
    )

    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='operator_assignments')
    operator = models.ForeignKey(OperatorProfile, on_delete=models.CASCADE, related_name='job_assignments')
    status = models.CharField(max_length=30, choices=JOB_STATUS_CHOICES, default='REQUESTED')
    
    # Financial compensation
    compensation_amount = models.DecimalField(max_digits=10, decimal_places=2, default=500.00)
    
    # Routing / GPS tracking data
    pickup_latitude = models.DecimalField(max_digits=9, decimal_places=6, default=11.0168)
    pickup_longitude = models.DecimalField(max_digits=9, decimal_places=6, default=76.9558)
    pickup_address = models.CharField(max_length=255, default='Coimbatore, Tamil Nadu')
    
    destination_latitude = models.DecimalField(max_digits=9, decimal_places=6, default=11.0000)
    destination_longitude = models.DecimalField(max_digits=9, decimal_places=6, default=76.9000)
    destination_address = models.CharField(max_length=255, default='Coimbatore Rural Farm Area')
    
    current_operator_lat = models.DecimalField(max_digits=9, decimal_places=6, default=11.0168)
    current_operator_lng = models.DecimalField(max_digits=9, decimal_places=6, default=76.9558)
    
    estimated_travel_distance_km = models.FloatField(default=12.5)
    estimated_arrival_minutes = models.IntegerField(default=25)
    eta_timestamp = models.DateTimeField(null=True, blank=True)
    
    # Lifecycle Timestamps
    requested_at = models.DateTimeField(auto_now_add=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    pickup_arrival_at = models.DateTimeField(null=True, blank=True)
    machine_collected_at = models.DateTimeField(null=True, blank=True)
    farm_arrival_at = models.DateTimeField(null=True, blank=True)
    work_started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    rejected_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    
    rejection_reason = models.TextField(blank=True, default='')
    status_notes = models.TextField(blank=True, default='')

    class Meta:
        ordering = ['-requested_at']

    def __str__(self):
        return f"JobAssignment #{self.id} for Booking #{self.booking_id} -> Op:{self.operator.user.username} ({self.status})"


class JobStatusHistory(models.Model):
    assignment = models.ForeignKey(OperatorJobAssignment, on_delete=models.CASCADE, related_name='status_history')
    from_status = models.CharField(max_length=30, blank=True, default='')
    to_status = models.CharField(max_length=30)
    recorded_at = models.DateTimeField(auto_now_add=True)
    operator_lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    operator_lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    note = models.TextField(blank=True, default='')

    def __str__(self):
        return f"StatusHistory #{self.assignment_id}: {self.from_status} -> {self.to_status}"


class Review(models.Model):
    equipment = models.ForeignKey(Equipment, on_delete=models.CASCADE, related_name='reviews')
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews_written')
    rating = models.IntegerField(default=5) # 1 to 5 stars
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Review by {self.author.username} on {self.equipment.title} ({self.rating} stars)"


class Message(models.Model):
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='chat_messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Message from {self.sender.username} at {self.timestamp}"


class Notification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    content = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Notification for {self.user.username}: {self.content[:30]}..."


class SupportTicket(models.Model):
    STATUS_CHOICES = (
        ('Open', 'Open'),
        ('In Progress', 'In Progress'),
        ('Closed', 'Closed'),
    )
    PRIORITY_CHOICES = (
        ('Low', 'Low'),
        ('Medium', 'Medium'),
        ('High', 'High'),
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='support_tickets')
    subject = models.CharField(max_length=150)
    message = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Open')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='Medium')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Ticket #{self.id}: {self.subject} ({self.status})"


class PricePrediction(models.Model):
    equipment_type = models.CharField(max_length=50)
    demand = models.CharField(max_length=20)
    season = models.CharField(max_length=20)
    location = models.CharField(max_length=150)
    min_price = models.DecimalField(max_digits=10, decimal_places=2)
    rec_price = models.DecimalField(max_digits=10, decimal_places=2)
    max_price = models.DecimalField(max_digits=10, decimal_places=2)
    predicted_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Price Prediction for {self.equipment_type} ({self.predicted_at.date()})"


class Recommendation(models.Model):
    crop_type = models.CharField(max_length=50)
    land_size = models.DecimalField(max_digits=5, decimal_places=2)
    task_type = models.CharField(max_length=50)
    recommended_equipment = models.TextField() # comma-separated or JSON string list
    confidence_score = models.DecimalField(max_digits=3, decimal_places=2)
    estimated_cost = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Recommendation: {self.crop_type} -> {self.recommended_equipment}"
