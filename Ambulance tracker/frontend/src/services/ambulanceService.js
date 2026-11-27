import api, { USE_MOCK_DATA } from './api';

export const ambulanceService = {
  async list(params = {}) {
    if (USE_MOCK_DATA) return null;
    const { data } = await api.get('/api/ambulances', { params });
    return data;
  },

  async create(payload) {
    if (USE_MOCK_DATA) return payload;
    const { data } = await api.post('/api/ambulances', payload);
    return data;
  },

  async update(ambulanceId, payload) {
    if (USE_MOCK_DATA) return { id: ambulanceId, ...payload };
    const { data } = await api.patch(`/api/ambulances/${ambulanceId}`, payload);
    return data;
  }
};
