import React, { useMemo, useState } from 'react';
import { ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';

export function DataTable({
  columns,
  data,
  keyField = 'id',
  pageSize = 8,
  emptyTitle = 'No records found',
  emptyDescription = 'Try adjusting your search or filter criteria.',
  onRowClick
}) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [page, setPage] = useState(1);

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return data;
    const col = columns.find((c) => c.key === sortConfig.key);
    const copy = [...data];
    copy.sort((a, b) => {
      const aVal = col?.sortValue ? col.sortValue(a) : a[sortConfig.key];
      const bVal = col?.sortValue ? col.sortValue(b) : b[sortConfig.key];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sortConfig.direction === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
    return copy;
  }, [data, sortConfig, columns]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedData = sortedData.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  const handleSort = (col) => {
    if (!col.sortable) return;
    setSortConfig((prev) => {
      if (prev.key === col.key) {
        return {
          key: col.key,
          direction: prev.direction === 'asc' ? 'desc' : 'asc'
        };
      }
      return { key: col.key, direction: 'asc' };
    });
  };

  if (data.length === 0) {
    return (
      <div className="empty-state">
        <p style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
          {emptyTitle}
        </p>
        <p style={{ fontSize: 13 }}>{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={col.sortable ? 'sortable-th' : ''}
                  onClick={() => handleSort(col)}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    {col.header}
                    {col.sortable && <ArrowUpDown size={12} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row) => (
              <tr
                key={row[keyField]}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                style={onRowClick ? { cursor: 'pointer' } : undefined}
              >
                {columns.map((col) => (
                  <td key={col.key}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination-bar">
          <span>
            Showing {(safePage - 1) * pageSize + 1}–
            {Math.min(safePage * pageSize, sortedData.length)} of {sortedData.length}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              <ChevronLeft size={14} />
              Prev
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next page"
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
