import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  Ambulance,
  CheckCircle2,
  Hourglass,
  Route,
  ShieldCheck,
  Siren,
  UserCheck,
  Users
} from 'lucide-react';
import Button from '../../components/common/Button';
import StatusBadge from '../../components/common/StatusBadge';
import AppLayout from '../../components/layout/AppLayout';
import TrackingMap, { AMBULANCE_STATUS_COLORS } from '../../components/maps/TrackingMap';
import { useAppData } from '../../context/DataContext';
import { formatTimeOnly } from '../../utils/geo';

const minutesSince = (iso, now) => Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
const waitLabel = (m) => (m < 1 ? 'just now' : m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`);

export function AdminDashboard() {
  const { requests, ambulances, drivers, trips, hospitals, activity, updateDriver } = useAppData();
  const navigate = useNavigate();
  const [now, setNow] = useState(Date.now());
  const [selectedAmb, setSelectedAmb] = useState(null);
  const [approving, setApproving] = useState('');

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const waiting = useMemo(
    () =>
      requests
        .filter((r) => ['PENDING', 'NO_AMBULANCE_AVAILABLE'].includes(r.status))
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
    [requests]
  );
  const activeTrips = trips.filter((t) => t.status !== 'COMPLETED');
  const today = new Date().toDateString();
  const doneToday = trips.filter((t) => t.completedAt && new Date(t.completedAt).toDateString() === today).length;
  const free = ambulances.filter((a) => a.status === 'AVAILABLE').length;
  const onDuty = drivers.filter((d) => d.availability === 'ONLINE').length;
  const pendingDrivers = drivers.filter((d) => d.verificationStatus === 'PENDING_APPROVAL');
  const oldest = waiting[0] ? minutesSince(waiting[0].createdAt, now) : null;

  const approve = async (driverId) => {
    setApproving(driverId);
    try {
      await updateDriver(driverId, { verificationStatus: 'VERIFIED' });
    } finally {
      setApproving('');
    }
  };

  const kpis = [
    {
      icon: Siren,
      tone: 'red',
      label: 'Waiting for an ambulance',
      value: waiting.length,
      hint: oldest != null ? `Oldest waiting ${waitLabel(oldest)}` : 'Queue is clear'
    },
    { icon: Ambulance, tone: 'green', label: 'Units free', value: `${free}/${ambulances.length}`, hint: 'Ready to dispatch' },
    { icon: Route, tone: 'blue', label: 'On the road', value: activeTrips.length, hint: 'Trips in progress' },
    { icon: CheckCircle2, tone: 'violet', label: 'Completed today', value: doneToday, hint: 'Patients handed over' },
    { icon: Users, tone: 'navy', label: 'Drivers on duty', value: onDuty, hint: `${drivers.length} registered` }
  ];

  return (
    <AppLayout title="Command center" subtitle="What needs attention now, and where every unit is">
      <div className="kpi-strip">
        {kpis.map(({ icon: Icon, tone, label, value, hint }) => (
          <div key={label} className={`kpi tone-${tone} ${tone === 'red' && waiting.length ? 'alert' : ''}`}>
            <span className="kpi-ic">
              <Icon size={18} />
            </span>
            <span className="kpi-val">{value}</span>
            <span className="kpi-lab">{label}</span>
            <span className="kpi-hint">{hint}</span>
          </div>
        ))}
      </div>

      {pendingDrivers.length > 0 && (
        <section className="notice notice-amber approvals">
          <ShieldCheck size={20} />
          <div style={{ flex: 1 }}>
            <strong>
              {pendingDrivers.length === 1 ? '1 driver is' : `${pendingDrivers.length} drivers are`} waiting for approval
            </strong>
            <ul className="approval-list">
              {pendingDrivers.map((d) => (
                <li key={d.id}>
                  <span>
                    <b>{d.name}</b> licence {d.licenseNumber}
                    {d.assignedAmbulanceId ? `, vehicle ${ambulances.find((a) => a.id === d.assignedAmbulanceId)?.registrationNumber || ''}` : ', no vehicle'}
                  </span>
                  <Button variant="success" size="sm" loading={approving === d.id} onClick={() => approve(d.id)}>
                    <UserCheck size={14} /> Approve
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <div className="command-grid">
        <TrackingMap
          title="Fleet and open requests"
          ambulances={ambulances}
          pickups={waiting.map((r) => ({ id: r.id, label: r.id, lat: r.lat, lng: r.lng }))}
          hospitals={hospitals}
          selectedAmbulanceId={selectedAmb}
          onSelectAmbulance={(a) => setSelectedAmb(a.id)}
          height={520}
        />

        <section className="card queue">
          <div className="card-header">
            <div>
              <div className="card-title">
                <Hourglass size={16} /> Waiting queue
              </div>
              <div className="card-subtitle">Oldest first</div>
            </div>
            <Link to="/admin/requests">All requests</Link>
          </div>
          {waiting.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <CheckCircle2 size={24} />
              </div>
              <p className="empty-title">Nobody is waiting</p>
              <p className="empty-text">New requests appear here instantly, with an alert.</p>
            </div>
          ) : (
            <ul className="queue-list">
              {waiting.map((r) => {
                const m = minutesSince(r.createdAt, now);
                return (
                  <li key={r.id} className={m >= 5 ? 'late' : ''}>
                    <div className="queue-top">
                      <StatusBadge status={r.category} />
                      <span className="queue-wait">{waitLabel(m)}</span>
                    </div>
                    <strong>{r.patientName}</strong>
                    <span className="queue-addr">{r.pickupAddress}</span>
                    {r.details && <span className="queue-details">{r.details}</span>}
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => navigate(`/admin/assignments?requestId=${r.id}`)}
                    >
                      Allocate ambulance
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <div className="grid-2">
        <section className="card">
          <div className="card-header">
            <div className="card-title">
              <Ambulance size={16} /> Fleet board
            </div>
            <Link to="/admin/ambulances">Manage fleet</Link>
          </div>
          <ul className="fleet-board">
            {ambulances.map((a) => (
              <li
                key={a.id}
                className={selectedAmb === a.id ? 'selected' : ''}
                onClick={() => setSelectedAmb(a.id)}
              >
                <span className="fleet-dot" style={{ background: AMBULANCE_STATUS_COLORS[a.status] }} />
                <span className="fleet-main">
                  <strong>{a.registrationNumber}</strong>
                  <span>
                    {a.driverName} · {a.currentLocation}
                  </span>
                </span>
                <span className="fleet-meta">
                  <StatusBadge status={a.status} />
                  <span>{formatTimeOnly(a.lastUpdated)}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <div className="card-header">
            <div className="card-title">
              <Activity size={16} /> Recent activity
            </div>
          </div>
          <ul className="feed">
            {activity.slice(0, 9).map((a) => (
              <li key={a.id} className={`feed-${a.type}`}>
                <span className="feed-dot" />
                <span className="feed-msg">{a.message}</span>
                <span className="feed-time">{formatTimeOnly(a.time)}</span>
              </li>
            ))}
            {activity.length === 0 && <li className="muted-small">Nothing has happened yet.</li>}
          </ul>
        </section>
      </div>
    </AppLayout>
  );
}

export default AdminDashboard;