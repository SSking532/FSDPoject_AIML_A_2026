import api, { USE_MOCK_DATA } from './api';

export const TRIP_STATUS_FLOW = [
  'ACCEPTED',
  'EN_ROUTE',
  'ARRIVED',
  'IN_TRANSIT',
  'COMPLETED'
];

export function getNextTripStatus(currentStatus) {
  const index = TRIP_STATUS_FLOW.indexOf(currentStatus);
  if (index === -1 || index >= TRIP_STATUS_FLOW.length - 1) return null;
  return TRIP_STATUS_FLOW[index + 1];
}

export function isValidTripTransition(currentStatus, nextStatus) {
  const currentIdx = TRIP_STATUS_FLOW.indexOf(currentStatus);
  const nextIdx = TRIP_STATUS_FLOW.indexOf(nextStatus);
  return currentIdx !== -1 && nextIdx === currentIdx + 1;
}

export const tripService = {
  async list(params = {}) {
    if (USE_MOCK_DATA) return null;
    const { data } = await api.get('/api/trips', { params });
    return data;
  },

  async updateStatus(tripId, status) {
    if (USE_MOCK_DATA) return { id: tripId, status };
    const { data } = await api.patch(`/api/trips/${tripId}/status`, { status });
    return data;
  }
};
