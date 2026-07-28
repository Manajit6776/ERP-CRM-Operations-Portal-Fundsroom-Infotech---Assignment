import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { StatusBadge } from '../components/StatusBadge';
import { Pagination } from '../components/Pagination';
import { Modal } from '../components/Modal';
import { Search, Plus, Edit, Eye, MessageSquare, Calendar, User, Building, Phone, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

export const CustomersPage = () => {
  const { hasRole, user } = useAuth();

  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Form Fields
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    business_name: '',
    gst_number: '',
    customer_type: 'Retail',
    address: '',
    status: 'Lead',
    follow_up_date: '',
    notes: ''
  });

  // Follow-up Note Form
  const [newFollowupNote, setNewFollowupNote] = useState('');
  const [submittingFollowup, setSubmittingFollowup] = useState(false);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/customers', {
        params: { page, limit: 8, search, status: statusFilter, type: typeFilter }
      });
      setCustomers(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(err.message || 'Failed to fetch customer records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [page, search, statusFilter, typeFilter]);

  const handleOpenAddModal = () => {
    setEditingCustomer(null);
    setFormData({
      name: '',
      mobile: '',
      email: '',
      business_name: '',
      gst_number: '',
      customer_type: 'Retail',
      address: '',
      status: 'Lead',
      follow_up_date: '',
      notes: ''
    });
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (cust) => {
    setEditingCustomer(cust);
    setFormData({
      name: cust.name,
      mobile: cust.mobile,
      email: cust.email,
      business_name: cust.business_name,
      gst_number: cust.gst_number || '',
      customer_type: cust.customer_type,
      address: cust.address,
      status: cust.status,
      follow_up_date: cust.follow_up_date ? cust.follow_up_date.substring(0, 10) : '',
      notes: cust.notes || ''
    });
    setIsFormModalOpen(true);
  };

  const handleViewDetails = async (cust) => {
    try {
      setError('');
      const res = await api.get(`/customers/${cust.id}`);
      setSelectedCustomer(res.data.customer);
      setIsDetailModalOpen(true);
    } catch (err) {
      setError(err.message || 'Failed to fetch customer details');
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (editingCustomer) {
        await api.put(`/customers/${editingCustomer.id}`, formData);
        setSuccess(`Customer "${formData.business_name}" updated successfully.`);
      } else {
        await api.post('/customers', formData);
        setSuccess(`New customer "${formData.business_name}" added successfully.`);
      }
      setIsFormModalOpen(false);
      fetchCustomers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddFollowup = async (e) => {
    e.preventDefault();
    if (!newFollowupNote.trim() || !selectedCustomer) return;

    try {
      setSubmittingFollowup(true);
      const res = await api.post(`/customers/${selectedCustomer.id}/followups`, {
        note: newFollowupNote.trim()
      });
      setSelectedCustomer({
        ...selectedCustomer,
        followups: [res.data.followup, ...(selectedCustomer.followups || [])]
      });
      setNewFollowupNote('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmittingFollowup(false);
    }
  };

  const canEdit = hasRole(['Admin', 'Sales']);

  return (
    <Layout title="Customer CRM Management">
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
              placeholder="Search customer, email, GST..."
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
            <option value="Lead">Lead</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>

          <select
            className="select-field"
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          >
            <option value="ALL">All Customer Types</option>
            <option value="Retail">Retail</option>
            <option value="Wholesale">Wholesale</option>
            <option value="Distributor">Distributor</option>
          </select>
        </div>

        {canEdit && (
          <button className="btn btn-primary" onClick={handleOpenAddModal}>
            <Plus size={18} /> Add New Customer
          </button>
        )}
      </div>

      {/* Customer Data Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Business Name & Contact</th>
                <th>Mobile & Email</th>
                <th>Type</th>
                <th>GST Number</th>
                <th>Status</th>
                <th>Next Follow-up</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Loading CRM database records...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No customers match the given search criteria.
                  </td>
                </tr>
              ) : (
                customers.map((cust) => (
                  <tr key={cust.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{cust.business_name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{cust.name}</div>
                    </td>
                    <td>
                      <div>{cust.mobile}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{cust.email}</div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{cust.customer_type}</span>
                    </td>
                    <td style={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>
                      {cust.gst_number || 'N/A'}
                    </td>
                    <td>
                      <StatusBadge status={cust.status} />
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>
                      {cust.follow_up_date ? cust.follow_up_date.substring(0, 10) : 'None'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '6px 10px' }}
                          title="View Details & Follow-up Log"
                          onClick={() => handleViewDetails(cust)}
                        >
                          <Eye size={14} />
                        </button>
                        {canEdit && (
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '6px 10px' }}
                            title="Edit Customer"
                            onClick={() => handleOpenEditModal(cust)}
                          >
                            <Edit size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination pagination={pagination} onPageChange={setPage} />

      {/* Add / Edit Customer Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingCustomer ? `Edit Customer: ${editingCustomer.business_name}` : 'Add New Customer'}
      >
        <form onSubmit={handleFormSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Contact Person Name *</label>
            <input
              type="text"
              className="input-field"
              style={{ width: '100%' }}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Business / Company Name *</label>
            <input
              type="text"
              className="input-field"
              style={{ width: '100%' }}
              value={formData.business_name}
              onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Mobile Number *</label>
            <input
              type="text"
              className="input-field"
              style={{ width: '100%' }}
              value={formData.mobile}
              onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Email Address *</label>
            <input
              type="email"
              className="input-field"
              style={{ width: '100%' }}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>GST Number (Optional)</label>
            <input
              type="text"
              className="input-field"
              style={{ width: '100%' }}
              placeholder="e.g. 27AAAAA0000A1Z5"
              value={formData.gst_number}
              onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Customer Type *</label>
            <select
              className="select-field"
              style={{ width: '100%' }}
              value={formData.customer_type}
              onChange={(e) => setFormData({ ...formData, customer_type: e.target.value })}
            >
              <option value="Retail">Retail</option>
              <option value="Wholesale">Wholesale</option>
              <option value="Distributor">Distributor</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Status *</label>
            <select
              className="select-field"
              style={{ width: '100%' }}
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="Lead">Lead</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Next Follow-up Date</label>
            <input
              type="date"
              className="input-field"
              style={{ width: '100%' }}
              value={formData.follow_up_date}
              onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })}
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Address *</label>
            <textarea
              className="input-field"
              rows={2}
              style={{ width: '100%' }}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              required
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Notes</label>
            <textarea
              className="input-field"
              rows={2}
              style={{ width: '100%' }}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsFormModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {editingCustomer ? 'Save Changes' : 'Create Customer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Customer Detail & Followup Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={selectedCustomer ? `Customer Card: ${selectedCustomer.business_name}` : 'Customer Details'}
        maxWidth="750px"
      >
        {selectedCustomer && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px', background: 'var(--bg-dark)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Contact Person</div>
                <div style={{ fontWeight: 600 }}>{selectedCustomer.name}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Status & Type</div>
                <div><StatusBadge status={selectedCustomer.status} /> <span style={{ marginLeft: '8px', fontSize: '0.85rem' }}>({selectedCustomer.customer_type})</span></div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Phone & Email</div>
                <div>{selectedCustomer.mobile} | {selectedCustomer.email}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>GST Number</div>
                <div style={{ fontFamily: 'monospace' }}>{selectedCustomer.gst_number || 'N/A'}</div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Address</div>
                <div>{selectedCustomer.address}</div>
              </div>
            </div>

            {/* Follow-up Notes Activity Log */}
            <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={18} color="var(--accent-primary)" /> CRM Follow-up Timeline
            </h4>

            {canEdit && (
              <form onSubmit={handleAddFollowup} style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    className="input-field"
                    style={{ flex: 1 }}
                    placeholder="Type follow-up note (e.g. Called customer regarding quotation)..."
                    value={newFollowupNote}
                    onChange={(e) => setNewFollowupNote(e.target.value)}
                    required
                  />
                  <button type="submit" className="btn btn-primary" disabled={submittingFollowup}>
                    {submittingFollowup ? 'Saving...' : 'Add Note'}
                  </button>
                </div>
              </form>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '250px', overflowY: 'auto' }}>
              {!selectedCustomer.followups || selectedCustomer.followups.length === 0 ? (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '12px 0' }}>
                  No follow-up notes logged yet for this customer.
                </div>
              ) : (
                selectedCustomer.followups.map((f) => (
                  <div key={f.id} style={{ background: 'var(--bg-dark)', padding: '12px', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--accent-primary)' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>{f.note}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '6px' }}>
                      <span>Author: <strong>{f.author_name}</strong></span>
                      <span>{new Date(f.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
};
