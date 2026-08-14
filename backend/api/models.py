from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    ROLE_CHOICES = (
        ('Farmer', 'Farmer'),
        ('Owner', 'Owner'),
        ('Admin', 'Admin'),
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='Farmer')
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    otp_code = models.CharField(max_length=6, blank=True, null=True)
    is_verified = models.BooleanField(default=False)
    
    # Farmer & Owner Trust Score fields
    reliability_score = models.FloatField(default=4.8)
    aadhaar_kyc_status = models.CharField(max_length=20, default='Verified') # Verified, Pending, Not Started
    aadhaar_number_masked = models.CharField(max_length=15, default='XXXX-XXXX-1234')

    def __str__(self):
        return f"{self.username} ({self.role})"


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
