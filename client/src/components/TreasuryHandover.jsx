import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { Wallet, Coins, UserCheck, Calendar, FileText, CheckCircle, Plus, AlertCircle, X, DollarSign } from 'lucide-react';

const TreasuryHandover = () => {
  const [summary, setSummary] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCashier, setSelectedCashier] = useState(null);
  const [surrenderAmount, setSurrenderAmount] = useState('');
  const [surrenderDate, setSurrenderDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('Weekly cash settlement');

  const fetchTreasuryData = async () => {
    setLoading(true);
    try {
      const summaryRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/surrenders/summary`);
      const historyRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/surrenders`);
      setSummary(summaryRes.data);
      setHistory(historyRes.data);
    } catch (error) {
      console.error('Error fetching treasury data', error);
      setErrorMsg('Failed to load treasury handover records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTreasuryData();
  }, []);

  const handleOpenHandoverModal = (cashier) => {
    setSelectedCashier(cashier);
    setSurrenderAmount(cashier.cashInHand > 0 ? cashier.cashInHand : '');
    setSurrenderDate(new Date().toISOString().split('T')[0]);
    setNotes(`Cash settlement for ${cashier.name}`);
    setIsModalOpen(true);
  };

  const handleRecordSurrender = async (e) => {
    e.preventDefault();
    if (!selectedCashier || !surrenderAmount || Number(surrenderAmount) <= 0) {
      setErrorMsg('Please enter a valid cash amount.');
      return;
    }

    // Feature 2: Surrendered amount must not exceed current cash in hand
    if (Number(surrenderAmount) > selectedCashier.cashInHand) {
      setErrorMsg(`Surrendered amount (₹${Number(surrenderAmount).toLocaleString()}) cannot exceed the Current Cash in Hand (₹${selectedCashier.cashInHand.toLocaleString()}). Please enter an amount equal to or less than ₹${selectedCashier.cashInHand.toLocaleString()}.`);
      return;
    }

    try {
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/surrenders`, {
        cashierId: selectedCashier._id,
        amount: Number(surrenderAmount),
        surrenderDate: surrenderDate ? new Date(surrenderDate) : new Date(),
        notes
      });
      setSuccessMsg(`Successfully recorded ₹${Number(surrenderAmount).toLocaleString()} surrender from ${selectedCashier.name}!`);
      setIsModalOpen(false);
      fetchTreasuryData();
    } catch (error) {
      setErrorMsg(error.response?.data?.error || 'Failed to record surrender transaction.');
    }
  };

  const getCashierStatusBadge = (cashier) => {
    if (cashier.totalCollected === 0) {
      return {
        text: 'Not Collected',
        bg: '#f1f5f9',
        color: '#64748b',
        border: '#cbd5e1',
        barColor: '#94a3b8'
      };
    } else if (cashier.totalSurrendered === 0) {
      return {
        text: 'Pending Handover',
        bg: 'rgba(245, 158, 11, 0.15)',
        color: '#d97706',
        border: '#fde68a',
        barColor: '#f59e0b'
      };
    } else if (cashier.cashInHand > 0) {
      return {
        text: 'Partially Settled',
        bg: 'rgba(59, 130, 246, 0.15)',
        color: '#2563eb',
        border: '#bfdbfe',
        barColor: '#3b82f6'
      };
    } else {
      return {
        text: 'Fully Settled',
        bg: 'rgba(16, 185, 129, 0.15)',
        color: '#10b981',
        border: '#a7f3d0',
        barColor: '#10b981'
      };
    }
  };

  const totalVillageCollected = summary.reduce((acc, curr) => acc + curr.totalCollected, 0);
  const totalVillageSurrendered = summary.reduce((acc, curr) => acc + curr.totalSurrendered, 0);
  const totalPendingInHand = Math.max(0, totalVillageCollected - totalVillageSurrendered);

  return (
    <div className="treasury-container animate-fade-in" style={{ padding: '20px 0', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Banner */}
      <div className="treasury-overview glass-panel mb-8" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(16px)', color: '#0f172a', padding: '32px', borderRadius: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)', border: '1px solid rgba(203, 213, 225, 0.8)' }}>
        <div style={{ padding: '24px', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '20px', border: '1px solid rgba(56, 189, 248, 0.3)', transition: 'transform 0.2s', boxShadow: '0 4px 12px rgba(56, 189, 248, 0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{ padding: '10px', background: '#38bdf8', borderRadius: '12px', color: '#ffffff', boxShadow: '0 4px 10px rgba(56,189,248,0.4)' }}>
              <Coins size={24} />
            </div>
            <span style={{ fontSize: '0.9rem', color: '#0369a1', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '800' }}>Total Cash Collected</span>
          </div>
          <strong style={{ fontSize: '2.5rem', color: '#0284c7', fontWeight: '900' }}>₹{totalVillageCollected.toLocaleString()}</strong>
          <span style={{ fontSize: '0.85rem', color: '#075985', display: 'block', marginTop: '6px', fontWeight: '600' }}>All dues collected across cashiers</span>
        </div>

        <div style={{ padding: '24px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '20px', border: '1px solid rgba(16, 185, 129, 0.3)', transition: 'transform 0.2s', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{ padding: '10px', background: '#10b981', borderRadius: '12px', color: '#ffffff', boxShadow: '0 4px 10px rgba(16,185,129,0.4)' }}>
              <UserCheck size={24} />
            </div>
            <span style={{ fontSize: '0.9rem', color: '#047857', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '800' }}>Total Cash Surrendered</span>
          </div>
          <strong style={{ fontSize: '2.5rem', color: '#10b981', fontWeight: '900' }}>₹{totalVillageSurrendered.toLocaleString()}</strong>
          <span style={{ fontSize: '0.85rem', color: '#065f46', display: 'block', marginTop: '6px', fontWeight: '600' }}>Remitted & verified in Admin Treasury</span>
        </div>

        <div style={{ padding: '24px', background: totalPendingInHand > 0 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(241, 245, 249, 0.8)', borderRadius: '20px', border: `1px solid ${totalPendingInHand > 0 ? 'rgba(245, 158, 11, 0.35)' : 'rgba(203, 213, 225, 0.8)'}`, transition: 'transform 0.2s', boxShadow: totalPendingInHand > 0 ? '0 4px 12px rgba(245, 158, 11, 0.08)' : 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{ padding: '10px', background: totalPendingInHand > 0 ? '#f59e0b' : '#64748b', borderRadius: '12px', color: '#ffffff', boxShadow: totalPendingInHand > 0 ? '0 4px 10px rgba(245,158,11,0.4)' : 'none' }}>
              <Wallet size={24} />
            </div>
            <span style={{ fontSize: '0.9rem', color: totalPendingInHand > 0 ? '#b45309' : '#475569', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '800' }}>Pending Cashier Remittance</span>
          </div>
          <strong style={{ fontSize: '2.5rem', color: totalPendingInHand > 0 ? '#d97706' : '#475569', fontWeight: '900' }}>₹{totalPendingInHand.toLocaleString()}</strong>
          <span style={{ fontSize: '0.85rem', color: totalPendingInHand > 0 ? '#92400e' : '#64748b', display: 'block', marginTop: '6px', fontWeight: '600' }}>Cash currently held by cashiers</span>
        </div>
      </div>

      {/* Cashier Handover Status Cards */}
      <div className="section-title mb-6" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.6rem', color: '#0f172a', fontWeight: '800' }}>Cashier Balances & Settlements</h2>
        <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '700' }}>{summary.length} Registered Cashiers</span>
      </div>

      {loading && summary.length === 0 ? (
        <div className="text-center py-12 glass-panel mb-8" style={{ padding: '40px 0', color: '#64748b' }}>Loading treasury records...</div>
      ) : (
        <div className="cashiers-grid mb-12" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '24px' }}>
          {summary.map(cashier => {
            const badgeInfo = getCashierStatusBadge(cashier);
            return (
            <div key={cashier._id} className="cashier-card glass-panel hover-scale" style={{ background: '#ffffff', borderRadius: '24px', padding: '28px', border: '1px solid #cbd5e1', borderTop: `6px solid ${badgeInfo.barColor}`, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.4rem', color: '#0f172a', fontWeight: '800', margin: '0 0 4px 0' }}>{cashier.name}</h3>
                    <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>ID: #{cashier.cashierId} • 📞 {cashier.phone}</span>
                  </div>
                  <span className="badge" style={{ background: badgeInfo.bg, color: badgeInfo.color, border: `1px solid ${badgeInfo.border}`, fontWeight: '800', fontSize: '0.8rem', padding: '6px 12px', borderRadius: '12px' }}>
                    {badgeInfo.text}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', display: 'block' }}>Total Collected</span>
                    <strong style={{ fontSize: '1.2rem', color: '#334155', fontWeight: '800' }}>₹{cashier.totalCollected.toLocaleString()}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', display: 'block' }}>Surrendered</span>
                    <strong style={{ fontSize: '1.2rem', color: '#10b981', fontWeight: '800' }}>₹{cashier.totalSurrendered.toLocaleString()}</strong>
                  </div>
                </div>

                <div style={{ background: cashier.cashInHand > 0 ? 'rgba(254, 243, 199, 0.6)' : 'rgba(241, 245, 249, 0.6)', padding: '16px 20px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', border: `1px solid ${cashier.cashInHand > 0 ? '#fde68a' : '#e2e8f0'}` }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: '800', color: cashier.cashInHand > 0 ? '#92400e' : '#64748b' }}>Cash in Hand:</span>
                  <strong style={{ fontSize: '1.5rem', fontWeight: '900', color: cashier.cashInHand > 0 ? '#b45309' : '#10b981' }}>₹{cashier.cashInHand.toLocaleString()}</strong>
                </div>
              </div>

              {/* Feature 3: Disable handover button when no cash collected or no cash in hand */}
              {(() => {
                const isDisabled = cashier.totalCollected === 0 || cashier.cashInHand <= 0;
                const disabledReason = cashier.totalCollected === 0 
                  ? 'No cash has been collected by this cashier yet' 
                  : cashier.cashInHand <= 0 
                    ? 'No cash in hand — all collections have been surrendered' 
                    : '';
                return (
                  <button 
                    onClick={() => !isDisabled && handleOpenHandoverModal(cashier)}
                    disabled={isDisabled}
                    title={isDisabled ? disabledReason : 'Record a cash surrender handover'}
                    className="btn-primary" 
                    style={{ 
                      width: '100%', padding: '14px', borderRadius: '16px', fontWeight: '800', 
                      display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', 
                      background: isDisabled ? '#cbd5e1' : '#2563eb', 
                      color: isDisabled ? '#94a3b8' : '#ffffff',
                      cursor: isDisabled ? 'not-allowed' : 'pointer', 
                      opacity: isDisabled ? 0.7 : 1,
                      transition: 'all 0.2s',
                      border: 'none'
                    }}
                  >
                    <Plus size={18} /> {isDisabled ? (cashier.totalCollected === 0 ? 'No Collections Yet' : 'Fully Settled') : 'Record Surrender Handover'}
                  </button>
                );
              })()}
            </div>
            );
          })}
          {summary.length === 0 && (
            <div className="empty-state glass-panel text-center col-span-full py-12" style={{ gridColumn: '1/-1', padding: '40px 0', color: '#94a3b8', fontSize: '1.1rem' }}>
              No cashiers registered in the system yet.
            </div>
          )}
        </div>
      )}

      {/* Handover Transactions History Ledger */}
      <div className="section-title mb-6" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.6rem', color: '#0f172a', fontWeight: '800' }}>Treasury Handover Log</h2>
        <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '700' }}>{history.length} Handover Transactions</span>
      </div>

      <div className="ledger-card glass-panel" style={{ background: '#ffffff', borderRadius: '24px', padding: '28px', border: '1px solid #cbd5e1', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '16px 12px', textAlign: 'left', color: '#475569', fontWeight: '800', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date & Time</th>
              <th style={{ padding: '16px 12px', textAlign: 'left', color: '#475569', fontWeight: '800', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cashier Info</th>
              <th style={{ padding: '16px 12px', textAlign: 'left', color: '#475569', fontWeight: '800', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Surrendered Amount</th>
              <th style={{ padding: '16px 12px', textAlign: 'left', color: '#475569', fontWeight: '800', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Received By</th>
              <th style={{ padding: '16px 12px', textAlign: 'left', color: '#475569', fontWeight: '800', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Notes & Purpose</th>
              <th style={{ padding: '16px 12px', textAlign: 'center', color: '#475569', fontWeight: '800', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {history.map((tx, idx) => (
              <tr key={tx._id || idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                <td style={{ padding: '16px 12px', color: '#1e293b', fontWeight: '700' }}>
                  {new Date(tx.surrenderDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  <span style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600' }}>{new Date(tx.surrenderDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                </td>
                <td style={{ padding: '16px 12px' }}>
                  <strong style={{ color: '#0f172a', display: 'block', fontSize: '1rem' }}>{tx.cashierId?.name || 'Unknown Cashier'}</strong>
                  <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>ID: #{tx.cashierId?.cashierId || 'N/A'}</span>
                </td>
                <td style={{ padding: '16px 12px' }}>
                  <strong style={{ color: '#10b981', fontSize: '1.15rem', fontWeight: '800' }}>₹{(tx.amount || 0).toLocaleString()}</strong>
                </td>
                <td style={{ padding: '16px 12px', color: '#475569', fontWeight: '600' }}>{tx.receivedByAdmin}</td>
                <td style={{ padding: '16px 12px', color: '#475569', fontStyle: 'italic', maxWidth: '300px' }}>{tx.notes}</td>
                <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: '800', fontSize: '0.8rem', padding: '6px 12px', borderRadius: '12px' }}>
                    <CheckCircle size={14} /> Verified
                  </span>
                </td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr>
                <td colSpan="6" style={{ padding: '40px 0', textAlign: 'center', color: '#94a3b8', fontSize: '1.1rem' }}>No cash surrender transactions recorded yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Record Handover Modal Overlay */}
      {isModalOpen && createPortal(
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)} style={{ zIndex: 9999 }}>
          <div className="modal-content glass-panel animate-fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', borderRadius: '28px', padding: '36px', background: 'rgba(255, 255, 255, 0.95)', border: '1px solid #cbd5e1', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.6rem', color: '#0f172a', fontWeight: '900', margin: 0 }}>Record Treasury Remittance</h2>
                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Cash Handover Verification Form</span>
              </div>
              <button onClick={() => setIsModalOpen(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', padding: '10px', cursor: 'pointer', color: '#64748b', transition: 'all 0.2s' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleRecordSurrender}>
              <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '20px', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '800', display: 'block', marginBottom: '4px' }}>Remitting Cashier</span>
                <strong style={{ fontSize: '1.3rem', color: '#0f172a', display: 'block', fontWeight: '900' }}>{selectedCashier?.name} (ID: #{selectedCashier?.cashierId})</strong>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #cbd5e1', fontSize: '0.9rem' }}>
                  <span style={{ color: '#64748b', fontWeight: '700' }}>Current Cash in Hand:</span>
                  <strong style={{ color: '#b45309', fontWeight: '800' }}>₹{selectedCashier?.cashInHand.toLocaleString()}</strong>
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '800', color: '#1e293b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Surrendered Cash Amount (₹)</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: '16px', fontSize: '1.4rem', color: '#10b981', fontWeight: '800' }}>₹</span>
                  <input 
                    type="number" 
                    value={surrenderAmount} 
                    onChange={(e) => setSurrenderAmount(e.target.value)} 
                    placeholder="e.g. 5000" 
                    required 
                    min="1"
                    style={{ width: '100%', padding: '16px 16px 16px 44px', borderRadius: '16px', border: '2px solid #cbd5e1', fontSize: '1.3rem', fontWeight: '800', color: '#0f172a', outline: 'none', background: '#ffffff', transition: 'all 0.2s' }}
                    onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                    onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '800', color: '#1e293b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Remittance Date</label>
                <input 
                  type="date" 
                  value={surrenderDate} 
                  onChange={(e) => setSurrenderDate(e.target.value)} 
                  required 
                  style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '2px solid #cbd5e1', fontSize: '1.1rem', fontWeight: '700', color: '#0f172a', outline: 'none', background: '#ffffff', transition: 'all 0.2s' }}
                  onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                  onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                />
              </div>

              <div style={{ marginBottom: '28px' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '800', color: '#1e293b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Remittance Notes & Purpose</label>
                <textarea 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)} 
                  placeholder="Notes about this cash settlement..." 
                  rows="3"
                  style={{ width: '100%', padding: '14px 16px', borderRadius: '16px', border: '2px solid #cbd5e1', fontSize: '0.95rem', fontWeight: '600', color: '#334155', outline: 'none', background: '#ffffff', transition: 'all 0.2s', resize: 'vertical' }}
                  onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                  onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                />
              </div>

              <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  style={{ padding: '14px 24px', borderRadius: '16px', border: '1px solid #cbd5e1', background: '#f1f5f9', color: '#475569', fontWeight: '800', fontSize: '1rem', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ padding: '14px 28px', borderRadius: '16px', background: '#10b981', color: '#ffffff', fontWeight: '800', fontSize: '1rem', border: 'none', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}
                >
                  Verify & Remit to Treasury
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Success Notification Modal */}
      {successMsg && createPortal(
        <div className="modal-overlay" onClick={() => setSuccessMsg('')} style={{ zIndex: 9999 }}>
          <div className="modal-content glass-panel animate-fade-in" style={{ maxWidth: '440px', borderRadius: '28px', padding: '36px', textAlign: 'center', background: 'rgba(255, 255, 255, 0.95)', border: '1px solid #cbd5e1', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
            <div style={{ color: '#10b981', marginBottom: '20px' }}>
              <div style={{ display: 'inline-flex', background: 'rgba(16, 185, 129, 0.15)', borderRadius: '50%', padding: '20px' }}>
                <CheckCircle size={56} />
              </div>
            </div>
            <h2 style={{ fontSize: '1.8rem', color: '#0f172a', fontWeight: '900', marginBottom: '12px' }}>Handover Verified!</h2>
            <p style={{ color: '#475569', fontSize: '1.1rem', lineHeight: '1.6', marginBottom: '28px', fontWeight: '600' }}>{successMsg}</p>
            <button className="btn-primary" style={{ background: '#10b981', border: 'none', color: '#ffffff', width: '100%', padding: '16px', borderRadius: '16px', fontWeight: '800', fontSize: '1.1rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }} onClick={() => setSuccessMsg('')}>
              Done
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Error Notification Modal */}
      {errorMsg && createPortal(
        <div className="modal-overlay" onClick={() => setErrorMsg('')} style={{ zIndex: 9999 }}>
          <div className="modal-content glass-panel animate-fade-in" style={{ maxWidth: '440px', borderRadius: '28px', padding: '36px', textAlign: 'center', background: 'rgba(255, 255, 255, 0.95)', border: '1px solid #cbd5e1', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
            <div style={{ color: '#ef4444', marginBottom: '20px' }}>
              <div style={{ display: 'inline-flex', background: 'rgba(239, 68, 68, 0.15)', borderRadius: '50%', padding: '20px' }}>
                <AlertCircle size={56} />
              </div>
            </div>
            <h2 style={{ fontSize: '1.8rem', color: '#0f172a', fontWeight: '900', marginBottom: '12px' }}>Handover Failed</h2>
            <p style={{ color: '#475569', fontSize: '1.1rem', lineHeight: '1.6', marginBottom: '28px', fontWeight: '600' }}>{errorMsg}</p>
            <button className="btn-primary" style={{ background: '#ef4444', border: 'none', color: '#ffffff', width: '100%', padding: '16px', borderRadius: '16px', fontWeight: '800', fontSize: '1.1rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(239,68,68,0.3)' }} onClick={() => setErrorMsg('')}>
              Okay
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default TreasuryHandover;
