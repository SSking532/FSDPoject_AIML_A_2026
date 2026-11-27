import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { getDashboardRoute, useAuth } from '../../context/AuthContext';
import AuthLayout from './AuthLayout';

export function Login() {
  const { login, loginWithDemoRole, isMockMode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setSubmitting(true);
    try {
      const signedInUser = await login({ email, password, remember });
      const redirectTo =
        location.state?.from?.pathname || getDashboardRoute(signedInUser.role);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message || 'Unable to sign in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoLogin = async (role) => {
    setError('');
    setSubmitting(true);
    try {
      const demoUser = await loginWithDemoRole(role);
      navigate(getDashboardRoute(demoUser.role), { replace: true });
    } catch (err) {
      setError(err.message || 'Demo sign-in failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to request, drive or dispatch."
    >
      <div className="tabs" role="tablist" aria-label="Authentication options">
        <button
          className="tab active"
          type="button"
          role="tab"
          aria-selected="true"
        >
          Sign in
        </button>
        <Link
          className="tab"
          to="/register"
          role="tab"
          aria-selected="false"
        >
          Create account
        </Link>
      </div>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="auth-field">
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="auth-field">
          <label htmlFor="password">Password</label>
          <div className="input-wrap">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              className="toggle-password"
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <div className="form-row">
          <label className="check">
            <input
              type="checkbox"
              name="remember"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            Remember me
          </label>
          <Link className="auth-link" to="/forgot-password">
            Forgot password?
          </Link>
        </div>

        {error && (
          <div className="auth-message error" role="alert">
            {error}
          </div>
        )}

        <button className="submit" type="submit" disabled={submitting}>
          {submitting && <Loader2 size={16} className="spin" />}
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <div className="demo-access">
        <div className="demo-access-header">
          <strong>Try a demo account</strong>
          <span>{isMockMode ? 'Offline demo data' : 'Password: demo1234'}</span>
        </div>
        <div className="demo-role-grid">
          {[
            ['patient', 'Patient', 'Aarav Sharma'],
            ['driver', 'Driver', 'Vikram Singh'],
            ['admin', 'Dispatcher', 'Dr. Meera Nair']
          ].map(([role, label, name]) => (
            <button
              key={role}
              type="button"
              className="demo-role-btn"
              disabled={submitting}
              onClick={() => handleDemoLogin(role)}
            >
              <strong>{label}</strong>
              <span>{name}</span>
            </button>
          ))}
        </div>
      </div>
    </AuthLayout>
  );
}

export default Login;
