import React from 'react';
import { Search, X } from 'lucide-react';

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search...',
  ariaLabel = 'Search'
}) {
  return (
    <div className="search-box">
      <Search size={16} className="search-box-icon" aria-hidden="true" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
      />
      {value && (
        <button
          type="button"
          className="search-clear-btn"
          onClick={() => onChange('')}
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

export default SearchBar;
