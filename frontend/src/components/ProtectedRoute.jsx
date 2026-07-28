import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ allowedRoles }) => {
  const { user, token, hasRole } = useAuth();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !hasRole(allowedRoles)) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--accent-danger)' }}>403 Access Forbidden</h2>
        <p style={{ marginTop: '10px', color: 'var(--text-muted)' }}>
          Your role (<strong>{user.role}</strong>) does not have sufficient permission to view this section.
        </p>
      </div>
    );
  }

  return <Outlet />;
};
