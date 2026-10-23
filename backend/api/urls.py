from django.urls import path
from .views import (
    register_view, verify_otp_view, login_view, forgot_password_view, reset_password_view, get_me_view,
    EquipmentListCreateView, EquipmentDetailView, verify_equipment_view, create_review_view,
    BookingListCreateView, update_booking_status_view, booking_chat_view, notification_list_view,
    SupportTicketListCreateView, update_ticket_status_view,
    ai_recommend_view, ai_predict_price_view, ai_voice_booking_view, ai_assistant_chat_view,
    farmer_dashboard_analytics, owner_dashboard_analytics, admin_dashboard_analytics,
    weather_forecast_view, govt_schemes_view, booking_damage_detection_view
)
from .operator_views import (
    OperatorProfileView, update_operator_availability_view, admin_operator_verifications_view,
    find_matching_operators_view, operator_dashboard_jobs_view,
    operator_accept_job_view, operator_reject_job_view,
    update_job_status_transition_view, update_operator_location_view, get_job_tracking_data_view,
    list_nearby_online_operators_view, owner_request_operator_view
)

urlpatterns = [
    # Auth Routes
    path('auth/register/', register_view, name='register'),
    path('auth/verify-otp/', verify_otp_view, name='verify-otp'),
    path('auth/login/', login_view, name='login'),
    path('auth/forgot-password/', forgot_password_view, name='forgot-password'),
    path('auth/reset-password/', reset_password_view, name='reset-password'),
    path('auth/me/', get_me_view, name='auth-me'),

    # Listings & Reviews
    path('equipment/', EquipmentListCreateView.as_view(), name='equipment-list-create'),
    path('equipment/<int:pk>/', EquipmentDetailView.as_view(), name='equipment-detail'),
    path('equipment/<int:pk>/verify/', verify_equipment_view, name='equipment-verify'),
    path('equipment/<int:pk>/reviews/', create_review_view, name='equipment-reviews'),

    # Bookings & Real-time Chat
    path('bookings/', BookingListCreateView.as_view(), name='bookings-list-create'),
    path('bookings/<int:pk>/status/', update_booking_status_view, name='booking-status-update'),
    path('bookings/<int:pk>/messages/', booking_chat_view, name='booking-chat'),
    path('bookings/<int:pk>/damage/', booking_damage_detection_view, name='booking-damage-detection'),

    # Operator Management & Smart Jobs APIs
    path('operator/profile/', OperatorProfileView.as_view(), name='operator-profile'),
    path('operator/availability/', update_operator_availability_view, name='operator-availability'),
    path('operator/nearby/', list_nearby_online_operators_view, name='operator-nearby-online'),
    path('operator/request/<int:booking_id>/', owner_request_operator_view, name='operator-owner-request'),
    path('operator/dashboard/', operator_dashboard_jobs_view, name='operator-dashboard'),
    path('operator/jobs/<int:pk>/accept/', operator_accept_job_view, name='operator-accept-job'),
    path('operator/jobs/<int:pk>/reject/', operator_reject_job_view, name='operator-reject-job'),
    path('operator/jobs/<int:pk>/status/', update_job_status_transition_view, name='operator-job-status'),
    path('operator/jobs/<int:pk>/location/', update_operator_location_view, name='operator-location-update'),
    path('operator/jobs/<int:pk>/tracking/', get_job_tracking_data_view, name='operator-job-tracking'),
    path('operator/match/<int:booking_id>/', find_matching_operators_view, name='operator-match-booking'),
    path('operator/verifications/', admin_operator_verifications_view, name='operator-verifications-list'),
    path('operator/verifications/<int:pk>/', admin_operator_verifications_view, name='operator-verification-update'),

    # Notifications & Support
    path('notifications/', notification_list_view, name='notifications-list'),
    path('support/tickets/', SupportTicketListCreateView.as_view(), name='support-tickets'),
    path('support/tickets/<int:pk>/', update_ticket_status_view, name='support-ticket-update'),

    # AI Module routes
    path('ai/recommend/', ai_recommend_view, name='ai-recommend'),
    path('ai/predict-price/', ai_predict_price_view, name='ai-predict-price'),
    path('ai/voice-booking/', ai_voice_booking_view, name='ai-voice-booking'),
    path('ai/chat/', ai_assistant_chat_view, name='ai-chat'),

    # Analytics Dashboards
    path('dashboard/farmer/', farmer_dashboard_analytics, name='dashboard-farmer'),
    path('dashboard/owner/', owner_dashboard_analytics, name='dashboard-owner'),
    path('dashboard/admin/', admin_dashboard_analytics, name='dashboard-admin'),
    
    # Weather & Government Schemes
    path('weather/', weather_forecast_view, name='weather-forecast'),
    path('govt-schemes/', govt_schemes_view, name='govt-schemes'),
]
