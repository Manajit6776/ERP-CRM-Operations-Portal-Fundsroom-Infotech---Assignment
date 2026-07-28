import React from 'react';
import { Menu, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Topbar = ({ title, onMenuToggle }) => {
  const { user, logout } = useAuth();

  const roleClass = `role-pill role-${user?.role?.toLowerCase() || 'sales'}`;

  return (
    <header className="topbar">
      <div className="topbar-left">
        <h1 className="page-title">{title}</h1>
      </div>

      <div className="topbar-right">
        <div className="user-badge">
          <UserIcon size={16} color="var(--accent-primary)" />
          <span className="user-name" style={{ fontSize: '0.9rem', fontWeight: 600 }}>
            {user?.name}
          </span>
          <span className={roleClass}>{user?.role}</span>
        </div>

        <button
          className="btn btn-secondary"
          onClick={logout}
          title="Sign Out"
          style={{ padding: '8px 12px' }}
        >
          <LogOut size={16} />
          <span className="user-name">Logout</span>
        </button>
      </div>
    </header>
  );
};
