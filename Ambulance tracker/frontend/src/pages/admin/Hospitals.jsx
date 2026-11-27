import React, { useMemo, useState } from 'react';
import { Building2, Edit2, MapPin, Phone, Plus, Trash2 } from 'lucide-react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import SearchBar from '../../components/common/SearchBar';
import AppLayout from '../../components/layout/AppLayout';
import { useAppData } from '../../context/DataContext';

const EMPTY_HOSPITAL = {
  name: '',
  address: '',
  contactNumber: '',
  lat: '28.6139',
  lng: '77.2090'
};

export function Hospitals() {
  const { hospitals, addHospital, updateHospital, deleteHospital } = useAppData();

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_HOSPITAL);
  const [error, setError] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return hospitals;
    return hospitals.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        h.address.toLowerCase().includes(q) ||
        h.contactNumber.toLowerCase().includes(q)
    );
  }, [hospitals, search]);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_HOSPITAL);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (h) => {
    setEditing(h);
    setForm({
      name: h.name,
      address: h.address,
      contactNumber: h.contactNumber,
      lat: String(h.lat),
      lng: String(h.lng)
    });
    setError('');
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.address.trim() || !form.contactNumber.trim()) {
      setError('Hospital name, address, and contact number are required.');
      return;
    }
    if (editing) {
      await updateHospital(editing.id, form);
    } else {
      await addHospital(form);
    }
    setModalOpen(false);
  };

  return (
    <AppLayout
      title="Hospitals"
      subtitle="Receiving hospitals that ambulances can be routed to"
    >
      <div className="toolbar">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search hospitals by name, address, or phone..."
        />
        <Button variant="primary" onClick={openAdd}>
          <Plus size={16} />
          Add Hospital
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">No hospitals match your search.</div>
        </div>
      ) : (
        <div className="grid-2">
          {filtered.map((hosp) => (
            <div key={hosp.id} className="card">
              <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="kpi-icon green" style={{ width: 36, height: 36 }}>
                    <Building2 size={18} />
                  </div>
                  <div>
                    <div className="card-title">{hosp.name}</div>
                    <div className="card-subtitle">{hosp.id}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(hosp)}>
                    <Edit2 size={14} />
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setDeleteTarget(hosp)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
              <div className="card-body" style={{ display: 'grid', gap: 8, fontSize: 13 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <MapPin size={15} style={{ color: 'var(--red)', marginTop: 2 }} />
                  <span>{hosp.address}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Phone size={15} style={{ color: 'var(--navy)' }} />
                  <span>{hosp.contactNumber}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  Coordinates: {hosp.lat}, {hosp.lng}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit Hospital · ${editing.name}` : 'Add Receiving Hospital'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="hospital-form" variant="navy">
              {editing ? 'Save Changes' : 'Add Hospital'}
            </Button>
          </>
        }
      >
        <form id="hospital-form" className="form-grid" onSubmit={handleSave}>
          <Input
            label="Hospital Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Input
            label="Street Address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            required
          />
          <Input
            label="Emergency Contact Number"
            value={form.contactNumber}
            onChange={(e) =>
              setForm({ ...form, contactNumber: e.target.value })
            }
            required
          />
          <div className="form-grid-2">
            <Input
              label="Latitude"
              type="number"
              step="any"
              value={form.lat}
              onChange={(e) => setForm({ ...form, lat: e.target.value })}
              required
            />
            <Input
              label="Longitude"
              type="number"
              step="any"
              value={form.lng}
              onChange={(e) => setForm({ ...form, lng: e.target.value })}
              required
            />
          </div>
          {error && <div className="alert-banner danger">{error}</div>}
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Remove hospital?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={async () => {
                await deleteHospital(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Confirm Delete
            </Button>
          </>
        }
      >
        <p style={{ fontSize: 13.5, color: 'var(--muted)' }}>
          Remove <strong>{deleteTarget?.name}</strong> from the hospital directory?
        </p>
      </Modal>
    </AppLayout>
  );
}

export default Hospitals;
