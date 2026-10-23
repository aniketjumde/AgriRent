from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from .supabase_storage import upload_to_supabase_storage

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_equipment_image_view(request):
    """
    Handles authenticated image upload to Supabase Storage.
    Validates file extension, size limit (max 5MB), and user permissions.
    Returns the public URL to be attached to Equipment, Booking, or Profile.
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

    # 3. Attempt upload to Supabase Storage
    try:
        public_url = upload_to_supabase_storage(
            file_obj=file_obj,
            filename=file_obj.name,
            content_type=file_obj.content_type
        )
        if not public_url:
            # Fallback if Supabase storage is not configured in local dev
            return Response({
                "message": "Supabase credentials not configured in environment; file validated.",
                "url": "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=600"
            })

        return Response({
            "message": "File uploaded successfully to Supabase Storage.",
            "url": public_url
        }, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
