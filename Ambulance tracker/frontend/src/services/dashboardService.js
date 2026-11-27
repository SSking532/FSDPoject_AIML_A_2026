import api, { USE_MOCK_DATA } from './api';

export const dashboardService = {
  async activity(limit = 25) {
    if (USE_MOCK_DATA) return null;
    const { data } = await api.get('/api/activity', { params: { limit } });
    return data;
  },

  async stats() {
    if (USE_MOCK_DATA) return null;
    const { data } = await api.get('/api/dashboard/stats');
    return data;
  }
};
