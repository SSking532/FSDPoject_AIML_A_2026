import api, { USE_MOCK_DATA } from './api';

export const requestService = {
  async list(params = {}) {
    if (USE_MOCK_DATA) return null;
    const { data } = await api.get('/api/requests', { params });
    return data;
  },

  async getById(requestId) {
    if (USE_MOCK_DATA) return null;
    const { data } = await api.get(`/api/requests/${requestId}`);
    return data;
  },

  async create(payload) {
    if (USE_MOCK_DATA) return payload;
    const { data } = await api.post('/api/requests', payload);
    return data;
  },

  async cancel(requestId) {
    if (USE_MOCK_DATA) return { id: requestId, status: 'CANCELLED' };
    const { data } = await api.post(`/api/requests/${requestId}/cancel`);
    return data;
  }
};
