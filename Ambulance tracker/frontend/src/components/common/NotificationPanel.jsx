import React from 'react';
import { Bell, CheckCheck, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';

export function NotificationPanel({
  notifications,
  onMarkRead,
  onMarkAllRead,
  onSelectNotification
}) {
  const unreadCount = notifications.filter((n) => !n.read).length;

  const getIcon = (type) => {
    if (type === 'emergency' || type === 'warning') {
      return <AlertTriangle size={16} style={{ color: 'var(--red)', flexShrink: 0 }} />;
    }
    if (type === 'success') {
      return <CheckCircle2 size={16} style={{ color: 'var(--green)', flexShrink: 0 }} />;
    }
    return <Info size={16} style={{ color: 'var(--navy)', flexShrink: 0 }} />;
  };

  return (
    <div className="notif-panel" role="region" aria-label="Notifications">
      <div className="notif-panel-header">
        <span style={{ fontWeight: 800, fontSize: 13.5 }}>
          Notifications {unreadCount > 0 ? `(${unreadCount})` : ''}
        </span>
        {unreadCount > 0 && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onMarkAllRead}
            style={{ height: 28, padding: '0 8px', fontSize: 11.5 }}
          >
            <CheckCheck size={13} />
            Mark all read
          </button>
        )}
      </div>

      <div className="notif-list">
        {notifications.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>
            <Bell size={22} style={{ marginBottom: 6, opacity: 0.5 }} />
            <div style={{ fontSize: 12.5 }}>No notifications right now</div>
          </div>
        ) : (
          notifications.map((item) => (
            <div
              key={item.id}
              className={`notif-item ${item.read ? '' : 'unread'}`}
              onClick={() => {
                onMarkRead(item.id);
                onSelectNotification?.(item);
              }}
            >
              <div style={{ marginTop: 2 }}>{getIcon(item.type)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12.5,
                    fontWeight: item.read ? 600 : 700,
                    color: 'var(--ink)'
                  }}
                >
                  {item.title}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                  {item.message}
                </div>
                <div style={{ fontSize: 11, color: '#8d99aa', marginTop: 4 }}>
                  {item.timeLabel}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default NotificationPanel;
