import React from 'react';

export const StatusBadge = ({ status }) => {
  const s = status?.toLowerCase() || '';

  let className = 'badge badge-inactive';
  if (s === 'active' || s === 'confirmed') className = 'badge badge-confirmed';
  if (s === 'lead') className = 'badge badge-lead';
  if (s === 'draft') className = 'badge badge-draft';
  if (s === 'cancelled' || s === 'inactive') className = 'badge badge-cancelled';
  if (s === 'low stock') className = 'badge badge-low-stock';

  return <span className={className}>{status}</span>;
};
