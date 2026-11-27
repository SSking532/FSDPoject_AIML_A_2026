import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Ambulance,
  ChevronRight,
  ClipboardList,
  DoorOpen,
  Droplet,
  MapPin,
  Phone,
  PhoneCall,
  Pill,
  Siren,
  UserRound
} from 'lucide-react';
import StageProgress from '../../components/common/StageProgress';
import StatusBadge from '../../components/common/StatusBadge';
import AppLayout from '../../components/layout/AppLayout';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/DataContext';
import { usePatientRequests } from '../../hooks/useRoleData';
import { estimateEtaMinutes, formatDateTime, haversineDistanceKm } from '../../utils/geo';

const HEADLINES = {
  PENDING: ['Finding you an ambulance', 'Dispatch is choosing the nearest suitable unit.'],
  NO_AMBULANCE_AVAILABLE: ['No ambulance free right now', 'Dispatch is still trying. If this is life-threatening, call 112.'],
  ASSIGNED: ['Ambulance assigned', 'Waiting for the driver to confirm.'],
  ACCEPTED: ['Driver confirmed', 'Your ambulance is about to set off.'],
  EN_ROUTE: ['Ambulance on the way', 'Keep your phone close; the driver may call you.'],
  ARRIVED: ['Your ambulance has arrived', 'The crew is at your pickup point.'],
  IN_TRANSIT: ['On the way to hospital', 'The hospital is expecting you.']
};

const TIPS = [
  { icon: Phone, title: 'Keep your phone free', text: 'The driver may call to find you.' },
  { icon: DoorOpen, title: 'Make the way clear', text: 'Unlock the door and switch on an outside light.' },
  { icon: Pill, title: 'Gather medicines', text: 'Have current prescriptions and reports ready.' }
];

export function PatientDashboard() {
  const { user } = useAuth();
  const { ambulances } = useAppData();
  const { mine, active } = usePatientRequests();
  const navigate = useNavigate();

  const firstName = user?.name?.split(' ')[0] || 'there';
  const amb = active ? ambulances.find((a) => a.id === active.assignedAmbulanceId) : null;
  const dist = amb && active ? haversineDistanceKm(amb.lat, amb.lng, active.lat, active.lng) : null;
  const [headline, sub] = active ? HEADLINES[active.status] || ['Request in progress', ''] : [];

  return (
    <AppLayout title={`Hello, ${firstName}`} subtitle="Request an ambulance or follow one that is on its way">
      {active ? (
        <section className="live-card" aria-live="polite">
          <div className="live-card-top">
            <div>
              <span className="live-chip">
                <span className="live-dot" /> {active.id}
              </span>
              <h2 className="live-title">{headline}</h2>
              <p className="live-sub">{sub}</p>
            </div>
            {amb && dist != null && ['ASSIGNED', 'ACCEPTED', 'EN_ROUTE'].includes(active.status) && (
              <div className="live-eta">
                <span>Arriving in about</span>
                <strong>{estimateEtaMinutes(dist)} min</strong>
                <small>{dist} km away</small>
              </div>
            )}
          </div>

          <StageProgress status={active.status} dark />

          <div className="live-card-foot">
            <div className="live-unit">
              {amb ? (
                <>
                  <Ambulance size={18} />
                  <span>
                    <strong>{amb.registrationNumber}</strong> {amb.category}
                  </span>
                </>
              ) : (
                <>
                  <MapPin size={18} />
                  <span>{active.pickupAddress}</span>
                </>
              )}
            </div>
            <button type="button" className="btn btn-light" onClick={() => navigate(`/patient/tracking/${active.id}`)}>
              Open live tracking
              <ChevronRight size={16} />
            </button>
          </div>
        </section>
      ) : (
        <section className="sos-card">
          <div className="sos-copy">
            <h2>Need an ambulance?</h2>
            <p>
              Tell us what happened and where you are. Dispatch sends the nearest suitable unit and you
              can watch it arrive here.
            </p>
            <p className="sos-fineprint">
              This is a prototype and is not connected to 108 or 112. In a real emergency, call 112.
            </p>
          </div>
          <button type="button" className="sos-button" onClick={() => navigate('/patient/request')}>
            <span className="sos-ring" aria-hidden="true" />
            <Siren size={30} />
            <span>Request ambulance</span>
          </button>
        </section>
      )}

      <div className="home-grid">
        <section className="card">
          <div className="card-header">
            <div className="card-title">
              <ClipboardList size={17} /> Your requests
            </div>
            {mine.length > 0 && <Link to="/patient/history">See all</Link>}
          </div>
          {mine.length === 0 ? (
            <div className="empty-state">
              <p className="empty-title">No requests yet</p>
              <p className="empty-text">When you request an ambulance it will appear here with its full timeline.</p>
            </div>
          ) : (
            <ul className="row-list">
              {mine.slice(0, 5).map((r) => (
                <li key={r.id}>
                  <button type="button" className="row-item" onClick={() => navigate(`/patient/tracking/${r.id}`)}>
                    <span className={`row-icon cat-${r.category?.toLowerCase()}`}>
                      <Siren size={16} />
                    </span>
                    <span className="row-main">
                      <strong>
                        {r.category} emergency <span className="row-id">{r.id}</span>
                      </strong>
                      <span>{r.pickupAddress}</span>
                    </span>
                    <span className="row-meta">
                      <StatusBadge status={r.status} />
                      <span>{formatDateTime(r.createdAt)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="stack">
          <section className="card">
            <div className="card-header">
              <div className="card-title">
                <UserRound size={17} /> Your details
              </div>
              <Link to="/patient/profile">Edit</Link>
            </div>
            <div className="card-body facts">
              <div>
                <span>Phone</span>
                <strong>{user?.phone || 'Add a phone number'}</strong>
              </div>
              <div>
                <span>
                  <Droplet size={13} /> Blood group
                </span>
                <strong>{user?.bloodGroup && user.bloodGroup !== 'Not specified' ? user.bloodGroup : 'Not added'}</strong>
              </div>
              <div>
                <span>Emergency contact</span>
                <strong>{user?.emergencyContact || 'Not added'}</strong>
              </div>
              <div>
                <span>Home address</span>
                <strong>{user?.address || 'Not added'}</strong>
              </div>
            </div>
          </section>

          <section className="card">
            <div className="card-header">
              <div className="card-title">While you wait</div>
            </div>
            <ul className="tips">
              {TIPS.map(({ icon: Icon, title, text }) => (
                <li key={title}>
                  <span className="tip-icon">
                    <Icon size={16} />
                  </span>
                  <span>
                    <strong>{title}</strong>
                    {text}
                  </span>
                </li>
              ))}
            </ul>
            <div className="card-body" style={{ paddingTop: 0 }}>
              <a className="btn btn-secondary" style={{ width: '100%' }} href="tel:112">
                <PhoneCall size={16} /> Call 112
              </a>
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}

export default PatientDashboard;