import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { INITIAL_NOTIFICATIONS } from '../data/mockData';
import { USE_MOCK_DATA } from '../services/api';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState(USE_MOCK_DATA ? INITIAL_NOTIFICATIONS : []);

  // Live mode: notifications arrive over the WebSocket; start fresh per account.
  useEffect(() => {
    if (!USE_MOCK_DATA) setItems([]);
  }, [user?.id]);

  const visibleNotifications = useMemo(() => {
    if (!user) return [];
    return items.filter(
      (n) => !n.roles || n.roles.includes(user.role)
    );
  }, [items, user]);

  const unreadCount = useMemo(
    () => visibleNotifications.filter((n) => !n.read).length,
    [visibleNotifications]
  );

  const [toasts, setToasts] = useState([]);
  const roleRef = useRef(user?.role);
  roleRef.current = user?.role;

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addNotification = useCallback(({
    title,
    message,
    type = 'info',
    roles = ['patient', 'driver', 'admin'],
    link = null
  }) => {
    const newItem = {
      id: `NTF-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title,
      message,
      type,
      roles,
      link,
      timeLabel: 'Just now',
      createdAt: new Date().toISOString(),
      read: false
    };
    setItems((prev) => [newItem, ...prev].slice(0, 40));
    // Pop a toast for the signed-in role so live events are impossible to miss.
    if (roleRef.current && roles.includes(roleRef.current)) {
      setToasts((prev) => [newItem, ...prev].slice(0, 3));
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newItem.id));
      }, type === 'emergency' ? 9000 : 6000);
    }
  }, []);

  const markAsRead = (id) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    if (!user) return;
    setItems((prev) =>
      prev.map((n) =>
        !n.roles || n.roles.includes(user.role) ? { ...n, read: true } : n
      )
    );
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications: visibleNotifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        toasts,
        dismissToast
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used inside NotificationProvider');
  }
  return ctx;
}