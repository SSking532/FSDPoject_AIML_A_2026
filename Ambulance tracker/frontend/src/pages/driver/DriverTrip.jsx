import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Check,
  CheckCircle2,
  Hospital,
  LocateFixed,
  MapPin,
  Navigation,
  Phone,
  Play,
  Radio,
  Square,
  User
} from 'lucide-react';
import Button from '../../components/common/Button';
import StatusBadge from '../../components/common/StatusBadge';
import AppLayout from '../../components/layout/AppLayout';
import TrackingMap from '../../components/maps/TrackingMap';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/DataContext';
import { getNextTripStatus, TRIP_STATUS_FLOW } from '../../services/tripService';
import { estimateEtaMinutes, formatTimeOnly, haversineDistanceKm } from '../../utils/geo';

const ACTION_LABELS = {
  EN_ROUTE: 'Start driving to pickup',
  ARRIVED: 'I have arrived at pickup',
  IN_TRANSIT: 'Patient onboard, heading to hospital',
  COMPLETED: 'Handover complete, release unit'
};

const STEP_LABELS = {
  ACCEPTED: 'Assignment accepted',
  EN_ROUTE: 'En route to pickup',
  ARRIVED: 'Arrived at pickup',
  IN_TRANSIT: 'Transporting patient',
  COMPLETED: 'Trip completed'
};

const GPS_INTERVAL_MS = 4000;

export function DriverTrip() {
  const { tripId } = useParams();
  const { user } = useAuth();
  const {
    drivers,
    ambulances,
    requests,
    trips,
    hospitals,
    advanceTripStatus,
    updateAmbulanceLocation
  } = useAppData();
  const navigate = useNavigate();

  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [gpsMode, setGpsMode] = useState('off'); // off | device | simulate
  const [gpsFeedback, setGpsFeedback] = useState('');

  const driver =
    drivers.find((d) => d.userId === user?.id || d.id === user?.driverId) || drivers[0];
  const driverTrips = trips.filter(
    (t) => t.driverId === driver?.id || t.ambulanceId === driver?.assignedAmbulanceId
  );
  const trip =
    tripId === 'active'
      ? driverTrips.find((t) => t.status !== 'COMPLETED') || driverTrips[0]
      : trips.find((t) => t.id === tripId) || driverTrips[0];

  const request = trip ? requests.find((r) => r.id === trip.requestId) : null;
  const ambulance = trip ? ambulances.find((a) => a.id === trip.ambulanceId) : null;
  const hospital = trip ? hospitals.find((h) => h.id === trip.hospitalId) : null;
  const headingToHospital = trip && ['ARRIVED', 'IN_TRANSIT'].includes(trip.status);
  const target = headingToHospital && hospital ? hospital : request;

  // Keep the latest values available to timers without re-subscribing.
  const live = useRef({});
  live.current = { ambulance, target, trip, update: updateAmbulanceLocation };

  // ---- Live GPS: real device position (Browser Geolocation API) ----------
  useEffect(() => {
    if (gpsMode !== 'device') return undefined;
    if (!navigator.geolocation) {
      setGpsFeedback('This browser cannot share location. Try "Simulate drive" instead.');
      setGpsMode('off');
      return undefined;
    }
    let lastSent = 0;
    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const now = Date.now();
        const amb = live.current.ambulance;
        if (!amb || now - lastSent < GPS_INTERVAL_MS) return;
        lastSent = now;
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        try {
          await live.current.update({
            ambulanceId: amb.id,
            lat,
            lng,
            currentLocation: `Live GPS (±${Math.round(pos.coords.accuracy)} m)`
          });
          setGpsFeedback(`Position shared at ${new Date().toLocaleTimeString()}`);
        } catch (err) {
          setGpsFeedback(err.message);
        }
      },
      (err) => {
        setGpsFeedback(
          err.code === 1
            ? 'Location permission was denied. Allow it in your browser, or use "Simulate drive".'
            : 'Could not read your position. Check that location services are on.'
        );
        setGpsMode('off');
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [gpsMode]);

  // ---- Simulated drive: step the unit toward its current target ----------
  useEffect(() => {
    if (gpsMode !== 'simulate') return undefined;
    const tick = async () => {
      const { ambulance: amb, target: tgt } = live.current;
      if (!amb || !tgt) return;
      const remaining = haversineDistanceKm(amb.lat, amb.lng, tgt.lat, tgt.lng) ?? 0;
      if (remaining < 0.05) {
        setGpsFeedback('Reached the destination point. Update the trip stage when ready.');
        return;
      }
      const step = remaining < 0.4 ? 1 : 0.22;
      const lat = Number((amb.lat + (tgt.lat - amb.lat) * step).toFixed(6));
      const lng = Number((amb.lng + (tgt.lng - amb.lng) * step).toFixed(6));
      try {
        await live.current.update({
          ambulanceId: amb.id,
          lat,
          lng,
          currentLocation: `Simulated drive, ${remaining.toFixed(1)} km to go`
        });
        setGpsFeedback(`Simulated position sent at ${new Date().toLocaleTimeString()}`);
      } catch (err) {
        setGpsFeedback(err.message);
        setGpsMode('off');
      }
    };
    tick();
    const id = setInterval(tick, GPS_INTERVAL_MS);
    return () => clearInterval(id);
  }, [gpsMode]);

  useEffect(() => {
    if (trip?.status === 'COMPLETED') setGpsMode('off');
  }, [trip?.status]);

  if (!trip) {
    return (
      <AppLayout title="Active trip" subtitle="Manage trip progress and live location">
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">
              <Navigation size={26} />
            </div>
            <p className="empty-title">No active trip</p>
            <p className="empty-text">Accept an incoming assignment to start a trip.</p>
            <Button variant="primary" onClick={() => navigate('/driver/assignments')}>
              Go to assignments
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const nextStatus = getNextTripStatus(trip.status);
  const currentIdx = TRIP_STATUS_FLOW.indexOf(trip.status);
  const distanceKm =
    ambulance && target
      ? haversineDistanceKm(ambulance.lat, ambulance.lng, target.lat, target.lng)
      : null;

  const handleAdvanceStatus = async () => {
    if (!nextStatus) return;
    setError('');
    setUpdating(true);
    try {
      await advanceTripStatus(trip.id, nextStatus);
    } catch (err) {
      setError(err.message || 'Could not update trip status.');
    } finally {
      setUpdating(false);
    }
  };

  const routes = [];
  if (ambulance && request && !headingToHospital) {
    routes.push({
      id: 'drv-pickup',
      points: [
        { lat: ambulance.lat, lng: ambulance.lng },
        { lat: request.lat, lng: request.lng }
      ],
      color: '#ff3b5c',
      dashed: true
    });
  }
  if (request && hospital) {
    routes.push({
      id: 'drv-hosp',
      points: [
        headingToHospital && ambulance
          ? { lat: ambulance.lat, lng: ambulance.lng }
          : { lat: request.lat, lng: request.lng },
        { lat: hospital.lat, lng: hospital.lng }
      ],
      color: '#0ea5a4',
      dashed: !headingToHospital
    });
  }

  const done = trip.status === 'COMPLETED';

  return (
    <AppLayout title={`Trip ${trip.id}`} subtitle={`Request ${trip.requestId} · ${trip.pickupAddress}`}>
      <div style={{ display: 'grid', gap: 20 }}>
        <div className="card trip-hero">
          <div className="card-body" style={{ display: 'grid', gap: 16 }}>
            <div className="trip-hero-top">
              <div>
                <div className="eyebrow">Current stage</div>
                <div className="trip-hero-stage">{STEP_LABELS[trip.status]}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  <StatusBadge status={trip.status} />
                  {gpsMode !== 'off' ? (
                    <span className="badge badge-green live-badge">
                      <Radio size={12} /> {gpsMode === 'device' ? 'Live GPS on' : 'Simulated drive'}
                    </span>
                  ) : (
                    <span className="badge badge-neutral">
                      <Radio size={12} /> Location paused
                    </span>
                  )}
                </div>
              </div>
              {!done && target && (
                <div className="trip-hero-metric">
                  <span>{headingToHospital ? 'To hospital' : 'To pickup'}</span>
                  <strong>{distanceKm != null ? `${distanceKm} km` : '—'}</strong>
                  <small>
                    {distanceKm != null ? `about ${estimateEtaMinutes(distanceKm)} min` : ''}
                  </small>
                </div>
              )}
            </div>

            {!done && (
              <div className="gps-controls">
                <Button
                  variant={gpsMode === 'device' ? 'success' : 'secondary'}
                  size="sm"
                  onClick={() => setGpsMode(gpsMode === 'device' ? 'off' : 'device')}
                >
                  {gpsMode === 'device' ? <Square size={14} /> : <LocateFixed size={15} />}
                  {gpsMode === 'device' ? 'Stop live GPS' : 'Share live GPS'}
                </Button>
                <Button
                  variant={gpsMode === 'simulate' ? 'success' : 'secondary'}
                  size="sm"
                  onClick={() => setGpsMode(gpsMode === 'simulate' ? 'off' : 'simulate')}
                >
                  {gpsMode === 'simulate' ? <Square size={14} /> : <Play size={14} />}
                  {gpsMode === 'simulate' ? 'Stop simulation' : 'Simulate drive'}
                </Button>
                {gpsFeedback && <span className="gps-feedback">{gpsFeedback}</span>}
              </div>
            )}

            {error && <div className="alert-banner danger">{error}</div>}

            {nextStatus ? (
              <Button
                variant={nextStatus === 'COMPLETED' ? 'success' : 'primary'}
                className="driver-action-btn"
                loading={updating}
                onClick={handleAdvanceStatus}
              >
                <CheckCircle2 size={20} />
                {ACTION_LABELS[nextStatus] || `Advance to ${nextStatus}`}
              </Button>
            ) : (
              <div className="alert-banner success">
                <span>Trip {trip.id} is complete. Your ambulance is available again.</span>
                <Button variant="secondary" size="sm" onClick={() => navigate('/driver/history')}>
                  View history
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="grid-main-aside">
          <div style={{ display: 'grid', gap: 20, alignContent: 'start' }}>
            <TrackingMap
              title={`Route for ${trip.id}`}
              ambulances={ambulance ? [ambulance] : []}
              pickups={request ? [{ id: request.id, label: 'Pickup', lat: request.lat, lng: request.lng }] : []}
              hospitals={hospital ? [hospital] : []}
              routes={routes}
              selectedAmbulanceId={ambulance?.id}
              followAmbulanceId={gpsMode !== 'off' ? ambulance?.id : null}
              height={380}
            />

            <div className="card">
              <div className="card-header">
                <div className="card-title">Patient & destination</div>
                {request && <StatusBadge status={request.category} />}
              </div>
              <div className="card-body detail-list">
                <div className="detail-row">
                  <User size={16} />
                  <span>Patient</span>
                  <strong>{request?.patientName || 'Authorised patient'}</strong>
                </div>
                <div className="detail-row">
                  <Phone size={16} />
                  <span>Contact</span>
                  <strong>
                    {request?.contactNumber ? (
                      <a href={`tel:${request.contactNumber}`}>{request.contactNumber}</a>
                    ) : (
                      '—'
                    )}
                  </strong>
                </div>
                <div className="detail-row">
                  <MapPin size={16} className="text-red" />
                  <span>Pickup</span>
                  <strong>{trip.pickupAddress}</strong>
                </div>
                <div className="detail-row">
                  <Hospital size={16} className="text-teal" />
                  <span>Destination</span>
                  <strong>{trip.destinationName}</strong>
                </div>
                {request?.details && (
                  <div className="detail-note">{request.details}</div>
                )}
                {ambulance && (
                  <div className="muted-small">
                    Vehicle: {ambulance.currentLocation} · updated {formatTimeOnly(ambulance.lastUpdated)}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="card" style={{ alignSelf: 'start' }}>
            <div className="card-header">
              <div>
                <div className="card-title">Trip progress</div>
                <div className="card-subtitle">Each stage must be completed in order</div>
              </div>
            </div>
            <div className="card-body">
              <div className="timeline">
                {TRIP_STATUS_FLOW.map((stepStatus, idx) => {
                  const historyMatch = trip.statusHistory?.find((h) => h.status === stepStatus);
                  const isDone = done ? true : currentIdx > idx;
                  const isCurrent = !done && currentIdx === idx;
                  return (
                    <div
                      key={stepStatus}
                      className={`timeline-step ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''}`}
                    >
                      <div className="timeline-marker">{isDone ? <Check size={14} /> : idx + 1}</div>
                      <div>
                        <div className="timeline-title">{STEP_LABELS[stepStatus]}</div>
                        <div className="timeline-meta">
                          {historyMatch
                            ? formatTimeOnly(historyMatch.time)
                            : isCurrent
                            ? 'In progress'
                            : 'Waiting'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default DriverTrip;
