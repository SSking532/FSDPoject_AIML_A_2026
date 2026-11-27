import React, { useMemo, useState } from 'react';
import { Check, Eye } from 'lucide-react';
import Button from '../../components/common/Button';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import SearchBar from '../../components/common/SearchBar';
import StatusBadge from '../../components/common/StatusBadge';
import AppLayout from '../../components/layout/AppLayout';
import { useAppData } from '../../context/DataContext';
import { formatDateTime } from '../../utils/geo';

export function Trips() {
  const { trips, ambulances, drivers } = useAppData();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedTrip, setSelectedTrip] = useState(null);

  const getAmbReg = (id) =>
    ambulances.find((a) => a.id === id)?.registrationNumber || id;
  const getDriverName = (id) =>
    drivers.find((d) => d.id === id)?.name || id;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return trips.filter((t) => {
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      if (!q) return true;
      return (
        t.id.toLowerCase().includes(q) ||
        t.requestId.toLowerCase().includes(q) ||
        getAmbReg(t.ambulanceId).toLowerCase().includes(q) ||
        getDriverName(t.driverId).toLowerCase().includes(q)
      );
    });
  }, [trips, ambulances, drivers, search, statusFilter]);

  const columns = [
    { key: 'id', header: 'Trip ID', sortable: true, render: (t) => <strong>{t.id}</strong> },
    { key: 'requestId', header: 'Request ID', sortable: true },
    {
      key: 'ambulanceId',
      header: 'Ambulance',
      render: (t) => getAmbReg(t.ambulanceId)
    },
    {
      key: 'driverId',
      header: 'Driver',
      render: (t) => getDriverName(t.driverId)
    },
    {
      key: 'startedAt',
      header: 'Start Time',
      sortable: true,
      render: (t) => formatDateTime(t.startedAt)
    },
    {
      key: 'completedAt',
      header: 'Completion Time',
      render: (t) => formatDateTime(t.completedAt)
    },
    {
      key: 'status',
      header: 'Trip Status',
      sortable: true,
      render: (t) => <StatusBadge status={t.status} />
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (t) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setSelectedTrip(t)}
        >
          <Eye size={14} />
          Details
        </Button>
      )
    }
  ];

  return (
    <AppLayout
      title="Trips"
      subtitle="Active and completed transports with their full timeline"
    >
      <div className="toolbar">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search trip ID, request ID, ambulance, or driver..."
        />
        <div className="filter-pills">
          {['ALL', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'IN_TRANSIT', 'COMPLETED'].map(
            (st) => (
              <button
                key={st}
                type="button"
                className={`filter-pill ${statusFilter === st ? 'active' : ''}`}
                onClick={() => setStatusFilter(st)}
              >
                {st === 'ALL' ? 'All' : st.replace(/_/g, ' ')}
              </button>
            )
          )}
        </div>
      </div>

      <div className="card">
        <DataTable columns={columns} data={filtered} />
      </div>

      <Modal
        isOpen={Boolean(selectedTrip)}
        onClose={() => setSelectedTrip(null)}
        title={`Trip ${selectedTrip?.id || ''}`}
        footer={
          <Button variant="secondary" onClick={() => setSelectedTrip(null)}>
            Close
          </Button>
        }
      >
        {selectedTrip && (
          <div style={{ display: 'grid', gap: 14, fontSize: 13.5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span><strong>Request:</strong> {selectedTrip.requestId}</span>
              <StatusBadge status={selectedTrip.status} />
            </div>
            <div><strong>Ambulance:</strong> {getAmbReg(selectedTrip.ambulanceId)}</div>
            <div><strong>Driver:</strong> {getDriverName(selectedTrip.driverId)}</div>
            <div><strong>Pickup:</strong> {selectedTrip.pickupAddress}</div>
            <div><strong>Destination:</strong> {selectedTrip.destinationName}</div>
            <div><strong>Started:</strong> {formatDateTime(selectedTrip.startedAt)}</div>
            <div><strong>Completed:</strong> {formatDateTime(selectedTrip.completedAt)}</div>

            <div style={{ paddingTop: 10, borderTop: '1px solid var(--line)' }}>
              <div style={{ fontWeight: 700, marginBottom: 10 }}>Status History</div>
              <div className="timeline">
                {(selectedTrip.statusHistory || []).map((entry, idx) => (
                  <div key={`${entry.status}-${idx}`} className="timeline-step done">
                    <div className="timeline-marker">
                      <Check size={13} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>
                        {entry.status.replace(/_/g, ' ')}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                        {formatDateTime(entry.time)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}

export default Trips;
