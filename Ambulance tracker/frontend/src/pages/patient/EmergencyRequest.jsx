import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Crosshair,
  HeartPulse,
  Loader2,
  MapPin,
  PhoneCall
} from 'lucide-react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import AppLayout from '../../components/layout/AppLayout';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/DataContext';

const CATEGORIES = [
  {
    value: 'Cardiac',
    label: 'Cardiac Emergency',
    desc: 'Chest pain, arrhythmia, suspected heart event'
  },
  {
    value: 'Trauma',
    label: 'Trauma / Injury',
    desc: 'Road accident, severe bleeding, fractures'
  },
  {
    value: 'Respiratory',
    label: 'Respiratory Distress',
    desc: 'Acute asthma, breathing difficulty, oxygen need'
  },
  {
    value: 'Stroke',
    label: 'Stroke',
    desc: 'Face drooping, arm weakness, slurred speech'
  },
  {
    value: 'Maternity',
    label: 'Maternity',
    desc: 'Labour, pregnancy complications'
  },
  {
    value: 'General',
    label: 'General Medical',
    desc: 'Urgent hospital transfer or clinical support'
  }
];

export function EmergencyRequest() {
  const { user } = useAuth();
  const { createRequest } = useAppData();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    category: 'Cardiac',
    pickupAddress: user?.address && user.address !== 'Address not yet set' ? user.address : '',
    lat: '28.6139',
    lng: '77.2090',
    contactNumber: user?.phone || '',
    details: ''
  });

  const [locating, setLocating] = useState(false);
  const [locationNotice, setLocationNotice] = useState('');
  const [locationError, setLocationError] = useState('');
  const [validationError, setValidationError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdRequest, setCreatedRequest] = useState(null);

  const handleDetectLocation = () => {
    setLocationError('');
    setLocationNotice('');

    if (!navigator.geolocation) {
      setLocationError(
        'Browser geolocation is unavailable. Enter latitude and longitude manually below.'
      );
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(5);
        const lng = pos.coords.longitude.toFixed(5);
        setForm((prev) => ({
          ...prev,
          lat,
          lng,
          pickupAddress:
            prev.pickupAddress || `GPS Pin (${lat}, ${lng})`
        }));
        setLocationNotice(
          `GPS coordinates captured (${lat}, ${lng}). Verify your street address above.`
        );
        setLocating(false);
      },
      () => {
        setLocationError(
          'Location permission was denied or timed out. You can still enter your pickup address and coordinates manually.'
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleReviewSubmit = (e) => {
    e.preventDefault();
    setValidationError('');

    if (!form.pickupAddress.trim()) {
      setValidationError('Pickup address is required.');
      return;
    }
    const latNum = Number(form.lat);
    const lngNum = Number(form.lng);
    if (Number.isNaN(latNum) || latNum < -90 || latNum > 90) {
      setValidationError('Please provide a valid latitude between -90 and 90.');
      return;
    }
    if (Number.isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
      setValidationError('Please provide a valid longitude between -180 and 180.');
      return;
    }
    if (form.contactNumber.trim().length < 7) {
      setValidationError('Please provide a valid contact phone number.');
      return;
    }

    setConfirmOpen(true);
  };

  const handleConfirmDispatch = async () => {
    setSubmitting(true);
    try {
      const created = await createRequest({
        patientId: user?.id,
        patientName: user?.name || 'Patient',
        category: form.category,
        pickupAddress: form.pickupAddress.trim(),
        lat: Number(form.lat),
        lng: Number(form.lng),
        contactNumber: form.contactNumber.trim(),
        details: form.details.trim()
      });
      setConfirmOpen(false);
      setCreatedRequest(created);
    } catch (err) {
      setValidationError(err.message || 'Failed to submit emergency request.');
      setConfirmOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (createdRequest) {
    return (
      <AppLayout
        title="Request sent"
        subtitle="Dispatch has your request and is assigning an ambulance"
      >
        <div className="card" style={{ maxWidth: 620, margin: '0 auto' }}>
          <div className="card-body" style={{ textAlign: 'center', padding: 36 }}>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 16,
                background: 'var(--green-soft)',
                color: 'var(--green)',
                display: 'grid',
                placeItems: 'center',
                margin: '0 auto 16px'
              }}
            >
              <CheckCircle2 size={30} />
            </div>
            <h2 style={{ fontSize: 22, marginBottom: 8 }}>
              Request {createdRequest.id} Confirmed
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: 13.5, marginBottom: 22 }}>
              Dispatch administrators have received your {createdRequest.category}{' '}
              request for <strong>{createdRequest.pickupAddress}</strong>.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              <Button
                variant="primary"
                onClick={() => navigate(`/patient/tracking/${createdRequest.id}`)}
              >
                Track Request Status
              </Button>
              <Button
                variant="secondary"
                onClick={() => navigate('/patient/dashboard')}
              >
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Request an ambulance"
      subtitle="Tell us what happened and where to come. It takes under a minute."
    >
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <form className="card" onSubmit={handleReviewSubmit} noValidate>
          <div className="card-header">
            <div>
              <div className="card-title">Emergency Dispatch Details</div>
              <div className="card-subtitle">
                Accurate pickup coordinates help allocate the nearest available unit
              </div>
            </div>
          </div>

          <div className="card-body form-grid">
            {/* Emergency Category Selector */}
            <div className="field-group">
              <label className="field-label">Emergency Category</label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
                  gap: 10
                }}
              >
                {CATEGORIES.map((cat) => {
                  const selected = form.category === cat.value;
                  return (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setForm({ ...form, category: cat.value })}
                      style={{
                        textAlign: 'left',
                        padding: '12px 14px',
                        borderRadius: 12,
                        border: selected
                          ? '2px solid var(--red)'
                          : '1px solid var(--line)',
                        background: selected ? '#fff6f7' : 'var(--white)',
                        transition: 'all 0.15s'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 7,
                          fontWeight: 800,
                          fontSize: 13.5,
                          color: selected ? 'var(--red-dark)' : 'var(--ink)'
                        }}
                      >
                        <HeartPulse size={15} />
                        {cat.label}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4 }}>
                        {cat.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pickup Address & GPS Button */}
            <div className="field-group">
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8
                }}
              >
                <label htmlFor="pickupAddress" className="field-label">
                  Pickup Address
                </label>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleDetectLocation}
                  disabled={locating}
                >
                  {locating ? (
                    <Loader2 size={14} className="spin" />
                  ) : (
                    <Crosshair size={14} />
                  )}
                  {locating ? 'Detecting GPS...' : 'Detect GPS Location'}
                </Button>
              </div>
              <input
                id="pickupAddress"
                className="field-input"
                placeholder="House / Street / Landmark / Area"
                value={form.pickupAddress}
                onChange={(e) =>
                  setForm({ ...form, pickupAddress: e.target.value })
                }
                required
              />
            </div>

            {locationNotice && (
              <div className="alert-banner success">{locationNotice}</div>
            )}
            {locationError && (
              <div className="alert-banner warning">{locationError}</div>
            )}

            {/* Coordinates (Manual fallback or GPS populated) */}
            <div className="form-grid-2">
              <Input
                label="Latitude (GPS / Manual)"
                type="number"
                step="any"
                value={form.lat}
                onChange={(e) => setForm({ ...form, lat: e.target.value })}
                hint="Auto-filled via GPS or enter manually"
              />
              <Input
                label="Longitude (GPS / Manual)"
                type="number"
                step="any"
                value={form.lng}
                onChange={(e) => setForm({ ...form, lng: e.target.value })}
                hint="Auto-filled via GPS or enter manually"
              />
            </div>

            <Input
              label="Contact Phone Number"
              type="tel"
              placeholder="+91 98110 24510"
              value={form.contactNumber}
              onChange={(e) =>
                setForm({ ...form, contactNumber: e.target.value })
              }
              required
            />

            <Input
              label="Additional Emergency Details"
              as="textarea"
              placeholder="Describe symptoms, patient condition, gate access instructions, or floor number..."
              value={form.details}
              onChange={(e) => setForm({ ...form, details: e.target.value })}
            />

            {validationError && (
              <div className="alert-banner danger" role="alert">
                {validationError}
              </div>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
                paddingTop: 6
              }}
            >
              <span style={{ fontSize: 12, color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={14} />
                Coordinates: {form.lat || '—'}, {form.lng || '—'}
              </span>
              <div style={{ display: 'flex', gap: 10 }}>
                <Button
                  variant="secondary"
                  onClick={() => navigate('/patient/dashboard')}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="lg">
                  <PhoneCall size={17} />
                  Submit Emergency Request
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Confirmation Dialog */}
      <Modal
        isOpen={confirmOpen}
        onClose={() => !submitting && setConfirmOpen(false)}
        title="Send this request?"
        footer={
          <>
            <Button
              variant="secondary"
              disabled={submitting}
              onClick={() => setConfirmOpen(false)}
            >
              Review Details
            </Button>
            <Button
              variant="primary"
              loading={submitting}
              onClick={handleConfirmDispatch}
            >
              Confirm & Dispatch
            </Button>
          </>
        }
      >
        <div style={{ display: 'grid', gap: 12, fontSize: 13.5 }}>
          <p style={{ color: 'var(--muted)' }}>
            Please verify the pickup details below before sending this request to
            the dispatch center:
          </p>
          <div
            style={{
              padding: 14,
              borderRadius: 10,
              background: 'var(--cream)',
              border: '1px solid var(--line)',
              display: 'grid',
              gap: 8
            }}
          >
            <div>
              <strong>Category:</strong> {form.category}
            </div>
            <div>
              <strong>Pickup Address:</strong> {form.pickupAddress}
            </div>
            <div>
              <strong>Coordinates:</strong> {form.lat}, {form.lng}
            </div>
            <div>
              <strong>Contact Number:</strong> {form.contactNumber}
            </div>
            {form.details && (
              <div>
                <strong>Notes:</strong> {form.details}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}

export default EmergencyRequest;
