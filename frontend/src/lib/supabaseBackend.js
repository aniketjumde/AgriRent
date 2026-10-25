/**
 * Supabase Direct Backend Service for AgriRent
 * Seamlessly executes PostgreSQL RPC procedures on the managed Supabase Database
 * when the external WSGI container (e.g. Render) is offline or unavailable.
 */

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || 'https://dtunlnhcxpvtyvumswwk.supabase.co').replace(/\/$/, '');
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0dW5sbmhjeHB2dHl2dW1zd3drIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5MTA2MjQsImV4cCI6MjEwODQ4NjYyNH0.zse2zfRU27hMXVEJMFy5jCP_IOiB7-hu-lUtKh0-vdo';

const supabaseRpc = async (fnName, params = {}) => {
  const url = `${SUPABASE_URL}/rest/v1/rpc/${fnName}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(params)
  });

  if (!response.ok) {
    let errText;
    try {
      const errJson = await response.json();
      errText = errJson.message || errJson.details || errJson.hint || JSON.stringify(errJson);
    } catch {
      errText = await response.text();
    }
    throw new Error(errText || `Supabase RPC ${fnName} failed`);
  }

  return await response.json();
};

export const supabaseBackend = {
  // Auth
  async register(username, email, password, role, phone_number) {
    const res = await supabaseRpc('custom_register_user', {
      p_username: username,
      p_email: email,
      p_password: password,
      p_role: role,
      p_phone_number: phone_number || ''
    });
    if (res.error) throw new Error(res.error);
    return res;
  },

  async verifyEmail(email, code) {
    const res = await supabaseRpc('custom_verify_email', {
      p_email: email,
      p_code: code
    });
    if (res.error) throw new Error(res.error);
    return {
      user: res.user,
      token: {
        access: `sb-token-${res.user.id}-${Date.now()}`,
        refresh: `sb-refresh-${res.user.id}-${Date.now()}`
      },
      message: res.message
    };
  },

  async resendCode(email) {
    const res = await supabaseRpc('custom_resend_code', {
      p_email: email
    });
    if (res.error) throw new Error(res.error);
    return res;
  },

  async login(emailOrUsername, password) {
    const res = await supabaseRpc('custom_check_login', {
      p_email: emailOrUsername,
      p_password: password
    });
    if (res.error) throw new Error(res.error);
    return {
      user: res.user,
      token: {
        access: `sb-token-${res.user.id}-${Date.now()}`,
        refresh: `sb-refresh-${res.user.id}-${Date.now()}`
      }
    };
  },

  async forgotPassword(email) {
    const res = await supabaseRpc('custom_forgot_password', {
      p_email: email
    });
    if (res.error) throw new Error(res.error);
    return res;
  },

  async resetPassword(email, token, newPassword) {
    const res = await supabaseRpc('custom_reset_password', {
      p_email: email,
      p_token: token,
      p_new_password: newPassword
    });
    if (res.error) throw new Error(res.error);
    return res;
  },

  // Equipment & Cart
  async getEquipment() {
    return await supabaseRpc('custom_get_equipment');
  },

  async getEquipmentById(id) {
    return await supabaseRpc('custom_get_equipment_by_id', { p_id: id });
  },

  async getNearbyEquipment(lat, lng, radiusKm = 50) {
    return await supabaseRpc('custom_nearby_equipment', {
      p_lat: lat,
      p_lng: lng,
      p_radius_km: radiusKm
    });
  },

  async validateCart(items) {
    return await supabaseRpc('custom_cart_validate', { p_items: items });
  },

  // Bookings & Notifications
  async createBooking(bookingData) {
    return await supabaseRpc('custom_create_booking', {
      p_farmer_id: bookingData.farmer_id || bookingData.farmer,
      p_equipment_id: bookingData.equipment_id || bookingData.equipment,
      p_start_date: bookingData.start_date,
      p_end_date: bookingData.end_date,
      p_total_cost: bookingData.total_cost || bookingData.total_price,
      p_delivery_option: bookingData.delivery_option || 'pickup',
      p_notes: bookingData.notes || '',
      p_requires_operator: Boolean(bookingData.requires_operator)
    });
  },

  async getBookings(userId) {
    return await supabaseRpc('custom_get_bookings', { p_user_id: userId });
  },

  async getNotifications(userId) {
    return await supabaseRpc('custom_get_notifications', { p_user_id: userId });
  },

  async getOperators() {
    return await supabaseRpc('custom_get_operators');
  },

  // Dashboards
  async getFarmerDashboard(userId) {
    return await supabaseRpc('custom_dashboard_farmer', { p_user_id: userId });
  },

  async getOwnerDashboard(userId) {
    return await supabaseRpc('custom_dashboard_owner', { p_user_id: userId });
  },

  async getOperatorDashboard(userId) {
    return await supabaseRpc('custom_dashboard_operator', { p_user_id: userId });
  }
};
