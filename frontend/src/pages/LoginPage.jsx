import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    }
  };

  const handleQuickLogin = (roleEmail, rolePass) => {
    setEmail(roleEmail);
    setPassword(rolePass);
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-header">
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.6rem', color: 'var(--text-main)' }}>
            ERP & CRM Portal
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Sign in to access Fundsroom Operations Portal
          </p>
        </div>

        {error && (
          <div className="alert alert-danger">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={18}
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }}
              />
              <input
                type="email"
                className="input-field"
                style={{ width: '100%', paddingLeft: '40px' }}
                placeholder="name@fundsroom.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={18}
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }}
              />
              <input
                type="password"
                className="input-field"
                style={{ width: '100%', paddingLeft: '40px' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }} disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textAlign: 'center', marginBottom: '12px' }}>
            DEMO ROLE QUICK LOGIN
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '6px' }}
              onClick={() => handleQuickLogin('admin@fundsroom.com', 'Admin@123')}
            >
              👑 Admin
            </button>
            <button
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '6px' }}
              onClick={() => handleQuickLogin('sales@fundsroom.com', 'Sales@123')}
            >
              💼 Sales
            </button>
            <button
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '6px' }}
              onClick={() => handleQuickLogin('warehouse@fundsroom.com', 'Warehouse@123')}
            >
              🏭 Warehouse
            </button>
            <button
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '6px' }}
              onClick={() => handleQuickLogin('accounts@fundsroom.com', 'Accounts@123')}
            >
              📊 Accounts
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
