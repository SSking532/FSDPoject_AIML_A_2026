import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Ambulance,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Hospital,
  MapPin,
  Power,
  Radio,
  ShieldAlert,
  Siren
} from 'lucide-react';
import Button from '../../components/common/Button';
import StatusBadge from '../../components/common/StatusBadge';
import AppLayout from '../../components/layout/AppLayout';
import { useAppData } from '../../context/DataContext';
import { useDriverData } from '../../hooks/useRoleData';
import { estimateEtaMinutes, formatDateTime, formatTimeOnly, haversineDistanceKm } from '../../utils/geo';

const STAGE_COPY = {
  ACCEPTED: 'Accepted, ready to set off',
  EN_ROUTE: 'Driving to pickup',
  ARRIVED: 'At pickup',
  IN_TRANSIT: 'Taking patient to hospital'
};

export function DriverDashboard() {
  const { toggleDriverAvailability, toggleDriverGps, respondToAssignment } = useAppData();
  const { driver, ambulance, offers, activeTrip, activeRequest, completedTrips, isApproved, isOnline } =
    useDriverData();
  const navigate = useNavigate();
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const run = async (key, fn) => {
    setBusy(key);
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again.');
    } finally {
      setBusy('');
    }
  };

  const accept = (assignmentId) =>
    run(`accept-${assignmentId}`, async () => {
      const tripId = await respondToAssignment(assignmentId, 'accept');
      navigate(tripId ? `/driver/trip/${tripId}` : '/driver/trip/active');
    });

  const today = new Date().toDateString();
  const tripsToday = completedTrips.filter((t) => new Date(t.completedAt).toDateString() === today).length;
  const offer = offers[0];

  return (
    <AppLayout title="Today’s shift" subtitle="Your duty status, current job and location sharing">
      {!isApproved && (
        <div className="notice notice-amber">
          <ShieldAlert size={20} />
          <div>
            <strong>Waiting for approval</strong>
            <span>
              A dispatcher needs to check your licence ({driver?.licenseNumber}). You can go on duty now; jobs start
              arriving once you are approved.
            </span>
          </div>
        </div>
      )}
      {driver && !ambulance && (
        <div className="notice notice-blue">
          <Ambulance size={20} />
          <div>
            <strong>No ambulance linked yet</strong>
            <span>Ask your dispatcher to link you to a vehicle from the Drivers page.</span>
          </div>
        </div>
      )}
      {error && <div className="alert-banner danger" style={{ marginBottom: 16 }}>{error}</div>}

      <section className={`duty-card ${isOnline ? 'on' : 'off'}`}>
        <div className="duty-main">
          <span className="duty-label">{isOnline ? 'You are on duty' : 'You are off duty'}</span>
          <h2>{driver?.name || 'Driver'}</h2>
          <p>
            {ambulance
              ? `${ambulance.registrationNumber}, ${ambulance.category}`
              : 'No vehicle linked'}
          </p>
        </div>
        <div className="duty-actions">
          <button
            type="button"
            className={`duty-switch ${isOnline ? 'on' : ''}`}
            disabled={!driver || busy === 'duty' || Boolean(activeTrip)}
            onClick={() => run('duty', () => toggleDriverAvailability(driver.id))}
            aria-pressed={isOnline}
            title={activeTrip ? 'Finish your trip before going off duty' : undefined}
          >
            <Power size={22} />
            <span>{isOnline ? 'Go off duty' : 'Go on duty'}</span>
          </button>
          <button
            type="button"
            className={`share-toggle ${driver?.gpsSharing ? 'on' : ''}`}
            disabled={!driver || busy === 'gps'}
            onClick={() => run('gps', () => toggleDriverGps(driver.id))}
            aria-pressed={Boolean(driver?.gpsSharing)}
          >
            <Radio size={16} />
            {driver?.gpsSharing ? 'Sharing location' : 'Location paused'}
          </button>
        </div>
      </section>

      {offer && (
        <section className="offer-card" aria-live="assertive">
          <div className="offer-head">
            <span className="offer-pulse">
              <Siren size={20} />
            </span>
            <div>
              <span className="offer-kicker">New job, respond now</span>
              <h3>
                {offer.request?.category || 'Emergency'} at {offer.request?.pickupAddress || 'pickup'}
              </h3>
            </div>
          </div>
          <div className="offer-facts">
            <div>
              <MapPin size={15} />
              {ambulance && offer.request
                ? `${haversineDistanceKm(ambulance.lat, ambulance.lng, offer.request.lat, offer.request.lng)} km away, about ${estimateEtaMinutes(
                    haversineDistanceKm(ambulance.lat, ambulance.lng, offer.request.lat, offer.request.lng)
                  )} min`
                : 'Distance unknown'}
            </div>
            <div>
              <Hospital size={15} />
              {offer.hospital?.name || 'Hospital to be confirmed'}
            </div>
            <div>
              <Clock3 size={15} />
              Assigned {formatTimeOnly(offer.assignment.assignedAt)}
            </div>
          </div>
          {offer.request?.details && <p className="offer-note">{offer.request.details}</p>}
          <div className="offer-actions">
            <Button
              variant="success"
              size="lg"
              loading={busy === `accept-${offer.assignment.id}`}
              onClick={() => accept(offer.assignment.id)}
            >
              <CheckCircle2 size={18} /> Accept job
            </Button>
            <Button variant="secondary" size="lg" onClick={() => navigate('/driver/assignments')}>
              Review or decline
            </Button>
          </div>
        </section>
      )}

      <div className="home-grid">
        <section className="card">
          <div className="card-header">
            <div className="card-title">Current trip</div>
            {activeTrip && <StatusBadge status={activeTrip.status} />}
          </div>
          {activeTrip ? (
            <button type="button" className="trip-tile" onClick={() => navigate(`/driver/trip/${activeTrip.id}`)}>
              <span className="trip-tile-stage">{STAGE_COPY[activeTrip.status]}</span>
              <span className="trip-tile-route">
                <span>
                  <MapPin size={15} className="text-red" /> {activeTrip.pickupAddress}
                </span>
                <span>
                  <Hospital size={15} className="text-teal" /> {activeTrip.destinationName}
                </span>
              </span>
              <span className="trip-tile-foot">
                {activeRequest?.patientName} · {activeTrip.id}
                <span className="trip-tile-open">
                  Open trip <ChevronRight size={16} />
                </span>
              </span>
            </button>
          ) : (
            <div className="empty-state">
              <p className="empty-title">{isOnline ? 'Waiting for your next job' : 'Go on duty to receive jobs'}</p>
              <p className="empty-text">
                {isOnline
                  ? 'New jobs pop up here and as an alert the moment a dispatcher assigns you.'
                  : 'While you are off duty, dispatch will not assign you.'}
              </p>
            </div>
          )}
        </section>

        <div className="stack">
          <section className="card">
            <div className="card-body stat-pair">
              <div>
                <strong>{tripsToday}</strong>
                <span>Trips today</span>
              </div>
              <div>
                <strong>{completedTrips.length}</strong>
                <span>All-time trips</span>
              </div>
            </div>
          </section>
          <section className="card">
            <div className="card-header">
              <div className="card-title">Recent trips</div>
            </div>
            {completedTrips.length === 0 ? (
              <div className="card-body muted-small">Completed trips appear here.</div>
            ) : (
              <ul className="row-list compact">
                {completedTrips.slice(0, 4).map((t) => (
                  <li key={t.id} className="row-item static">
                    <span className="row-main">
                      <strong>{t.destinationName}</strong>
                      <span>from {t.pickupAddress}</span>
                    </span>
                    <span className="row-meta">
                      <span>{formatDateTime(t.completedAt)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </AppLayout>
  );
}

export default DriverDashboard;