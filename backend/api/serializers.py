from rest_framework import serializers
from .models import User, Equipment, Booking, Review, Message, Notification, SupportTicket, PricePrediction, Recommendation

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password', 'role', 'phone_number', 'is_verified', 'reliability_score', 'aadhaar_kyc_status', 'aadhaar_number_masked')

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            role=validated_data.get('role', 'Farmer'),
            phone_number=validated_data.get('phone_number', ''),
            is_verified=False,
            reliability_score=4.8,
            aadhaar_kyc_status='Verified',
            aadhaar_number_masked='XXXX-XXXX-1234'
        )
        user.set_password(validated_data['password'])
        # For simplicity, assign an OTP code on registration
        user.otp_code = "123456" # Default test OTP
        user.save()
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'role', 'phone_number', 'is_verified', 'reliability_score', 'aadhaar_kyc_status', 'aadhaar_number_masked')


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


class BookingSerializer(serializers.ModelSerializer):
    farmer_name = serializers.CharField(source='farmer.username', read_only=True)
    farmer_reliability = serializers.FloatField(source='farmer.reliability_score', read_only=True)
    farmer_kyc_status = serializers.CharField(source='farmer.aadhaar_kyc_status', read_only=True)
    equipment_details = EquipmentSerializer(source='equipment', read_only=True)

    class Meta:
        model = Booking
        fields = (
            'id', 'equipment', 'equipment_details', 'farmer', 'farmer_name',
            'farmer_reliability', 'farmer_kyc_status', 'start_date', 'end_date',
            'status', 'total_cost', 'delivery_option', 'notes', 'created_at',
            'escrow_status', 'micro_rental_shared', 'insurance_opt_in',
            'insurance_claim_status', 'before_rental_image', 'after_rental_image',
            'damage_severity', 'damage_dispute_report', 'blockchain_contract_hash',
            'blockchain_ipfs_hash', 'carbon_saved_kg'
        )
        read_only_fields = ('farmer', 'total_cost')


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
