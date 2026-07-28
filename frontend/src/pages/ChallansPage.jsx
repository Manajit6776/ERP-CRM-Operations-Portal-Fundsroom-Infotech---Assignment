import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { StatusBadge } from '../components/StatusBadge';
import { Pagination } from '../components/Pagination';
import { Modal } from '../components/Modal';
import { Search, Plus, Eye, CheckCircle2, XCircle, Trash2, FileText, Printer, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

export const ChallansPage = () => {
  const { hasRole } = useAuth();

  const [challans, setChallans] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedChallan, setSelectedChallan] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  // Creation Form State
  const [customersList, setCustomersList] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [challanNotes, setChallanNotes] = useState('');
  const [lineItems, setLineItems] = useState([
    { product_id: '', quantity: 1 }
  ]);

  const fetchChallans = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/challans', {
        params: { page, limit: 8, search, status: statusFilter }
      });
      setChallans(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(err.message || 'Failed to fetch sales challans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChallans();
  }, [page, search, statusFilter]);

  const handleOpenCreateModal = async () => {
    try {
      setError('');
      setModalError('');
      // Fetch customers & products for select options
      const [custRes, prodRes] = await Promise.all([
        api.get('/customers', { params: { limit: 100 } }),
        api.get('/products', { params: { limit: 100 } })
      ]);

      setCustomersList(custRes.data.data);
      setProductsList(prodRes.data.data);
      setSelectedCustomerId(custRes.data.data[0]?.id || '');
      setLineItems([{ product_id: prodRes.data.data[0]?.id || '', quantity: 1 }]);
      setChallanNotes('');
      setIsCreateModalOpen(true);
    } catch (err) {
      setError(err.message || 'Failed to load options for creating challan');
    }
  };

  const handleAddLineItem = () => {
    if (productsList.length === 0) return;
    setLineItems([...lineItems, { product_id: productsList[0].id, quantity: 1 }]);
  };

  const handleRemoveLineItem = (index) => {
    if (lineItems.length <= 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleLineItemChange = (index, field, value) => {
    const updated = [...lineItems];
    updated[index][field] = value;
    setLineItems(updated);
  };

  const handleCalculateTotal = () => {
    return lineItems.reduce((sum, item) => {
      const prod = productsList.find((p) => String(p.id) === String(item.product_id));
      if (!prod) return sum;
      return sum + Number(prod.unit_price) * (item.quantity || 0);
    }, 0);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setModalError('');

    const formattedItems = lineItems.map((item) => ({
      product_id: parseInt(item.product_id, 10),
      quantity: parseInt(item.quantity, 10)
    }));

    try {
      setActionLoading(true);
      await api.post('/challans', {
        customer_id: parseInt(selectedCustomerId, 10),
        notes: challanNotes,
        items: formattedItems
      });
      setSuccess('Draft Sales Challan generated successfully.');
      setIsCreateModalOpen(false);
      fetchChallans();
    } catch (err) {
      setModalError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewDetails = async (challanId) => {
    try {
      setError('');
      setModalError('');
      const res = await api.get(`/challans/${challanId}`);
      setSelectedChallan(res.data.challan);
      setIsDetailModalOpen(true);
    } catch (err) {
      setError(err.message || 'Failed to fetch challan details');
    }
  };

  const handleConfirmChallan = async (challanId) => {
    try {
      setActionLoading(true);
      setModalError('');
      setSuccess('');
      const res = await api.patch(`/challans/${challanId}/confirm`);
      setSelectedChallan(res.data.challan);
      setSuccess(`Challan #${res.data.challan.challan_number} confirmed & stock decremented!`);
      fetchChallans();
    } catch (err) {
      setModalError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelChallan = async (challanId) => {
    if (!window.confirm('Are you sure you want to cancel this sales challan? Restocking will occur if confirmed.')) return;

    try {
      setActionLoading(true);
      setModalError('');
      setSuccess('');
      const res = await api.patch(`/challans/${challanId}/cancel`);
      setSelectedChallan(res.data.challan);
      setSuccess(`Challan #${res.data.challan.challan_number} cancelled.`);
      fetchChallans();
    } catch (err) {
      setModalError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const canCreate = hasRole(['Admin', 'Sales']);
  const canOperate = hasRole(['Admin', 'Sales', 'Warehouse']);

  return (
    <Layout title="Sales Challan Operations">
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Action Toolbar */}
      <div className="action-bar">
        <div className="search-filter-group">
          <div style={{ position: 'relative', minWidth: '240px' }}>
            <Search
              size={16}
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }}
            />
            <input
              type="text"
              className="input-field"
              placeholder="Search challan #, customer..."
              style={{ paddingLeft: '36px', width: '100%' }}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          <select
            className="select-field"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="ALL">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        {canCreate && (
          <button className="btn btn-primary" onClick={handleOpenCreateModal}>
            <Plus size={18} /> Create Sales Challan
          </button>
        )}
      </div>

      {/* Challans Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Challan Number</th>
                <th>Customer Name</th>
                <th>Total Value</th>
                <th>Status</th>
                <th>Created Date</th>
                <th>Created By</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Loading sales challan ledger...
                  </td>
                </tr>
              ) : challans.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No sales challans found.
                  </td>
                </tr>
              ) : (
                challans.map((ch) => (
                  <tr key={ch.id}>
                    <td style={{ fontWeight: 700, color: 'var(--accent-primary)', fontFamily: 'monospace' }}>
                      {ch.challan_number}
                    </td>
                    <td style={{ fontWeight: 600 }}>{ch.customer_name_snapshot}</td>
                    <td style={{ fontWeight: 600 }}>₹{Number(ch.total_amount).toLocaleString('en-IN')}</td>
                    <td>
                      <StatusBadge status={ch.status} />
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{new Date(ch.created_at).toLocaleDateString()}</td>
                    <td style={{ fontSize: '0.85rem' }}>{ch.created_by_user_name}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '6px 10px' }}
                        onClick={() => handleViewDetails(ch.id)}
                      >
                        <Eye size={14} /> View / Process
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination pagination={pagination} onPageChange={setPage} />

      {/* Create Sales Challan Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Sales Challan (Draft)"
        maxWidth="800px"
      >
        {modalError && (
          <div className="alert alert-danger">
            <AlertTriangle size={18} /> {modalError}
          </div>
        )}

        <form onSubmit={handleCreateSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
              Select Customer *
            </label>
            <select
              className="select-field"
              style={{ width: '100%' }}
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              required
            >
              {customersList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.business_name} ({c.name} - {c.mobile})
                </option>
              ))}
            </select>
          </div>

          <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', marginTop: '20px', marginBottom: '12px' }}>
            Line Items Builder
          </h4>

          {lineItems.map((item, index) => {
            const selectedProd = productsList.find((p) => String(p.id) === String(item.product_id));
            const availableStock = selectedProd ? selectedProd.current_stock : 0;
            const linePrice = selectedProd ? Number(selectedProd.unit_price) : 0;
            const lineTotal = linePrice * (item.quantity || 0);

            return (
              <div
                key={index}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
                  gap: '12px',
                  alignItems: 'center',
                  background: 'var(--bg-dark)',
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '10px'
                }}
              >
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Product</label>
                  <select
                    className="select-field"
                    style={{ width: '100%' }}
                    value={item.product_id}
                    onChange={(e) => handleLineItemChange(index, 'product_id', e.target.value)}
                  >
                    {productsList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku}) - Stock: {p.current_stock}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Quantity</label>
                  <input
                    type="number"
                    min="1"
                    className="input-field"
                    style={{ width: '100%' }}
                    value={item.quantity}
                    onChange={(e) => handleLineItemChange(index, 'quantity', parseInt(e.target.value, 10) || 1)}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Unit Price</label>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, padding: '8px 0' }}>
                    ₹{linePrice.toLocaleString('en-IN')}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Line Total</label>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-primary)', padding: '8px 0' }}>
                    ₹{lineTotal.toLocaleString('en-IN')}
                  </div>
                </div>

                <div style={{ paddingTop: '16px' }}>
                  <button
                    type="button"
                    className="btn btn-danger"
                    style={{ padding: '8px' }}
                    onClick={() => handleRemoveLineItem(index)}
                    disabled={lineItems.length <= 1}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}

          <button type="button" className="btn btn-secondary" style={{ marginTop: '6px' }} onClick={handleAddLineItem}>
            + Add Another Line Item
          </button>

          <div style={{ marginTop: '20px', padding: '16px', background: 'var(--bg-dark)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Total Challan Valuation:</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#10b981' }}>
              ₹{handleCalculateTotal().toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div style={{ marginTop: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Challan Notes / Shipping Instructions</label>
            <textarea
              className="input-field"
              rows={2}
              style={{ width: '100%' }}
              value={challanNotes}
              onChange={(e) => setChallanNotes(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={actionLoading}>
              {actionLoading ? 'Creating...' : 'Save Draft Challan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Challan Detail & Transaction Processing Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={selectedChallan ? `Sales Challan #${selectedChallan.challan_number}` : 'Challan Details'}
        maxWidth="850px"
      >
        {selectedChallan && (
          <div>
            {modalError && (
              <div className="alert alert-danger" style={{ whiteSpace: 'pre-line' }}>
                <AlertTriangle size={20} />
                <div>
                  <strong>Stock Check / Transaction Error:</strong>
                  <div>{modalError}</div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: 'var(--bg-dark)', padding: '20px', borderRadius: 'var(--radius-md)', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontFamily: 'monospace', color: 'var(--accent-primary)', fontSize: '1.3rem' }}>
                  #{selectedChallan.challan_number}
                </h3>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, marginTop: '4px' }}>
                  Customer: {selectedChallan.customer_name_snapshot}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Created on: {new Date(selectedChallan.created_at).toLocaleString()} by {selectedChallan.created_by_user_name}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <StatusBadge status={selectedChallan.status} />
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#10b981', marginTop: '8px' }}>
                  ₹{Number(selectedChallan.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* Line Items Snapshot Table */}
            <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', marginBottom: '12px' }}>
              Itemized Line Items (Historical Catalog Snapshot)
            </h4>

            <div className="table-responsive" style={{ marginBottom: '20px' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>SKU (Snapshot)</th>
                    <th>Unit Price</th>
                    <th>Quantity</th>
                    <th>Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedChallan.items?.map((item) => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 600 }}>{item.product_name_snapshot}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{item.sku_snapshot}</td>
                      <td>₹{Number(item.unit_price_snapshot).toLocaleString('en-IN')}</td>
                      <td style={{ fontWeight: 700 }}>{item.quantity}</td>
                      <td style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
                        ₹{Number(item.line_total).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedChallan.notes && (
              <div style={{ background: 'var(--bg-dark)', padding: '12px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', marginBottom: '20px' }}>
                <strong>Notes:</strong> {selectedChallan.notes}
              </div>
            )}

            {/* Transaction Controls */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                className="btn btn-secondary"
                onClick={() => window.print()}
                title="Print Challan Receipt"
              >
                <Printer size={16} /> Print Receipt
              </button>

              <div style={{ display: 'flex', gap: '12px' }}>
                {canOperate && selectedChallan.status === 'Draft' && (
                  <button
                    className="btn btn-success"
                    disabled={actionLoading}
                    onClick={() => handleConfirmChallan(selectedChallan.id)}
                  >
                    <CheckCircle2 size={16} /> {actionLoading ? 'Processing DB Transaction...' : 'Confirm Challan & Deduct Stock'}
                  </button>
                )}

                {canOperate && selectedChallan.status !== 'Cancelled' && (
                  <button
                    className="btn btn-danger"
                    disabled={actionLoading}
                    onClick={() => handleCancelChallan(selectedChallan.id)}
                  >
                    <XCircle size={16} /> Cancel Challan {selectedChallan.status === 'Confirmed' ? '(Restock)' : ''}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
};
