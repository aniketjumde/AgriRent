/**
 * Supabase Client Initialization for AgriRent Frontend
 * Connects to Supabase using VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
 * Designed with safe fallback if keys are pending environment setup.
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const getSupabaseConfig = () => ({
  url: supabaseUrl,
  hasAnonKey: Boolean(supabaseAnonKey),
  storageBucket: import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'equipment-images',
});

// Helper for uploading equipment pictures directly from frontend via Supabase Storage
export async function uploadEquipmentImageToSupabase(file, bucketName = 'equipment-images') {
  if (!isSupabaseConfigured) {
    console.warn('Supabase credentials not configured in frontend environment; skipping direct storage upload.');
    return null;
  }

  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const uploadEndpoint = `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/${bucketName}/${filePath}`;
    const response = await fetch(uploadEndpoint, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': file.type,
      },
      body: file,
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Upload failed: ${err}`);
    }

    const publicUrl = `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${bucketName}/${filePath}`;
    return publicUrl;
  } catch (error) {
    console.error('Error uploading image to Supabase Storage:', error);
    throw error;
  }
}
