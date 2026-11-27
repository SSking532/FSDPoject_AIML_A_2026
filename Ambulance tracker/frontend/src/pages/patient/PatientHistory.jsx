import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Navigation } from 'lucide-react';
import Button from '../../components/common/Button';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import SearchBar from '../../components/common/SearchBar';
import StatusBadge from '../../components/common/StatusBadge';
import AppLayout from '../../components/layout/AppLayout';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/DataContext';
import { formatDateTime } from '../../utils/geo';

export function PatientHistory() {
  const { user } = useAuth();
  const { requests, ambulances } = useAppData();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedRequest, setSelectedRequest] = useState(null);

  const myRequests = useMemo(
    () =>
      requests.filter(
        (r) =>
          r.patientId === user?.id ||
          r.patientName?.toLowerCase() === user?.name?.toLowerCase()
      ),
    [requests, user]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return myRequests.filter((r) => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.id.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.pickupAddress.toLowerCase().includes(q)
      );
    });
  }, [myRequests, search, statusFilter]);

  const getAmbLabel = (ambId) => {
    if (!ambId) return '—';
    const found = ambulances.find((a) => a.id === ambId);
    return found ? found.registrationNumber : ambId;
  };

  const columns = [
    { key: 'id', header: 'Request ID', sortable: true, render: (r) => <strong>{r.id}</strong> },
    {
      key: 'createdAt',
      header: 'Date & Time',
      sortable: true,
      render: (r) => formatDateTime(r.createdAt)
    },
    {
      key: 'category',
      header: 'Category',
      sortable: true,
      render: (r) => <StatusBadge status={r.category} />
    },
    { key: 'pickupAddress', header: 'Pickup Location' },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (r) => <StatusBadge status={r.status} />
    },
    {
      key: 'assignedAmbulanceId',
      header: 'Assigned Ambulance',
      render: (r) => getAmbLabel(r.assignedAmbulanceId)
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        <div style={{ display: 'flex', gap: 6 }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedRequest(r);
            }}
          >
            <Eye size={14} />
            Details
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/patient/tracking/${r.id}`);
            }}
          >
            <Navigation size={14} />
            Track
          </Button>
        </div>
      )
    }
  ];

  return (
    <AppLayout
      title="Request history"
      subtitle="All your past and current requests"
    >
      <div className="toolbar">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by request ID, category, or address..."
        />
        <div className="filter-pills">
          {['ALL', 'PENDING', 'EN_ROUTE', 'COMPLETED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              type="button"
              className={`filter-pill ${statusFilter === st ? 'active' : ''}`}
              onClick={() => setStatusFilter(st)}
            >
              {st === 'ALL' ? 'All' : st.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={filtered}
          emptyTitle="No matching requests"
          emptyDescription="You have not submitted any requests matching these filters."
        />
      </div>

      <Modal
        isOpen={Boolean(selectedRequest)}
        onClose={() => setSelectedRequest(null)}
        title={`Request ${selectedRequest?.id || ''}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelectedRequest(null)}>
              Close
            </Button>
            {selectedRequest && (
              <Button
                variant="navy"
                onClick={() => {
                  const id = selectedRequest.id;
                  setSelectedRequest(null);
                  navigate(`/patient/tracking/${id}`);
                }}
              >
                Open Live Tracking
              </Button>
            )}
          </>
        }
      >
        {selectedRequest && (
          <div style={{ display: 'grid', gap: 12, fontSize: 13.5 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <StatusBadge status={selectedRequest.status} />
              <StatusBadge status={selectedRequest.category} />
            </div>
            <div>
              <strong>Requested:</strong> {formatDateTime(selectedRequest.createdAt)}
            </div>
            <div>
              <strong>Pickup Address:</strong> {selectedRequest.pickupAddress}
            </div>
            <div>
              <strong>Coordinates:</strong> {selectedRequest.lat}, {selectedRequest.lng}
            </div>
            <div>
              <strong>Assigned Ambulance:</strong>{' '}
              {getAmbLabel(selectedRequest.assignedAmbulanceId)}
            </div>
            <div>
              <strong>Notes:</strong>{' '}
              {selectedRequest.details || 'No additional notes provided.'}
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}

export default PatientHistory;
