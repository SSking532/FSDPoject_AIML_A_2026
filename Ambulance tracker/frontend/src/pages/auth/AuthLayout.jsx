import React from 'react';
import { Lock } from 'lucide-react';
import BrandLogo from '../../components/common/BrandLogo';

export function AuthLayout({ title, subtitle, children }) {
  return (
    <main className="auth-page">
      <section className="hero" aria-label="About Smart Ambulance">
        <div className="hero-livery" aria-hidden="true" />

        <div className="brand">
          <BrandLogo />
        </div>

        <div className="hero-content">
          <h1>
            Help,
            <br />
            on the way.
          </h1>
          <p className="hero-copy">
            Patients request an ambulance in seconds. Dispatch assigns the nearest
            suitable unit. Everyone watches it arrive, live.
          </p>

          <div className="dispatch-ticket" aria-hidden="true">
            <div className="ticket-row">
              <span className="ticket-id">REQ-2041</span>
              <span className="ticket-pill">En route</span>
            </div>
            <div className="ticket-main">
              <div>
                <span className="ticket-label">Unit</span>
                <strong>DL-1A-4401</strong>
                <small>Advanced Life Support</small>
              </div>
              <div className="ticket-eta">
                <span className="ticket-label">Arriving in</span>
                <strong>4 min</strong>
              </div>
            </div>
            <div className="ticket-track">
              <span className="done" />
              <span className="done" />
              <span className="now" />
              <span />
              <span />
            </div>
          </div>
        </div>

        <ul className="hero-roles">
          <li>
            <strong>Patients</strong>
            <span>Request and track</span>
          </li>
          <li>
            <strong>Drivers</strong>
            <span>Accept and navigate</span>
          </li>
          <li>
            <strong>Dispatch</strong>
            <span>Assign and monitor</span>
          </li>
        </ul>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-heading">
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>

          {children}

          <div className="secure-note">
            <Lock size={13} aria-hidden="true" />
            <span>Signed-in sessions use encrypted, expiring tokens.</span>
          </div>
        </div>
      </section>
    </main>
  );
}

export default AuthLayout;
