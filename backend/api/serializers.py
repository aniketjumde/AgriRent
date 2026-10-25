from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from .models import (
    User, Equipment, Booking, Review, Message, Notification, SupportTicket,
    PricePrediction, Recommendation, OperatorProfile, OperatorJobAssignment, JobStatusHistory, PaymentTransaction
)

class OperatorProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    reliability_score = serializers.FloatField(source='user.reliability_score', read_only=True)
    aadhaar_kyc_status = serializers.CharField(source='user.aadhaar_kyc_status', read_only=True)

    class Meta:
        model = OperatorProfile
        fields = (
            'id', 'user_id', 'username', 'full_name', 'phone', 'experience_years',
            'skills', 'supported_machinery', 'service_area', 'service_radius_km',
            'current_latitude', 'current_longitude', 'working_hours', 'is_available', 'is_online', 'last_seen_at',
            'current_work_status', 'verification_status', 'verification_notes',
            'license_number', 'document_url', 'hourly_compensation_rate',
            'total_jobs_completed', 'reliability_score', 'aadhaar_kyc_status',
            'created_at', 'updated_at'
        )
        read_only_fields = ('user_id', 'username', 'verification_status', 'reliability_score', 'aadhaar_kyc_status', 'total_jobs_completed')


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    email = serializers.EmailField(required=True)

    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'password', 'role', 'phone_number',
            'is_verified', 'is_email_verified', 'reliability_score',
            'aadhaar_kyc_status', 'aadhaar_number_masked'
        )
        read_only_fields = ('is_verified', 'is_email_verified', 'reliability_score', 'aadhaar_kyc_status', 'aadhaar_number_masked')

    def validate_email(self, value):
        normalized = value.strip().lower()
        if User.objects.filter(email__iexact=normalized).exists():
            raise serializers.ValidationError("An account with this email address already exists.")
        return normalized

    def validate_password(self, value):
        if len(value) < 12:
            raise serializers.ValidationError("Password must be at least 12 characters long.")
        validate_password(value)
        return value

    def validate_role(self, value):
        if value == 'Admin':
            raise serializers.ValidationError("Admin accounts cannot be created via public registration.")
        if value not in ['Farmer', 'Owner', 'Operator']:
            raise serializers.ValidationError("Invalid role selected.")
        return value

    def create(self, validated_data):
        role = validated_data.get('role', 'Farmer')
        raw_password = validated_data.pop('password')
        
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            role=role,
            phone_number=validated_data.get('phone_number', ''),
            is_verified=False,
            is_email_verified=False,
            reliability_score=4.8,
            aadhaar_kyc_status='Verified',
            aadhaar_number_masked='XXXX-XXXX-1234'
        )
        user.set_password(raw_password)
        user.save()

        # If registered as Operator, auto-create associated OperatorProfile
        if role == 'Operator':
            OperatorProfile.objects.create(
                user=user,
                full_name=user.username.capitalize(),
                phone=user.phone_number or '',
                skills=['Machinery Operation', 'Field Maintenance'],
                supported_machinery=['Tractor', 'Harvester', 'Rotavator'],
                verification_status='Pending'
            )

        return user


class UserProfileSerializer(serializers.ModelSerializer):
    operator_profile = OperatorProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'role', 'phone_number',
            'is_verified', 'is_email_verified',
            'reliability_score', 'aadhaar_kyc_status', 'aadhaar_number_masked',
            'operator_profile'
        )


class ReviewSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.username', read_only=True)

    class Meta:
        model = Review
        fields = ('id', 'equipment', 'author', 'author_name', 'rating', 'comment', 'created_at')
        read_only_fields = ('author',)


class EquipmentSerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(source='owner.username', read_only=True)
    owner_phone = serializers.CharField(source='owner.phone_number', read_only=True)
    owner_reliability = serializers.FloatField(source='owner.reliability_score', read_only=True)
    owner_kyc_status = serializers.CharField(source='owner.aadhaar_kyc_status', read_only=True)
    reviews = ReviewSerializer(many=True, read_only=True)
    average_rating = serializers.SerializerMethodField()

    class Meta:
        model = Equipment
        fields = (
            'id', 'title', 'category', 'description', 'rental_price_per_hour',
            'location_latitude', 'location_longitude', 'address', 'owner',
            'owner_name', 'owner_phone', 'owner_reliability', 'owner_kyc_status',
            'image_url', 'is_available', 'is_verified', 'created_at', 'reviews',
            'average_rating', 'service_history', 'maintenance_records', 'purchase_details',
            'fuel_efficiency', 'breakdown_history', 'qr_code_data', 'sensor_temperature',
            'sensor_vibration', 'sensor_oil_level', 'last_sensor_update'
        )
        read_only_fields = ('owner', 'is_verified')

    def get_average_rating(self, obj):
        ratings = obj.reviews.values_list('rating', flat=True)
        if ratings:
            return round(sum(ratings) / len(ratings), 1)
        return 0.0


class JobStatusHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = JobStatusHistory
        fields = ('id', 'assignment', 'from_status', 'to_status', 'recorded_at', 'operator_lat', 'operator_lng', 'note')


class OperatorJobAssignmentSerializer(serializers.ModelSerializer):
    operator_name = serializers.CharField(source='operator.full_name', read_only=True)
    operator_username = serializers.CharField(source='operator.user.username', read_only=True)
    operator_phone = serializers.CharField(source='operator.phone', read_only=True)
    operator_rating = serializers.FloatField(source='operator.user.reliability_score', read_only=True)
    
    # Nested booking and equipment info
    booking_id = serializers.IntegerField(source='booking.id', read_only=True)
    farmer_name = serializers.CharField(source='booking.farmer.username', read_only=True)
    farmer_phone = serializers.CharField(source='booking.farmer.phone_number', read_only=True)
    owner_name = serializers.CharField(source='booking.equipment.owner.username', read_only=True)
    owner_phone = serializers.CharField(source='booking.equipment.owner.phone_number', read_only=True)
    machine_title = serializers.CharField(source='booking.equipment.title', read_only=True)
    machine_category = serializers.CharField(source='booking.equipment.category', read_only=True)
    machine_image = serializers.CharField(source='booking.equipment.image_url', read_only=True)
    start_date = serializers.DateTimeField(source='booking.start_date', read_only=True)
    end_date = serializers.DateTimeField(source='booking.end_date', read_only=True)
    status_history = JobStatusHistorySerializer(many=True, read_only=True)

    class Meta:
        model = OperatorJobAssignment
        fields = (
            'id', 'booking', 'booking_id', 'operator', 'operator_name', 'operator_username',
            'operator_phone', 'operator_rating', 'status', 'compensation_amount',
            'pickup_latitude', 'pickup_longitude', 'pickup_address',
            'destination_latitude', 'destination_longitude', 'destination_address',
            'current_operator_lat', 'current_operator_lng',
            'estimated_travel_distance_km', 'estimated_arrival_minutes', 'eta_timestamp',
            'farmer_name', 'farmer_phone', 'owner_name', 'owner_phone',
            'machine_title', 'machine_category', 'machine_image',
            'start_date', 'end_date', 'expires_at',
            'requested_at', 'accepted_at', 'pickup_arrival_at', 'machine_collected_at',
            'farm_arrival_at', 'work_started_at', 'completed_at', 'rejected_at', 'cancelled_at',
            'rejection_reason', 'status_notes', 'status_history'
        )
        read_only_fields = ('requested_at', 'accepted_at', 'completed_at')


class BookingSerializer(serializers.ModelSerializer):
    farmer_name = serializers.CharField(source='farmer.username', read_only=True)
    farmer_reliability = serializers.FloatField(source='farmer.reliability_score', read_only=True)
    farmer_kyc_status = serializers.CharField(source='farmer.aadhaar_kyc_status', read_only=True)
    equipment_details = EquipmentSerializer(source='equipment', read_only=True)
    operator_assigned_name = serializers.CharField(source='operator_assigned.username', read_only=True, default='')
    latest_assignment = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = (
            'id', 'equipment', 'equipment_details', 'farmer', 'farmer_name',
            'farmer_reliability', 'farmer_kyc_status', 'start_date', 'end_date',
            'status', 'total_cost', 'delivery_option', 'notes', 'created_at',
            'escrow_status', 'payment_status', 'razorpay_order_id', 'razorpay_payment_id', 'paid_at', 'micro_rental_shared', 'insurance_opt_in',
            'insurance_claim_status', 'requires_operator', 'operator_assigned',
            'operator_assigned_name', 'latest_assignment',
            'before_rental_image', 'after_rental_image',
            'damage_severity', 'damage_dispute_report', 'blockchain_contract_hash',
            'blockchain_ipfs_hash', 'carbon_saved_kg'
        )
        read_only_fields = ('farmer', 'total_cost')

    def get_latest_assignment(self, obj):
        latest = obj.operator_assignments.order_by('-requested_at').first()
        if latest:
            return {
                'id': latest.id,
                'status': latest.status,
                'operator_name': latest.operator.full_name or latest.operator.user.username,
                'operator_phone': latest.operator.phone or latest.operator.user.phone_number,
                'current_operator_lat': float(latest.current_operator_lat),
                'current_operator_lng': float(latest.current_operator_lng),
                'estimated_arrival_minutes': latest.estimated_arrival_minutes,
                'estimated_travel_distance_km': latest.estimated_travel_distance_km,
                'compensation_amount': float(latest.compensation_amount)
            }
        return None


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.username', read_only=True)

    class Meta:
        model = Message
        fields = ('id', 'booking', 'sender', 'sender_name', 'content', 'timestamp')
        read_only_fields = ('sender',)


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ('id', 'user', 'content', 'is_read', 'created_at')


class SupportTicketSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = SupportTicket
        fields = ('id', 'user', 'username', 'subject', 'message', 'status', 'priority', 'created_at')
        read_only_fields = ('user',)


class PricePredictionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PricePrediction
        fields = '__all__'


class RecommendationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Recommendation
        fields = '__all__'


class PaymentTransactionSerializer(serializers.ModelSerializer):
    farmer_name = serializers.CharField(source='farmer.username', read_only=True)
    equipment_title = serializers.CharField(source='booking.equipment.title', read_only=True)

    class Meta:
        model = PaymentTransaction
        fields = (
            'id', 'booking', 'farmer', 'farmer_name', 'equipment_title',
            'razorpay_order_id', 'razorpay_payment_id', 'amount', 'currency',
            'status', 'rental_charge', 'operator_charge', 'insurance_fee',
            'delivery_fee', 'tax_amount', 'discount_amount', 'refund_id',
            'refund_amount', 'refund_reason', 'receipt_number', 'error_code',
            'error_description', 'created_at', 'updated_at'
        )
        read_only_fields = ('farmer',)
