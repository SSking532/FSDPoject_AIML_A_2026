import React from 'react';

export function Input({
  label,
  id,
  error,
  hint,
  as = 'input',
  children,
  className = '',
  ...props
}) {
  const inputId = id || props.name;
  const controlClass =
    as === 'textarea'
      ? 'field-textarea'
      : as === 'select'
      ? 'field-select'
      : 'field-input';

  return (
    <div className={`field-group ${className}`.trim()}>
      {label && (
        <label htmlFor={inputId} className="field-label">
          {label}
        </label>
      )}
      {as === 'select' ? (
        <select id={inputId} className={controlClass} {...props}>
          {children}
        </select>
      ) : as === 'textarea' ? (
        <textarea id={inputId} className={controlClass} {...props} />
      ) : (
        <input id={inputId} className={controlClass} {...props} />
      )}
      {error && <span className="field-error">{error}</span>}
      {!error && hint && <span className="field-hint">{hint}</span>}
    </div>
  );
}

export default Input;
