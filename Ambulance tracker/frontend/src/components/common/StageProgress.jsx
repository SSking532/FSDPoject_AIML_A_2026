import React from 'react';

export const PATIENT_STAGES = [
  { key: 'PENDING', label: 'Requested' },
  { key: 'ASSIGNED', label: 'Assigned' },
  { key: 'ACCEPTED', label: 'Confirmed' },
  { key: 'EN_ROUTE', label: 'On the way' },
  { key: 'ARRIVED', label: 'Arrived' },
  { key: 'IN_TRANSIT', label: 'To hospital' },
  { key: 'COMPLETED', label: 'Done' }
];

export function stageIndex(status) {
  if (status === 'NO_AMBULANCE_AVAILABLE') return 0;
  return PATIENT_STAGES.findIndex((s) => s.key === status);
}

/** Segmented progress bar: filled segments are done, the pulsing one is now. */
export function StageProgress({ status, stages = PATIENT_STAGES, dark = false }) {
  const current = stages.findIndex((s) => s.key === status);
  const idx = current === -1 ? stageIndex(status) : current;
  const done = status === 'COMPLETED';
  return (
    <div className={`stage-progress ${dark ? 'dark' : ''}`}>
      <div className="stage-track" role="progressbar" aria-valuemin={0} aria-valuemax={stages.length} aria-valuenow={idx + 1}>
        {stages.map((s, i) => (
          <span
            key={s.key}
            className={`stage-seg ${i < idx || done ? 'done' : ''} ${i === idx && !done ? 'now' : ''}`}
          />
        ))}
      </div>
      <div className="stage-caption">
        Step {idx + 1} of {stages.length}: <strong>{stages[idx]?.label}</strong>
      </div>
      <div className="stage-labels">
        {stages.map((s, i) => (
          <span key={s.key} className={i === idx ? 'current' : i < idx ? 'past' : ''}>
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default StageProgress;