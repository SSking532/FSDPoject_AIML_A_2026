import api, { USE_MOCK_DATA } from './api';

export const hospitalService = {
  async list() {
    if (USE_MOCK_DATA) return null;
    const { data } = await api.get('/api/hospitals');
    return data;
  },

  async create(payload) {
    if (USE_MOCK_DATA) return payload;
    const { data } = await api.post('/api/hospitals', payload);
    return data;
  },

  async update(hospitalId, payload) {
    if (USE_MOCK_DATA) return { id: hospitalId, ...payload };
    const { data } = await api.put(`/api/hospitals/${hospitalId}`, payload);
    return data;
  },

  async remove(hospitalId) {
    if (USE_MOCK_DATA) return { id: hospitalId };
    const { data } = await api.delete(`/api/hospitals/${hospitalId}`);
    return data;
  }
};
