/**
 * Compute approximate great-circle distance in kilometers between two coordinates.
 */
export function haversineDistanceKm(lat1, lng1, lat2, lng2) {
  if (
    lat1 == null ||
    lng1 == null ||
    lat2 == null ||
    lng2 == null
  ) {
    return null;
  }
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

/**
 * Estimate travel time in minutes assuming average urban emergency speed (~38 km/h).
 */
export function estimateEtaMinutes(distanceKm) {
  if (distanceKm == null) return null;
  return Math.max(2, Math.round((distanceKm / 38) * 60));
}

export function formatDateTime(isoString) {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatTimeOnly(isoString) {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/* ---- Allocation helpers (mirror backend app/geo.py) ---- */
export const DEFAULT_TYPE_FOR_EMERGENCY = {
  Cardiac: 'Cardiac Care Unit (CCU)',
  Stroke: 'Advanced Life Support (ALS)',
  Trauma: 'Advanced Life Support (ALS)',
  Respiratory: 'Advanced Life Support (ALS)',
  Maternity: 'Basic Life Support (BLS)',
  General: 'Basic Life Support (BLS)'
};

const TYPE_COMPATIBILITY = {
  'Basic Life Support (BLS)': [
    'Basic Life Support (BLS)',
    'Advanced Life Support (ALS)',
    'Cardiac Care Unit (CCU)'
  ],
  'Advanced Life Support (ALS)': ['Advanced Life Support (ALS)', 'Cardiac Care Unit (CCU)'],
  'Cardiac Care Unit (CCU)': ['Cardiac Care Unit (CCU)']
};

export function requiredTypeFor(request) {
  return request?.ambulanceTypeRequired || DEFAULT_TYPE_FOR_EMERGENCY[request?.category] || null;
}

/** Rank every ambulance for a request: eligible first, nearest first. */
export function rankAmbulances(request, ambulances, drivers) {
  const required = requiredTypeFor(request);
  return ambulances
    .map((amb) => {
      const driver = drivers.find((d) => d.id === amb.driverId) || null;
      const distanceKm = request ? haversineDistanceKm(request.lat, request.lng, amb.lat, amb.lng) : null;
      const reasons = [];
      if (amb.status !== 'AVAILABLE') reasons.push(`Unit is ${amb.status.replace(/_/g, ' ').toLowerCase()}`);
      if (!driver) reasons.push('No driver linked');
      else if (driver.availability !== 'ONLINE') reasons.push('Driver off duty');
      const typeMatch = !required || (TYPE_COMPATIBILITY[required] || [required]).includes(amb.category);
      if (!typeMatch) reasons.push('Category does not match');
      return {
        amb,
        driver,
        distanceKm,
        eta: estimateEtaMinutes(distanceKm),
        isEligible: reasons.length === 0,
        typeMatch,
        reasons
      };
    })
    .sort((a, b) => {
      if (a.isEligible !== b.isEligible) return a.isEligible ? -1 : 1;
      return (a.distanceKm ?? 9e9) - (b.distanceKm ?? 9e9);
    });
}
