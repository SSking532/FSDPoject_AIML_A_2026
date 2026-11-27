import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, LogOut, Menu, RotateCcw, UserCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/DataContext';
import { useNotifications } from '../../context/NotificationContext';
import NotificationPanel from '../common/NotificationPanel';

export function Topbar({ title, subtitle, onOpenMobileMenu }) {
  const { user, logout, isMockMode } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotifications();
  const { resetDemoData } = useAppData();
  const navigate = useNavigate();

  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const notifRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    const handleOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const initials = (user?.name || 'U')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const profileRoute = `/${user?.role || 'patient'}/profile`;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
        >
          <Menu size={19} />
        </button>

        <div className="topbar-title-group">
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>

      <div className="topbar-right">
        {isMockMode && (
          <span
            className="topbar-sim-badge"
            title="Running on built-in demo data. Connect the API to go live."
          >
            Demo data
          </span>
        )}

        {/* Notifications */}
        <div className="dropdown-container" ref={notifRef}>
          <button
            type="button"
            className="icon-btn"
            aria-label="Notifications"
            onClick={() => {
              setNotifOpen((prev) => !prev);
              setProfileOpen(false);
            }}
          >
            <Bell size={18} />
            {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
          </button>

          {notifOpen && (
            <NotificationPanel
              notifications={notifications}
              onMarkRead={markAsRead}
              onMarkAllRead={markAllAsRead}
              onSelectNotification={(item) => {
                setNotifOpen(false);
                if (item.link) navigate(item.link);
              }}
            />
          )}
        </div>

        {/* User Profile Menu */}
        <div className="dropdown-container" ref={profileRef}>
          <button
            type="button"
            className="profile-trigger"
            onClick={() => {
              setProfileOpen((prev) => !prev);
              setNotifOpen(false);
            }}
            aria-label="Open user menu"
          >
            <span className="avatar-circle">{initials}</span>
            <span className="profile-meta">
              <div className="profile-name">{user?.name}</div>
              <div className="profile-role">{user?.role}</div>
            </span>
            <ChevronDown size={15} style={{ color: 'var(--muted)' }} />
          </button>

          {profileOpen && (
            <div className="dropdown-menu" role="menu">
              <div style={{ padding: '6px 12px 8px' }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{user?.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                  {user?.email}
                </div>
              </div>
              <div className="dropdown-divider" />
              <button
                type="button"
                className="dropdown-item"
                onClick={() => {
                  setProfileOpen(false);
                  navigate(profileRoute);
                }}
              >
                <UserCircle2 size={16} />
                My Profile
              </button>
              {isMockMode && (
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    resetDemoData();
                    setProfileOpen(false);
                  }}
                >
                  <RotateCcw size={16} />
                  Reset Demo Data
                </button>
              )}
              <div className="dropdown-divider" />
              <button
                type="button"
                className="dropdown-item danger"
                onClick={handleLogout}
              >
                <LogOut size={16} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Topbar;
