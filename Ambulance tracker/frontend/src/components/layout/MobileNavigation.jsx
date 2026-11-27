import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROLE_NAV_CONFIG } from './navigationConfig';

export function MobileNavigation() {
  const { user } = useAuth();
  const items = (ROLE_NAV_CONFIG[user?.role] || []).slice(0, 4);

  if (!items.length) return null;

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile quick navigation">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `mobile-bottom-link ${isActive ? 'active' : ''}`
            }
          >
            <Icon size={19} />
            <span>{item.short || item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

export default MobileNavigation;
