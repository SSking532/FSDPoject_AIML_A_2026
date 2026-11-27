import api, { USE_MOCK_DATA } from './api';

export const trackingService = {
  async updateLocation({ ambulanceId, lat, lng, currentLocation }) {
    if (USE_MOCK_DATA) {
      return {
        ambulanceId,
        lat,
        lng,
        currentLocation,
        updatedAt: new Date().toISOString()
      };
    }
    const { data } = await api.post('/api/location/update', {
      ambulance_id: ambulanceId,
      lat,
      lng,
      current_location: currentLocation
    });
    return data;
  },

  async getRequestTracking(requestId) {
    if (USE_MOCK_DATA) return null;
    const { data } = await api.get(`/api/tracking/${requestId}`);
    return data;
  }
};
