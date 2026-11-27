import React from 'react';

const STATUS_MAP = {
  // General / Availability
  AVAILABLE: { label: 'Available', tone: 'green' },
  ONLINE: { label: 'Online', tone: 'green' },
  VERIFIED: { label: 'Verified', tone: 'green' },
  COMPLETED: { label: 'Completed', tone: 'green' },
  OFFLINE: { label: 'Off Duty', tone: 'neutral' },
  OFF_DUTY: { label: 'Off Duty', tone: 'neutral' },
  OUT_OF_SERVICE: { label: 'Out of Service', tone: 'neutral' },
  NO_AMBULANCE_AVAILABLE: { label: 'No Unit Available', tone: 'red' },

  // Pending / Assigned
  PENDING: { label: 'Pending', tone: 'amber' },
  PENDING_ACCEPTANCE: { label: 'Pending Acceptance', tone: 'amber' },
  PENDING_APPROVAL: { label: 'Pending Approval', tone: 'amber' },
  ASSIGNED: { label: 'Assigned', tone: 'navy' },
  ACCEPTED: { label: 'Accepted', tone: 'navy' },

  // Active / In Progress
  EN_ROUTE: { label: 'En Route', tone: 'blue' },
  ON_TRIP: { label: 'On Trip', tone: 'violet' },
  ARRIVED: { label: 'Arrived', tone: 'teal' },
  IN_TRANSIT: { label: 'In Transit', tone: 'violet' },

  // Cancelled / Critical / Rejected
  CANCELLED: { label: 'Cancelled', tone: 'red' },
  REJECTED: { label: 'Rejected', tone: 'red' },
  CRITICAL: { label: 'Critical', tone: 'red' },

  // Emergency categories
  Cardiac: { label: 'Cardiac', tone: 'red' },
  Trauma: { label: 'Trauma', tone: 'red' },
  Respiratory: { label: 'Respiratory', tone: 'amber' },
  Stroke: { label: 'Stroke', tone: 'violet' },
  Maternity: { label: 'Maternity', tone: 'teal' },
  General: { label: 'General', tone: 'blue' }
};

export function StatusBadge({ status, label }) {
  const key = String(status || '').trim();
  const config = STATUS_MAP[key] || {
    label: label || key.replace(/_/g, ' ') || 'Unknown',
    tone: 'neutral'
  };

  return (
    <span className={`badge badge-${config.tone}`}>
      <span className="badge-dot" aria-hidden="true" />
      {label || config.label}
    </span>
  );
}

export default StatusBadge;
