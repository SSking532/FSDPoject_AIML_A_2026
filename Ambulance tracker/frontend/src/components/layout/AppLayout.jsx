import React, { useState } from 'react';
import MobileNavigation from './MobileNavigation';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useAppData } from '../../context/DataContext';
import LoadingState from '../common/LoadingState';

export function AppLayout({ title, subtitle, children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { syncing, syncError, refresh, isLive } = useAppData();

  return (
    <div className="app-shell">
      <div
        className={`mobile-drawer-backdrop ${mobileOpen ? 'open' : ''}`}
        onClick={() => setMobileOpen(false)}
      />

      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className={`app-main ${collapsed ? 'sidebar-collapsed' : ''}`}>
        <Topbar
          title={title}
          subtitle={subtitle}
          onOpenMobileMenu={() => setMobileOpen(true)}
        />
        <main className="page-content">
          {syncError && (
            <div className="sync-banner" role="alert">
              <span>Can’t reach the server: {syncError}</span>
              <button type="button" className="btn btn-secondary btn-sm" onClick={refresh}>
                Try again
              </button>
            </div>
          )}
          {isLive && syncing ? <LoadingState message="Loading the latest data…" /> : children}
        </main>
      </div>

      <MobileNavigation />
    </div>
  );
}

export default AppLayout;
