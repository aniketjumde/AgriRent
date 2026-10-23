import os
import uuid
import mimetypes
import requests
from django.conf import settings

def upload_to_supabase_storage(file_obj, filename=None, bucket=None, content_type=None):
    """
    Uploads a file directly to Supabase Storage bucket using Supabase REST API.
    Returns the public URL of the uploaded asset or raises an Exception.
    
    Requirements/Fallback:
    If SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not configured,
    returns None so the application can gracefully fall back to local/standard URL handling.
    """
    supabase_url = getattr(settings, 'SUPABASE_URL', '') or os.environ.get('SUPABASE_URL', '')
    service_key = getattr(settings, 'SUPABASE_SERVICE_ROLE_KEY', '') or os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '') or getattr(settings, 'SUPABASE_ANON_KEY', '') or os.environ.get('SUPABASE_ANON_KEY', '')
    bucket_name = bucket or getattr(settings, 'SUPABASE_STORAGE_BUCKET', 'equipment-images')

    if not supabase_url or not service_key:
        return None

    supabase_url = supabase_url.rstrip('/')
    ext = os.path.splitext(filename)[1] if filename else '.jpg'
    unique_filename = f"{uuid.uuid4().hex}{ext}"
    storage_path = f"{bucket_name}/{unique_filename}"

    if not content_type and filename:
        content_type, _ = mimetypes.guess_type(filename)
    content_type = content_type or 'application/octet-stream'

    upload_url = f"{supabase_url}/storage/v1/object/{storage_path}"
    headers = {
        'Authorization': f"Bearer {service_key}",
        'apiKey': service_key,
        'Content-Type': content_type
    }

    # If file_obj has read attribute, read bytes
    if hasattr(file_obj, 'read'):
        file_bytes = file_obj.read()
    else:
        file_bytes = file_obj

    response = requests.post(upload_url, data=file_bytes, headers=headers)
    if response.status_code in (200, 201):
        # Public URL format
        public_url = f"{supabase_url}/storage/v1/object/public/{storage_path}"
        return public_url
    else:
        raise Exception(f"Supabase Storage Upload Error ({response.status_code}): {response.text}")
