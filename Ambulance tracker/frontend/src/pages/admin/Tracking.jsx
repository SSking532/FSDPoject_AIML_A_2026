import React, { useMemo, useState } from 'react';
import { Truck, User, MapPin, Clock } from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';
import AppLayout from '../../components/layout/AppLayout';
import TrackingMap from '../../components/maps/TrackingMap';
import { useAppData } from '../../context/DataContext';
import { formatTimeOnly } from '../../utils/geo';

export function Tracking() {
  const { ambulances, requests, hospitals, drivers } = useAppData();
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedAmbId, setSelectedAmbId] = useState(ambulances[0]?.id || null);

  const visibleAmbulances = useMemo(() => {
    if (statusFilter === 'ALL') return ambulances;
    return ambulances.filter((a) => a.status === statusFilter);
  }, [ambulances, statusFilter]);

  const activeRequests = useMemo(
    () => requests.filter((r) => !['COMPLETED', 'CANCELLED'].includes(r.status)),
    [requests]
  );

  const selectedAmbulance =
    visibleAmbulances.find((a) => a.id === selectedAmbId) ||
    visibleAmbulances[0] ||
    null;

  const selectedDriver = selectedAmbulance?.driverId
    ? drivers.find((d) => d.id === selectedAmbulance.driverId)
    : null;

  return (
    <AppLayout
      title="Live tracking"
      subtitle="Where every unit is right now, updated as drivers move"
    >
      <div className="toolbar">
        <div className="filter-pills">
          {['ALL', 'AVAILABLE', 'ASSIGNED', 'EN_ROUTE', 'ON_TRIP', 'OUT_OF_SERVICE'].map((st) => (
            <button
              key={st}
              type="button"
              className={`filter-pill ${statusFilter === st ? 'active' : ''}`}
              onClick={() => setStatusFilter(st)}
            >
              {st === 'ALL' ? 'All Units' : st.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="grid-main-aside">
        <TrackingMap
          title="Fleet map"
          ambulances={visibleAmbulances}
          pickups={activeRequests.map((r) => ({
            id: r.id,
            label: `${r.id} (${r.category})`,
            lat: r.lat,
            lng: r.lng
          }))}
          hospitals={hospitals}
          selectedAmbulanceId={selectedAmbulance?.id}
          onSelectAmbulance={(amb) => setSelectedAmbId(amb.id)}
          height={480}
        />

        <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
          {/* Selected Vehicle Details */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Selected Vehicle Details</div>
              {selectedAmbulance && <StatusBadge status={selectedAmbulance.status} />}
            </div>
            <div className="card-body">
              {selectedAmbulance ? (
                <div style={{ display: 'grid', gap: 10, fontSize: 13.5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 15 }}>
                    <Truck size={17} style={{ color: 'var(--navy)' }} />
                    {selectedAmbulance.registrationNumber}
                  </div>
                  <div style={{ color: 'var(--muted)' }}>
                    {selectedAmbulance.category}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <User size={15} />
                    <span>
                      <strong>Driver:</strong>{' '}
                      {selectedDriver?.name || selectedAmbulance.driverName || 'Unassigned'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <MapPin size={15} style={{ color: 'var(--red)', marginTop: 2 }} />
                    <span>
                      <strong>Position:</strong> {selectedAmbulance.currentLocation} (
                      {selectedAmbulance.lat?.toFixed(4)},{' '}
                      {selectedAmbulance.lng?.toFixed(4)})
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--muted)' }}>
                    <Clock size={14} />
                    Last updated: {formatTimeOnly(selectedAmbulance.lastUpdated)}
                  </div>
                </div>
              ) : (
                <div style={{ color: 'var(--muted)', fontSize: 13 }}>
                  No vehicles match the selected filter.
                </div>
              )}
            </div>
          </div>

          {/* Clickable Fleet Roster */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Filtered Fleet ({visibleAmbulances.length})</div>
            </div>
            <div className="card-body" style={{ display: 'grid', gap: 8 }}>
              {visibleAmbulances.map((amb) => {
                const isSelected = amb.id === selectedAmbulance?.id;
                return (
                  <button
                    key={amb.id}
                    type="button"
                    onClick={() => setSelectedAmbId(amb.id)}
                    style={{
                      textAlign: 'left',
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: isSelected
                        ? '2px solid var(--navy)'
                        : '1px solid var(--line)',
                      background: isSelected ? '#f4f7fb' : 'var(--white)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 8
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>
                        {amb.registrationNumber}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                        {amb.driverName}
                      </div>
                    </div>
                    <StatusBadge status={amb.status} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default Tracking;
