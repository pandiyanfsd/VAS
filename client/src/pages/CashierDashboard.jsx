import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  LayoutDashboard, 
  Search, 
  CreditCard, 
  Coins, 
  LogOut, 
  Menu, 
  X, 
  Printer, 
  CheckCircle, 
  AlertCircle, 
  Receipt,
  User,
  ArrowRight,
  RefreshCw,
  Lock
} from 'lucide-react';
import './AdminDashboard.css'; // Reuses structural sidebar layouts
import ManageExpenses from '../components/ManageExpenses';

const CashierDashboard = () => {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('collect'); // collect, receipts, handovers, expenses
  const [cashier, setCashier] = useState(null);
  
  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdStatus, setPwdStatus] = useState({ type: '', message: '' });
  const [pwdLoading, setPwdLoading] = useState(false);
  
  // Financial metrics
  const [stats, setStats] = useState({
    totalCollected: 0,
    totalSurrendered: 0,
    cashInHand: 0
  });

  // Search & Member Selection
  const [searchTerm, setSearchTerm] = useState('');
  const [allMembers, setAllMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [unpaidDues, setUnpaidDues] = useState([]);
  const [loadingDues, setLoadingDues] = useState(false);

  // All dues (for totals)
  const [allDues, setAllDues] = useState([]);

  const getTodayDateString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Payment Form State
  const [paymentSplits, setPaymentSplits] = useState({});
  const [selectedFunds, setSelectedFunds] = useState({});
  const [paymentMode, setPaymentMode] = useState('cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentDate, setPaymentDate] = useState(getTodayDateString());
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentToConfirm, setPaymentToConfirm] = useState(null);

  // Allotment mode
  const [allotmentMode, setAllotmentMode] = useState('auto'); // 'auto' | 'manual'
  const [autoAmount, setAutoAmount] = useState('');
  const [autoSplitPreview, setAutoSplitPreview] = useState([]);
  const [showAutoPreview, setShowAutoPreview] = useState(false);

  // Manual mode filters
  const [fundTypeFilter, setFundTypeFilter] = useState('all');
  const [fundNameSearch, setFundNameSearch] = useState('');

  // History Lists
  const [receiptHistory, setReceiptHistory] = useState([]);
  const [handoverHistory, setHandoverHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // UI Modals
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Detailed Stats Modal State
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsModalType, setDetailsModalType] = useState('allotted'); // 'allotted' | 'paid' | 'outstanding'
  const [modalSearchTerm, setModalSearchTerm] = useState('');

  const handleOpenDetailsModal = (type) => {
    setDetailsModalType(type);
    setModalSearchTerm('');
    setShowDetailsModal(true);
  };

  // 1. Verify Cashier Authentication
  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const storedUser = localStorage.getItem('user');

    if (!token || role !== 'cashier' || !storedUser) {
      localStorage.clear();
      navigate('/login');
    } else {
      const parsedUser = JSON.parse(storedUser);
      setCashier(parsedUser);
      fetchFinancials(parsedUser._id);
      fetchMembersList();
    }
  }, [navigate]);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwdStatus({ type: '', message: '' });

    if (newPassword !== confirmPassword) {
      setPwdStatus({ type: 'error', message: 'Confirm password does not match.' });
      return;
    }

    if (newPassword.length < 5) {
      setPwdStatus({ type: 'error', message: 'Password must be at least 5 characters long.' });
      return;
    }

    setPwdLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `/api/auth/cashier/change-password`,
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setPwdStatus({ type: 'success', message: res.data.message || 'Password updated successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('[CHANGE PASSWORD ERROR]:', err);
      setPwdStatus({
        type: 'error',
        message: err.response?.data?.error || 'Failed to update password. Verify your current password.'
      });
    } finally {
      setPwdLoading(false);
    }
  };

  // 2. Fetch Financial summaries & statistics for this cashier
  const fetchFinancials = async (cashierId) => {
    try {
      const res = await axios.get(`/api/surrenders/summary`);
      const myStats = res.data.find(c => c._id === cashierId);
      if (myStats) {
        setStats({
          totalCollected: myStats.totalCollected || 0,
          totalSurrendered: myStats.totalSurrendered || 0,
          cashInHand: myStats.cashInHand || 0
        });
      }
    } catch (error) {
      console.error("Error fetching cashier summary stats", error);
    }
  };

  const fetchMembersList = async () => {
    try {
      const res = await axios.get(`/api/members`);
      setAllMembers(res.data || []);
    } catch (error) {
      console.error("Error fetching villagers list", error);
    }
  };

  // 3. Tab switching & history fetching
  useEffect(() => {
    if (!cashier) return;
    if (activeTab === 'receipts') {
      fetchReceipts();
    } else if (activeTab === 'handovers') {
      fetchHandovers();
    }
  }, [activeTab, cashier]);

  const fetchReceipts = async () => {
    setLoadingHistory(true);
    try {
      const res = await axios.get(`/api/payments?cashierId=${cashier._id}`);
      setReceiptHistory(res.data || []);
    } catch (error) {
      console.error("Error loading receipt history", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchHandovers = async () => {
    setLoadingHistory(true);
    try {
      const res = await axios.get(`/api/surrenders`);
      // Filter handovers specifically recorded for this cashier
      const filtered = res.data.filter(h => h.cashierId?._id === cashier._id);
      setHandoverHistory(filtered);
    } catch (error) {
      console.error("Error loading handover history", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // 4. Look up specific member dues
  const handleSelectMember = async (member) => {
    setSelectedMember(member);
    setSearchTerm('');
    setLoadingDues(true);
    setErrorMsg('');
    setSuccessMsg('');
    setShowAutoPreview(false);
    setAutoAmount('');
    setAllotmentMode('auto');
    setFundTypeFilter('all');
    setFundNameSearch('');
    setPaymentDate(getTodayDateString());
    try {
      const res = await axios.get(`/api/dues/member/${member._id}`);
      const all = res.data;
      const unpaid = all.filter(d => d.status !== 'paid');
      setAllDues(all);
      setUnpaidDues(unpaid);
      const initialSplits = {};
      const initialSelected = {};
      unpaid.forEach(due => {
        const maxRem = due.totalDueAmount - due.amountPaid;
        initialSplits[due._id] = maxRem;
        initialSelected[due._id] = true;
      });
      setPaymentSplits(initialSplits);
      setSelectedFunds(initialSelected);
    } catch (error) {
      setErrorMsg("Failed to load outstanding dues for this villager.");
    } finally {
      setLoadingDues(false);
    }
  };

  // Auto Allotment: distribute entered amount across dues — oldest dues first
  const calcAutoAllotment = () => {
    const total = parseFloat(autoAmount);
    if (isNaN(total) || total <= 0) { setErrorMsg('Enter a valid amount greater than ₹0.'); return; }
    setErrorMsg('');
    let remaining = total;
    // Sort by createdAt ascending so oldest dues are paid first
    const sorted = [...unpaidDues].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const splits = [];
    for (const due of sorted) {
      if (remaining <= 0) break;
      const maxRem = due.totalDueAmount - due.amountPaid;
      const allocate = Math.min(remaining, maxRem);
      if (allocate > 0) { splits.push({ due, allocate }); remaining -= allocate; }
    }
    if (splits.length === 0) { setErrorMsg('No outstanding dues to allocate against.'); return; }
    setAutoSplitPreview(splits);
    setShowAutoPreview(true);
  };

  // Confirm and submit auto allotment
  const confirmAutoPayment = () => {
    const splitDetails = autoSplitPreview.map(s => ({ fundId: s.due.fundId._id, amountAllocated: s.allocate }));
    setPaymentToConfirm({
      mode: 'auto',
      payload: {
        memberId: selectedMember._id, cashierId: cashier._id, paymentSource: 'cashier',
        paymentMode, splitDetails, notes: paymentNotes || 'Auto-Allotment Payment',
        paymentDate: paymentDate
      },
      total: autoSplitPreview.reduce((s, x) => s + x.allocate, 0)
    });
  };

  const handleSplitAmountChange = (dueId, val, maxVal) => {
    let numericVal = val === '' ? '' : parseFloat(val);
    if (numericVal !== '' && (isNaN(numericVal) || numericVal < 0)) return;
    if (numericVal !== '' && numericVal > maxVal) numericVal = maxVal;
    
    setPaymentSplits({ ...paymentSplits, [dueId]: numericVal });
  };

  const getCheckedTotal = () => {
    return Object.keys(paymentSplits).reduce((sum, dueId) => {
      if (selectedFunds[dueId]) {
        return sum + (parseFloat(paymentSplits[dueId]) || 0);
      }
      return sum;
    }, 0);
  };

  // Helper: build full fund display name e.g. "MAINTENANCE FUND Jan 2026"
  const fundDisplayName = (fundId) => {
    if (!fundId) return 'Unknown Fund';
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const month = fundId.month ? MONTHS[fundId.month - 1] : '';
    const year = fundId.year || '';
    const suffix = [month, year].filter(Boolean).join(' ');
    return suffix ? `${fundId.name} ${suffix}` : fundId.name;
  };

  // 5. Submit dynamic split payments
  const handleProcessPayment = (e) => {
    e.preventDefault();
    if (!selectedMember || !cashier) return;

    const totalToPay = getCheckedTotal();
    if (totalToPay <= 0) {
      setErrorMsg("Please allocate a valid payment amount greater than ₹0.");
      return;
    }

    // Format splitDetails list
    const splitDetails = Object.keys(paymentSplits)
      .filter(dueId => selectedFunds[dueId])
      .map(dueId => {
        const amount = parseFloat(paymentSplits[dueId]) || 0;
        const due = unpaidDues.find(d => d._id === dueId);
        return {
          fundId: due?.fundId?._id,
          amountAllocated: amount
        };
      })
      .filter(split => split.fundId && split.amountAllocated > 0);

    setPaymentToConfirm({
      mode: 'manual',
      payload: {
        memberId: selectedMember._id,
        cashierId: cashier._id,
        paymentSource: 'cashier',
        paymentMode,
        splitDetails,
        notes: paymentNotes || 'Counter Payment',
        paymentDate: paymentDate
      },
      total: totalToPay
    });
  };

  const executeConfirmedPayment = async () => {
    if (!paymentToConfirm) return;
    setProcessingPayment(true);
    setErrorMsg('');
    try {
      const payload = { ...paymentToConfirm.payload };
      const dateStr = payload.paymentDate || getTodayDateString();
      const [year, month, day] = dateStr.split('-').map(Number);
      const now = new Date();
      const localPaymentDate = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
      payload.paymentDate = localPaymentDate.toISOString();

      const res = await axios.post(`/api/payments`, payload);
      
      // Show receipt modal immediately
      setCurrentReceipt(res.data.receipt);
      setShowReceiptModal(true);
      
      // Clear payment selections & reload
      setSuccessMsg("Payment processed successfully! Receipt generated.");
      setPaymentNotes('');
      setPaymentDate(getTodayDateString());
      setSelectedMember(null);
      setUnpaidDues([]);
      setShowAutoPreview(false);
      setAutoAmount('');
      setPaymentToConfirm(null);
      
      // Refresh financials
      fetchFinancials(cashier._id);
    } catch (error) {
      setErrorMsg(error.response?.data?.error || "Transaction failed. Please verify dues allocation.");
      setPaymentToConfirm(null);
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  // Autocomplete search suggestions — by Name or Family ID only
  const filteredSuggestions = searchTerm.trim() === '' ? [] : allMembers.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.familyId && m.familyId.toString().includes(searchTerm))
  ).slice(0, 5);

  return (
    <div className="admin-layout">
      {/* Mobile Header */}
      <div className="mobile-header">
        <h2>Denalai Cashier</h2>
        <button className="menu-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`sidebar glass-panel ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>Denalai Cashier</h2>
        </div>
        
        <nav className="sidebar-nav">
          <button 
            onClick={() => { setActiveTab('collect'); setIsMobileMenuOpen(false); }}
            className={`nav-item ${activeTab === 'collect' ? 'active' : ''}`}
            style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
          >
            <CreditCard size={20} />
            <span>Collect Payments</span>
          </button>

          <button 
            onClick={() => { setActiveTab('receipts'); setIsMobileMenuOpen(false); }}
            className={`nav-item ${activeTab === 'receipts' ? 'active' : ''}`}
            style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
          >
            <Receipt size={20} />
            <span>Receipt History</span>
          </button>

          <button 
            onClick={() => { setActiveTab('handovers'); setIsMobileMenuOpen(false); }}
            className={`nav-item ${activeTab === 'handovers' ? 'active' : ''}`}
            style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
          >
            <Coins size={20} />
            <span>Cash Handovers</span>
          </button>

          <button 
            onClick={() => { setActiveTab('expenses'); setIsMobileMenuOpen(false); }}
            className={`nav-item ${activeTab === 'expenses' ? 'active' : ''}`}
            style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
          >
            <Receipt size={20} />
            <span>Manage Expenses</span>
          </button>

          <button 
            onClick={() => { setActiveTab('password'); setIsMobileMenuOpen(false); }}
            className={`nav-item ${activeTab === 'password' ? 'active' : ''}`}
            style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
          >
            <Lock size={20} />
            <span>Update Password</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <button className="nav-item logout-btn" onClick={handleLogout}>
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="content-header">
          <h1>
            {activeTab === 'collect' && 'Collect Outstanding Dues'}
            {activeTab === 'receipts' && 'My Receipt Logs'}
            {activeTab === 'handovers' && 'My Treasury Handovers'}
            {activeTab === 'expenses' && 'Manage Expenses'}
            {activeTab === 'password' && 'Account Security & Password'}
          </h1>
          <div className="user-profile">
            <div className="avatar" style={{ background: '#38bdf8' }}>C</div>
            <span>{cashier?.name || 'Cashier Counter'}</span>
          </div>
        </header>

        <div className="content-body animate-fade-in">
          
          {/* 1. Real-time Cashier Treasury Stats Banner */}
          {activeTab !== 'collect' && activeTab !== 'expenses' && activeTab !== 'password' && (
            <div className="demographic-banner glass-panel mb-6 treasury-banner" style={{ 
              background: activeTab === 'receipts' 
                ? 'linear-gradient(135deg, #1e1b4b 0%, #31115a 100%)' // Premium Dark Purple/Plum theme
                : 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', // Dark blue-slate theme
              color: '#f8fafc', 
              padding: '24px', 
              borderRadius: '20px', 
              border: activeTab === 'receipts'
                ? '1px solid rgba(232, 121, 249, 0.25)' 
                : '1px solid rgba(255, 255, 255, 0.15)', 
              boxShadow: activeTab === 'receipts'
                ? '0 20px 25px -5px rgba(49, 17, 90, 0.4)' 
                : '0 20px 25px -5px rgba(0, 0, 0, 0.3)' 
            }}>
              <div className="demo-card" style={{ padding: '16px', background: activeTab === 'receipts' ? 'rgba(232, 121, 249, 0.05)' : 'rgba(255, 255, 255, 0.05)', borderRadius: '16px', border: activeTab === 'receipts' ? '1px solid rgba(232, 121, 249, 0.12)' : '1px solid rgba(255, 255, 255, 0.08)' }}>
                <span className="demo-icon"><CreditCard size={20} color={activeTab === 'receipts' ? '#e879f9' : '#38bdf8'} /></span>
                <span className="demo-label" style={{ fontSize: '0.8rem', color: activeTab === 'receipts' ? '#d8b4fe' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '800', display: 'block', marginBottom: '6px' }}>Total Collected</span>
                <strong className="demo-value" style={{ fontSize: '2rem', color: activeTab === 'receipts' ? '#e879f9' : '#38bdf8', fontWeight: '800' }}>₹{stats.totalCollected.toLocaleString()}</strong>
                <span className="demo-sublabel" style={{ fontSize: '0.75rem', color: activeTab === 'receipts' ? '#a5b4fc' : '#64748b', display: 'block', marginTop: '4px', fontWeight: '600' }}>Gross revenue processed</span>
              </div>
              <div className="demo-card" style={{ padding: '16px', background: activeTab === 'receipts' ? 'rgba(232, 121, 249, 0.05)' : 'rgba(255, 255, 255, 0.05)', borderRadius: '16px', border: activeTab === 'receipts' ? '1px solid rgba(232, 121, 249, 0.12)' : '1px solid rgba(255, 255, 255, 0.08)' }}>
                <span className="demo-icon"><Coins size={20} color={activeTab === 'receipts' ? '#22d3ee' : '#34d399'} /></span>
                <span className="demo-label" style={{ fontSize: '0.8rem', color: activeTab === 'receipts' ? '#c8f2fa' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '800', display: 'block', marginBottom: '6px' }}>Handed Over</span>
                <strong className="demo-value" style={{ fontSize: '2rem', color: activeTab === 'receipts' ? '#22d3ee' : '#34d399', fontWeight: '800' }}>₹{stats.totalSurrendered.toLocaleString()}</strong>
                <span className="demo-sublabel" style={{ fontSize: '0.75rem', color: activeTab === 'receipts' ? '#818cf8' : '#64748b', display: 'block', marginTop: '4px', fontWeight: '600' }}>Settled with treasury admin</span>
              </div>
              <div className="demo-card" style={{ padding: '16px', background: stats.cashInHand > 0 ? 'rgba(249, 115, 22, 0.1)' : (activeTab === 'receipts' ? 'rgba(232, 121, 249, 0.05)' : 'rgba(16, 185, 129, 0.05)'), borderRadius: '16px', border: stats.cashInHand > 0 ? '1px solid rgba(249, 115, 22, 0.2)' : (activeTab === 'receipts' ? '1px solid rgba(232, 121, 249, 0.12)' : '1px solid rgba(255, 255, 255, 0.08)') }}>
                <span className="demo-icon"><Coins size={20} color={stats.cashInHand > 0 ? '#fbbf24' : (activeTab === 'receipts' ? '#f472b6' : '#34d399')} /></span>
                <span className="demo-label" style={{ fontSize: '0.8rem', color: activeTab === 'receipts' ? '#fbcfe8' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '800', display: 'block', marginBottom: '6px' }}>Cash In Hand</span>
                <strong className="demo-value" style={{ fontSize: '2rem', color: stats.cashInHand > 0 ? '#fbbf24' : (activeTab === 'receipts' ? '#f472b6' : '#34d399'), fontWeight: '800' }}>₹{stats.cashInHand.toLocaleString()}</strong>
                <span className="demo-sublabel" style={{ fontSize: '0.75rem', color: stats.cashInHand > 0 ? '#f59e0b' : (activeTab === 'receipts' ? '#f472b6' : '#10b981'), display: 'block', marginTop: '4px', fontWeight: '800' }}>
                  {stats.cashInHand > 0 ? '⚠️ Pending settlement' : (activeTab === 'receipts' ? '✅ Account clear' : '✅ Account clear')}
                </span>
              </div>
            </div>
          )}

          {/* TAB 1: Collect payments */}
          {activeTab === 'collect' && (
            <div>
              {/* Member Lookup Bar */}
              <div className="glass-panel p-6 mb-6" style={{ borderRadius: '20px', background: 'white', border: '1px solid #cbd5e1', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', position: 'relative' }}>
                <h3 style={{ fontSize: '1.1rem', color: '#0f172a', fontWeight: '800', marginBottom: '14px', paddingLeft: '4px' }}>Lookup Villager Profile</h3>
                
                <div style={{ display: 'flex', gap: '15px' }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', borderRadius: '12px', border: '1px solid #cbd5e1', padding: '0 16px' }}>
                      <Search size={18} color="#64748b" style={{ marginRight: '10px' }} />
                      <input 
                        type="text" 
                        placeholder="Search by Villager Name or Family ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ border: 'none', background: 'transparent', outline: 'none', padding: '12px 0', width: '100%', fontSize: '0.95rem', fontWeight: '600' }}
                      />
                      {searchTerm && (
                        <button onClick={() => setSearchTerm('')} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}>
                          <X size={18} />
                        </button>
                      )}
                    </div>

                    {/* Suggestions Autocomplete */}
                    {filteredSuggestions.length > 0 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 1000, marginTop: '8px', overflow: 'hidden' }}>
                        {filteredSuggestions.map(member => (
                          <div 
                            key={member._id}
                            onClick={() => handleSelectMember(member)}
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                          >
                            <div>
                              <strong style={{ display: 'block', color: '#0f172a' }}>{member.name}</strong>
                              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>Family #{member.familyId}</span>
                            </div>
                            <span style={{ fontSize: '0.8rem', background: '#e0e7ff', color: '#4f46e5', fontWeight: '800', padding: '4px 8px', borderRadius: '6px' }}>
                              Fam ID: {member.familyId}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Notifications */}
              {errorMsg && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '16px 20px', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.2)', marginBottom: '24px', fontWeight: '700' }}>
                  <AlertCircle size={20} /> {errorMsg}
                </div>
              )}
              {successMsg && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '16px 20px', borderRadius: '16px', border: '1px solid rgba(16, 185, 129, 0.2)', marginBottom: '24px', fontWeight: '700' }}>
                  <CheckCircle size={20} /> {successMsg}
                </div>
              )}

              {/* Outstanding Dues Billing Form */}
              {selectedMember && (
                <div className="glass-panel p-8" style={{ borderRadius: '24px', background: 'white', border: '1px solid #cbd5e1', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
                  
                  {/* Selected Member Profile Head */}
                  <div className="responsive-footer-row" style={{ paddingBottom: '20px', borderBottom: '1px solid #f1f5f9', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingLeft: '4px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(79, 70, 229, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5' }}>
                        <User size={24} style={{ margin: '0 auto' }} />
                      </div>
                      <div>
                        <h2 style={{ fontSize: '1.4rem', color: '#0f172a', fontWeight: '800', margin: 0 }}>{selectedMember.name}</h2>
                        <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Family ID: #{selectedMember.familyId}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => setSelectedMember(null)}
                      className="btn-clear-villager"
                    >
                      Clear Villager
                    </button>
                  </div>

                  {loadingDues ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                      <RefreshCw size={32} style={{ margin: '0 auto 10px auto' }} />Loading outstanding dues...
                    </div>
                  ) : (
                    <>
                      {/* Totals Summary Row */}
                      {(() => {
                        const totalAllotted = allDues.reduce((s, d) => s + d.totalDueAmount, 0);
                        const totalPaid = allDues.reduce((s, d) => s + d.amountPaid, 0);
                        const totalOutstanding = totalAllotted - totalPaid;
                        return (
                          <div className="totals-summary-row" style={{ marginBottom: '22px' }}>
                            <div 
                              className="clickable-stat-card allotted"
                              onClick={() => handleOpenDetailsModal('allotted')}
                              style={{ background: 'rgba(79,70,229,0.07)', borderRadius: '14px', padding: '14px 18px', border: '1px solid rgba(79,70,229,0.15)' }}
                              title="Click to view total allotted details"
                            >
                              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', display: 'block' }}>Total Allotted</span>
                              <strong style={{ fontSize: '1.5rem', color: '#4f46e5', fontWeight: '900' }}>₹{totalAllotted.toLocaleString()}</strong>
                            </div>
                            <div 
                              className="clickable-stat-card paid"
                              onClick={() => handleOpenDetailsModal('paid')}
                              style={{ background: 'rgba(16,185,129,0.07)', borderRadius: '14px', padding: '14px 18px', border: '1px solid rgba(16,185,129,0.15)' }}
                              title="Click to view total paid details"
                            >
                              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', display: 'block' }}>Total Paid</span>
                              <strong style={{ fontSize: '1.5rem', color: '#10b981', fontWeight: '900' }}>₹{totalPaid.toLocaleString()}</strong>
                            </div>
                            <div 
                              className={`clickable-stat-card outstanding-${totalOutstanding > 0 ? 'warning' : 'success'}`}
                              onClick={() => handleOpenDetailsModal('outstanding')}
                              style={{ background: totalOutstanding > 0 ? 'rgba(225,29,72,0.07)' : 'rgba(16,185,129,0.05)', borderRadius: '14px', padding: '14px 18px', border: `1px solid ${totalOutstanding > 0 ? 'rgba(225,29,72,0.15)' : 'rgba(16,185,129,0.1)'}` }}
                              title="Click to view outstanding dues details"
                            >
                              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', display: 'block' }}>Outstanding Dues</span>
                              <strong style={{ fontSize: '1.5rem', color: totalOutstanding > 0 ? '#e11d48' : '#10b981', fontWeight: '900' }}>₹{totalOutstanding.toLocaleString()}</strong>
                            </div>
                          </div>
                        );
                      })()}

                      {unpaidDues.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '30px', background: 'rgba(16,185,129,0.05)', borderRadius: '16px', border: '1px solid rgba(16,185,129,0.1)', color: '#059669', fontWeight: '700' }}>
                          🎉 All dues settled for this villager!
                        </div>
                      ) : (
                        <>
                          {/* Mode Toggle */}
                          <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '14px', padding: '4px', marginBottom: '20px', border: '1px solid #cbd5e1' }}>
                            <button type="button" onClick={() => { setAllotmentMode('auto'); setShowAutoPreview(false); }}
                              style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', fontWeight: '800', fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s', background: allotmentMode === 'auto' ? '#4f46e5' : 'transparent', color: allotmentMode === 'auto' ? '#fff' : '#64748b' }}>
                              ⚡ Auto Allotment
                            </button>
                            <button type="button" onClick={() => { setAllotmentMode('manual'); setShowAutoPreview(false); }}
                              style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', fontWeight: '800', fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s', background: allotmentMode === 'manual' ? '#4f46e5' : 'transparent', color: allotmentMode === 'manual' ? '#fff' : '#64748b' }}>
                              ✏️ Manual Selection
                            </button>
                          </div>

                          {/* AUTO ALLOTMENT MODE */}
                          {allotmentMode === 'auto' && !showAutoPreview && (
                            <div style={{ background: '#f8fafc', borderRadius: '18px', padding: '24px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                              <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '16px', fontWeight: '600' }}>
                                Enter the total amount to pay. The system will automatically distribute it across outstanding dues — <strong style={{ color: '#4f46e5' }}>oldest dues are settled first</strong>, then progressively to newer ones.
                              </p>
                              <div className="responsive-flex-row">
                                <div style={{ display: 'flex', alignItems: 'center', background: 'white', border: '2px solid #4f46e5', borderRadius: '12px', padding: '4px 16px', flex: 1 }}>
                                  <span style={{ color: '#4f46e5', fontWeight: '900', fontSize: '1.2rem', marginRight: '8px' }}>₹</span>
                                  <input type="number" min="1" value={autoAmount} onChange={e => setAutoAmount(e.target.value)}
                                    placeholder="Enter total amount..."
                                    style={{ border: 'none', outline: 'none', fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', width: '100%', padding: '10px 0' }} />
                                </div>
                                <button type="button" onClick={calcAutoAllotment}
                                  style={{ background: '#4f46e5', color: 'white', border: 'none', padding: '14px 24px', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                  Preview Allotment →
                                </button>
                              </div>
                            </div>
                          )}

                          {/* AUTO PREVIEW CONFIRMATION */}
                          {allotmentMode === 'auto' && showAutoPreview && (
                            <div style={{ background: '#f8fafc', borderRadius: '18px', padding: '24px', border: '2px solid #4f46e5', marginBottom: '20px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h4 style={{ margin: 0, color: '#0f172a', fontWeight: '800' }}>⚡ Allotment Preview — Please Confirm</h4>
                                <button type="button" onClick={() => setShowAutoPreview(false)}
                                  style={{ background: '#f1f5f9', border: 'none', padding: '6px 14px', borderRadius: '8px', fontWeight: '700', color: '#64748b', cursor: 'pointer' }}>
                                  ← Modify
                                </button>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                                {autoSplitPreview.map((s, i) => (
                                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '12px 18px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                    <div>
                                      <strong style={{ color: '#0f172a' }}>{fundDisplayName(s.due.fundId)}</strong>
                                      <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>Type: {s.due.fundId?.fundType || 'General'}</span>
                                    </div>
                                    <strong style={{ color: '#4f46e5', fontSize: '1.1rem' }}>₹{s.allocate.toLocaleString()}</strong>
                                  </div>
                                ))}
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#eef2ff', padding: '12px 18px', borderRadius: '12px', marginBottom: '20px' }}>
                                <span style={{ fontWeight: '800', color: '#3730a3' }}>Total Being Collected</span>
                                <strong style={{ fontSize: '1.3rem', color: '#4f46e5' }}>₹{autoSplitPreview.reduce((s, x) => s + x.allocate, 0).toLocaleString()}</strong>
                              </div>
                              <div className="responsive-grid-payment" style={{ marginBottom: '20px' }}>
                                <div>
                                  <label style={{ fontSize: '0.8rem', fontWeight: '800', color: '#1e293b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Payment Date</label>
                                  <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: '600', color: '#0f172a', outline: 'none', boxSizing: 'border-box' }} />
                                </div>
                                <div>
                                  <label style={{ fontSize: '0.8rem', fontWeight: '800', color: '#1e293b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Payment Channel</label>
                                  <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: '700', color: '#0f172a', background: 'white', outline: 'none' }}>
                                    <option value="cash">💵 Cash</option>
                                    <option value="upi">📱 UPI</option>
                                    <option value="card">💳 Card</option>
                                  </select>
                                </div>
                                <div>
                                  <label style={{ fontSize: '0.8rem', fontWeight: '800', color: '#1e293b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Notes</label>
                                  <input type="text" value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)} placeholder="Optional notes..."
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: '600', color: '#0f172a', outline: 'none', boxSizing: 'border-box' }} />
                                </div>
                              </div>
                              <button type="button" onClick={confirmAutoPayment} disabled={processingPayment}
                                style={{ width: '100%', background: '#10b981', border: 'none', color: 'white', padding: '14px', borderRadius: '12px', fontSize: '1rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                {processingPayment ? 'Processing...' : <><CheckCircle size={18} /> Confirm & Process Payment</>}
                              </button>
                            </div>
                          )}

                          {/* MANUAL MODE */}
                          {allotmentMode === 'manual' && (
                            <form onSubmit={handleProcessPayment}>
                              {/* Fund Filters */}
                              <div style={{ display: 'flex', gap: '12px', marginBottom: '18px', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: '160px' }}>
                                  <label style={{ fontSize: '0.78rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Filter by Fund Type</label>
                                  <select value={fundTypeFilter} onChange={e => setFundTypeFilter(e.target.value)}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: '700', color: '#0f172a', background: 'white', outline: 'none' }}>
                                    <option value="all">All Types</option>
                                    {[...new Set(unpaidDues.map(d => d.fundId?.fundType).filter(Boolean))].map(t => (
                                      <option key={t} value={t}>{t}</option>
                                    ))}
                                  </select>
                                </div>
                                <div style={{ flex: 2, minWidth: '200px' }}>
                                  <label style={{ fontSize: '0.78rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Search Fund Name</label>
                                  <input type="text" value={fundNameSearch} onChange={e => setFundNameSearch(e.target.value)} placeholder="Type fund name..."
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: '600', color: '#0f172a', outline: 'none', boxSizing: 'border-box' }} />
                                </div>
                              </div>

                              {/* Filtered Dues List */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                                {(() => {
                                  const filteredDues = unpaidDues.filter(d => (fundTypeFilter === 'all' || d.fundId?.fundType === fundTypeFilter) && d.fundId?.name?.toLowerCase().includes(fundNameSearch.toLowerCase()));
                                  const allSelected = filteredDues.length > 0 && filteredDues.every(d => selectedFunds[d._id]);

                                  const handleSelectAll = (e) => {
                                    const isChecked = e.target.checked;
                                    const newSelected = { ...selectedFunds };
                                    filteredDues.forEach(d => {
                                      newSelected[d._id] = isChecked;
                                    });
                                    setSelectedFunds(newSelected);
                                  };

                                  return (
                                    <>
                                      {filteredDues.length > 0 && (
                                        <div style={{ padding: '0 10px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                          <input type="checkbox" checked={allSelected} onChange={handleSelectAll} style={{ width: '18px', height: '18px', accentColor: '#4f46e5', cursor: 'pointer' }} />
                                          <strong style={{ color: '#4f46e5', fontSize: '0.9rem' }}>Select All / Deselect All</strong>
                                        </div>
                                      )}
                                      {filteredDues.map(due => {
                                        const maxRem = due.totalDueAmount - due.amountPaid;
                                        const checked = selectedFunds[due._id] || false;
                                        const amt = paymentSplits[due._id] !== undefined ? paymentSplits[due._id] : '';
                                        return (
                                          <div key={due._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '14px 18px', borderRadius: '14px', border: checked ? '2px solid #4f46e5' : '1px solid #cbd5e1' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                                              <input type="checkbox" checked={checked}
                                                onChange={e => setSelectedFunds({ ...selectedFunds, [due._id]: e.target.checked })}
                                                style={{ width: '20px', height: '20px', accentColor: '#4f46e5', cursor: 'pointer' }} />
                                              <div>
                                                <strong style={{ color: '#0f172a' }}>{fundDisplayName(due.fundId)}</strong>
                                                <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block', fontWeight: '700' }}>
                                                  {due.fundId?.fundType || 'General'} • Rem: ₹{maxRem} • Paid: ₹{due.amountPaid}
                                                </span>
                                              </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                              <strong style={{ color: '#e11d48' }}>₹{maxRem}</strong>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '4px 8px', opacity: checked ? 1 : 0.5 }}>
                                                <span style={{ color: '#64748b', fontWeight: '700' }}>₹</span>
                                                <input type="number" min="0" max={maxRem} step="any" value={amt} placeholder="0" disabled={!checked}
                                                  onChange={e => handleSplitAmountChange(due._id, e.target.value, maxRem)}
                                                  style={{ width: '65px', border: 'none', outline: 'none', fontWeight: '800', fontSize: '0.9rem', color: '#0f172a', textAlign: 'right', background: 'transparent' }} />
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </>
                                  );
                                })()}
                              </div>

                              {/* Payment channel + notes + submit */}
                              <div className="responsive-grid-payment" style={{ marginBottom: '20px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                                <div>
                                  <label style={{ fontSize: '0.8rem', fontWeight: '800', color: '#1e293b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Payment Date</label>
                                  <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: '600', color: '#0f172a', outline: 'none', boxSizing: 'border-box' }} />
                                </div>
                                <div>
                                  <label style={{ fontSize: '0.8rem', fontWeight: '800', color: '#1e293b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Payment Channel</label>
                                  <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: '700', color: '#0f172a', background: 'white', outline: 'none' }}>
                                    <option value="cash">💵 Cash</option>
                                    <option value="upi">📱 UPI</option>
                                    <option value="card">💳 Card</option>
                                  </select>
                                </div>
                                <div>
                                  <label style={{ fontSize: '0.8rem', fontWeight: '800', color: '#1e293b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Notes</label>
                                  <input type="text" value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)} placeholder="Optional notes..."
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: '600', color: '#0f172a', outline: 'none', boxSizing: 'border-box' }} />
                                </div>
                              </div>
                              <div className="responsive-footer-row" style={{ background: '#f1f5f9', padding: '18px 24px', borderRadius: '14px' }}>
                                <div>
                                  <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', display: 'block' }}>Total Collecting</span>
                                  <strong style={{ fontSize: '1.7rem', color: '#4f46e5', fontWeight: '900' }}>₹{getCheckedTotal().toLocaleString()}</strong>
                                </div>
                                <button type="submit" disabled={processingPayment || getCheckedTotal() <= 0}
                                  style={{ background: '#4f46e5', border: 'none', color: 'white', padding: '14px 28px', borderRadius: '12px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', opacity: getCheckedTotal() <= 0 ? 0.5 : 1 }}>
                                  {processingPayment ? 'Processing...' : <> Record Payment <ArrowRight size={18} /></>}
                                </button>
                              </div>
                            </form>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              )}

              {!selectedMember && (
                <div style={{ textAlign: 'center', padding: '60px 0', border: '2px dashed #cbd5e1', borderRadius: '24px', color: '#64748b' }}>
                  <Search size={48} style={{ margin: '0 auto 15px auto', color: '#94a3b8' }} />
                  <h3 style={{ fontSize: '1.2rem', color: '#1e293b', fontWeight: '800', marginBottom: '6px' }}>No Villager Selected</h3>
                  <p>Please enter their Name or Family ID in the lookup bar above to inspect outstanding dues.</p>
                </div>
              )}

            </div>
          )}

          {/* TAB 2: Receipt History */}
          {activeTab === 'receipts' && (
            <div className="glass-panel p-8" style={{ background: 'white', borderRadius: '24px', border: '1px solid #cbd5e1', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <h3 style={{ fontSize: '1.2rem', color: '#0f172a', fontWeight: '800', marginBottom: '20px' }}>Your Collection Receipts History</h3>
              
              {loadingHistory ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                  <RefreshCw className="animate-spin" size={32} style={{ margin: '0 auto 10px auto' }} />
                  Loading receipts database...
                </div>
              ) : receiptHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                  No collection receipts logged under your cashier ID yet.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #cbd5e1', color: '#64748b', fontSize: '0.85rem', fontWeight: '800', textTransform: 'uppercase' }}>
                        <th style={{ padding: '12px' }}>Receipt #</th>
                        <th style={{ padding: '12px' }}>Villager Head</th>
                        <th style={{ padding: '12px' }}>Mode</th>
                        <th style={{ padding: '12px' }}>Funds Breakdown</th>
                        <th style={{ padding: '12px' }}>Amount Paid</th>
                        <th style={{ padding: '12px' }}>Date</th>
                        <th style={{ padding: '12px', textAlign: 'center' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: '600' }}>
                      {receiptHistory.map(receipt => (
                        <tr key={receipt._id} style={{ borderBottom: '1px solid #f1f5f9' }} className="hover-scale">
                          <td style={{ padding: '16px 12px' }}>
                            <span style={{ color: '#4f46e5', fontWeight: '800' }}>#{receipt.receiptNumber}</span>
                          </td>
                          <td style={{ padding: '16px 12px' }}>
                            <strong style={{ color: '#0f172a' }}>{receipt.memberId?.name || 'Deleted Member'}</strong>
                            <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b' }}>Fam ID: #{receipt.memberId?.familyId || 'N/A'}</span>
                          </td>
                          <td style={{ padding: '16px 12px', textTransform: 'uppercase' }}>{receipt.paymentMode}</td>
                          <td style={{ padding: '16px 12px' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {receipt.splitDetails?.map((split, i) => (
                                <span key={i} style={{ background: '#f1f5f9', color: '#334155', fontSize: '0.75rem', padding: '3px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                  {split.fundId?.name || 'Fund'}: ₹{split.amountAllocated}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td style={{ padding: '16px 12px', fontSize: '1.05rem', color: '#10b981', fontWeight: '800' }}>
                            ₹{receipt.totalAmountPaid.toLocaleString()}
                          </td>
                          <td style={{ padding: '16px 12px' }}>
                            {new Date(receipt.paymentDate).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                            <button 
                              onClick={() => { setCurrentReceipt(receipt); setShowReceiptModal(true); }}
                              style={{ border: 'none', background: '#f1f5f9', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: '700', color: '#4f46e5' }}
                            >
                              <Printer size={14} /> Reprint
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Handovers History */}
          {activeTab === 'handovers' && (
            <div className="glass-panel p-8" style={{ background: 'white', borderRadius: '24px', border: '1px solid #cbd5e1', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <h3 style={{ fontSize: '1.2rem', color: '#0f172a', fontWeight: '800', marginBottom: '20px' }}>Your Cash Handovers to Administration</h3>
              
              {loadingHistory ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                  <RefreshCw className="animate-spin" size={32} style={{ margin: '0 auto 10px auto' }} />
                  Loading handovers database...
                </div>
              ) : handoverHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                  No cash handover transactions settled under your cashier ID.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #cbd5e1', color: '#64748b', fontSize: '0.85rem', fontWeight: '800', textTransform: 'uppercase' }}>
                        <th style={{ padding: '12px' }}>Transaction ID</th>
                        <th style={{ padding: '12px' }}>Amount Handed Over</th>
                        <th style={{ padding: '12px' }}>Received By</th>
                        <th style={{ padding: '12px' }}>Settlement Notes</th>
                        <th style={{ padding: '12px' }}>Handover Date</th>
                      </tr>
                    </thead>
                    <tbody style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: '600' }}>
                      {handoverHistory.map(tx => (
                        <tr key={tx._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '16px 12px', color: '#64748b' }}>#{tx._id}</td>
                          <td style={{ padding: '16px 12px', fontSize: '1.1rem', color: '#ea580c', fontWeight: '800' }}>
                            ₹{tx.amount.toLocaleString()}
                          </td>
                          <td style={{ padding: '16px 12px' }}>👤 {tx.receivedByAdmin || 'Admin Treasury'}</td>
                          <td style={{ padding: '16px 12px', color: '#64748b' }}>{tx.notes}</td>
                          <td style={{ padding: '16px 12px' }}>
                            {new Date(tx.surrenderDate).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Manage Expenses */}
          {activeTab === 'expenses' && (
            <ManageExpenses isCashier={true} currentCashier={cashier} />
          )}

          {/* TAB 5: Update Password */}
          {activeTab === 'password' && (
            <div className="glass-panel p-8 animate-fade-in" style={{ background: 'white', borderRadius: '24px', maxWidth: '480px', margin: '0 auto', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)', border: '1px solid #cbd5e1' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '950', color: '#0f172a', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock size={20} color="var(--primary-color)" /> Update Password
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '600', marginBottom: '24px' }}>
                Change your login credentials to protect your cashier terminal access.
              </p>

              {pwdStatus.message && (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  border: pwdStatus.type === 'success' ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
                  background: pwdStatus.type === 'success' ? '#ecfdf5' : '#fef2f2',
                  color: pwdStatus.type === 'success' ? '#10b981' : '#ef4444'
                }}>
                  {pwdStatus.type === 'success' ? <CheckCircle size={16} color="#10b981" /> : <AlertCircle size={16} color="#ef4444" />}
                  <span>{pwdStatus.message}</span>
                </div>
              )}

              <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569' }}>Current Password</label>
                  <input 
                    type="password"
                    required
                    placeholder="Enter current password..."
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    style={{ padding: '11px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569' }}>New Password</label>
                  <input 
                    type="password"
                    required
                    placeholder="Min 5 characters..."
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={{ padding: '11px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569' }}>Confirm New Password</label>
                  <input 
                    type="password"
                    required
                    placeholder="Confirm new password..."
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{ padding: '11px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box' }}
                  />
                </div>

                <button 
                  type="submit"
                  disabled={pwdLoading}
                  style={{ 
                    background: 'var(--primary-color)', 
                    color: 'white', 
                    border: 'none', 
                    padding: '12px', 
                    borderRadius: '12px', 
                    fontWeight: '800', 
                    cursor: pwdLoading ? 'not-allowed' : 'pointer', 
                    fontSize: '0.9rem', 
                    marginTop: '8px',
                    boxShadow: '0 4px 10px rgba(79, 70, 229, 0.2)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                >
                  {pwdLoading ? 'Saving...' : 'Update Password'}
                </button>
              </form>
            </div>
          )}

        </div>
      </main>

      {/* PRINTABLE RECEIPT DIALOG MODAL VIA PORTAL */}
      {showReceiptModal && currentReceipt && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-panel animate-fade-in" style={{ background: 'white', borderRadius: '24px', width: '100%', maxWidth: '480px', padding: '30px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column' }}>
            
            {/* Modal Control header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px', marginBottom: '20px' }} className="no-print">
              <h2 style={{ fontSize: '1.2rem', color: '#0f172a', fontWeight: '800' }}>Printable Receipt Invoice</h2>
              <button 
                onClick={() => setShowReceiptModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Receipt Area (Target for print) */}
            <div id="printable-invoice-area" style={{ border: '2px solid #0f172a', padding: '24px', background: '#fff', borderRadius: '16px', fontFamily: 'monospace', lineHeight: '1.4', color: '#000' }}>
              <div style={{ textAlign: 'center', borderBottom: '2px dashed #000', paddingBottom: '16px', marginBottom: '16px' }}>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '1.15rem', textTransform: 'uppercase', fontWeight: '900' }}>Denalai Village Authority</h3>
                <span style={{ fontSize: '0.8rem' }}>Treasury Collection Receipt Terminal</span>
                <div style={{ fontSize: '0.8rem', marginTop: '6px' }}>Date: {new Date(currentReceipt.paymentDate).toLocaleString()}</div>
              </div>

              <div style={{ marginBottom: '16px', fontSize: '0.85rem' }}>
                <div><strong>Receipt No:</strong> #{currentReceipt.receiptNumber}</div>
                <div><strong>Processed By:</strong> {cashier?.name} (Cashier ID: #{cashier?.cashierId})</div>
                <div><strong>Villager Head:</strong> {currentReceipt.memberId?.name}</div>
                <div><strong>Family ID:</strong> #{currentReceipt.memberId?.familyId || 'N/A'}</div>
                <div><strong>Payment Mode:</strong> {currentReceipt.paymentMode?.toUpperCase()}</div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem', marginBottom: '16px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #000', fontWeight: '900' }}>
                    <th style={{ padding: '6px 0' }}>Dues Item Description</th>
                    <th style={{ padding: '6px 0', textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {currentReceipt.splitDetails?.map((split, i) => (
                    <tr key={i}>
                      <td style={{ padding: '6px 0' }}>{fundDisplayName(split.fundId) || 'General Due Invoice'}</td>
                      <td style={{ padding: '6px 0', textAlign: 'right' }}>₹{split.amountAllocated}</td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: '2px dashed #000', fontWeight: '900' }}>
                    <td style={{ padding: '10px 0 0 0' }}>TOTAL AMOUNT PAID</td>
                    <td style={{ padding: '10px 0 0 0', textAlign: 'right', fontSize: '1.05rem' }}>₹{currentReceipt.totalAmountPaid}</td>
                  </tr>
                </tbody>
              </table>

              <div style={{ textAlign: 'center', fontSize: '0.8rem', marginTop: '20px', borderTop: '1px solid #cbd5e1', paddingTop: '10px' }}>
                <div style={{ textTransform: 'uppercase', fontWeight: '900', color: '#10b981', fontSize: '1rem', letterSpacing: '1px', marginBottom: '4px' }}>★ PAID IN FULL ★</div>
                Thank you for your timely contribution!
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: '15px', marginTop: '24px', justifyContent: 'flex-end' }} className="no-print">
              <button 
                onClick={() => setShowReceiptModal(false)}
                style={{ background: '#f1f5f9', border: 'none', padding: '12px 20px', borderRadius: '10px', fontWeight: '700', color: '#64748b', cursor: 'pointer' }}
              >
                Close View
              </button>
              <button 
                onClick={() => {
                  const printContents = document.getElementById('printable-invoice-area').innerHTML;
                  const originalContents = document.body.innerHTML;
                  
                  // Setup clean document for printing
                  document.body.innerHTML = printContents;
                  window.print();
                  
                  // Restore
                  window.location.reload();
                }}
                style={{ background: '#2563eb', border: 'none', color: 'white', padding: '12px 20px', borderRadius: '10px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
              >
                <Printer size={16} /> Print Invoice
              </button>
            </div>

          </div>
        </div>
      )}

      {/* BEAUTIFUL DETAILS DIALOG MODAL */}
      {showDetailsModal && selectedMember && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-panel animate-fade-in details-modal-container" style={{ background: 'white', borderRadius: '24px', width: '100%', maxWidth: '750px', padding: '28px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '1.4rem', color: '#0f172a', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {detailsModalType === 'allotted' && <span style={{ color: '#4f46e5' }}>📋 Total Allotted Dues</span>}
                  {detailsModalType === 'paid' && <span style={{ color: '#10b981' }}>✅ Total Paid Dues</span>}
                  {detailsModalType === 'outstanding' && <span style={{ color: '#e11d48' }}>⚠️ Outstanding Dues</span>}
                </h2>
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px', fontWeight: '600' }}>
                  Villager: <strong style={{ color: '#1e293b' }}>{selectedMember.name}</strong> • Family ID: #{selectedMember.familyId}
                </p>
              </div>
              <button 
                onClick={() => setShowDetailsModal(false)}
                style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', color: '#64748b', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#0f172a'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Summary Banner */}
            {(() => {
              const totalAllotted = allDues.reduce((s, d) => s + d.totalDueAmount, 0);
              const totalPaid = allDues.reduce((s, d) => s + d.amountPaid, 0);
              const totalOutstanding = totalAllotted - totalPaid;
              
              let title = '';
              let amt = 0;
              let bg = '';
              let fg = '';
              let border = '';
              
              if (detailsModalType === 'allotted') {
                title = 'Total Allotted Amount';
                amt = totalAllotted;
                bg = 'rgba(79,70,229,0.06)';
                fg = '#4f46e5';
                border = '1px solid rgba(79,70,229,0.15)';
              } else if (detailsModalType === 'paid') {
                title = 'Total Settled Amount';
                amt = totalPaid;
                bg = 'rgba(16,185,129,0.06)';
                fg = '#10b981';
                border = '1px solid rgba(16,185,129,0.15)';
              } else {
                title = 'Total Outstanding Dues';
                amt = totalOutstanding;
                bg = totalOutstanding > 0 ? 'rgba(225,29,72,0.06)' : 'rgba(16,185,129,0.06)';
                fg = totalOutstanding > 0 ? '#e11d48' : '#10b981';
                border = totalOutstanding > 0 ? '1px solid rgba(225,29,72,0.15)' : '1px solid rgba(16,185,129,0.15)';
              }

              return (
                <div style={{ background: bg, border: border, borderRadius: '16px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</span>
                  <strong style={{ fontSize: '1.8rem', color: fg, fontWeight: '900' }}>₹{amt.toLocaleString()}</strong>
                </div>
              );
            })()}

            {/* Inline search filter inside modal */}
            <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px solid #cbd5e1', padding: '0 14px', marginBottom: '16px' }}>
              <Search size={16} color="#64748b" style={{ marginRight: '8px' }} />
              <input 
                type="text" 
                placeholder="Search by fund name or type..."
                value={modalSearchTerm}
                onChange={(e) => setModalSearchTerm(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', padding: '10px 0', width: '100%', fontSize: '0.85rem', fontWeight: '600' }}
              />
              {modalSearchTerm && (
                <button onClick={() => setModalSearchTerm('')} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}>
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Dues Details Table/List Area */}
            <div style={{ flex: 1, overflow: 'auto', maxHeight: '45vh', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
              {(() => {
                let filteredDues = [];
                if (detailsModalType === 'allotted') {
                  filteredDues = allDues;
                } else if (detailsModalType === 'paid') {
                  filteredDues = allDues.filter(d => d.amountPaid > 0);
                } else if (detailsModalType === 'outstanding') {
                  filteredDues = allDues.filter(d => (d.totalDueAmount - d.amountPaid) > 0);
                }

                // Apply search filter
                if (modalSearchTerm.trim() !== '') {
                  filteredDues = filteredDues.filter(d => 
                    fundDisplayName(d.fundId).toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
                    (d.fundId?.fundType && d.fundId.fundType.toLowerCase().includes(modalSearchTerm.toLowerCase()))
                  );
                }

                if (filteredDues.length === 0) {
                  return (
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b', fontWeight: '600' }}>
                      No dues found matching this category.
                    </div>
                  );
                }

                return (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: '800', textTransform: 'uppercase', position: 'sticky', top: 0, zIndex: 10 }}>
                        <th style={{ padding: '12px 16px' }}>Fund Name</th>
                        <th style={{ padding: '12px 16px' }}>Type</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right' }}>Allotted</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right' }}>Paid</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right' }}>Outstanding</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody style={{ color: '#334155', fontWeight: '600' }}>
                      {filteredDues.map((due) => {
                        const maxRem = due.totalDueAmount - due.amountPaid;
                        let statusColor = '#ef4444';
                        let statusBg = 'rgba(239, 68, 68, 0.08)';
                        let statusText = 'Unpaid';
                        
                        if (due.status === 'paid' || maxRem <= 0) {
                          statusColor = '#10b981';
                          statusBg = 'rgba(16, 185, 129, 0.08)';
                          statusText = 'Paid';
                        } else if (due.amountPaid > 0) {
                          statusColor = '#f59e0b';
                          statusBg = 'rgba(245, 158, 11, 0.08)';
                          statusText = 'Partial';
                        }

                        return (
                          <tr key={due._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '12px 16px' }}>
                              <strong style={{ color: '#0f172a', display: 'block' }}>{fundDisplayName(due.fundId)}</strong>
                              {due.fundId?.dueDate && (
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginTop: '2px' }}>
                                  Due: {new Date(due.fundId.dueDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{ background: '#f1f5f9', color: '#475569', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700' }}>
                                {due.fundId?.fundType || 'General'}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '700' }}>₹{due.totalDueAmount.toLocaleString()}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', color: '#10b981', fontWeight: '700' }}>₹{due.amountPaid.toLocaleString()}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', color: maxRem > 0 ? '#e11d48' : '#10b981', fontWeight: '700' }}>₹{maxRem.toLocaleString()}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <span style={{ display: 'inline-block', color: statusColor, background: statusBg, padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '800' }}>
                                {statusText}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '16px', marginTop: '20px' }}>
              <button 
                onClick={() => setShowDetailsModal(false)}
                style={{ background: '#4f46e5', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)', transition: 'all 0.2s' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#4338ca'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#4f46e5'; }}
              >
                Close View
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Payment Confirmation Modal Overlay */}
      {paymentToConfirm && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div className="modal-content animate-fade-in" style={{ background: 'white', borderRadius: '24px', width: '100%', maxWidth: '400px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <AlertCircle size={28} color="#f59e0b" />
              <div>
                <h3 style={{ margin: 0, color: '#0f172a', fontWeight: '800', fontSize: '1.2rem' }}>Confirm Payment</h3>
                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Please review before processing</span>
              </div>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Total Amount</span>
                <strong style={{ fontSize: '2.5rem', color: '#4f46e5', fontWeight: '900', lineHeight: 1 }}>₹{paymentToConfirm.total.toLocaleString()}</strong>
              </div>
              <div style={{ background: '#f1f5f9', padding: '16px', borderRadius: '12px', fontSize: '0.9rem', color: '#334155', fontWeight: '600' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>Villager:</span>
                  <strong style={{ color: '#0f172a' }}>{selectedMember?.name}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>Funds Count:</span>
                  <strong style={{ color: '#0f172a' }}>{paymentToConfirm.payload.splitDetails.length} items</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>Mode:</span>
                  <strong style={{ color: '#0f172a', textTransform: 'capitalize' }}>{paymentMode}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Date:</span>
                  <strong style={{ color: '#0f172a' }}>{paymentDate ? new Date(paymentDate).toLocaleDateString() : new Date().toLocaleDateString()}</strong>
                </div>
              </div>
            </div>
            <div style={{ padding: '20px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '12px', background: '#f8fafc' }}>
              <button 
                onClick={() => setPaymentToConfirm(null)}
                disabled={processingPayment}
                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', fontWeight: '800', cursor: processingPayment ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
              >
                Cancel
              </button>
              <button 
                onClick={executeConfirmedPayment}
                disabled={processingPayment}
                style={{ flex: 2, padding: '12px', borderRadius: '12px', border: 'none', background: '#10b981', color: 'white', fontWeight: '800', cursor: processingPayment ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)' }}
              >
                {processingPayment ? <RefreshCw size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                {processingPayment ? 'Processing...' : 'Confirm Pay'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div className="sidebar-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}
    </div>
  );
};

export default CashierDashboard;
