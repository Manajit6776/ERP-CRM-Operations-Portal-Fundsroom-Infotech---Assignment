import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { StatusBadge } from '../components/StatusBadge';
import { AlertTriangle, Clock, UserCheck, IndianRupee, Package, Activity } from 'lucide-react';
import api from '../api/client';

export const DashboardPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/dashboard/summary');
      setData(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <Layout title="Operations Overview">
      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>
          Loading dashboard...
        </div>
      ) : (
        <>
          {/* Key Metrics Grid */}
          <div className="grid-metrics">
            <div className="metric-card">
              <div>
                <div className="metric-label">Low Stock Alerts</div>
                <div className="metric-val" style={{ color: data?.metrics.lowStockCount > 0 ? '#ef4444' : '#10b981' }}>
                  {data?.metrics.lowStockCount || 0}
                </div>
              </div>
              <div className="metric-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                <AlertTriangle size={24} />
              </div>
            </div>

            <div className="metric-card">
              <div>
                <div className="metric-label">Pending Draft Challans</div>
                <div className="metric-val" style={{ color: '#f59e0b' }}>
                  {data?.metrics.pendingChallansCount || 0}
                </div>
              </div>
              <div className="metric-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                <Clock size={24} />
              </div>
            </div>

            <div className="metric-card">
              <div>
                <div className="metric-label">Active Leads (CRM)</div>
                <div className="metric-val" style={{ color: '#3b82f6' }}>
                  {data?.metrics.activeLeadsCount || 0}
                </div>
              </div>
              <div className="metric-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                <UserCheck size={24} />
              </div>
            </div>

            <div className="metric-card">
              <div>
                <div className="metric-label">Confirmed Revenue</div>
                <div className="metric-val" style={{ color: '#10b981' }}>
                  ₹{(data?.metrics.totalRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="metric-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                <IndianRupee size={24} />
              </div>
            </div>
          </div>

          {/* Activity Tables Layout */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
            {/* Recent Sales Challans */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem' }}>Recent Sales Challans</h3>
              </div>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Challan #</th>
                      <th>Customer</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.recentChallans?.length === 0 ? (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No recent challans found</td>
                      </tr>
                    ) : (
                      data?.recentChallans?.map((ch) => (
                        <tr key={ch.id}>
                          <td style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{ch.challan_number}</td>
                          <td>{ch.customer_name_snapshot}</td>
                          <td>₹{Number(ch.total_amount).toLocaleString('en-IN')}</td>
                          <td>
                            <StatusBadge status={ch.status} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Inventory Stock Movement Audit Log */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity size={18} color="var(--accent-info)" /> Recent Stock Audit Trail
                </h3>
              </div>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Qty</th>
                      <th>Type</th>
                      <th>Reason</th>
                      <th>User</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.recentMovements?.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No stock movements recorded</td>
                      </tr>
                    ) : (
                      data?.recentMovements?.map((m) => (
                        <tr key={m.id}>
                          <td style={{ fontWeight: 600 }}>{m.product_name} ({m.sku})</td>
                          <td style={{ fontWeight: 700, color: m.movement_type === 'IN' ? '#10b981' : '#ef4444' }}>
                            {m.movement_type === 'IN' ? `+${m.quantity_changed}` : `-${m.quantity_changed}`}
                          </td>
                          <td>
                            <span className={`badge ${m.movement_type === 'IN' ? 'badge-active' : 'badge-cancelled'}`}>
                              {m.movement_type}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{m.reason}</td>
                          <td style={{ fontSize: '0.8rem' }}>{m.created_by_user_name}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </Layout>
  );
};
