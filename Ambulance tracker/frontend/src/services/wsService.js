import { USE_MOCK_DATA, WS_BASE_URL } from './api';

/**
 * WebSocket client for real-time updates (Design Doc 2.4 / 6.6).
 * Connects to /ws/updates, which streams every event relevant to the signed-in
 * user: location updates, request status changes, assignments and admin feed.
 * Reconnects with back-off. In demo mode it acts as a local event bus only.
 */
class EmergencyWebSocketClient {
  constructor() {
    this.socket = null;
    this.token = null;
    this.listeners = new Map();
    this.retry = 0;
    this.retryTimer = null;
    this.pingTimer = null;
    this.status = 'idle';
  }

  connect(token) {
    if (USE_MOCK_DATA) return;
    this.token = token;
    if (this.socket) return;
    clearTimeout(this.retryTimer);
    try {
      const url = `${WS_BASE_URL}/ws/updates?token=${encodeURIComponent(token)}`;
      const socket = new WebSocket(url);
      this.socket = socket;
      this.setStatus('connecting');

      socket.onopen = () => {
        this.retry = 0;
        this.setStatus('live');
        clearInterval(this.pingTimer);
        this.pingTimer = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) socket.send('ping');
        }, 25000);
      };
      socket.onmessage = (event) => {
        if (event.data === 'pong') return;
        try {
          const payload = JSON.parse(event.data);
          this.emitLocal(payload.event || 'message', payload.data || {});
          this.emitLocal('*', payload);
        } catch {
          // ignore malformed frame
        }
      };
      socket.onclose = () => {
        clearInterval(this.pingTimer);
        this.socket = null;
        if (!this.token) {
          this.setStatus('idle');
          return;
        }
        this.setStatus('reconnecting');
        const delay = Math.min(15000, 1000 * 2 ** this.retry++);
        this.retryTimer = setTimeout(() => this.connect(this.token), delay);
      };
    } catch {
      this.socket = null;
    }
  }

  disconnect() {
    this.token = null;
    clearTimeout(this.retryTimer);
    clearInterval(this.pingTimer);
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.setStatus('idle');
  }

  setStatus(status) {
    this.status = status;
    this.emitLocal('connection', { status });
  }

  subscribe(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType).add(callback);
    return () => {
      this.listeners.get(eventType)?.delete(callback);
    };
  }

  emitLocal(eventType, data) {
    this.listeners.get(eventType)?.forEach((cb) => cb(data));
  }
}

export const wsService = new EmergencyWebSocketClient();
