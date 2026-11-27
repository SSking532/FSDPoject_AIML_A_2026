import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Ambulance, HeartPulse, Loader2, LocateFixed, RadioTower } from 'lucide-react';
import { getDashboardRoute, useAuth } from '../../context/AuthContext';
import AuthLayout from './AuthLayout';

const ROLES = [
  {
    value: 'patient',
    label: 'Patient',
    hint: 'Request an ambulance',
    icon: HeartPulse,
    note: 'You can request an ambulance as soon as your account is created.'
  },
  {
    value: 'driver',
    label: 'Driver',
    hint: 'Drive and respond',
    icon: Ambulance,
    note: 'A dispatcher checks your licence before you can receive assignments. You can sign in and set up straight away.'
  },
  {
    value: 'admin',
    label: 'Dispatcher',
    hint: 'Run the control room',
    icon: RadioTower,
    note: 'Dispatcher accounts need the access code from your organisation.'
  }
];

const AMBULANCE_TYPES = [
  'Basic Life Support (BLS)',
  'Advanced Life Support (ALS)',
  'Cardiac Care Unit (CCU)'
];
const TYPE_LABELS = {
  'Basic Life Support (BLS)': 'Basic (BLS)',
  'Advanced Life Support (ALS)': 'Advanced (ALS)',
  'Cardiac Care Unit (CCU)': 'Cardiac (CCU)'
};

const EMPTY = {
  name: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  licenseNumber: '',
  vehicleNumber: '',
  ambulanceType: AMBULANCE_TYPES[1],
  lat: '',
  lng: '',
  adminCode: '',
  department: ''
};

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState('patient');
  const [form, setForm] = useState(EMPTY);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');

  const roleInfo = ROLES.find((r) => r.value === role);

  const set = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setError('');
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError('This browser cannot share location. You can skip this step.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((prev) => ({
          ...prev,
          lat: pos.coords.latitude.toFixed(5),
          lng: pos.coords.longitude.toFixed(5)
        }));
        setLocating(false);
      },
      () => {
        setError('Location permission was denied. You can skip this step.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const validate = () => {
    if (form.name.trim().length < 2) return 'Enter your full name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return 'Enter a valid email address.';
    if (form.phone.replace(/\D/g, '').length < 7) return 'Enter a phone number we can call.';
    if (role === 'driver' && form.licenseNumber.trim().length < 5) return 'Enter your driving licence number.';
    if (role === 'admin' && !form.adminCode.trim()) return 'Enter the dispatcher access code.';
    if (form.password.length < 6) return 'Use at least 6 characters for your password.';
    if (form.password !== form.confirmPassword) return 'The two passwords do not match.';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        role
      };
      if (role === 'driver') {
        Object.assign(payload, {
          licenseNumber: form.licenseNumber.trim(),
          vehicleNumber: form.vehicleNumber.trim() || null,
          ambulanceType: form.vehicleNumber.trim() ? form.ambulanceType : null,
          lat: form.lat ? Number(form.lat) : null,
          lng: form.lng ? Number(form.lng) : null
        });
      }
      if (role === 'admin') {
        Object.assign(payload, {
          adminCode: form.adminCode.trim(),
          department: form.department.trim() || null
        });
      }
      const user = await register(payload);
      navigate(getDashboardRoute(user.role), { replace: true });
    } catch (err) {
      setError(err.message || 'Could not create your account.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Create your account" subtitle="Choose how you’ll use Smart Ambulance.">
      <div className="tabs" role="tablist" aria-label="Authentication options">
        <Link className="tab" to="/login" role="tab" aria-selected="false">
          Sign in
        </Link>
        <button className="tab active" type="button" role="tab" aria-selected="true">
          Create account
        </button>
      </div>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <fieldset className="role-picker">
          <legend>I am a</legend>
          {ROLES.map(({ value, label, hint, icon: Icon }) => (
            <label key={value} className={`role-card role-${value} ${role === value ? 'active' : ''}`}>
              <input
                type="radio"
                name="role"
                value={value}
                checked={role === value}
                onChange={() => {
                  setRole(value);
                  setError('');
                }}
              />
              <span className="role-card-icon">
                <Icon size={20} />
              </span>
              <strong>{label}</strong>
              <span>{hint}</span>
            </label>
          ))}
        </fieldset>

        <p className={`role-note role-${role}`}>{roleInfo.note}</p>

        <div className="auth-field">
          <label htmlFor="name">Full name</label>
          <input id="name" name="name" autoComplete="name" placeholder="As on your ID" value={form.name} onChange={set('name')} />
        </div>

        <div className="auth-grid-2">
          <div className="auth-field">
            <label htmlFor="reg-email">Email</label>
            <input id="reg-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={set('email')} />
          </div>
          <div className="auth-field">
            <label htmlFor="phone">Phone</label>
            <input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="+91 98110 00000" value={form.phone} onChange={set('phone')} />
          </div>
        </div>

        {role === 'driver' && (
          <div className="role-section">
            <div className="auth-field">
              <label htmlFor="licence">Driving licence number</label>
              <input id="licence" placeholder="DL-04-2019004821" value={form.licenseNumber} onChange={set('licenseNumber')} />
            </div>
            <div className="auth-grid-2">
              <div className="auth-field">
                <label htmlFor="vehicle">
                  Ambulance number <span className="optional">optional</span>
                </label>
                <input id="vehicle" placeholder="DL-1A-4401" value={form.vehicleNumber} onChange={set('vehicleNumber')} />
              </div>
              <div className="auth-field">
                <label htmlFor="amb-type">Ambulance type</label>
                <select id="amb-type" value={form.ambulanceType} onChange={set('ambulanceType')} disabled={!form.vehicleNumber.trim()}>
                  {AMBULANCE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {form.vehicleNumber.trim() && (
              <button type="button" className="locate-btn" onClick={useMyLocation} disabled={locating}>
                {locating ? <Loader2 size={15} className="spin" /> : <LocateFixed size={15} />}
                {form.lat ? `Base location set (${form.lat}, ${form.lng})` : 'Use my current location as the ambulance base'}
              </button>
            )}
          </div>
        )}

        {role === 'admin' && (
          <div className="role-section">
            <div className="auth-grid-2">
              <div className="auth-field">
                <label htmlFor="code">Dispatcher access code</label>
                <input id="code" placeholder="From your organisation" value={form.adminCode} onChange={set('adminCode')} autoComplete="off" />
              </div>
              <div className="auth-field">
                <label htmlFor="dept">
                  Control room <span className="optional">optional</span>
                </label>
                <input id="dept" placeholder="Central Dispatch, Delhi" value={form.department} onChange={set('department')} />
              </div>
            </div>
          </div>
        )}

        <div className="auth-grid-2">
          <div className="auth-field">
            <label htmlFor="reg-password">Password</label>
            <div className="input-wrap">
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="At least 6 characters"
                value={form.password}
                onChange={set('password')}
              />
              <button type="button" className="toggle-password" onClick={() => setShowPassword((v) => !v)}>
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          <div className="auth-field">
            <label htmlFor="confirm">Confirm password</label>
            <input
              id="confirm"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Type it again"
              value={form.confirmPassword}
              onChange={set('confirmPassword')}
            />
          </div>
        </div>

        {error && (
          <div className="auth-message error" role="alert">
            {error}
          </div>
        )}

        <button type="submit" className="submit" disabled={submitting}>
          {submitting && <Loader2 size={18} className="spin" />}
          {submitting ? 'Creating account…' : `Create ${roleInfo.label.toLowerCase()} account`}
        </button>
      </form>
    </AuthLayout>
  );
}

export default Register;