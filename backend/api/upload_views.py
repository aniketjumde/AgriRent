import os
import uuid
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_equipment_image_view(request):
    """
    Handles authenticated image upload to local media storage.
    Validates file extension, size limit (max 5MB), and user permissions.
    Returns the URL to be attached to Equipment, Booking, or Profile.
    """
    file_obj = request.FILES.get('file') or request.FILES.get('image')
    if not file_obj:
        return Response({"error": "No file uploaded."}, status=status.HTTP_400_BAD_REQUEST)

    # 1. Validate file size (max 5MB)
    max_size = 5 * 1024 * 1024
    if file_obj.size > max_size:
        return Response({"error": "File size exceeds 5MB limit."}, status=status.HTTP_400_BAD_REQUEST)

    # 2. Validate file extension / mime type
    allowed_types = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
    if file_obj.content_type not in allowed_types:
        return Response({"error": "Invalid file type. Allowed: JPEG, PNG, WebP."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        ext = os.path.splitext(file_obj.name)[1] if file_obj.name else '.jpg'
        unique_name = f"equipment/{uuid.uuid4().hex}{ext}"
        saved_path = default_storage.save(unique_name, ContentFile(file_obj.read()))
        file_url = default_storage.url(saved_path)

        # Build absolute URL if request is available
        full_url = request.build_absolute_uri(file_url)

        return Response({
            "message": "File uploaded successfully.",
            "url": full_url
        }, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
