import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Package, FileText, Layers } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Sidebar = ({ isOpen, onClose }) => {
  const { user } = useAuth();

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Customers (CRM)', path: '/customers', icon: Users },
    { label: 'Products & Inventory', path: '/products', icon: Package },
    { label: 'Sales Challans', path: '/challans', icon: FileText }
  ];

  return (
    <aside className={`sidebar ${isOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <Layers size={22} />
        </div>
        <div>
          <div className="sidebar-title">Mini ERP & CRM</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Operations Portal</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
        <div>Fundsroom Operations v1.0</div>
        <div>Logged in: <strong>{user?.name}</strong></div>
      </div>
    </aside>
  );
};
