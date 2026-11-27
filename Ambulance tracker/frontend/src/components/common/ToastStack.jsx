import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, BellRing, CheckCircle2, Info, X } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';

const ICONS = {
  emergency: BellRing,
  warning: AlertTriangle,
  success: CheckCircle2,
  info: Info
};

/** Live pop-up alerts for events that arrive over the WebSocket. */
export function ToastStack() {
  const { toasts, dismissToast, markAsRead } = useNotifications();
  const navigate = useNavigate();

  if (!toasts.length) return null;

  return (
    <div className="toast-stack" role="region" aria-live="polite" aria-label="Live alerts">
      {toasts.map((t) => {
        const Icon = ICONS[t.type] || Info;
        return (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <span className="toast-icon">
              <Icon size={18} />
            </span>
            <button
              type="button"
              className="toast-body"
              onClick={() => {
                markAsRead(t.id);
                dismissToast(t.id);
                if (t.link) navigate(t.link);
              }}
            >
              <strong>{t.title}</strong>
              <span>{t.message}</span>
            </button>
            <button
              type="button"
              className="toast-close"
              aria-label="Dismiss"
              onClick={() => dismissToast(t.id)}
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default ToastStack;