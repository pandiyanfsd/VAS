import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { Search, Plus, Edit2, Trash2, X } from 'lucide-react';
import './ManageMembers.css'; // Reusing the identical UI classes

const ManageCashiers = () => {
  const [cashiers, setCashiers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cashierToDelete, setCashierToDelete] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [formData, setFormData] = useState({
    cashierId: '',
    name: '',
    phone: '',
    password: ''
  });

  const getNextAvailableCashierId = () => {
    const usedIds = new Set(cashiers.map(c => parseInt(c.cashierId, 10)).filter(id => !isNaN(id)));
    let nextId = 1;
    while (usedIds.has(nextId)) {
      nextId++;
    }
    return nextId;
  };

  const handleOpenModal = () => {
    setIsEditMode(false);
    setEditId(null);
    setFormData({
      cashierId: getNextAvailableCashierId().toString(),
      name: '',
      phone: '',
      password: 'password123'
    });
    setIsModalOpen(true);
  };

  const handleEdit = (cashier) => {
    setIsEditMode(true);
    setEditId(cashier._id);
    setFormData({
      cashierId: cashier.cashierId,
      name: cashier.name,
      phone: cashier.phone,
      password: ''
    });
    setIsModalOpen(true);
  };

  useEffect(() => {
    fetchCashiers();
  }, []);

  const fetchCashiers = async () => {
    try {
      const res = await axios.get(`/api/cashiers`);
      setCashiers(res.data);
    } catch (error) {
      console.error("Error fetching cashiers", error);
    }
  };

  const handleInputChange = (e) => {
    let { name, value } = e.target;
    if (name === 'name') value = value.toUpperCase();
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEditMode) {
        await axios.put(`/api/cashiers/${editId}`, formData);
      } else {
        await axios.post(`/api/cashiers`, formData);
      }
      setIsModalOpen(false);
      fetchCashiers();
    } catch (error) {
      setErrorMsg(error.response?.data?.error || `Failed to ${isEditMode ? 'update' : 'create'} cashier.`);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!cashierToDelete) return;
    setLoading(true);
    try {
      await axios.delete(`/api/cashiers/${cashierToDelete._id}`);
      fetchCashiers();
      setCashierToDelete(null);
    } catch (error) {
      setErrorMsg(error.response?.data?.error || "Failed to delete cashier.");
    } finally {
      setLoading(false);
    }
  };

  const filteredCashiers = cashiers
    .filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (c.cashierId && c.cashierId.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      const idA = parseInt(a.cashierId, 10);
      const idB = parseInt(b.cashierId, 10);
      if (!isNaN(idA) && !isNaN(idB)) return idA - idB;
      return (a.cashierId || '').localeCompare(b.cashierId || '');
    });

  return (
    <div className="manage-members-container animate-fade-in">
      <div className="header-actions">
        <div className="search-box glass-panel">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Search by Name or Cashier ID..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="btn-primary add-btn" onClick={handleOpenModal}>
          <Plus size={18} /> Add New Cashier
        </button>
      </div>

      <div className="members-grid">
        {filteredCashiers.map(cashier => (
          <div key={cashier._id} className="member-card glass-panel hover-scale">
            <div className="card-header">
              <span className="badge">{cashier.cashierId}</span>
              <div className="actions-cell">
                <button className="icon-btn edit" onClick={(e) => { e.stopPropagation(); handleEdit(cashier); }}><Edit2 size={16} /></button>
                <button className="icon-btn delete" onClick={(e) => { e.stopPropagation(); setCashierToDelete(cashier); }}><Trash2 size={16} /></button>
              </div>
            </div>
            <div className="card-body">
              <h3>{cashier.name}</h3>
              <p><strong>Phone:</strong> {cashier.phone}</p>
            </div>
          </div>
        ))}
        {filteredCashiers.length === 0 && (
          <div className="empty-state glass-panel text-center">
            No cashiers found.
          </div>
        )}
      </div>

      {isModalOpen && createPortal(
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content glass-panel animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{isEditMode ? 'Edit Cashier' : 'Create New Cashier'}</h2>
              <button className="icon-btn close-btn" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-grid">
                <div className="input-group">
                  <label>Cashier ID</label>
                  <input type="text" className="input-field" name="cashierId" value={formData.cashierId} onChange={handleInputChange} disabled required />
                </div>
                <div className="input-group">
                  <label>Full Name</label>
                  <input type="text" className="input-field" name="name" value={formData.name} onChange={handleInputChange} required />
                </div>
                <div className="input-group">
                  <label>Phone Number</label>
                  <input type="text" className="input-field" name="phone" value={formData.phone} onChange={handleInputChange} pattern="[0-9]{10}" maxLength="10" title="Phone number must be exactly 10 digits" required />
                </div>
                <div className="input-group">
                  <label>Password</label>
                  <input type="password" className="input-field" name="password" value={formData.password} onChange={handleInputChange} required={!isEditMode} placeholder={isEditMode ? "Leave blank to keep current" : ""} />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : (isEditMode ? 'Update Cashier' : 'Save Cashier')}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal via Portal */}
      {cashierToDelete && createPortal(
        <div className="modal-overlay" onClick={() => setCashierToDelete(null)}>
          <div className="modal-content glass-panel animate-fade-in" style={{maxWidth: '400px', textAlign: 'center'}} onClick={e => e.stopPropagation()}>
            <div style={{color: 'var(--error)', marginBottom: '15px'}}>
              <Trash2 size={48} style={{ margin: '0 auto' }} />
            </div>
            <h2 style={{marginBottom: '10px', fontSize: '1.4rem'}}>Delete Cashier?</h2>
            <p style={{color: 'var(--text-light)', marginBottom: '25px', lineHeight: '1.5'}}>
              Are you sure you want to permanently delete Cashier <strong>{cashierToDelete.name}</strong> (ID: {cashierToDelete.cashierId})? This action cannot be undone.
            </p>
            <div style={{display: 'flex', gap: '15px', justifyContent: 'center'}}>
              <button className="btn-secondary" onClick={() => setCashierToDelete(null)} disabled={loading}>Cancel</button>
              <button className="btn-primary" style={{background: 'var(--error)', border: 'none', color: 'white'}} onClick={confirmDelete} disabled={loading}>
                {loading ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Stylish Error Modal */}
      {errorMsg && createPortal(
        <div className="modal-overlay" onClick={() => setErrorMsg('')} style={{ zIndex: 9999 }}>
          <div className="modal-content glass-panel animate-fade-in" style={{maxWidth: '400px', textAlign: 'center'}} onClick={e => e.stopPropagation()}>
            <div style={{color: 'var(--error)', marginBottom: '15px'}}>
              <div style={{ display: 'inline-flex', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '50%', padding: '15px' }}>
                <X size={40} />
              </div>
            </div>
            <h2 style={{marginBottom: '10px', fontSize: '1.4rem'}}>Action Failed</h2>
            <p style={{color: 'var(--text-light)', marginBottom: '25px', lineHeight: '1.5', fontSize: '1.05rem'}}>
              {errorMsg}
            </p>
            <div style={{display: 'flex', justifyContent: 'center'}}>
              <button className="btn-primary" style={{background: 'var(--error)', border: 'none', color: 'white', width: '100%', padding: '12px'}} onClick={() => setErrorMsg('')}>
                Okay
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ManageCashiers;
