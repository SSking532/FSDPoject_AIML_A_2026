import api, { USE_MOCK_DATA } from './api';

export const assignmentService = {
  async list(params = {}) {
    if (USE_MOCK_DATA) return null;
    const { data } = await api.get('/api/assignments', { params });
    return data;
  },

  async create({ requestId, ambulanceId, hospitalId }) {
    if (USE_MOCK_DATA) return { requestId, ambulanceId, hospitalId };
    const { data } = await api.post('/api/assignments', {
      request_id: requestId,
      ambulance_id: ambulanceId,
      hospital_id: hospitalId
    });
    return data;
  },

  async recommend(requestId) {
    if (USE_MOCK_DATA) return null;
    const { data } = await api.post('/api/assignments/recommend', {
      request_id: requestId
    });
    return data;
  },

  async respond(assignmentId, action) {
    if (USE_MOCK_DATA) return { id: assignmentId, action };
    const { data } = await api.post(`/api/assignments/${assignmentId}/${action}`);
    return data;
  }
};
