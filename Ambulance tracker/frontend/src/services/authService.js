import api, { USE_MOCK_DATA } from './api';

export const authService = {
  async login({ email, password }) {
    if (USE_MOCK_DATA) {
      return { mode: 'mock', email, password };
    }
    const { data } = await api.post('/api/auth/login', { email, password });
    return data;
  },

  /** payload: name, email, phone, password, role, plus role-specific fields
   *  (driver: licenseNumber, vehicleNumber, ambulanceType, lat, lng;
   *   admin: adminCode, department). */
  async register(payload) {
    if (USE_MOCK_DATA) {
      return { mode: 'mock', ...payload };
    }
    const { data } = await api.post('/api/auth/register', payload);
    return data;
  },

  async getCurrentUser() {
    if (USE_MOCK_DATA) {
      return null;
    }
    const { data } = await api.get('/api/auth/me');
    return data;
  },

  async updateProfile(updates) {
    if (USE_MOCK_DATA) return null;
    const { data } = await api.patch('/api/auth/me', updates);
    return data;
  },

  async requestPasswordReset(email) {
    if (USE_MOCK_DATA) {
      return {
        ok: true,
        message: `Password recovery instructions prepared for ${email} (development mode).`
      };
    }
    const { data } = await api.post('/api/auth/forgot-password', { email });
    return data;
  }
};