import React, { useState } from 'react';
import { CheckCircle2, RotateCcw, Shield, UserCircle2 } from 'lucide-react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import StatusBadge from '../../components/common/StatusBadge';
import AppLayout from '../../components/layout/AppLayout';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/DataContext';

export function ProfilePage() {
  const { user, updateProfile, isMockMode } = useAuth();
  const { drivers, ambulances, resetDemoData } = useAppData();

  const driverRecord =
    user?.role === 'driver'
      ? drivers.find((d) => d.userId === user.id || d.id === user.driverId)
      : null;
  const assignedAmbulance = driverRecord
    ? ambulances.find((a) => a.id === driverRecord.assignedAmbulanceId)
    : null;

  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: user?.address || '',
    emergencyContact: user?.emergencyContact || '',
    bloodGroup: user?.bloodGroup || '',
    department: user?.department || ''
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSaved(false);
    if (!form.name.trim()) {
      setError('Full name is required.');
      return;
    }
    if (!form.phone.trim()) {
      setError('Phone number is required.');
      return;
    }
    updateProfile(form);
    setSaved(true);
  };

  return (
    <AppLayout
      title="Profile"
      subtitle="Your contact details and emergency information"
    >
      <div className="grid-main-aside">
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Personal Information</div>
              <div className="card-subtitle">
                Keep contact details accurate for emergency coordination
              </div>
            </div>
            <StatusBadge status="VERIFIED" label={user?.role?.toUpperCase()} />
          </div>

          <form className="card-body form-grid" onSubmit={handleSubmit}>
            <div className="form-grid-2">
              <Input
                label="Full Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              <Input
                label="Email Address"
                value={user?.email || ''}
                disabled
                hint="Account email cannot be modified here"
              />
            </div>

            <div className="form-grid-2">
              <Input
                label="Contact Number"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
              />
              {user?.role === 'patient' && (
                <Input
                  label="Blood Group"
                  as="select"
                  value={form.bloodGroup}
                  onChange={(e) =>
                    setForm({ ...form, bloodGroup: e.target.value })
                  }
                >
                  <option value="Not specified">Not specified</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </Input>
              )}
              {user?.role === 'admin' && (
                <Input
                  label="Dispatch Unit / Department"
                  value={form.department}
                  onChange={(e) =>
                    setForm({ ...form, department: e.target.value })
                  }
                />
              )}
              {user?.role === 'driver' && (
                <Input
                  label="Driver License Number"
                  value={driverRecord?.licenseNumber || user?.licenseNumber || '—'}
                  disabled
                />
              )}
            </div>

            {user?.role === 'patient' && (
              <div className="form-grid-2">
                <Input
                  label="Default Pickup Address"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
                <Input
                  label="Emergency Contact Number"
                  value={form.emergencyContact}
                  onChange={(e) =>
                    setForm({ ...form, emergencyContact: e.target.value })
                  }
                />
              </div>
            )}

            {error && <div className="alert-banner danger">{error}</div>}
            {saved && (
              <div className="alert-banner success">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle2 size={16} />
                  Profile updated successfully.
                </span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button type="submit" variant="navy">
                Save Profile Changes
              </Button>
            </div>
          </form>
        </div>

        <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <UserCircle2 size={18} />
                Role & Assignment Summary
              </div>
            </div>
            <div className="card-body" style={{ display: 'grid', gap: 12, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--muted)' }}>User ID</span>
                <strong>{user?.id}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--muted)' }}>Assigned Role</span>
                <strong style={{ textTransform: 'capitalize' }}>{user?.role}</strong>
              </div>
              {driverRecord && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--muted)' }}>Driver Status</span>
                    <StatusBadge status={driverRecord.availability} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--muted)' }}>Verification</span>
                    <StatusBadge status={driverRecord.verificationStatus} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--muted)' }}>Assigned Vehicle</span>
                    <strong>
                      {assignedAmbulance?.registrationNumber || 'Not assigned'}
                    </strong>
                  </div>
                </>
              )}
            </div>
          </div>

          {isMockMode && (
            <div className="card">
              <div className="card-header">
                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Shield size={17} />
                  Prototype Environment
                </div>
              </div>
              <div className="card-body" style={{ display: 'grid', gap: 12 }}>
                <p style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                  You are running in simulated development mode. Changes are persisted
                  locally in your browser.
                </p>
                <Button variant="secondary" onClick={resetDemoData}>
                  <RotateCcw size={15} />
                  Reset Simulated Demo Data
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

export default ProfilePage;
