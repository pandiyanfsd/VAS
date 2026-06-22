import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  Coins, 
  PlusCircle, 
  Search, 
  X, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  Edit, 
  Trash2,
  Calendar,
  Filter
} from 'lucide-react';
import './DetailedReports.css'; // Leverage established admin CSS classes

const ManageDonations = () => {
  const [loading, setLoading] = useState(true);
  const [donations, setDonations] = useState([]);
  const [cashiers, setCashiers] = useState([]);
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [submittingDonation, setSubmittingDonation] = useState(false);

  // Form State
  const [donationForm, setDonationForm] = useState({
    name: '',
    date: '',
    amount: '',
    address: '',
    purpose: '',
    cashierId: ''
  });
  const [editingDonationId, setEditingDonationId] = useState(null);
  const [donationError, setDonationError] = useState('');
  const [donationSuccess, setDonationSuccess] = useState('');

  // Filtering States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDonationPurpose, setFilterDonationPurpose] = useState('all');
  const [filterDonationDuration, setFilterDonationDuration] = useState('all');
  const [donationStartDate, setDonationStartDate] = useState('');
  const [donationEndDate, setDonationEndDate] = useState('');

  // Autocomplete state
  const [showPurposeSuggestions, setShowPurposeSuggestions] = useState(false);

  // Custom confirmation dialog state
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    onConfirm: () => {},
    type: 'primary'
  });

  const getTodayDateString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  useEffect(() => {
    setDonationForm(prev => ({ ...prev, date: getTodayDateString() }));
    fetchDonationsAndCashiers();
  }, []);

  const fetchDonationsAndCashiers = async () => {
    setLoading(true);
    try {
      const [donationsRes, cashiersRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/donations`),
        axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/cashiers`)
      ]);
      setDonations(donationsRes.data || []);
      setCashiers(cashiersRes.data || []);
    } catch (error) {
      console.error("Error loading donations or cashiers", error);
    } finally {
      setLoading(false);
    }
  };

  const showCustomConfirm = ({ title, message, confirmText, cancelText, onConfirm, type = 'primary' }) => {
    setConfirmConfig({
      isOpen: true,
      title,
      message,
      confirmText: confirmText || 'Confirm',
      cancelText: cancelText || 'Cancel',
      onConfirm: () => {
        onConfirm();
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      },
      type
    });
  };

  const handleRecordDonation = (e) => {
    e.preventDefault();
    setDonationError('');
    setDonationSuccess('');

    if (!donationForm.name.trim()) {
      setDonationError('Donor Name is required.');
      return;
    }
    if (!donationForm.amount || parseFloat(donationForm.amount) <= 0) {
      setDonationError('Enter a valid amount greater than ₹0.');
      return;
    }
    if (!donationForm.address.trim()) {
      setDonationError('Address is required.');
      return;
    }
    if (!donationForm.purpose.trim()) {
      setDonationError('Purpose is required.');
      return;
    }
    if (!donationForm.cashierId) {
      setDonationError('Please select which Cashier collected this donation.');
      return;
    }

    const actionWord = editingDonationId ? "update" : "record";
    showCustomConfirm({
      title: editingDonationId ? "Update Donation Record" : "Save Donation Record",
      message: `Are you sure you want to ${actionWord} this donation of ₹${donationForm.amount} from ${donationForm.name.toUpperCase()} for ${donationForm.purpose.toUpperCase()}?`,
      confirmText: editingDonationId ? "Yes, Update" : "Yes, Save",
      type: 'primary',
      onConfirm: async () => {
        setSubmittingDonation(true);
        try {
          const payload = {
            name: donationForm.name.toUpperCase(),
            date: donationForm.date,
            amount: Number(donationForm.amount),
            address: donationForm.address.toUpperCase(),
            purpose: donationForm.purpose.toUpperCase(),
            cashierId: donationForm.cashierId
          };

          if (editingDonationId) {
            await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/donations/${editingDonationId}`, payload);
            setDonationSuccess('Donation updated successfully!');
          } else {
            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/donations`, payload);
            setDonationSuccess('Donation recorded successfully!');
          }

          setDonationForm({
            name: '',
            date: getTodayDateString(),
            amount: '',
            address: '',
            purpose: '',
            cashierId: ''
          });
          setEditingDonationId(null);

          setTimeout(() => {
            setShowDonationModal(false);
            setDonationSuccess('');
          }, 1500);

          fetchDonationsAndCashiers();
        } catch (err) {
          console.error("Error saving donation", err);
          setDonationError(err.response?.data?.error || 'Failed to save donation. Please try again.');
        } finally {
          setSubmittingDonation(false);
        }
      }
    });
  };

  const handleDeleteDonation = (id) => {
    showCustomConfirm({
      title: "Delete Donation Record",
      message: "Are you sure you want to delete this donation record? This action cannot be undone.",
      confirmText: "Yes, Delete",
      type: 'danger',
      onConfirm: async () => {
        try {
          await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/donations/${id}`);
          fetchDonationsAndCashiers();
        } catch (err) {
          console.error("Error deleting donation", err);
          alert(err.response?.data?.error || "Failed to delete donation record.");
        }
      }
    });
  };

  const handleEditDonationClick = (donation) => {
    setEditingDonationId(donation._id);
    let dateStr = getTodayDateString();
    if (donation.date) {
      if (typeof donation.date === 'string') {
        dateStr = donation.date.split('T')[0];
      } else if (donation.date instanceof Date) {
        dateStr = donation.date.toISOString().split('T')[0];
      }
    }
    setDonationForm({
      name: donation.name ? donation.name.toUpperCase() : '',
      date: dateStr,
      amount: donation.amount || '',
      address: donation.address ? donation.address.toUpperCase() : '',
      purpose: donation.purpose ? donation.purpose.toUpperCase() : '',
      cashierId: donation.cashierId?._id || donation.cashierId || ''
    });
    setDonationError('');
    setDonationSuccess('');
    setShowDonationModal(true);
  };

  // Helper filters
  const isDateInDuration = (dateVal, durationMode) => {
    if (!dateVal) return false;
    const dDate = new Date(dateVal);
    const today = new Date();
    
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    
    if (durationMode === 'today') {
      return dDate >= todayStart && dDate < tomorrowStart;
    }
    
    if (durationMode === 'week') {
      const dayOfWeek = today.getDay();
      const sundayStart = new Date(todayStart.getTime() - dayOfWeek * 24 * 60 * 60 * 1000);
      return dDate >= sundayStart && dDate < tomorrowStart;
    }
    
    if (durationMode === 'month') {
      const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return dDate >= firstOfMonth && dDate < tomorrowStart;
    }

    if (durationMode === 'custom') {
      if (!donationStartDate && !donationEndDate) return true;
      const start = donationStartDate ? new Date(donationStartDate) : new Date(0);
      const end = donationEndDate ? new Date(donationEndDate) : new Date();
      end.setHours(23, 59, 59, 999);
      return dDate >= start && dDate <= end;
    }

    return true; // 'all'
  };

  // Auto-complete unique purposes
  const recordedPurposes = [...new Set(donations.map(d => d.purpose).filter(Boolean))];
  const matchingPurposes = donationForm.purpose
    ? recordedPurposes.filter(p => p.toUpperCase().includes(donationForm.purpose.toUpperCase()))
    : recordedPurposes;

  // Filtered donations list
  const filteredDonations = donations
    .filter(d => {
      // 1. Filter by search term (name, address, purpose, cashier)
      const matchesSearch = !searchTerm.trim() || 
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.purpose.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.cashierId?.name && d.cashierId.name.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // 2. Filter by purpose
      const matchesPurpose = filterDonationPurpose === 'all' || d.purpose === filterDonationPurpose;
      
      // 3. Filter by date range
      const matchesDuration = isDateInDuration(d.date, filterDonationDuration);

      return matchesSearch && matchesPurpose && matchesDuration;
    });

  return (
    <div className="manage-donations-wrapper animate-fade-in" style={{ padding: '10px 0', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Action Row */}
      <div className="summary-banner glass-panel mb-8" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(16px)', padding: '24px 32px', borderRadius: '24px', border: '1px solid rgba(203, 213, 225, 0.8)', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(79, 70, 229, 0.15)', borderRadius: '16px', color: '#4f46e5' }}>
            <Coins size={32} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.8rem', color: '#0f172a', fontWeight: '900', margin: 0 }}>General Donations Ledger</h1>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Overview and tracking of general donations collected from non-members and the public</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={fetchDonationsAndCashiers} 
            disabled={loading}
            style={{ background: '#ffffff', border: '1px solid #cbd5e1', padding: '12px 20px', borderRadius: '14px', color: '#334155', fontWeight: '800', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button
            onClick={() => {
              setEditingDonationId(null);
              setDonationForm({
                name: '',
                date: getTodayDateString(),
                amount: '',
                address: '',
                purpose: '',
                cashierId: ''
              });
              setDonationError('');
              setDonationSuccess('');
              setShowDonationModal(true);
            }}
            style={{
              background: '#4f46e5',
              color: 'white',
              border: 'none',
              padding: '12px 20px',
              borderRadius: '14px',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)'
            }}
          >
            <PlusCircle size={18} /> Record Donation
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
          <RefreshCw className="animate-spin" size={36} style={{ margin: '0 auto 12px auto' }} />
          Loading donations data...
        </div>
      ) : (
        <>
          {/* Filters Control Panel */}
          <div className="glass-panel p-6 mb-6" style={{ background: 'white', borderRadius: '24px', border: '1px solid #cbd5e1', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', marginBottom: '24px' }}>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: '2 1 300px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Search Donations
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}><Search size={16} /></span>
                  <input
                    type="text"
                    placeholder="Search by Donor Name, Address, Purpose, Cashier..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 38px',
                      borderRadius: '12px',
                      border: '1px solid #cbd5e1',
                      fontWeight: '600',
                      color: '#0f172a',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}>✕</button>
                  )}
                </div>
              </div>

              <div style={{ flex: '1 1 200px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Filter by Purpose
                </label>
                <select
                  value={filterDonationPurpose}
                  onChange={(e) => setFilterDonationPurpose(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    fontWeight: '700',
                    color: '#0f172a',
                    background: 'white',
                    outline: 'none'
                  }}
                >
                  <option value="all">All Purposes</option>
                  {recordedPurposes.map(purpose => (
                    <option key={purpose} value={purpose}>{purpose}</option>
                  ))}
                </select>
              </div>

              <div style={{ flex: '1 1 200px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Filter by Duration
                </label>
                <select
                  value={filterDonationDuration}
                  onChange={(e) => setFilterDonationDuration(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    fontWeight: '700',
                    color: '#0f172a',
                    background: 'white',
                    outline: 'none'
                  }}
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="custom">Custom Date Range</option>
                </select>
              </div>

              {filterDonationDuration === 'custom' && (
                <>
                  <div style={{ flex: '1 1 150px' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={donationStartDate}
                      onChange={(e) => setDonationStartDate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        border: '1px solid #cbd5e1',
                        fontWeight: '600',
                        color: '#0f172a',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div style={{ flex: '1 1 150px' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                      End Date
                    </label>
                    <input
                      type="date"
                      value={donationEndDate}
                      onChange={(e) => setDonationEndDate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        border: '1px solid #cbd5e1',
                        fontWeight: '600',
                        color: '#0f172a',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Metric Totals Panel */}
          {(() => {
            const overallTotal = donations.reduce((sum, d) => sum + (d.amount || 0), 0);
            const purposeWiseTotal = donations
              .filter(d => filterDonationPurpose === 'all' || d.purpose === filterDonationPurpose)
              .reduce((sum, d) => sum + (d.amount || 0), 0);
            const durationWiseTotal = donations
              .filter(d => isDateInDuration(d.date, filterDonationDuration))
              .reduce((sum, d) => sum + (d.amount || 0), 0);
            const combinedFilteredTotal = filteredDonations.reduce((sum, d) => sum + (d.amount || 0), 0);

            return (
              <div className="totals-summary-row" style={{ marginBottom: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <div style={{ background: 'rgba(79, 70, 229, 0.05)', borderRadius: '16px', padding: '16px 20px', border: '1px solid rgba(79, 70, 229, 0.12)' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Overall Total Collected</span>
                  <strong style={{ fontSize: '1.4rem', color: '#4f46e5', fontWeight: '900' }}>₹{overallTotal.toLocaleString('en-IN')}</strong>
                </div>

                <div style={{ background: 'rgba(16, 185, 129, 0.05)', borderRadius: '16px', padding: '16px 20px', border: '1px solid rgba(16, 185, 129, 0.12)' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Purpose-Wise Total</span>
                  <strong style={{ fontSize: '1.4rem', color: '#10b981', fontWeight: '900' }}>
                    ₹{purposeWiseTotal.toLocaleString('en-IN')}
                    <span style={{ fontSize: '0.72rem', fontWeight: '600', color: '#475569', display: 'block', marginTop: '2px', textTransform: 'none' }}>
                      {filterDonationPurpose === 'all' ? '(All Purposes)' : `(Purpose: "${filterDonationPurpose}")`}
                    </span>
                  </strong>
                </div>

                <div style={{ background: 'rgba(232, 121, 249, 0.05)', borderRadius: '16px', padding: '16px 20px', border: '1px solid rgba(232, 121, 249, 0.12)' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Duration-Wise Total</span>
                  <strong style={{ fontSize: '1.4rem', color: '#d946ef', fontWeight: '900' }}>
                    ₹{durationWiseTotal.toLocaleString('en-IN')}
                    <span style={{ fontSize: '0.72rem', fontWeight: '600', color: '#475569', display: 'block', marginTop: '2px', textTransform: 'none' }}>
                      {filterDonationDuration === 'all' && '(All Time)'}
                      {filterDonationDuration === 'today' && '(Today)'}
                      {filterDonationDuration === 'week' && '(This Week)'}
                      {filterDonationDuration === 'month' && '(This Month)'}
                      {filterDonationDuration === 'custom' && `(${donationStartDate || 'Start'} to ${donationEndDate || 'End'})`}
                    </span>
                  </strong>
                </div>

                <div style={{ background: 'rgba(249, 115, 22, 0.05)', borderRadius: '16px', padding: '16px 20px', border: '1px solid rgba(249, 115, 22, 0.12)' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Combined Filtered Total</span>
                  <strong style={{ fontSize: '1.4rem', color: '#f97316', fontWeight: '900' }}>₹{combinedFilteredTotal.toLocaleString('en-IN')}</strong>
                </div>
              </div>
            );
          })()}

          {/* Ledger Table */}
          {filteredDonations.length === 0 ? (
            <div className="glass-panel text-center py-12" style={{ background: 'white', padding: '40px 0', border: '1px solid #cbd5e1', color: '#64748b', fontWeight: '600', borderRadius: '24px' }}>
              No general donations match your filters.
            </div>
          ) : (
            <div className="glass-panel" style={{ background: 'white', borderRadius: '24px', border: '1px solid #cbd5e1', padding: '12px', overflowX: 'auto', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #cbd5e1', color: '#475569', fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase' }}>
                    <th style={{ padding: '14px 10px' }}>Donor Name</th>
                    <th style={{ padding: '14px 10px' }}>Purpose</th>
                    <th style={{ padding: '14px 10px' }}>Amount</th>
                    <th style={{ padding: '14px 10px' }}>Address</th>
                    <th style={{ padding: '14px 10px' }}>Collected By</th>
                    <th style={{ padding: '14px 10px' }}>Date</th>
                    <th style={{ padding: '14px 10px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody style={{ fontSize: '0.9rem', fontWeight: '600', color: '#0f172a' }}>
                  {filteredDonations.map((d, index) => (
                    <tr key={d._id || index} style={{ borderBottom: '1px solid #e2e8f0', background: index % 2 === 0 ? '#f8fafc' : 'white' }}>
                      <td style={{ padding: '14px 10px', fontWeight: '700' }}>{d.name}</td>
                      <td style={{ padding: '14px 10px' }}>
                        <span style={{ background: 'rgba(79, 70, 229, 0.08)', color: '#4f46e5', padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '800', textTransform: 'uppercase' }}>
                          {d.purpose}
                        </span>
                      </td>
                      <td style={{ padding: '14px 10px', color: '#10b981', fontWeight: '800' }}>₹{(d.amount || 0).toLocaleString('en-IN')}</td>
                      <td style={{ padding: '14px 10px', color: '#475569', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={d.address}>
                        {d.address}
                      </td>
                      <td style={{ padding: '14px 10px', color: '#4b5563' }}>
                        {d.cashierId?.name || <em style={{ color: '#9ca3af' }}>External</em>}
                      </td>
                      <td style={{ padding: '14px 10px', color: '#64748b' }}>{d.date ? new Date(d.date).toLocaleDateString('en-IN') : ''}</td>
                      <td style={{ padding: '14px 10px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                          <button 
                            onClick={() => handleEditDonationClick(d)}
                            style={{ background: 'transparent', border: 'none', color: '#4f46e5', cursor: 'pointer', padding: '4px' }}
                            title="Edit Record"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteDonation(d._id)}
                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                            title="Delete Record"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Record / Edit Donation Modal */}
          {showDonationModal && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' }}>
              <div className="glass-panel p-8 animate-scale-up" style={{ background: 'white', borderRadius: '24px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '950', color: '#0f172a' }}>
                    {editingDonationId ? "Edit Donation Record" : "Record General Donation"}
                  </h3>
                  <button onClick={() => {
                    setShowDonationModal(false);
                    setEditingDonationId(null);
                    setDonationForm({
                      name: '',
                      date: getTodayDateString(),
                      amount: '',
                      address: '',
                      purpose: '',
                      cashierId: ''
                    });
                    setDonationError('');
                    setDonationSuccess('');
                  }} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}>
                    <X size={20} />
                  </button>
                </div>

                {donationError && (
                  <div style={{ padding: '12px 16px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '700', marginBottom: '20px', background: '#fef2f2', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
                    <AlertCircle size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} /> {donationError}
                  </div>
                )}
                {donationSuccess && (
                  <div style={{ padding: '12px 16px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '700', marginBottom: '20px', background: '#ecfdf5', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981' }}>
                    <CheckCircle size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} /> {donationSuccess}
                  </div>
                )}

                <form onSubmit={handleRecordDonation} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: '800', color: '#1e293b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Donor Name</label>
                    <input
                      type="text"
                      required
                      value={donationForm.name}
                      onChange={(e) => setDonationForm({ ...donationForm, name: e.target.value.toUpperCase() })}
                      placeholder="e.g. JOHN DOE"
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: '600', color: '#0f172a', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.78rem', fontWeight: '800', color: '#1e293b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Amount (₹)</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={donationForm.amount}
                        onChange={(e) => setDonationForm({ ...donationForm, amount: e.target.value })}
                        placeholder="e.g. 500"
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: '600', color: '#0f172a', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.78rem', fontWeight: '800', color: '#1e293b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Collection Date</label>
                      <input
                        type="date"
                        required
                        value={donationForm.date}
                        onChange={(e) => setDonationForm({ ...donationForm, date: e.target.value })}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: '600', color: '#0f172a', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: '800', color: '#1e293b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Address</label>
                    <input
                      type="text"
                      required
                      value={donationForm.address}
                      onChange={(e) => setDonationForm({ ...donationForm, address: e.target.value.toUpperCase() })}
                      placeholder="e.g. 123 STREET NAME, TOWN"
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: '600', color: '#0f172a', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: '800', color: '#1e293b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Collected By Cashier</label>
                    <select
                      required
                      value={donationForm.cashierId}
                      onChange={(e) => setDonationForm({ ...donationForm, cashierId: e.target.value })}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: '600', color: '#0f172a', outline: 'none', boxSizing: 'border-box', background: 'white' }}
                    >
                      <option value="">Select Cashier...</option>
                      {cashiers.map(c => (
                        <option key={c._id} value={c._id}>{c.name} ({c.cashierId})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: '800', color: '#1e293b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Purpose</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        required
                        value={donationForm.purpose}
                        onChange={(e) => {
                          setDonationForm({ ...donationForm, purpose: e.target.value.toUpperCase() });
                          setShowPurposeSuggestions(true);
                        }}
                        onFocus={() => setShowPurposeSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowPurposeSuggestions(false), 200)}
                        placeholder="e.g. FESTIVAL FUND"
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: '600', color: '#0f172a', outline: 'none', boxSizing: 'border-box' }}
                      />
                      {showPurposeSuggestions && matchingPurposes.length > 0 && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', borderRadius: '10px', border: '1px solid #cbd5e1', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 1000, marginTop: '4px', overflow: 'hidden' }}>
                          {matchingPurposes.map((purpose, idx) => (
                            <div
                              key={idx}
                              onMouseDown={() => {
                                setDonationForm({ ...donationForm, purpose: purpose.toUpperCase() });
                                setShowPurposeSuggestions(false);
                              }}
                              style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem', fontWeight: '600', color: '#0f172a', transition: 'background 0.2s' }}
                              onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                            >
                              {purpose}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submittingDonation}
                    style={{
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      padding: '12px',
                      borderRadius: '12px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      marginTop: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    {submittingDonation ? 'Saving...' : (
                      editingDonationId ? <><CheckCircle size={16} /> Update Donation</> : <><CheckCircle size={16} /> Save Donation</>
                    )}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Custom Confirmation Modal */}
          {confirmConfig.isOpen && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20000, padding: '20px' }}>
              <div className="glass-panel p-6 animate-scale-up" style={{ background: 'white', borderRadius: '24px', width: '100%', maxWidth: '400px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                  <div style={{ 
                    background: confirmConfig.type === 'danger' ? '#fee2e2' : 'rgba(79, 70, 229, 0.1)', 
                    color: confirmConfig.type === 'danger' ? '#ef4444' : '#4f46e5', 
                    width: '56px', 
                    height: '56px', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}>
                    {confirmConfig.type === 'danger' ? <AlertCircle size={28} /> : <CheckCircle size={28} />}
                  </div>
                </div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: '950', color: '#0f172a' }}>{confirmConfig.title}</h3>
                <p style={{ margin: '0 0 24px 0', fontSize: '0.9rem', fontWeight: '600', color: '#475569', lineHeight: '1.5' }}>{confirmConfig.message}</p>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    type="button"
                    onClick={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                    style={{ 
                      flex: 1, 
                      padding: '12px', 
                      borderRadius: '12px', 
                      border: '1px solid #cbd5e1', 
                      background: 'white', 
                      color: '#475569', 
                      fontWeight: '800', 
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                  >
                    {confirmConfig.cancelText}
                  </button>
                  <button 
                    type="button"
                    onClick={confirmConfig.onConfirm}
                    style={{ 
                      flex: 1, 
                      padding: '12px', 
                      borderRadius: '12px', 
                      border: 'none', 
                      background: confirmConfig.type === 'danger' ? '#ef4444' : '#4f46e5', 
                      color: 'white', 
                      fontWeight: '800', 
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = confirmConfig.type === 'danger' ? '#dc2626' : '#4338ca'}
                    onMouseLeave={(e) => e.currentTarget.style.background = confirmConfig.type === 'danger' ? '#ef4444' : '#4f46e5'}
                  >
                    {confirmConfig.confirmText}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ManageDonations;
