import React from 'react';
import { Loader2 } from 'lucide-react';

export function LoadingState({ message = 'Loading emergency data...' }) {
  return (
    <div className="loading-state" role="status">
      <Loader2 size={28} className="spin" style={{ color: 'var(--red)' }} />
      <span style={{ fontSize: 13.5, fontWeight: 600 }}>{message}</span>
    </div>
  );
}

export default LoadingState;
