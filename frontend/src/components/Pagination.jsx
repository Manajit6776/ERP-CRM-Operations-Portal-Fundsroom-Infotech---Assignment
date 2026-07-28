import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const Pagination = ({ pagination, onPageChange }) => {
  if (!pagination || pagination.totalPages <= 1) return null;

  const { page, totalPages, total, limit } = pagination;
  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  return (
    <div className="pagination-wrapper">
      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        Showing <strong>{startItem}</strong> to <strong>{endItem}</strong> of <strong>{total}</strong> items
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button
          className="btn btn-secondary"
          style={{ padding: '6px 12px' }}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft size={16} /> Prev
        </button>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', padding: '0 8px' }}>
          Page {page} of {totalPages}
        </span>
        <button
          className="btn btn-secondary"
          style={{ padding: '6px 12px' }}
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};
