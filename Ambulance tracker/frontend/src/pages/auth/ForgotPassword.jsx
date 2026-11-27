import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { authService } from '../../services/authService';
import AuthLayout from './AuthLayout';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid registered email address.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await authService.requestPasswordReset(email.trim());
      setSuccessMessage(
        res.message ||
          `If an account exists for ${email.trim()}, reset instructions have been sent.`
      );
    } catch (err) {
      setError(err.message || 'Could not process recovery request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Reset password"
      subtitle="Enter your account email and we will send recovery instructions."
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="auth-field">
          <label htmlFor="reset-email">Email address</label>
          <input
            id="reset-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        {error && (
          <div className="auth-message error" role="alert">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="auth-message success" role="status">
            {successMessage}
          </div>
        )}

        <button className="submit" type="submit" disabled={submitting}>
          {submitting && <Loader2 size={16} className="spin" />}
          {submitting ? 'Sending instructions...' : 'Send recovery link'}
        </button>

        <div style={{ textAlign: 'center', marginTop: 4 }}>
          <Link
            to="/login"
            className="auth-link"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <ArrowLeft size={14} />
            Back to Sign in
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}

export default ForgotPassword;
