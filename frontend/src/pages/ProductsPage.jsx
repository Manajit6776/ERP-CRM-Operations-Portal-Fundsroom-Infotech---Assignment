import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { StatusBadge } from '../components/StatusBadge';
import { Pagination } from '../components/Pagination';
import { Modal } from '../components/Modal';
import { Search, Plus, Edit, Activity, AlertTriangle, Layers, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

export const ProductsPage = () => {
  const { hasRole } = useAuth();

  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [selectedProductForAdjustment, setSelectedProductForAdjustment] = useState(null);
  const [isMovementsModalOpen, setIsMovementsModalOpen] = useState(false);
  const [movementsList, setMovementsList] = useState([]);
  const [selectedProductForMovements, setSelectedProductForMovements] = useState(null);

  // Form Fields
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: 'Furniture',
    unit_price: 100,
    current_stock: 10,
    min_stock_alert: 5,
    location: 'Warehouse A'
  });

  // Manual Adjustment Form
  const [adjustmentQty, setAdjustmentQty] = useState(0);
  const [adjustmentReason, setAdjustmentReason] = useState('');

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/products', {
        params: { page, limit: 8, search, lowStock: lowStockFilter }
      });
      setProducts(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(err.message || 'Failed to fetch product catalog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [page, search, lowStockFilter]);

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      sku: `PROD-${Math.floor(1000 + Math.random() * 9000)}`,
      category: 'Electronics',
      unit_price: 1500,
      current_stock: 20,
      min_stock_alert: 5,
      location: 'Main Warehouse'
    });
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (prod) => {
    setEditingProduct(prod);
    setFormData({
      name: prod.name,
      sku: prod.sku,
      category: prod.category,
      unit_price: Number(prod.unit_price),
      current_stock: prod.current_stock,
      min_stock_alert: prod.min_stock_alert,
      location: prod.location
    });
    setIsFormModalOpen(true);
  };

  const handleOpenAdjustmentModal = (prod) => {
    setSelectedProductForAdjustment(prod);
    setAdjustmentQty(0);
    setAdjustmentReason('');
    setIsAdjustmentModalOpen(true);
  };

  const handleOpenMovementsModal = async (prod) => {
    try {
      setSelectedProductForMovements(prod);
      const res = await api.get(`/products/${prod.id}/stock-movements`, { params: { limit: 20 } });
      setMovementsList(res.data.data);
      setIsMovementsModalOpen(true);
    } catch (err) {
      setError(err.message || 'Failed to fetch product stock movements');
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, formData);
        setSuccess(`Product "${formData.name}" updated successfully.`);
      } else {
        await api.post('/products', formData);
        setSuccess(`New product "${formData.name}" added to inventory.`);
      }
      setIsFormModalOpen(false);
      fetchProducts();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAdjustmentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProductForAdjustment) return;

    try {
      setError('');
      setSuccess('');
      await api.post(`/products/${selectedProductForAdjustment.id}/stock-movements`, {
        quantity_changed: Number(adjustmentQty),
        reason: adjustmentReason
      });
      setSuccess(`Stock updated for ${selectedProductForAdjustment.name}.`);
      setIsAdjustmentModalOpen(false);
      fetchProducts();
    } catch (err) {
      setError(err.message);
    }
  };

  const canEdit = hasRole(['Admin', 'Warehouse']);

  return (
    <Layout title="Products & Inventory Control">
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
              placeholder="Search product name, SKU, category..."
              style={{ paddingLeft: '36px', width: '100%' }}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          <button
            className={`btn ${lowStockFilter ? 'btn-danger' : 'btn-secondary'}`}
            onClick={() => { setLowStockFilter(!lowStockFilter); setPage(1); }}
          >
            <AlertTriangle size={16} /> {lowStockFilter ? 'Showing Low Stock Only' : 'Filter Low Stock Alert'}
          </button>
        </div>

        {canEdit && (
          <button className="btn btn-primary" onClick={handleOpenAddModal}>
            <Plus size={18} /> Add New Product
          </button>
        )}
      </div>

      {/* Product Catalog Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product Name & SKU</th>
                <th>Category</th>
                <th>Unit Price</th>
                <th>Current Stock</th>
                <th>Min Alert Qty</th>
                <th>Warehouse Location</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Loading product inventory...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No products found.
                  </td>
                </tr>
              ) : (
                products.map((prod) => {
                  const isLowStock = prod.current_stock <= prod.min_stock_alert;
                  return (
                    <tr key={prod.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{prod.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          SKU: {prod.sku}
                        </div>
                      </td>
                      <td>{prod.category}</td>
                      <td style={{ fontWeight: 600 }}>₹{Number(prod.unit_price).toLocaleString('en-IN')}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700, fontSize: '1.05rem', color: isLowStock ? '#ef4444' : '#10b981' }}>
                            {prod.current_stock}
                          </span>
                          {isLowStock && <StatusBadge status="Low Stock" />}
                        </div>
                      </td>
                      <td>{prod.min_stock_alert}</td>
                      <td style={{ fontSize: '0.85rem' }}>{prod.location}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '6px 10px' }}
                            title="View Audit Trail"
                            onClick={() => handleOpenMovementsModal(prod)}
                          >
                            <Activity size={14} />
                          </button>
                          {canEdit && (
                            <>
                              <button
                                className="btn btn-secondary"
                                style={{ padding: '6px 10px' }}
                                title="Manual Stock Adjustment"
                                onClick={() => handleOpenAdjustmentModal(prod)}
                              >
                                ± Stock
                              </button>
                              <button
                                className="btn btn-secondary"
                                style={{ padding: '6px 10px' }}
                                title="Edit Product"
                                onClick={() => handleOpenEditModal(prod)}
                              >
                                <Edit size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination pagination={pagination} onPageChange={setPage} />

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingProduct ? `Edit Product: ${editingProduct.name}` : 'Add New Product'}
      >
        <form onSubmit={handleFormSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Product Title *</label>
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
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>SKU Code *</label>
            <input
              type="text"
              className="input-field"
              style={{ width: '100%' }}
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Category *</label>
            <input
              type="text"
              className="input-field"
              style={{ width: '100%' }}
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Unit Price (₹) *</label>
            <input
              type="number"
              step="0.01"
              className="input-field"
              style={{ width: '100%' }}
              value={formData.unit_price}
              onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) || 0 })}
              required
            />
          </div>

          {!editingProduct && (
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Initial Stock Qty *</label>
              <input
                type="number"
                className="input-field"
                style={{ width: '100%' }}
                value={formData.current_stock}
                onChange={(e) => setFormData({ ...formData, current_stock: parseInt(e.target.value, 10) || 0 })}
                required
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Min Stock Alert Qty *</label>
            <input
              type="number"
              className="input-field"
              style={{ width: '100%' }}
              value={formData.min_stock_alert}
              onChange={(e) => setFormData({ ...formData, min_stock_alert: parseInt(e.target.value, 10) || 0 })}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Warehouse Location *</label>
            <input
              type="text"
              className="input-field"
              style={{ width: '100%' }}
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              required
            />
          </div>

          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsFormModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {editingProduct ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Manual Stock Adjustment Modal */}
      <Modal
        isOpen={isAdjustmentModalOpen}
        onClose={() => setIsAdjustmentModalOpen(false)}
        title={selectedProductForAdjustment ? `Stock Adjustment: ${selectedProductForAdjustment.name}` : 'Stock Adjustment'}
      >
        <form onSubmit={handleAdjustmentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'var(--bg-dark)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Current Stock Level:</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
              {selectedProductForAdjustment?.current_stock} Units
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
              Quantity Adjustment (+ positive to add stock, - negative to reduce)
            </label>
            <input
              type="number"
              className="input-field"
              style={{ width: '100%' }}
              placeholder="e.g. +10 or -5"
              value={adjustmentQty}
              onChange={(e) => setAdjustmentQty(parseInt(e.target.value, 10) || 0)}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
              Adjustment Reason (Audit Requirement) *
            </label>
            <textarea
              className="input-field"
              rows={3}
              style={{ width: '100%' }}
              placeholder="e.g. Damaged inventory write-off or Supplier purchase order restock"
              value={adjustmentReason}
              onChange={(e) => setAdjustmentReason(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsAdjustmentModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Record Stock Adjustment
            </button>
          </div>
        </form>
      </Modal>

      {/* Stock Movement Audit Log Modal */}
      <Modal
        isOpen={isMovementsModalOpen}
        onClose={() => setIsMovementsModalOpen(false)}
        title={selectedProductForMovements ? `Audit Log: ${selectedProductForMovements.name} (${selectedProductForMovements.sku})` : 'Stock Audit Trail'}
        maxWidth="750px"
      >
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Type</th>
                <th>Qty Changed</th>
                <th>Reason</th>
                <th>Recorded By</th>
              </tr>
            </thead>
            <tbody>
              {movementsList.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                    No audit logs recorded for this product.
                  </td>
                </tr>
              ) : (
                movementsList.map((m) => (
                  <tr key={m.id}>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {new Date(m.timestamp).toLocaleString()}
                    </td>
                    <td>
                      <span className={`badge ${m.movement_type === 'IN' ? 'badge-active' : 'badge-cancelled'}`}>
                        {m.movement_type === 'IN' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />} {m.movement_type}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: m.movement_type === 'IN' ? '#10b981' : '#ef4444' }}>
                      {m.movement_type === 'IN' ? `+${m.quantity_changed}` : `-${m.quantity_changed}`}
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{m.reason}</td>
                    <td style={{ fontSize: '0.85rem', fontWeight: 600 }}>{m.created_by_user_name}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Modal>
    </Layout>
  );
};
