import React, { useMemo, useState } from 'react';
import { Edit2, Eye, Plus } from 'lucide-react';
import Button from '../../components/common/Button';
import DataTable from '../../components/common/DataTable';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import SearchBar from '../../components/common/SearchBar';
import StatusBadge from '../../components/common/StatusBadge';
import AppLayout from '../../components/layout/AppLayout';
import { useAppData } from '../../context/DataContext';
import { formatDateTime } from '../../utils/geo';

const EMPTY_FORM = {
  registrationNumber: '',
  category: 'Basic Life Support (BLS)',
  driverId: '',
  status: 'AVAILABLE',
  currentLocation: '',
  lat: '28.6139',
  lng: '77.2090'
};

export function Ambulances() {
  const { ambulances, drivers, addAmbulance, updateAmbulance } = useAppData();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAmb, setEditingAmb] = useState(null);
  const [viewAmb, setViewAmb] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ambulances.filter((a) => {
      if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;
      if (!q) return true;
      return (
        a.registrationNumber.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        (a.driverName || '').toLowerCase().includes(q) ||
        (a.currentLocation || '').toLowerCase().includes(q)
      );
    });
  }, [ambulances, search, statusFilter]);

  const openAdd = () => {
    setEditingAmb(null);
    setForm(EMPTY_FORM);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (amb) => {
    setEditingAmb(amb);
    setForm({
      registrationNumber: amb.registrationNumber,
      category: amb.category,
      driverId: amb.driverId || '',
      status: amb.status,
      currentLocation: amb.currentLocation || '',
      lat: String(amb.lat ?? 28.6139),
      lng: String(amb.lng ?? 77.209)
    });
    setError('');
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.registrationNumber.trim()) {
      setError('Registration number is required.');
      return;
    }

    const payload = {
      ...form,
      lat: Number(form.lat) || 28.6139,
      lng: Number(form.lng) || 77.209
    };

    if (editingAmb) {
      await updateAmbulance(editingAmb.id, payload);
    } else {
      await addAmbulance(payload);
    }
    setModalOpen(false);
  };

  const columns = [
    {
      key: 'registrationNumber',
      header: 'Registration No.',
      sortable: true,
      render: (a) => <strong>{a.registrationNumber}</strong>
    },
    { key: 'category', header: 'Category', sortable: true },
    { key: 'driverName', header: 'Assigned Driver', sortable: true },
    {
      key: 'status',
      header: 'Availability',
      sortable: true,
      render: (a) => <StatusBadge status={a.status} />
    },
    { key: 'currentLocation', header: 'Current Location' },
    {
      key: 'lastUpdated',
      header: 'Last Updated',
      sortable: true,
      render: (a) => formatDateTime(a.lastUpdated)
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (a) => (
        <div style={{ display: 'flex', gap: 6 }}>
          <Button variant="secondary" size="sm" onClick={() => setViewAmb(a)}>
            <Eye size={13} />
            Details
          </Button>
          <Button variant="ghost" size="sm" onClick={() => openEdit(a)}>
            <Edit2 size={13} />
            Edit
          </Button>
        </div>
      )
    }
  ];

  return (
    <AppLayout
      title="Ambulances"
      subtitle="Register vehicles and keep their status up to date"
    >
      <div className="toolbar">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search registration, category, driver, location..."
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <div className="filter-pills">
            {['ALL', 'AVAILABLE', 'ASSIGNED', 'EN_ROUTE', 'ON_TRIP', 'OUT_OF_SERVICE'].map((st) => (
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
          <Button variant="primary" onClick={openAdd}>
            <Plus size={16} />
            Add Ambulance
          </Button>
        </div>
      </div>

      <div className="card">
        <DataTable columns={columns} data={filtered} />
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          editingAmb
            ? `Edit Ambulance · ${editingAmb.registrationNumber}`
            : 'Add New Ambulance'
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="ambulance-form" variant="navy">
              {editingAmb ? 'Save Changes' : 'Add Ambulance'}
            </Button>
          </>
        }
      >
        <form id="ambulance-form" className="form-grid" onSubmit={handleSave}>
          <Input
            label="Registration Number"
            placeholder="e.g., DL-1A-5521"
            value={form.registrationNumber}
            onChange={(e) =>
              setForm({ ...form, registrationNumber: e.target.value })
            }
            required
          />
          <div className="form-grid-2">
            <Input
              label="Ambulance Category"
              as="select"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              <option value="Basic Life Support (BLS)">
                Basic Life Support (BLS)
              </option>
              <option value="Advanced Life Support (ALS)">
                Advanced Life Support (ALS)
              </option>
              <option value="Cardiac Care Unit (CCU)">
                Cardiac Care Unit (CCU)
              </option>
            </Input>
            <Input
              label="Availability Status"
              as="select"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="AVAILABLE">AVAILABLE</option>
              <option value="ASSIGNED">ASSIGNED</option>
              <option value="ON_TRIP">ON_TRIP</option>
              <option value="OUT_OF_SERVICE">Out of service</option>
            </Input>
          </div>
          <Input
            label="Assigned Driver"
            as="select"
            value={form.driverId}
            onChange={(e) => setForm({ ...form, driverId: e.target.value })}
          >
            <option value="">Unassigned</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.licenseNumber})
              </option>
            ))}
          </Input>
          <Input
            label="Current Base / Location"
            placeholder="e.g., Central Fleet Hub"
            value={form.currentLocation}
            onChange={(e) =>
              setForm({ ...form, currentLocation: e.target.value })
            }
          />
          <div className="form-grid-2">
            <Input
              label="Latitude"
              type="number"
              step="any"
              value={form.lat}
              onChange={(e) => setForm({ ...form, lat: e.target.value })}
            />
            <Input
              label="Longitude"
              type="number"
              step="any"
              value={form.lng}
              onChange={(e) => setForm({ ...form, lng: e.target.value })}
            />
          </div>
          {error && <div className="alert-banner danger">{error}</div>}
        </form>
      </Modal>

      {/* Details Modal */}
      <Modal
        isOpen={Boolean(viewAmb)}
        onClose={() => setViewAmb(null)}
        title={`${viewAmb?.registrationNumber || ''}`}
        footer={
          <Button variant="secondary" onClick={() => setViewAmb(null)}>
            Close
          </Button>
        }
      >
        {viewAmb && (
          <div style={{ display: 'grid', gap: 10, fontSize: 13.5 }}>
            <div><StatusBadge status={viewAmb.status} /></div>
            <div><strong>ID:</strong> {viewAmb.id}</div>
            <div><strong>Category:</strong> {viewAmb.category}</div>
            <div><strong>Assigned Driver:</strong> {viewAmb.driverName}</div>
            <div><strong>Location:</strong> {viewAmb.currentLocation}</div>
            <div>
              <strong>Coordinates:</strong> {viewAmb.lat}, {viewAmb.lng}
            </div>
            <div><strong>Last Updated:</strong> {formatDateTime(viewAmb.lastUpdated)}</div>
            <div style={{ paddingTop: 10, borderTop: '1px solid var(--line)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  const next =
                    viewAmb.status === 'AVAILABLE' ? 'OUT_OF_SERVICE' : 'AVAILABLE';
                  await updateAmbulance(viewAmb.id, { status: next });
                  setViewAmb({ ...viewAmb, status: next });
                }}
              >
                Toggle available / out of service
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}

export default Ambulances;
