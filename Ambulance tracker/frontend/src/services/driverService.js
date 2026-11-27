import api, { USE_MOCK_DATA } from './api';

export const driverService = {
  async list(params = {}) {
    if (USE_MOCK_DATA) return null;
    const { data } = await api.get('/api/drivers', { params });
    return data;
  },

  async create(payload) {
    if (USE_MOCK_DATA) return payload;
    const { data } = await api.post('/api/drivers', payload);
    return data;
  },

  async update(driverId, payload) {
    if (USE_MOCK_DATA) return { id: driverId, ...payload };
    const { data } = await api.patch(`/api/drivers/${driverId}`, payload);
    return data;
  },

  async setAvailability(driverId, availability) {
    if (USE_MOCK_DATA) return { id: driverId, availability };
    const { data } = await api.patch(`/api/drivers/${driverId}/availability`, {
      availability
    });
    return data;
  },

  async setGpsSharing(driverId, gpsSharing) {
    if (USE_MOCK_DATA) return { id: driverId, gpsSharing };
    const { data } = await api.patch(`/api/drivers/${driverId}/gps`, {
      gps_sharing: gpsSharing
    });
    return data;
  }
};
