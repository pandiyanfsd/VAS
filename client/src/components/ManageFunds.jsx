import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { Search, Plus, Edit2, Trash2, X, Wallet } from 'lucide-react';
import './ManageMembers.css'; // Reusing member styles for consistent UI

const getMonthName = (monthNumber) => {
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return months[monthNumber - 1] || monthNumber;
};

const getShortMonthName = (monthNumber) => {
  const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return shortMonths[monthNumber - 1] || monthNumber;
};

const cleanFundName = (name, type) => {
  if (type === 'Monthly') {
    return name.replace(/\bmonthly\b/gi, '').replace(/\s+/g, ' ').trim();
  }
  return name;
};

const getFundColor = (type = '') => {
  const normalized = type.toLowerCase();
  switch (normalized) {
    case 'monthly':
      return '#14b8a6'; // Teal for all monthly funds
    case 'yearly':
      return '#4f46e5'; // Indigo
    case 'one-time':
      return '#d97706'; // Orange/Amber
    case 'death fund':
      return '#374151'; // Charcoal
    case 'festival':
      return '#db2777'; // Rose/Pink
    case 'donation':
      return '#059669'; // Emerald
    default:
      return '#475569'; // Slate
  }
};

const getBadgeStyle = (type = '') => {
  const color = getFundColor(type);
  return { background: `linear-gradient(135deg, ${color}, ${color}cc)` };
};

const getCardStyle = (type = '') => {
  const color = getFundColor(type);
  return { 
    border: `1px solid ${color}35`,
    boxShadow: `0 4px 15px ${color}08`,
    background: 'rgba(255, 255, 255, 0.75)'
  };
};

const ManageFunds = () => {
  const [funds, setFunds] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [fundToDelete, setFundToDelete] = useState(null);
  const [selectedFund, setSelectedFund] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);
  const [filterType, setFilterType] = useState('All');
  const [originalType, setOriginalType] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    targetAmount: '',
    dueDate: '',
    fundType: 'Monthly',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1
  });

  const fetchFunds = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/funds`);
      setFunds(res.data);
    } catch (error) {
      console.error("Error fetching funds", error);
    }
  };

  useEffect(() => {
    fetchFunds();
  }, []);

  const handleOpenModal = () => {
    setIsEditMode(false);
    setEditId(null);
    setOriginalType('');
    setFormData({
      name: '',
      description: '',
      targetAmount: '',
      dueDate: '',
      fundType: 'Monthly',
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1
    });
    setIsModalOpen(true);
  };

  const handleEdit = (fund) => {
    setIsEditMode(true);
    setEditId(fund._id);
    setOriginalType(fund.fundType);
    setFormData({
      name: fund.name,
      description: fund.description || '',
      targetAmount: fund.targetAmount,
      dueDate: fund.dueDate ? new Date(fund.dueDate).toISOString().split('T')[0] : '',
      fundType: fund.fundType,
      year: fund.year || new Date().getFullYear(),
      month: fund.month || new Date().getMonth() + 1
    });
    setIsModalOpen(true);
  };

  const handleInputChange = (e) => {
    let { name, value } = e.target;
    if (name === 'name') value = value.toUpperCase();
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prepare payload
    const payload = {
      ...formData,
      targetAmount: Number(formData.targetAmount),
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1
    };

    if (!payload.dueDate) delete payload.dueDate; // Handle empty date

    // Check for duplicate name if we are creating a new fund
    if (!isEditMode) {
      const isDuplicate = funds.some(f => f.name === formData.name);
      if (isDuplicate) {
        setPendingPayload(payload);
        setDuplicateWarning(true);
        return;
      }
    }

    await executeSubmit(payload);
  };

  const executeSubmit = async (payload) => {
    setLoading(true);
    setDuplicateWarning(false);
    try {
      if (isEditMode) {
        await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/funds/${editId}`, payload);
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/funds`, payload);
      }
      setIsModalOpen(false);
      fetchFunds();
    } catch (error) {
      setErrorMsg(error.response?.data?.error || `Failed to ${isEditMode ? 'update' : 'create'} fund.`);
    } finally {
      setLoading(false);
      setPendingPayload(null);
    }
  };

  const confirmDelete = async () => {
    if (!fundToDelete) return;
    setLoading(true);
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/funds/${fundToDelete._id}`);
      fetchFunds();
      setFundToDelete(null);
    } catch (error) {
      setErrorMsg(error.response?.data?.error || "Failed to delete fund.");
    } finally {
      setLoading(false);
    }
  };

  const filteredFunds = funds.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          f.fundType.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'All' || f.fundType === filterType;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="manage-members-container animate-fade-in">
      <div className="header-actions">
        <div className="search-box glass-panel">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Search by Fund Name or Type..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select 
          className="input-field glass-panel" 
          style={{ width: 'auto', marginBottom: 0, padding: '12px 20px', borderRadius: '14px', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', cursor: 'pointer' }}
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="All">All Types</option>
          <option value="Monthly">Monthly</option>
          <option value="Yearly">Yearly</option>
          <option value="One-time">One-time</option>
          <option value="Death Fund">Death Fund</option>
          <option value="Festival">Festival</option>
          <option value="Donation">Donation</option>
          <option value="Others">Others</option>
        </select>
        <button className="btn-primary add-btn" onClick={handleOpenModal}>
          <Plus size={18} /> Create New Fund
        </button>
      </div>

      <div className="members-grid">
        {filteredFunds.map(fund => (
          <div key={fund._id} className="member-card glass-panel hover-scale" onClick={() => setSelectedFund(fund)} style={{ cursor: 'pointer', padding: '20px', ...getCardStyle(fund.fundType) }}>
            <div className="card-header" style={{
              background: `${getFundColor(fund.fundType)}12`,
              borderBottom: `1px solid ${getFundColor(fund.fundType)}25`,
              padding: '12px 20px',
              margin: '-20px -20px 15px -20px',
              borderTopLeftRadius: '19px',
              borderTopRightRadius: '19px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span className="badge" style={getBadgeStyle(fund.fundType)}>{fund.fundType}</span>
              <div className="actions-cell">
                <button className="icon-btn edit" onClick={(e) => { e.stopPropagation(); handleEdit(fund); }}><Edit2 size={16} /></button>
                <button className="icon-btn delete" onClick={(e) => { e.stopPropagation(); setFundToDelete(fund); }}><Trash2 size={16} /></button>
              </div>
            </div>
            <div className="card-body">
              <h3>
                {cleanFundName(fund.name, fund.fundType)}
                {fund.fundType.toLowerCase() === 'monthly' && ` ${getShortMonthName(fund.month)} ${fund.year}`}
              </h3>
              <p><strong>Amount:</strong> <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '1.1rem' }}>₹{fund.targetAmount}</span></p>
              <p><strong>Type:</strong> {fund.fundType}</p>
              {fund.fundType.toLowerCase() === 'monthly' && (
                <p><strong>Fund Period:</strong> {getMonthName(fund.month)} {fund.year}</p>
              )}
              <p><strong>Created Date:</strong> {new Date(fund.createdAt || new Date()).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              {fund.dueDate && <p><strong>Due Date:</strong> {new Date(fund.dueDate).toLocaleDateString()}</p>}
            </div>
          </div>
        ))}
        {filteredFunds.length === 0 && (
          <div className="empty-state glass-panel text-center">
            No funds found.
          </div>
        )}
      </div>

      {isModalOpen && createPortal(
        <div className="modal-overlay">
          <div className="modal-content glass-panel animate-fade-in" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>{isEditMode ? 'Edit Fund' : 'Create New Fund'}</h2>
              <button className="icon-btn close-btn" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-grid">
                <div className="input-group col-span-2">
                  <label>Fund Name</label>
                  <input type="text" className="input-field" name="name" value={formData.name} onChange={handleInputChange} required />
                </div>
                
                <div className="input-group">
                  <label>Amount (₹)</label>
                  <input type="number" className="input-field" name="targetAmount" value={formData.targetAmount} onChange={handleInputChange} required />
                </div>

                <div className="input-group">
                  <label>Fund Type</label>
                  <select className="input-field" name="fundType" value={formData.fundType} onChange={handleInputChange} disabled={isEditMode && originalType?.toLowerCase() === 'monthly'} required>
                    <option value="Monthly">Monthly</option>
                    <option value="Yearly">Yearly</option>
                    <option value="One-time">One-time</option>
                    <option value="Death Fund">Death Fund</option>
                    <option value="Festival">Festival</option>
                    <option value="Donation">Donation</option>
                    <option value="Others">Others</option>
                  </select>
                </div>

                <div className="input-group col-span-2">
                  <label>Due Date (Optional)</label>
                  <input type="date" className="input-field" name="dueDate" value={formData.dueDate} onChange={handleInputChange} />
                </div>

                <div className="input-group col-span-2">
                  <label>Description (Optional)</label>
                  <textarea className="input-field" name="description" value={formData.description} onChange={handleInputChange} rows="2"></textarea>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : (isEditMode ? 'Update Fund' : 'Create Fund')}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {selectedFund && createPortal(
        <div className="modal-overlay" onClick={() => setSelectedFund(null)}>
          <div className="modal-content glass-panel details-modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Fund Details</h2>
              <button className="icon-btn close-btn" onClick={() => setSelectedFund(null)}><X size={20} /></button>
            </div>
            <div className="modal-body details-body">
              <div className="details-header" style={{
                background: `${getFundColor(selectedFund.fundType)}15`,
                padding: '15px 20px',
                margin: '-20px -20px 20px -20px',
                borderBottom: `1px solid ${getFundColor(selectedFund.fundType)}30`,
                display: 'flex',
                alignItems: 'center'
              }}>
                <span className="badge" style={getBadgeStyle(selectedFund.fundType)}>{selectedFund.fundType}</span>
              </div>
              <div className="details-grid">
                <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                  <h3 style={{ margin: '0 0 10px 0', fontSize: '1.4rem', color: 'var(--text-dark)' }}>
                    {cleanFundName(selectedFund.name, selectedFund.fundType)}
                    {selectedFund.fundType.toLowerCase() === 'monthly' && ` ${getShortMonthName(selectedFund.month)} ${selectedFund.year}`}
                  </h3>
                </div>
                <div className="detail-item"><strong>Amount:</strong> <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '1.2rem' }}>₹{selectedFund.targetAmount}</span></div>
                {selectedFund.fundType.toLowerCase() === 'monthly' && (
                  <div className="detail-item"><strong>Fund Period:</strong> {getMonthName(selectedFund.month)} {selectedFund.year}</div>
                )}
                <div className="detail-item"><strong>Created Date:</strong> {new Date(selectedFund.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                {selectedFund.dueDate && (
                  <div className="detail-item"><strong>Due Date:</strong> {new Date(selectedFund.dueDate).toLocaleDateString()}</div>
                )}
                <div className="detail-item"><strong>Created On:</strong> {new Date(selectedFund.createdAt).toLocaleDateString()}</div>
                <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                  <strong>Description:</strong> {selectedFund.description || 'No description provided.'}
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {fundToDelete && createPortal(
        <div className="modal-overlay" onClick={() => setFundToDelete(null)}>
          <div className="modal-content glass-panel animate-fade-in" style={{maxWidth: '400px', textAlign: 'center'}} onClick={e => e.stopPropagation()}>
            <div style={{color: 'var(--error)', marginBottom: '15px'}}>
              <Trash2 size={48} style={{ margin: '0 auto' }} />
            </div>
            <h2 style={{marginBottom: '10px', fontSize: '1.4rem'}}>Delete Fund?</h2>
            <p style={{color: 'var(--text-light)', marginBottom: '25px', lineHeight: '1.5'}}>
              Are you sure you want to permanently delete <strong>{fundToDelete.name}</strong>? This will also remove all associated member dues. This action cannot be undone.
            </p>
            <div style={{display: 'flex', gap: '15px', justifyContent: 'center'}}>
              <button className="btn-secondary" onClick={() => setFundToDelete(null)} disabled={loading}>Cancel</button>
              <button className="btn-primary" style={{background: 'var(--error)', border: 'none', color: 'white'}} onClick={confirmDelete} disabled={loading}>
                {loading ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {duplicateWarning && createPortal(
        <div className="modal-overlay" onClick={() => setDuplicateWarning(false)}>
          <div className="modal-content glass-panel animate-fade-in" style={{maxWidth: '400px', textAlign: 'center'}} onClick={e => e.stopPropagation()}>
            <div style={{color: '#f59e0b', marginBottom: '15px'}}>
              <Wallet size={48} style={{ margin: '0 auto' }} />
            </div>
            <h2 style={{marginBottom: '10px', fontSize: '1.4rem'}}>Duplicate Name Detected</h2>
            <p style={{color: 'var(--text-light)', marginBottom: '25px', lineHeight: '1.5'}}>
              A fund named <strong>{pendingPayload?.name}</strong> already exists. Are you sure you want to create another fund with the exact same name?
            </p>
            <div style={{display: 'flex', gap: '15px', justifyContent: 'center'}}>
              <button className="btn-secondary" onClick={() => { setDuplicateWarning(false); setPendingPayload(null); }} disabled={loading}>Cancel</button>
              <button className="btn-primary" onClick={() => executeSubmit(pendingPayload)} disabled={loading}>
                {loading ? 'Creating...' : 'Yes, Create Anyway'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

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

export default ManageFunds;
