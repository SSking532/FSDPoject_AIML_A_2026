import React, { useMemo, useState } from 'react';
import { Edit2, Eye, Plus, UserCheck } from 'lucide-react';
import Button from '../../components/common/Button';
import DataTable from '../../components/common/DataTable';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import SearchBar from '../../components/common/SearchBar';
import StatusBadge from '../../components/common/StatusBadge';
import AppLayout from '../../components/layout/AppLayout';
import { useAppData } from '../../context/DataContext';

const EMPTY_DRIVER = {
  name: '',
  email: '',
  phone: '',
  licenseNumber: '',
  assignedAmbulanceId: '',
  availability: 'OFF_DUTY',
  verificationStatus: 'VERIFIED'
};

export function Drivers() {
  const { drivers, ambulances, addDriver, updateDriver } = useAppData();

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [viewDriver, setViewDriver] = useState(null);
  const [form, setForm] = useState(EMPTY_DRIVER);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return drivers;
    return drivers.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.email.toLowerCase().includes(q) ||
        d.licenseNumber.toLowerCase().includes(q) ||
        d.phone.toLowerCase().includes(q)
    );
  }, [drivers, search]);

  const getAmbReg = (ambId) => {
    if (!ambId) return 'Unassigned';
    return ambulances.find((a) => a.id === ambId)?.registrationNumber || ambId;
  };

  const openAdd = () => {
    setEditingDriver(null);
    setForm(EMPTY_DRIVER);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (drv) => {
    setEditingDriver(drv);
    setForm({
      name: drv.name,
      email: drv.email,
      phone: drv.phone,
      licenseNumber: drv.licenseNumber,
      assignedAmbulanceId: drv.assignedAmbulanceId || '',
      availability: drv.availability,
      verificationStatus: drv.verificationStatus
    });
    setError('');
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.email.trim() || !form.licenseNumber.trim()) {
      setError('Enter the driver’s name, email and licence number.');
      return;
    }

    setSaving(true);
    try {
      if (editingDriver) {
        await updateDriver(editingDriver.id, form);
      } else {
        await addDriver(form);
      }
      setModalOpen(false);
    } catch (err) {
      setError(err.message || 'Could not save this driver.');
    } finally {
      setSaving(false);
    }
  };

  const approve = async (driverId) => {
    setApproving(driverId);
    try {
      await updateDriver(driverId, { verificationStatus: 'VERIFIED' });
    } finally {
      setApproving('');
    }
  };

  const columns = [
    { key: 'name', header: 'Driver', sortable: true, render: (d) => <strong>{d.name}</strong> },
    { key: 'email', header: 'Email' },
    { key: 'phone', header: 'Phone' },
    { key: 'licenseNumber', header: 'Licence' },
    {
      key: 'assignedAmbulanceId',
      header: 'Ambulance',
      render: (d) => getAmbReg(d.assignedAmbulanceId)
    },
    {
      key: 'availability',
      header: 'Availability',
      sortable: true,
      render: (d) => <StatusBadge status={d.availability} />
    },
    {
      key: 'verificationStatus',
      header: 'Verification',
      sortable: true,
      render: (d) => <StatusBadge status={d.verificationStatus} />
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (d) => (
        <div style={{ display: 'flex', gap: 6 }}>
          {d.verificationStatus !== 'VERIFIED' && (
            <Button variant="success" size="sm" loading={approving === d.id} onClick={() => approve(d.id)}>
              <UserCheck size={13} />
              Approve
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={() => setViewDriver(d)}>
            <Eye size={13} />
            View
          </Button>
          <Button variant="ghost" size="sm" onClick={() => openEdit(d)}>
            <Edit2 size={13} />
            Edit
          </Button>
        </div>
      )
    }
  ];

  return (
    <AppLayout
      title="Drivers"
      subtitle="Driver accounts, licences and which ambulance each one drives"
    >
      <div className="toolbar">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by name, email, phone or licence"
        />
        <Button variant="primary" onClick={openAdd}>
          <Plus size={16} />
          Add driver
        </Button>
      </div>

      <div className="card">
        <DataTable columns={columns} data={filtered} />
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingDriver ? `Edit ${editingDriver.name}` : 'Add a driver'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="driver-form" variant="navy" loading={saving}>
              {editingDriver ? 'Save changes' : 'Create driver account'}
            </Button>
          </>
        }
      >
        <form id="driver-form" className="form-grid" onSubmit={handleSave}>
          <Input
            label="Full name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <div className="form-grid-2">
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            <Input
              label="Phone"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              required
            />
          </div>
          <div className="form-grid-2">
            <Input
              label="Licence number"
              value={form.licenseNumber}
              onChange={(e) =>
                setForm({ ...form, licenseNumber: e.target.value })
              }
              required
            />
            <Input
              label="Ambulance"
              as="select"
              value={form.assignedAmbulanceId}
              onChange={(e) =>
                setForm({ ...form, assignedAmbulanceId: e.target.value })
              }
            >
              <option value="">Unassigned</option>
              {ambulances.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.registrationNumber} ({a.category})
                </option>
              ))}
            </Input>
          </div>
          <div className="form-grid-2">
            <Input
              label="Availability"
              as="select"
              value={form.availability}
              onChange={(e) => setForm({ ...form, availability: e.target.value })}
            >
              <option value="ONLINE">On duty</option>
              <option value="OFF_DUTY">Off duty</option>
            </Input>
            <Input
              label="Verification"
              as="select"
              value={form.verificationStatus}
              onChange={(e) =>
                setForm({ ...form, verificationStatus: e.target.value })
              }
            >
              <option value="VERIFIED">Approved</option>
              <option value="PENDING_APPROVAL">Waiting for approval</option>
            </Input>
          </div>
          {error && <div className="alert-banner danger">{error}</div>}
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(viewDriver)}
        onClose={() => setViewDriver(null)}
        title={`${viewDriver?.name || ''}`}
        footer={
          <Button variant="secondary" onClick={() => setViewDriver(null)}>
            Close
          </Button>
        }
      >
        {viewDriver && (
          <div style={{ display: 'grid', gap: 10, fontSize: 13.5 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <StatusBadge status={viewDriver.availability} />
              <StatusBadge status={viewDriver.verificationStatus} />
            </div>
            <div><strong>Driver ID:</strong> {viewDriver.id}</div>
            <div><strong>Email:</strong> {viewDriver.email}</div>
            <div><strong>Phone:</strong> {viewDriver.phone}</div>
            <div><strong>Licence:</strong> {viewDriver.licenseNumber}</div>
            <div>
              <strong>Ambulance:</strong>{' '}
              {getAmbReg(viewDriver.assignedAmbulanceId)}
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}

export default Drivers;