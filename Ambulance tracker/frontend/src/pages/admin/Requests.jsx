import React, { useMemo, useState } from 'react';
import { Eye, Send, XCircle } from 'lucide-react';
import Button from '../../components/common/Button';
import DataTable from '../../components/common/DataTable';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import SearchBar from '../../components/common/SearchBar';
import StatusBadge from '../../components/common/StatusBadge';
import AppLayout from '../../components/layout/AppLayout';
import { useAppData } from '../../context/DataContext';
import { formatDateTime, rankAmbulances } from '../../utils/geo';

export function Requests() {
  const {
    requests,
    ambulances,
    drivers,
    hospitals,
    assignAmbulance,
    cancelRequest
  } = useAppData();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [detailTarget, setDetailTarget] = useState(null);
  const [assignTarget, setAssignTarget] = useState(null);
  const [selectedAmbId, setSelectedAmbId] = useState('');
  const [selectedHospId, setSelectedHospId] = useState(hospitals[0]?.id || '');
  const [cancelTarget, setCancelTarget] = useState(null);

  const availableAmbulances = useMemo(
    () => ambulances.filter((a) => a.status === 'AVAILABLE'),
    [ambulances]
  );

  const eligibleFor = (req) =>
    rankAmbulances(req, ambulances, drivers)
      .filter((c) => c.isEligible)
      .map((c) => ({ amb: c.amb, dist: c.distanceKm }));

  const getRecommendedAmbulance = (req) => eligibleFor(req)[0] || null;
  const [assignError, setAssignError] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter((r) => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.id.toLowerCase().includes(q) ||
        r.patientName.toLowerCase().includes(q) ||
        r.pickupAddress.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q)
      );
    });
  }, [requests, search, statusFilter]);

  const openAssignModal = (req) => {
    const rec = getRecommendedAmbulance(req);
    setAssignTarget(req);
    setSelectedAmbId(rec?.amb.id || '');
    setAssignError('');
    setSelectedHospId(hospitals[0]?.id || '');
  };

  const handleConfirmAssign = async () => {
    if (!assignTarget || !selectedAmbId) return;
    setAssignError('');
    try {
      await assignAmbulance({
        requestId: assignTarget.id,
        ambulanceId: selectedAmbId,
        hospitalId: selectedHospId
      });
      setAssignTarget(null);
    } catch (err) {
      setAssignError(err.message);
    }
  };

  const columns = [
    { key: 'id', header: 'Request ID', sortable: true, render: (r) => <strong>{r.id}</strong> },
    { key: 'patientName', header: 'Patient', sortable: true },
    {
      key: 'category',
      header: 'Category',
      sortable: true,
      render: (r) => <StatusBadge status={r.category} />
    },
    { key: 'pickupAddress', header: 'Pickup Location' },
    {
      key: 'createdAt',
      header: 'Request Time',
      sortable: true,
      render: (r) => formatDateTime(r.createdAt)
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (r) => <StatusBadge status={r.status} />
    },
    {
      key: 'recommended',
      header: 'Recommended Unit',
      render: (r) => {
        if (r.assignedAmbulanceId) {
          const amb = ambulances.find((a) => a.id === r.assignedAmbulanceId);
          return (
            <span style={{ fontWeight: 700, color: 'var(--navy)' }}>
              {amb?.registrationNumber || r.assignedAmbulanceId}
            </span>
          );
        }
        const rec = getRecommendedAmbulance(r);
        return rec ? (
          <span style={{ fontSize: 12.5 }}>
            <strong>{rec.amb.registrationNumber}</strong> ({rec.dist} km)
          </span>
        ) : (
          <span style={{ color: 'var(--muted)', fontSize: 12 }}>None available</span>
        );
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setDetailTarget(r)}
          >
            <Eye size={14} />
            View
          </Button>
          {r.status === 'PENDING' && (
            <Button
              variant="primary"
              size="sm"
              disabled={!availableAmbulances.length}
              onClick={() => openAssignModal(r)}
            >
              <Send size={13} />
              Assign
            </Button>
          )}
          {['PENDING', 'ASSIGNED'].includes(r.status) && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setCancelTarget(r)}
            >
              <XCircle size={13} />
              Cancel
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <AppLayout
      title="Emergency requests"
      subtitle="Every request, newest first. Assign the nearest suitable unit."
    >
      <div className="toolbar">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search request ID, patient, category, or address..."
        />
        <div className="filter-pills">
          {['ALL', 'PENDING', 'ASSIGNED', 'EN_ROUTE', 'COMPLETED', 'CANCELLED'].map(
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

      {/* View Details Modal */}
      <Modal
        isOpen={Boolean(detailTarget)}
        onClose={() => setDetailTarget(null)}
        title={`Request ${detailTarget?.id || ''}`}
        footer={
          <Button variant="secondary" onClick={() => setDetailTarget(null)}>
            Close
          </Button>
        }
      >
        {detailTarget && (
          <div style={{ display: 'grid', gap: 11, fontSize: 13.5 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <StatusBadge status={detailTarget.status} />
              <StatusBadge status={detailTarget.category} />
            </div>
            <div><strong>Patient:</strong> {detailTarget.patientName}</div>
            <div><strong>Contact:</strong> {detailTarget.contactNumber}</div>
            <div><strong>Pickup Address:</strong> {detailTarget.pickupAddress}</div>
            <div>
              <strong>Coordinates:</strong> {detailTarget.lat}, {detailTarget.lng}
            </div>
            <div><strong>Requested At:</strong> {formatDateTime(detailTarget.createdAt)}</div>
            <div>
              <strong>Emergency Notes:</strong>{' '}
              {detailTarget.details || 'No details provided.'}
            </div>
          </div>
        )}
      </Modal>

      {/* Assign Ambulance Modal */}
      <Modal
        isOpen={Boolean(assignTarget)}
        onClose={() => setAssignTarget(null)}
        title={`Assign an ambulance to ${assignTarget?.id || ''}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAssignTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!selectedAmbId}
              onClick={handleConfirmAssign}
            >
              Confirm Assignment
            </Button>
          </>
        }
      >
        {assignTarget && (
          <div style={{ display: 'grid', gap: 14 }}>
            <div
              style={{
                padding: 12,
                borderRadius: 10,
                background: 'var(--cream)',
                border: '1px solid var(--line)',
                fontSize: 13
              }}
            >
              <strong>{assignTarget.patientName}</strong> · {assignTarget.category}
              <div style={{ color: 'var(--muted)', marginTop: 3 }}>
                Pickup: {assignTarget.pickupAddress}
              </div>
            </div>

            <Input
              label="Select Available Ambulance (sorted by proximity)"
              as="select"
              value={selectedAmbId}
              onChange={(e) => setSelectedAmbId(e.target.value)}
            >
              {eligibleFor(assignTarget).map(({ amb, dist }) => (
                  <option key={amb.id} value={amb.id}>
                    {amb.registrationNumber} — {amb.category} ({dist} km away · Driver:{' '}
                    {amb.driverName})
                  </option>
                ))}
            </Input>
            {assignError && <div className="alert-banner danger">{assignError}</div>}

            <Input
              label="Receiving Hospital"
              as="select"
              value={selectedHospId}
              onChange={(e) => setSelectedHospId(e.target.value)}
            >
              {hospitals.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </Input>
          </div>
        )}
      </Modal>

      {/* Cancel Request Modal */}
      <Modal
        isOpen={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        title="Cancel this request?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelTarget(null)}>
              Keep Request
            </Button>
            <Button
              variant="primary"
              onClick={async () => {
                await cancelRequest(cancelTarget.id);
                setCancelTarget(null);
              }}
            >
              Confirm Cancel
            </Button>
          </>
        }
      >
        <p style={{ fontSize: 13.5, color: 'var(--muted)' }}>
          Cancel request <strong>{cancelTarget?.id}</strong> for{' '}
          <strong>{cancelTarget?.patientName}</strong>? Any assigned ambulance will be
          returned to AVAILABLE status.
        </p>
      </Modal>
    </AppLayout>
  );
}

export default Requests;
