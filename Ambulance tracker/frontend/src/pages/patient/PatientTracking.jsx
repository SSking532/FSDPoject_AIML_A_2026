import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Ambulance,
  Check,
  Clock3,
  Hospital,
  MapPin,
  Navigation,
  Phone,
  Radar,
  UserRound,
  XCircle
} from 'lucide-react';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import StageProgress from '../../components/common/StageProgress';
import StatusBadge from '../../components/common/StatusBadge';
import AppLayout from '../../components/layout/AppLayout';
import TrackingMap from '../../components/maps/TrackingMap';
import { useAppData } from '../../context/DataContext';
import { usePatientRequests } from '../../hooks/useRoleData';
import { estimateEtaMinutes, formatDateTime, formatTimeOnly, haversineDistanceKm } from '../../utils/geo';

const HEADLINES = {
  PENDING: 'Finding you an ambulance',
  NO_AMBULANCE_AVAILABLE: 'No ambulance free right now',
  ASSIGNED: 'Ambulance assigned',
  ACCEPTED: 'Driver confirmed',
  EN_ROUTE: 'Ambulance on the way',
  ARRIVED: 'Your ambulance has arrived',
  IN_TRANSIT: 'On the way to hospital',
  COMPLETED: 'You reached the hospital',
  CANCELLED: 'Request cancelled'
};

const SUBLINES = {
  PENDING: 'Dispatch has your request and is choosing the nearest suitable unit.',
  NO_AMBULANCE_AVAILABLE: 'Dispatch is still trying. If this is life-threatening, call 112.',
  ASSIGNED: 'Waiting for the driver to confirm. This usually takes under a minute.',
  ACCEPTED: 'The crew is getting ready to set off.',
  EN_ROUTE: 'Keep your phone close. The driver may call to find you.',
  ARRIVED: 'The crew is at your pickup point.',
  IN_TRANSIT: 'The hospital has been told you are coming.',
  COMPLETED: 'The crew handed over to the hospital team.',
  CANCELLED: 'This request was cancelled and no ambulance is coming.'
};

const TIMELINE = [
  { key: 'PENDING', label: 'Request sent' },
  { key: 'ASSIGNED', label: 'Ambulance assigned' },
  { key: 'ACCEPTED', label: 'Driver confirmed' },
  { key: 'EN_ROUTE', label: 'On the way to you' },
  { key: 'ARRIVED', label: 'Arrived at pickup' },
  { key: 'IN_TRANSIT', label: 'Travelling to hospital' },
  { key: 'COMPLETED', label: 'Handed over at hospital' }
];

export function PatientTracking() {
  const { requestId } = useParams();
  const { ambulances, drivers, trips, hospitals, assignments, cancelRequest } = useAppData();
  const { mine, active } = usePatientRequests();
  const navigate = useNavigate();

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  const request =
    requestId === 'active' || !requestId ? active || mine[0] || null : mine.find((r) => r.id === requestId) || null;

  if (!request) {
    return (
      <AppLayout title="Live tracking" subtitle="Follow your ambulance in real time">
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">
              <Radar size={26} />
            </div>
            <p className="empty-title">Nothing to track yet</p>
            <p className="empty-text">Once you request an ambulance you can follow it here, live on the map.</p>
            <Button variant="primary" onClick={() => navigate('/patient/request')}>
              Request an ambulance
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const ambulance = ambulances.find((a) => a.id === request.assignedAmbulanceId) || null;
  const trip = trips.find((t) => t.requestId === request.id) || null;
  const assignment =
    assignments
      .filter((a) => a.requestId === request.id && a.status !== 'REJECTED')
      .sort((a, b) => new Date(b.assignedAt) - new Date(a.assignedAt))[0] || null;
  const hospital = hospitals.find((h) => h.id === (trip?.hospitalId || assignment?.hospitalId)) || null;
  const driver = drivers.find((d) => d.id === (ambulance?.driverId || assignment?.driverId)) || null;

  const toHospital = ['ARRIVED', 'IN_TRANSIT'].includes(request.status);
  const target = toHospital ? hospital : request;
  const distanceKm =
    ambulance && target ? haversineDistanceKm(ambulance.lat, ambulance.lng, target.lat, target.lng) : null;
  const eta = estimateEtaMinutes(distanceKm);
  const showEta = ambulance && distanceKm != null && ['ASSIGNED', 'ACCEPTED', 'EN_ROUTE', 'IN_TRANSIT'].includes(request.status);
  const closed = ['COMPLETED', 'CANCELLED'].includes(request.status);
  const canCancel = ['PENDING', 'ASSIGNED', 'ACCEPTED', 'NO_AMBULANCE_AVAILABLE'].includes(request.status);

  const timeFor = (key) => {
    if (key === 'PENDING') return request.createdAt;
    if (key === 'ASSIGNED') return assignment?.assignedAt;
    return trip?.statusHistory?.find((h) => h.status === key)?.time;
  };
  const currentIdx = TIMELINE.findIndex((s) => s.key === request.status);

  const routes = [];
  if (ambulance && !toHospital && !closed) {
    routes.push({
      id: 'to-pickup',
      points: [ambulance, { lat: request.lat, lng: request.lng }],
      color: '#e8173a',
      dashed: request.status !== 'EN_ROUTE'
    });
  }
  if (hospital && request.status !== 'CANCELLED') {
    routes.push({
      id: 'to-hospital',
      points: [toHospital && ambulance ? ambulance : { lat: request.lat, lng: request.lng }, hospital],
      color: '#0b8f83',
      dashed: !toHospital
    });
  }

  const handleCancel = async () => {
    setCancelling(true);
    setCancelError('');
    try {
      await cancelRequest(request.id);
      setCancelOpen(false);
    } catch (err) {
      setCancelError(err.message || 'Could not cancel this request.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <AppLayout title="Live tracking" subtitle={`Request ${request.id}, sent ${formatDateTime(request.createdAt)}`}>
      <section className={`live-card ${request.status === 'CANCELLED' ? 'muted' : ''}`} aria-live="polite">
        <div className="live-card-top">
          <div>
            <span className="live-chip">
              {!closed && <span className="live-dot" />}
              {request.category} emergency
            </span>
            <h2 className="live-title">{HEADLINES[request.status] || request.status}</h2>
            <p className="live-sub">{SUBLINES[request.status]}</p>
          </div>
          {showEta ? (
            <div className="live-eta">
              <span>{toHospital ? 'Hospital in about' : 'Arriving in about'}</span>
              <strong>{eta} min</strong>
              <small>{distanceKm} km away</small>
            </div>
          ) : request.status === 'PENDING' ? (
            <div className="searching" aria-hidden="true">
              <span />
              <span />
              <Radar size={26} />
            </div>
          ) : null}
        </div>
        {request.status !== 'CANCELLED' && <StageProgress status={request.status} dark />}
      </section>

      <div className="track-grid">
        <div className="stack">
          <TrackingMap
            title={ambulance ? `${ambulance.registrationNumber} live position` : 'Your pickup point'}
            ambulances={ambulance && !closed ? [ambulance] : []}
            pickups={[{ id: request.id, label: 'You', lat: request.lat, lng: request.lng }]}
            hospitals={hospital ? [hospital] : []}
            routes={routes}
            followAmbulanceId={request.status === 'EN_ROUTE' ? ambulance?.id : null}
            height={440}
          />

          <section className="crew-card card">
            {ambulance ? (
              <>
                <div className="crew-item">
                  <span className="crew-icon">
                    <Ambulance size={20} />
                  </span>
                  <span>
                    <small>Ambulance</small>
                    <strong>{ambulance.registrationNumber}</strong>
                    <em>{ambulance.category}</em>
                  </span>
                </div>
                <div className="crew-item">
                  <span className="crew-icon">
                    <UserRound size={20} />
                  </span>
                  <span>
                    <small>Driver</small>
                    <strong>{driver?.name || ambulance.driverName}</strong>
                    <em>Updated {formatTimeOnly(ambulance.lastUpdated)}</em>
                  </span>
                </div>
                {driver?.phone && !closed && (
                  <a className="btn btn-success crew-call" href={`tel:${driver.phone.replace(/\s/g, '')}`}>
                    <Phone size={16} /> Call driver
                  </a>
                )}
              </>
            ) : (
              <div className="crew-waiting">
                <Clock3 size={18} />
                {request.status === 'CANCELLED'
                  ? 'No ambulance was sent for this request.'
                  : 'Driver and vehicle details appear here as soon as dispatch assigns an ambulance.'}
              </div>
            )}
          </section>
        </div>

        <div className="stack">
          <section className="card">
            <div className="card-header">
              <div className="card-title">Progress</div>
              <StatusBadge status={request.status} />
            </div>
            <div className="card-body">
              <ol className="timeline">
                {TIMELINE.map((step, i) => {
                  const done = request.status === 'COMPLETED' || (currentIdx > i && request.status !== 'CANCELLED');
                  const now = i === currentIdx && request.status !== 'COMPLETED';
                  const t = timeFor(step.key);
                  return (
                    <li key={step.key} className={`timeline-step ${done ? 'done' : ''} ${now ? 'current' : ''}`}>
                      <div className="timeline-marker">{done ? <Check size={14} /> : i + 1}</div>
                      <div>
                        <div className="timeline-title">{step.label}</div>
                        <div className="timeline-meta">{t ? formatTimeOnly(t) : now ? 'Now' : 'Not yet'}</div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </section>

          <section className="card">
            <div className="card-header">
              <div className="card-title">Where</div>
            </div>
            <div className="card-body route-summary">
              <div>
                <MapPin size={17} className="text-red" />
                <span>
                  <small>Pickup</small>
                  <strong>{request.pickupAddress}</strong>
                </span>
              </div>
              <div>
                <Hospital size={17} className="text-teal" />
                <span>
                  <small>Hospital</small>
                  <strong>{hospital?.name || 'Chosen by dispatch'}</strong>
                  {hospital?.address && <em>{hospital.address}</em>}
                </span>
              </div>
              {request.details && <div className="detail-note">{request.details}</div>}
            </div>
          </section>

          {canCancel && (
            <button type="button" className="btn btn-danger-outline" onClick={() => setCancelOpen(true)}>
              <XCircle size={16} /> Cancel this request
            </button>
          )}
          {closed && (
            <Button variant="secondary" onClick={() => navigate('/patient/history')}>
              <Navigation size={16} /> See all requests
            </Button>
          )}
        </div>
      </div>

      <Modal
        isOpen={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel this request?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelOpen(false)}>
              Keep request
            </Button>
            <Button variant="primary" loading={cancelling} onClick={handleCancel}>
              Cancel request
            </Button>
          </>
        }
      >
        <p style={{ color: 'var(--muted)' }}>
          The ambulance will be released for someone else. Only cancel if you no longer need help.
        </p>
        {cancelError && (
          <div className="alert-banner danger" style={{ marginTop: 14 }}>
            {cancelError}
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}

export default PatientTracking;