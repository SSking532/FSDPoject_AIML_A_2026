import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Ambulance, ChevronLeft, ChevronRight, HeartPulse, LogOut, RadioTower } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/DataContext';
import BrandLogo from '../common/BrandLogo';
import { ROLE_LABELS, ROLE_NAV_CONFIG } from './navigationConfig';

const ROLE_ICONS = { patient: HeartPulse, driver: Ambulance, admin: RadioTower };

export function Sidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile
}) {
  const { user, logout } = useAuth();
  const { connection } = useAppData();
  const connLabel = {
    live: 'Live updates on',
    connecting: 'Connecting…',
    reconnecting: 'Reconnecting…',
    demo: 'Demo data (offline)',
    idle: 'Offline'
  }[connection] || 'Offline';
  const navigate = useNavigate();

  const navItems = ROLE_NAV_CONFIG[user?.role] || [];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside
      className={`sidebar ${collapsed ? 'collapsed' : ''} ${
        mobileOpen ? 'mobile-open' : ''
      }`}
      aria-label="Primary sidebar navigation"
    >
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <BrandLogo markClassName="sidebar-brand-mark" />
        </div>
        <button
          type="button"
          className="sidebar-collapse-btn"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>

      <div className="sidebar-role-pill">
        {React.createElement(ROLE_ICONS[user?.role] || HeartPulse, { size: 15, style: { flexShrink: 0 } })}
        {!collapsed && <span>{ROLE_LABELS[user?.role] || 'Portal'}</span>}
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
              title={collapsed ? item.label : undefined}
            >
              <Icon size={18} style={{ flexShrink: 0 }} />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-conn" title={connLabel}>
          <span className={`conn-dot ${connection}`} />
          <span>{connLabel}</span>
        </div>
        <button
          type="button"
          className="sidebar-logout-btn"
          onClick={handleLogout}
          title="Sign out"
        >
          <LogOut size={17} style={{ flexShrink: 0 }} />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;