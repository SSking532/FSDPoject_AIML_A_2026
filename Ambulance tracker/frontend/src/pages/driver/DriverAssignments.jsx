import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock3, Hospital, Inbox, MapPin, Phone, Siren, XCircle } from 'lucide-react';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import AppLayout from '../../components/layout/AppLayout';
import TrackingMap from '../../components/maps/TrackingMap';
import { useAppData } from '../../context/DataContext';
import { useDriverData } from '../../hooks/useRoleData';
import { estimateEtaMinutes, formatDateTime, formatTimeOnly, haversineDistanceKm } from '../../utils/geo';

export function DriverAssignments() {
  const { requests, hospitals, respondToAssignment } = useAppData();
  const { ambulance, offers, myAssignments, activeTrip, isApproved, isOnline } = useDriverData();
  const navigate = useNavigate();

  const [declineTarget, setDeclineTarget] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const respond = async (assignmentId, action) => {
    setBusy(`${action}-${assignmentId}`);
    setError('');
    try {
      const tripId = await respondToAssignment(assignmentId, action);
      setDeclineTarget(null);
      if (action === 'accept') navigate(tripId ? `/driver/trip/${tripId}` : '/driver/trip/active');
    } catch (err) {
      setError(err.message || 'Could not send your response.');
    } finally {
      setBusy('');
    }
  };

  const past = myAssignments
    .filter((a) => a.status !== 'PENDING_ACCEPTANCE')
    .sort((a, b) => new Date(b.assignedAt) - new Date(a.assignedAt));

  return (
    <AppLayout title="Jobs" subtitle="Accept new dispatches and look back at earlier ones">
      {error && <div className="alert-banner danger" style={{ marginBottom: 16 }}>{error}</div>}

      {activeTrip && (
        <div className="notice notice-blue">
          <Siren size={20} />
          <div>
            <strong>You have a trip in progress</strong>
            <span>{activeTrip.pickupAddress} to {activeTrip.destinationName}</span>
          </div>
          <Button variant="secondary" size="sm" onClick={() => navigate(`/driver/trip/${activeTrip.id}`)}>
            Open trip
          </Button>
        </div>
      )}

      {offers.length === 0 ? (
        <section className="card" style={{ marginBottom: 22 }}>
          <div className="empty-state">
            <div className="empty-icon">
              <Inbox size={26} />
            </div>
            <p className="empty-title">No new jobs</p>
            <p className="empty-text">
              {!isApproved
                ? 'Jobs start arriving once a dispatcher approves your account.'
                : isOnline
                ? 'You are on duty. New jobs appear here and as an alert.'
                : 'Go on duty from Today’s shift to start receiving jobs.'}
            </p>
          </div>
        </section>
      ) : (
        <div className="stack" style={{ marginBottom: 22 }}>
          {offers.map(({ assignment, request, hospital }) => {
            const dist =
              ambulance && request ? haversineDistanceKm(ambulance.lat, ambulance.lng, request.lat, request.lng) : null;
            return (
              <section key={assignment.id} className="offer-card wide">
                <div className="offer-layout">
                  <div className="offer-info">
                    <div className="offer-head">
                      <span className="offer-pulse">
                        <Siren size={20} />
                      </span>
                      <div>
                        <span className="offer-kicker">
                          {request?.category} emergency, {request?.id}
                        </span>
                        <h3>{request?.pickupAddress}</h3>
                      </div>
                    </div>
                    <div className="offer-facts">
                      <div>
                        <MapPin size={15} />
                        {dist != null ? `${dist} km from you, about ${estimateEtaMinutes(dist)} min` : 'Distance unknown'}
                      </div>
                      <div>
                        <Hospital size={15} />
                        {hospital?.name || 'Hospital to be confirmed'}
                      </div>
                      <div>
                        <Phone size={15} />
                        {request?.patientName}, {request?.contactNumber}
                      </div>
                      <div>
                        <Clock3 size={15} />
                        Assigned {formatTimeOnly(assignment.assignedAt)}
                      </div>
                    </div>
                    {request?.details && <p className="offer-note">{request.details}</p>}
                    <div className="offer-actions">
                      <Button
                        variant="success"
                        size="lg"
                        loading={busy === `accept-${assignment.id}`}
                        onClick={() => respond(assignment.id, 'accept')}
                      >
                        <CheckCircle2 size={18} /> Accept job
                      </Button>
                      <Button variant="secondary" size="lg" onClick={() => setDeclineTarget(assignment)}>
                        <XCircle size={18} /> Decline
                      </Button>
                    </div>
                  </div>
                  <div className="offer-map">
                    <TrackingMap
                      title="Pickup"
                      ambulances={ambulance ? [ambulance] : []}
                      pickups={request ? [{ id: request.id, label: 'Pickup', lat: request.lat, lng: request.lng }] : []}
                      hospitals={hospital ? [hospital] : []}
                      routes={
                        ambulance && request
                          ? [{ id: 'r', points: [ambulance, request], color: '#e8173a', dashed: true }]
                          : []
                      }
                      height={260}
                    />
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}

      <section className="card">
        <div className="card-header">
          <div className="card-title">Earlier jobs</div>
        </div>
        {past.length === 0 ? (
          <div className="card-body muted-small">Jobs you accept or decline are listed here.</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Job</th>
                  <th>Pickup</th>
                  <th>Hospital</th>
                  <th>Assigned</th>
                  <th>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {past.map((a) => {
                  const r = requests.find((x) => x.id === a.requestId);
                  const h = hospitals.find((x) => x.id === a.hospitalId);
                  return (
                    <tr key={a.id}>
                      <td>
                        <strong>{a.requestId}</strong>
                        <div className="muted-small">{r?.category}</div>
                      </td>
                      <td>{r?.pickupAddress || '—'}</td>
                      <td>{h?.name || '—'}</td>
                      <td style={{ color: 'var(--muted)' }}>{formatDateTime(a.assignedAt)}</td>
                      <td>
                        <StatusBadge status={a.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        isOpen={Boolean(declineTarget)}
        onClose={() => setDeclineTarget(null)}
        title="Decline this job?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeclineTarget(null)}>
              Keep job
            </Button>
            <Button
              variant="primary"
              loading={busy === `reject-${declineTarget?.id}`}
              onClick={() => respond(declineTarget.id, 'reject')}
            >
              Decline job
            </Button>
          </>
        }
      >
        <p style={{ color: 'var(--muted)' }}>
          The request goes back to dispatch so another ambulance can be sent. Only decline if you cannot reach the
          patient quickly.
        </p>
      </Modal>
    </AppLayout>
  );
}

export default DriverAssignments;