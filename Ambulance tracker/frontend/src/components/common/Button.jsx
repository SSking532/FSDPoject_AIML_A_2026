import React from 'react';
import { Loader2 } from 'lucide-react';

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  type = 'button',
  ...props
}) {
  const variantClass = {
    primary: 'btn-primary',
    navy: 'btn-navy',
    secondary: 'btn-secondary',
    success: 'btn-success',
    ghost: 'btn-ghost',
    danger: 'btn-danger-outline'
  }[variant] || 'btn-primary';

  const sizeClass = {
    sm: 'btn-sm',
    md: '',
    lg: 'btn-lg'
  }[size] || '';

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`btn ${variantClass} ${sizeClass} ${className}`.trim()}
      {...props}
    >
      {loading && <Loader2 size={16} className="spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

export default Button;
