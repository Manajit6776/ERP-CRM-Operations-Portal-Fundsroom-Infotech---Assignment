import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export const Layout = ({ title, children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="app-container">
      <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      <div className="main-wrapper">
        <Topbar title={title} onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} />
        <main className="content-area">{children}</main>
      </div>
    </div>
  );
};
