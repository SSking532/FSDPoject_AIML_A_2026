import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import Button from '../../components/common/Button';
import { getDashboardRoute, useAuth } from '../../context/AuthContext';

export function UnauthorizedPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        background: 'var(--cream)'
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: 460,
          width: '100%',
          padding: 32,
          textAlign: 'center'
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: 'var(--red-soft)',
            color: 'var(--red)',
            display: 'grid',
            placeItems: 'center',
            margin: '0 auto 16px'
          }}
        >
          <ShieldAlert size={28} />
        </div>
        <h2 style={{ fontSize: 22, marginBottom: 8 }}>Access Restricted</h2>
        <p style={{ color: 'var(--muted)', fontSize: 13.5, marginBottom: 22 }}>
          Your current role ({user?.role || 'guest'}) does not have permission to
          access this route.
        </p>
        <Button
          variant="navy"
          onClick={() => navigate(getDashboardRoute(user?.role), { replace: true })}
        >
          Return to My Dashboard
        </Button>
      </div>
    </div>
  );
}

export default UnauthorizedPage;
