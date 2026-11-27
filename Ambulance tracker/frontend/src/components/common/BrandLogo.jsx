import React from 'react';

export function BrandLogo({ markClassName = 'brand-mark' }) {
  return (
    <>
      <span className={markClassName} aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 17V8.5A2.5 2.5 0 0 1 6.5 6h7l4.5 4v7" />
          <path d="M3 17h18M7 17v2M17 17v2M15 6v4h4" />
          <path d="M9 10h3M10.5 8.5v3" />
        </svg>
      </span>
      <span>Smart Ambulance</span>
    </>
  );
}

export default BrandLogo;
