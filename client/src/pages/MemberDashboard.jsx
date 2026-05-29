import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  User, 
  CreditCard, 
  Receipt, 
  Coins, 
  LogOut, 
  Menu, 
  X, 
  Printer, 
  Clock, 
  QrCode, 
  Info,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Users,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  Lock
} from 'lucide-react';
import './MemberDashboard.css';

const MemberDashboard = () => {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // overview, dues, receipts, card, centralFinancials
  const [member, setMember] = useState(null);
  
  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdStatus, setPwdStatus] = useState({ type: '', message: '' });
  const [pwdLoading, setPwdLoading] = useState(false);
  
  // Data states
  const [dues, setDues] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Receipt Modal State
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState(null);

  // Filters State
  const [filterFundType, setFilterFundType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchFundName, setSearchFundName] = useState('');

  // Sub Family Member Modal State
  const [showSubModal, setShowSubModal] = useState(false);
  const [editingSubIndex, setEditingSubIndex] = useState(null); // null if adding, number if editing
  const [subForm, setSubForm] = useState({ name: '', relation: '', age: '', gender: 'male' });

  // Central Financials settings and data
  const [memberFinancialsVisible, setMemberFinancialsVisible] = useState(false);
  const [centralStats, setCentralStats] = useState({
    totalAllotted: 0,
    totalCollected: 0,
    totalSpent: 0,
    currentBalance: 0,
    totalPendingDues: 0
  });
  const [centralExpenses, setCentralExpenses] = useState([]);
  const [showExpenseDetails, setShowExpenseDetails] = useState(false);
  const [searchExpenseTitle, setSearchExpenseTitle] = useState('');
  const [filterExpenseCategory, setFilterExpenseCategory] = useState('all');
  const [filterExpenseDateRange, setFilterExpenseDateRange] = useState('all'); // all, month, year

  // 1. Verify Member Authentication & Load Data
  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const storedUser = localStorage.getItem('user');

    if (!token || role !== 'member' || !storedUser) {
      localStorage.clear();
      navigate('/login');
    } else {
      const parsedUser = JSON.parse(storedUser);
      setMember(parsedUser);
      fetchMemberData(parsedUser._id);
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
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/member/change-password`,
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

  // 2. Fetch ONLY this family's own profile, dues, and payment history
  const fetchMemberData = async (memberId) => {
    setLoading(true);
    setErrorMsg('');
    try {
      // Fetch only this family's own profile — NOT all members
      const memberRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/members/${memberId}`);
      setMember(memberRes.data);

      // Fetch only this family's dues
      const duesRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/dues/member/${memberId}`);
      setDues(duesRes.data || []);

      // Fetch only this family's payment receipts
      const paymentsRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/payments?memberId=${memberId}`);
      setPayments(paymentsRes.data || []);

      // Fetch Visibility Setting for Central Financials
      try {
        const settingRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/settings/showMemberCentralFinancials`);
        const visible = !!settingRes.data.value;
        setMemberFinancialsVisible(visible);

        if (visible) {
          // Fetch central village financials
          const summaryRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/reports/summary`);
          const data = summaryRes.data;
          setCentralStats({
            totalAllotted: (data.totalCollected || 0) + (data.totalPendingDues || 0),
            totalCollected: data.totalCollected || 0,
            totalSpent: data.totalSpent || 0,
            currentBalance: data.currentBalance || 0,
            totalPendingDues: data.totalPendingDues || 0
          });

          // Fetch all central expenses
          const expensesRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/expenses`);
          // Filter to only approved expenses to display to the member
          const approved = (expensesRes.data || []).filter(e => e.status === 'approved');
          setCentralExpenses(approved);
        }
      } catch (err) {
        console.error("Failed to load setting or central summary", err);
      }

    } catch (err) {
      console.error("Error loading member dashboard details", err);
      setErrorMsg("Failed to connect to the backend server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  // 3. Sub Family Member CRUD Handlers
  const openAddSubModal = () => {
    setEditingSubIndex(null);
    setSubForm({ name: '', relation: '', age: '', gender: 'male' });
    setShowSubModal(true);
  };

  const openEditSubModal = (sub, index) => {
    setEditingSubIndex(index);
    setSubForm({
      name: sub.name,
      relation: sub.relation || sub.relationship || '',
      age: sub.age || '',
      gender: sub.gender || 'male'
    });
    setShowSubModal(true);
  };

  const handleSaveSub = async (e) => {
    e.preventDefault();
    if (!member) return;

    try {
      const updatedSubMembers = [...(member.subFamilyMembers || [])];
      const newSub = {
        name: subForm.name,
        relation: subForm.relation,
        age: subForm.age ? Number(subForm.age) : undefined,
        gender: subForm.gender
      };

      if (editingSubIndex !== null) {
        updatedSubMembers[editingSubIndex] = newSub;
      } else {
        updatedSubMembers.push(newSub);
      }

      const res = await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/members/${member._id}`, {
        ...member,
        subFamilyMembers: updatedSubMembers
      });

      setMember(res.data);
      setShowSubModal(false);
    } catch (err) {
      console.error("Failed to save sub family member", err);
      alert("Failed to save family member. Please check input.");
    }
  };

  const handleDeleteSub = async (index) => {
    if (!member) return;
    if (!window.confirm("Are you sure you want to remove this family member?")) return;

    try {
      const updatedSubMembers = member.subFamilyMembers.filter((_, idx) => idx !== index);
      const res = await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/members/${member._id}`, {
        ...member,
        subFamilyMembers: updatedSubMembers
      });

      setMember(res.data);
    } catch (err) {
      console.error("Failed to delete sub family member", err);
      alert("Failed to delete family member.");
    }
  };

  // Helper to find which cashier processed the payment for a specific fund
  const findCashierForDue = (fundId) => {
    if (!fundId) return null;
    const matchedPayment = payments.find(p => 
      p.splitDetails?.some(sd => (sd.fundId?._id || sd.fundId) === fundId)
    );
    return matchedPayment?.cashierId?.name || null;
  };

  // Filter dues list dynamically
  const filteredDues = dues.filter(d => {
    const matchesSearch = d.fundId?.name?.toLowerCase().includes(searchFundName.toLowerCase());
    const matchesType = filterFundType === 'all' || d.fundId?.fundType?.toLowerCase() === filterFundType.toLowerCase();
    
    const isPaid = (d.amountPaid || 0) >= (d.totalDueAmount || 0);
    const isPartial = (d.amountPaid || 0) > 0 && !isPaid;
    const isUnpaid = (d.amountPaid || 0) === 0;

    let matchesStatus = true;
    if (filterStatus === 'paid') matchesStatus = isPaid;
    else if (filterStatus === 'partial') matchesStatus = isPartial;
    else if (filterStatus === 'unpaid') matchesStatus = isUnpaid;

    return matchesSearch && matchesType && matchesStatus;
  });

  // Filter approved central expenses dynamically
  const filteredCentralExpenses = centralExpenses.filter(e => {
    const matchesSearch = e.title?.toLowerCase().includes(searchExpenseTitle.toLowerCase());
    const matchesCategory = filterExpenseCategory === 'all' || e.category?.toLowerCase() === filterExpenseCategory.toLowerCase();
    
    let matchesDate = true;
    if (filterExpenseDateRange === 'month') {
      const expDate = new Date(e.date);
      const now = new Date();
      matchesDate = expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear();
    } else if (filterExpenseDateRange === 'year') {
      const expDate = new Date(e.date);
      const now = new Date();
      matchesDate = expDate.getFullYear() === now.getFullYear();
    }
    
    return matchesSearch && matchesCategory && matchesDate;
  });

  const centralExpenseCategories = ['all', ...new Set(centralExpenses.map(e => e.category).filter(Boolean))];

  // Financial calculations for member's dues banner
  const totalAllotted = dues.reduce((acc, curr) => acc + (curr.totalDueAmount || 0), 0);
  const totalPaid = dues.reduce((acc, curr) => acc + (curr.amountPaid || 0), 0);
  const totalOutstanding = Math.max(0, totalAllotted - totalPaid);

  // Helper: get month string name
  const getMonthName = (monthNumber) => {
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return MONTHS[monthNumber - 1] || '';
  };

  // Helper: build full fund display name e.g. "MAINTENANCE FUND Jan 2026"
  const fundDisplayName = (fundId) => {
    if (!fundId) return 'General Fund';
    const month = fundId.month ? getMonthName(fundId.month) : '';
    const year = fundId.year || '';
    const suffix = [month, year].filter(Boolean).join(' ');
    return suffix ? `${fundId.name} ${suffix}` : fundId.name;
  };

  // Printable receipt areas
  const handlePrintReceipt = () => {
    const printContent = document.getElementById('receipt-print-area').innerHTML;
    const originalContent = document.body.innerHTML;
    document.body.innerHTML = printContent;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload();
  };

  return (
    <div className="member-layout">
      {/* Mobile Top Header */}
      <div className="mobile-header">
        <h2>Denalai Village Portal</h2>
        <button className="menu-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`sidebar glass-panel ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>Denalai Village</h2>
        </div>
        
        <nav className="sidebar-nav">
          <button 
            onClick={() => { setActiveTab('overview'); setIsMobileMenuOpen(false); }}
            className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
          >
            <User size={20} />
            <span>Profile & Overview</span>
          </button>

          <button 
            onClick={() => { setActiveTab('dues'); setIsMobileMenuOpen(false); }}
            className={`nav-item ${activeTab === 'dues' ? 'active' : ''}`}
          >
            <Clock size={20} />
            <span>My Family Dues</span>
          </button>

          <button 
            onClick={() => { setActiveTab('receipts'); setIsMobileMenuOpen(false); }}
            className={`nav-item ${activeTab === 'receipts' ? 'active' : ''}`}
          >
            <Receipt size={20} />
            <span>My Receipts Log</span>
          </button>

          <button 
            onClick={() => { setActiveTab('card'); setIsMobileMenuOpen(false); }}
            className={`nav-item ${activeTab === 'card' ? 'active' : ''}`}
          >
            <QrCode size={20} />
            <span>Membership Card</span>
          </button>

          <button 
            onClick={() => { setActiveTab('password'); setIsMobileMenuOpen(false); }}
            className={`nav-item ${activeTab === 'password' ? 'active' : ''}`}
          >
            <Lock size={20} />
            <span>Update Password</span>
          </button>

          {memberFinancialsVisible && (
            <button 
              onClick={() => { setActiveTab('centralFinancials'); setIsMobileMenuOpen(false); }}
              className={`nav-item ${activeTab === 'centralFinancials' ? 'active' : ''}`}
              style={{ borderTop: '1px solid rgba(79,70,229,0.15)', marginTop: '8px', paddingTop: '16px' }}
            >
              <Coins size={20} color="var(--primary-color)" />
              <span>Village central Treasury</span>
            </button>
          )}
        </nav>

        <div className="sidebar-footer">
          <button className="nav-item logout-btn" onClick={handleLogout}>
            <LogOut size={20} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Panel Content Area */}
      <main className="main-content">
        <header className="content-header">
          <h1>
            {activeTab === 'overview' && 'My Profile & Household'}
            {activeTab === 'dues' && 'My Family Dues Ledger'}
            {activeTab === 'receipts' && 'My Payment Receipts History'}
            {activeTab === 'card' && 'My Digital Membership Card'}
            {activeTab === 'password' && 'Account Security & Password'}
            {activeTab === 'centralFinancials' && 'Village Council Central Treasury'}
          </h1>
          <div className="user-profile">
            <div className="avatar">M</div>
            <span>{member?.name || 'Villager Head'}</span>
          </div>
        </header>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#64748b' }}>
            <div className="animate-spin" style={{ fontSize: '2rem', marginBottom: '16px' }}>⏳</div>
            <p style={{ fontWeight: '700' }}>Synchronizing with village central databases...</p>
          </div>
        ) : errorMsg ? (
          <div className="glass-panel p-8" style={{ border: '2px solid rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.05)', color: '#ef4444' }}>
            <AlertCircle size={32} style={{ marginBottom: '16px' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', margin: '0 0 8px 0' }}>Database Connection Issue</h3>
            <p style={{ fontWeight: '600', margin: 0 }}>{errorMsg}</p>
          </div>
        ) : (
          <div className="content-body animate-fade-in">
            {/* TAB 1: Profile & Overview */}
            {activeTab === 'overview' && (
              <>
                {/* Dynamic Financial Banner at top */}
                <div className="demographic-banner glass-panel p-6 mb-8">
                  <div className="demo-card">
                    <span className="demo-icon"><Coins size={20} color="#e879f9" /></span>
                    <span className="demo-label">Total Allotted Dues</span>
                    <strong className="demo-value">₹{totalAllotted.toLocaleString()}</strong>
                    <span className="demo-sublabel">Central contributions expected</span>
                  </div>
                  
                  <div className="demo-card">
                    <span className="demo-icon"><CheckCircle2 size={20} color="#34d399" /></span>
                    <span className="demo-label">Amount Cleared</span>
                    <strong className="demo-value" style={{ color: '#34d399' }}>₹{totalPaid.toLocaleString()}</strong>
                    <span className="demo-sublabel">Receipted funds settled</span>
                  </div>

                  <div className="demo-card">
                    <span className="demo-icon"><Clock size={20} color={totalOutstanding > 0 ? '#f87171' : '#34d399'} /></span>
                    <span className="demo-label">Outstanding Unpaid</span>
                    <strong className="demo-value" style={{ color: totalOutstanding > 0 ? '#f87171' : '#34d399' }}>
                      ₹{totalOutstanding.toLocaleString()}
                    </strong>
                    <span className="demo-sublabel">
                      {totalOutstanding > 0 ? '⚠️ Dues currently pending' : '✅ Clear of all dues!'}
                    </span>
                  </div>
                </div>

                <div className="profile-grid">
                  {/* Family Head Card */}
                  <div className="profile-card glass-panel p-8">
                    <div className="profile-header">
                      <div className="profile-avatar">🏡</div>
                      <div className="profile-title">
                        <h3>{member?.name}</h3>
                        <span>Household Head Profile</span>
                      </div>
                    </div>

                    <div className="info-list">
                      <div className="info-item">
                        <span className="info-label">Household Head Name</span>
                        <span className="info-value">{member?.name || 'N/A'}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Unique Member ID</span>
                        <span className="info-value" style={{ color: 'var(--primary-color)' }}>{member?.memberId || 'N/A'}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Family ID / Code</span>
                        <span className="info-value">{member?.familyId || 'N/A'}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Mobile Contact</span>
                        <span className="info-value">{member?.phone || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                {/* Sub Family Members List */}
                <div className="family-members-card glass-panel p-8">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Users size={20} color="var(--primary-color)" /> Family Members
                    </h3>
                    <button 
                      onClick={openAddSubModal}
                      style={{
                        background: 'rgba(79, 70, 229, 0.1)',
                        color: 'var(--primary-color)',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontWeight: '800',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Plus size={14} /> Add
                    </button>
                  </div>
                  <p style={{ color: 'var(--text-light)', fontSize: '0.85rem', fontWeight: '600', margin: '0 0 20px 0' }}>
                    Sub-members registered under this household head.
                  </p>

                  <div className="family-members-list">
                    {member?.subFamilyMembers && member.subFamilyMembers.length > 0 ? (
                      member.subFamilyMembers.map((sub, idx) => (
                        <div key={idx} className="family-member-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div className="family-member-avatar">👤</div>
                            <div>
                              <strong style={{ display: 'block', fontSize: '0.95rem' }}>{sub.name}</strong>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', fontWeight: '700' }}>
                                {sub.relation || sub.relationship || 'Member'} • {sub.age} yrs • {sub.gender}
                              </span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                              onClick={() => openEditSubModal(sub, idx)}
                              style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
                              title="Edit Member"
                            >
                              <Edit size={16} />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p style={{ textAlign: 'center', color: 'var(--text-light)', padding: '20px 0', fontStyle: 'italic', fontSize: '0.9rem' }}>
                        No other family members recorded.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

            {/* TAB 2: Family Dues Ledger */}
            {activeTab === 'dues' && (
              <div className="glass-panel p-6" style={{ background: 'white', borderRadius: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#0f172a', margin: 0 }}>
                    Central Dues & Fund Subscriptions
                  </h3>
                  
                  {/* Dynamic Filters bar */}
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ position: 'relative' }}>
                      <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                      <input 
                        type="text"
                        placeholder="Search fund name..."
                        value={searchFundName}
                        onChange={(e) => setSearchFundName(e.target.value)}
                        style={{
                          padding: '6px 12px 6px 30px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.85rem',
                          outline: 'none',
                          width: '160px'
                        }}
                      />
                    </div>

                    <select
                      value={filterFundType}
                      onChange={(e) => setFilterFundType(e.target.value)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.85rem',
                        color: '#475569',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="all">All Fund Types</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                      <option value="custom">Custom / Other</option>
                    </select>

                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.85rem',
                        color: '#475569',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="all">All Statuses</option>
                      <option value="paid">Fully Paid</option>
                      <option value="partial">Partially Paid</option>
                      <option value="unpaid">Unpaid</option>
                    </select>
                  </div>
                </div>

                <div className="table-wrapper" style={{ overflowX: 'auto' }}>
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Fund / Contribution Name</th>
                        <th>Type</th>
                        <th>Target Due</th>
                        <th>Amount Settled</th>
                        <th>Remaining Balance</th>
                        <th style={{ textAlign: 'center' }}>Due Date</th>
                        <th style={{ textAlign: 'center' }}>Payment Status</th>
                      </tr>
                    </thead>
                    <tbody style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                      {filteredDues.length > 0 ? (
                        filteredDues.map((d, idx) => {
                          const unpaidAmt = Math.max(0, (d.totalDueAmount || 0) - (d.amountPaid || 0));
                          const isPaid = (d.amountPaid || 0) >= (d.totalDueAmount || 0);
                          const isPartial = (d.amountPaid || 0) > 0 && !isPaid;
                          const cashierName = d.amountPaid > 0 ? findCashierForDue(d.fundId?._id) : null;
                          
                          return (
                            <tr key={d._id} className={idx % 2 === 0 ? 'row-even' : 'row-odd'}>
                              <td>
                                <strong style={{ color: '#0f172a' }}>{fundDisplayName(d.fundId)}</strong>
                                {cashierName && (
                                  <div style={{ fontSize: '0.74rem', color: '#4f46e5', fontWeight: '700', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                    <span style={{ display: 'inline-block', width: '5px', height: '5px', borderRadius: '50%', background: '#4f46e5' }}></span>
                                    Counter Cashier: {cashierName}
                                  </div>
                                )}
                              </td>
                              <td>
                                <span style={{ background: 'rgba(79, 70, 229, 0.08)', color: 'var(--primary-color)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '800', textTransform: 'uppercase' }}>
                                  {d.fundId?.fundType || 'General'}
                                </span>
                              </td>
                              <td><strong>₹{(d.totalDueAmount || 0).toLocaleString()}</strong></td>
                              <td style={{ color: '#10b981' }}><strong>₹{(d.amountPaid || 0).toLocaleString()}</strong></td>
                              <td style={{ color: unpaidAmt > 0 ? '#ef4444' : '#10b981' }}>
                                <strong>₹{unpaidAmt.toLocaleString()}</strong>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontSize: '0.82rem', color: '#475569' }}>
                                  <Calendar size={13} /> 
                                  {d.fundId?.dueDate ? new Date(d.fundId.dueDate).toLocaleDateString('en-IN') : 'No Limit'}
                                </span>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <span className={`status-badge ${isPaid ? 'paid' : isPartial ? 'partially_paid' : 'unpaid'}`}>
                                  {isPaid ? '✓ Fully Paid' : isPartial ? '⚠️ Partial' : '⚠️ Unpaid'}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="7" className="text-center py-6 text-muted" style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-light)' }}>
                            No due records found matching the active filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 3: My Receipts History */}
            {activeTab === 'receipts' && (
              <div className="glass-panel p-6" style={{ background: 'white', borderRadius: '24px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#0f172a', marginBottom: '20px' }}>
                  Settled Contribution Receipts
                </h3>
                
                {payments.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-light)', padding: '40px 0', fontWeight: '600' }}>
                    No payment history recorded yet. Visited the cashier counter to settle dues and receive your receipt.
                  </p>
                ) : (
                  <div className="table-wrapper" style={{ overflowX: 'auto' }}>
                    <table className="report-table">
                      <thead>
                        <tr>
                          <th>Receipt #</th>
                          <th>Payment Date</th>
                          <th>Method</th>
                          <th>Dues Allotted Breakdown</th>
                          <th>Collected By</th>
                          <th>Total Amount Paid</th>
                          <th style={{ textAlign: 'center' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                        {payments.map((p, idx) => (
                          <tr key={p._id} className={idx % 2 === 0 ? 'row-even' : 'row-odd'}>
                            <td>
                              <span style={{ color: 'var(--primary-color)', fontWeight: '900' }}>#{p.receiptNumber}</span>
                            </td>
                            <td>{new Date(p.paymentDate).toLocaleDateString()} • {new Date(p.paymentDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                            <td style={{ textTransform: 'uppercase' }}>
                              {p.paymentMode === 'cash' ? '💵 Cash' : p.paymentMode === 'upi' ? '📱 UPI' : '💳 Card'}
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {p.splitDetails?.map((split, sIdx) => (
                                  <span key={sIdx} style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.75rem', padding: '3px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: '700' }}>
                                    {split.fundId?.name || 'General'}: ₹{split.amountAllocated}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td>
                              <span style={{ fontWeight: '700', color: '#475569' }}>
                                {p.cashierId?.name || 'Central Office'}
                              </span>
                            </td>
                            <td style={{ color: '#10b981', fontSize: '1.05rem', fontWeight: '800' }}>
                              ₹{p.totalAmountPaid.toLocaleString()}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button 
                                onClick={() => { setCurrentReceipt(p); setShowReceiptModal(true); }}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(79, 70, 229, 0.1)', border: 'none', color: 'var(--primary-color)', padding: '6px 12px', borderRadius: '8px', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s' }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--primary-color)'; e.currentTarget.style.color = '#fff'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(79, 70, 229, 0.1)'; e.currentTarget.style.color = 'var(--primary-color)'; }}
                              >
                                <Info size={14} /> View Receipt
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

            {/* TAB 4: Digital ID Card */}
            {activeTab === 'card' && (
              <div className="glass-panel p-8" style={{ background: 'white', borderRadius: '24px', textAlign: 'center' }}>
                <h3 style={{ fontSize: '1.4rem', fontWeight: '900', color: '#0f172a', margin: '0 0 10px 0' }}>
                  Denalai Digital Villager Pass
                </h3>
                <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', fontWeight: '600', maxWidth: '500px', margin: '0 auto 30px auto' }}>
                  Present this card at the village cashier desk for quick outstanding checks and transaction records.
                </p>

                <div className="digital-card-container">
                  <div className="digital-membership-card">
                    <div className="card-bg-glow"></div>
                    <div className="card-header-row">
                      <span className="card-logo">🌲 DENALAI VILLAGE</span>
                      <div className="card-chip"></div>
                    </div>

                    <div className="card-body">
                      <h4 className="card-holder-name">{member?.name}</h4>
                      <span className="card-id-badge">Family Head Pass</span>
                    </div>

                    <div className="card-footer-row">
                      <div className="card-label-value">
                        <span className="card-meta-label">Family ID Code</span>
                        <span className="card-meta-value">{member?.familyId}</span>
                      </div>
                      
                      <div className="card-label-value" style={{ marginLeft: '20px' }}>
                        <span className="card-meta-label">Member ID</span>
                        <span className="card-meta-value">{member?.memberId}</span>
                      </div>

                      <div className="card-qr-block" style={{ marginLeft: 'auto' }}>
                        {/* Render simple simulation of QR/Barcode block */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '2px', width: '38px', height: '38px' }}>
                          {[...Array(25)].map((_, i) => (
                            <div 
                              key={i} 
                              style={{ 
                                background: (i % 2 === 0 && i % 3 !== 0) || i % 5 === 0 ? '#0f172a' : 'transparent',
                                borderRadius: '1px'
                              }}
                            ></div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: Central Village Treasury */}
            {activeTab === 'centralFinancials' && memberFinancialsVisible && (
              <div className="animate-fade-in">
                <div className="glass-panel p-6 mb-6" style={{ background: 'white', borderRadius: '24px' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#0f172a', marginBottom: '8px' }}>
                    Village Council Central Treasury
                  </h3>
                  <p style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '600', marginBottom: '24px' }}>
                    Real-time official council treasury statement public index.
                  </p>

                  <div className="profile-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                    <div className="glass-panel p-6" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
                      <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b', fontWeight: '800' }}>
                        Total Village Allotted
                      </span>
                      <h2 style={{ fontSize: '1.8rem', fontWeight: '900', color: '#0f172a', margin: '6px 0 0 0' }}>
                        ₹{centralStats.totalAllotted.toLocaleString()}
                      </h2>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginTop: '4px' }}>
                        Total central dues expectations
                      </span>
                    </div>

                    <div className="glass-panel p-6" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
                      <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#10b981', fontWeight: '800' }}>
                        Total Collected Dues
                      </span>
                      <h2 style={{ fontSize: '1.8rem', fontWeight: '900', color: '#10b981', margin: '6px 0 0 0' }}>
                        ₹{centralStats.totalCollected.toLocaleString()}
                      </h2>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginTop: '4px' }}>
                        Cleared villager contributions
                      </span>
                    </div>

                    <div className="glass-panel p-6" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
                      <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#ef4444', fontWeight: '800' }}>
                        Outstanding Pending
                      </span>
                      <h2 style={{ fontSize: '1.8rem', fontWeight: '900', color: '#ef4444', margin: '6px 0 0 0' }}>
                        ₹{centralStats.totalPendingDues.toLocaleString()}
                      </h2>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginTop: '4px' }}>
                        Outstanding default reserves
                      </span>
                    </div>

                    <div 
                      className="glass-panel p-6" 
                      onClick={() => setShowExpenseDetails(!showExpenseDetails)}
                      style={{ 
                        background: '#f8fafc', 
                        border: showExpenseDetails ? '2px solid #b91c1c' : '1px solid #e2e8f0', 
                        borderRadius: '16px', 
                        cursor: 'pointer',
                        boxShadow: showExpenseDetails ? '0 4px 12px rgba(185, 28, 28, 0.1)' : 'none',
                        transition: 'all 0.2s ease',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      <div style={{ position: 'absolute', top: 0, right: 0, width: '4px', height: '100%', background: '#b91c1c' }}></div>
                      <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#b91c1c', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Total Expenses Paid 🔍
                      </span>
                      <h2 style={{ fontSize: '1.8rem', fontWeight: '900', color: '#b91c1c', margin: '6px 0 0 0' }}>
                        ₹{centralStats.totalSpent.toLocaleString()}
                      </h2>
                      <span style={{ fontSize: '0.72rem', color: showExpenseDetails ? '#b91c1c' : '#94a3b8', display: 'block', marginTop: '4px', fontWeight: '700' }}>
                        {showExpenseDetails ? '▲ Click to hide details' : '▼ Click to view itemized bills'}
                      </span>
                    </div>

                    <div className="glass-panel p-6" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '16px' }}>
                      <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#16a34a', fontWeight: '800' }}>
                        Net Account Balance
                      </span>
                      <h2 style={{ fontSize: '1.8rem', fontWeight: '900', color: '#16a34a', margin: '6px 0 0 0' }}>
                        ₹{centralStats.currentBalance.toLocaleString()}
                      </h2>
                      <span style={{ fontSize: '0.72rem', color: '#86efac', display: 'block', marginTop: '4px' }}>
                        Currently held in central accounts
                      </span>
                    </div>
                  </div>

                  {/* Expandable itemized expenses details */}
                  {showExpenseDetails && (
                    <div className="glass-panel p-6 mt-6 animate-fade-in" style={{ background: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', marginTop: '24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                        <div>
                          <h4 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                            Central Approved Expenses Ledger
                          </h4>
                          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>
                            Transparent itemized list of all approved village outlays.
                          </span>
                        </div>
                        
                        {/* Live Filters */}
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                          <div style={{ position: 'relative' }}>
                            <Search size={13} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                            <input 
                              type="text"
                              placeholder="Search expenses..."
                              value={searchExpenseTitle}
                              onChange={(e) => setSearchExpenseTitle(e.target.value)}
                              style={{
                                padding: '5px 10px 5px 26px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                fontSize: '0.8rem',
                                outline: 'none',
                                width: '150px'
                              }}
                            />
                          </div>

                          <select
                            value={filterExpenseCategory}
                            onChange={(e) => setFilterExpenseCategory(e.target.value)}
                            style={{
                              padding: '5px 8px',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.8rem',
                              color: '#475569',
                              outline: 'none',
                              cursor: 'pointer',
                              textTransform: 'capitalize'
                            }}
                          >
                            {centralExpenseCategories.map(cat => (
                              <option key={cat} value={cat}>
                                {cat === 'all' ? 'All Categories' : cat}
                              </option>
                            ))}
                          </select>

                          <select
                            value={filterExpenseDateRange}
                            onChange={(e) => setFilterExpenseDateRange(e.target.value)}
                            style={{
                              padding: '5px 8px',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.8rem',
                              color: '#475569',
                              outline: 'none',
                              cursor: 'pointer'
                            }}
                          >
                            <option value="all">All Dates</option>
                            <option value="month">This Month</option>
                            <option value="year">This Year</option>
                          </select>
                        </div>
                      </div>

                      <div className="table-wrapper" style={{ overflowX: 'auto' }}>
                        <table className="report-table" style={{ width: '100%' }}>
                          <thead>
                            <tr>
                              <th>Expense Title</th>
                              <th>Category</th>
                              <th>Amount Settled</th>
                              <th>Payment Date</th>
                              <th>Logged By</th>
                            </tr>
                          </thead>
                          <tbody style={{ fontSize: '0.85rem', fontWeight: '600' }}>
                            {filteredCentralExpenses.length > 0 ? (
                              filteredCentralExpenses.map((exp, idx) => (
                                <tr key={exp._id} className={idx % 2 === 0 ? 'row-even' : 'row-odd'}>
                                  <td>
                                    <strong style={{ color: '#0f172a' }}>{exp.title}</strong>
                                    {exp.subDetails && (
                                      <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: '500', marginTop: '2px' }}>
                                        {exp.subDetails}
                                      </div>
                                    )}
                                  </td>
                                  <td>
                                    <span style={{ background: '#fef2f2', color: '#b91c1c', padding: '3px 8px', borderRadius: '6px', fontSize: '0.74rem', fontWeight: '800', textTransform: 'uppercase' }}>
                                      {exp.category || 'General'}
                                    </span>
                                  </td>
                                  <td style={{ color: '#b91c1c' }}><strong>₹{exp.amount.toLocaleString()}</strong></td>
                                  <td>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: '#475569' }}>
                                      <Calendar size={12} />
                                      {new Date(exp.date).toLocaleDateString('en-IN')}
                                    </span>
                                  </td>
                                  <td style={{ color: '#475569' }}>
                                    {exp.cashierId?.name || 'Super Admin'}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan="5" className="text-center py-6 text-muted" style={{ textAlign: 'center', padding: '24px 0', color: '#64748b' }}>
                                  No matching central expenses found.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 6: Update Password */}
            {activeTab === 'password' && (
              <div className="glass-panel p-8 animate-fade-in" style={{ background: 'white', borderRadius: '24px', maxWidth: '480px', margin: '0 auto', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '950', color: '#0f172a', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Lock size={20} color="var(--primary-color)" /> Update Password
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '600', marginBottom: '24px' }}>
                  Change your login credentials to protect your digital villager account.
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
                    {pwdStatus.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
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
        )}
      </main>

      {/* RENDER MODAL: Sub Family Member Add / Edit */}
      {showSubModal && (
        <div className="modal-backdrop animate-fade-in" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div className="modal-content animate-scale-up" style={{ width: '100%', maxWidth: '440px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '24px', padding: '30px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a', fontWeight: '800' }}>
                {editingSubIndex !== null ? '✏️ Edit Family Member' : '➕ Add Family Member'}
              </h3>
              <button 
                onClick={() => setShowSubModal(false)}
                style={{ background: '#f1f5f9', border: 'none', color: '#64748b', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSub} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569' }}>Full Name</label>
                <input 
                  type="text"
                  required
                  placeholder="Enter full name..."
                  value={subForm.name}
                  onChange={(e) => setSubForm({ ...subForm, name: e.target.value })}
                  style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569' }}>Relationship</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Spouse, Son, Daughter..."
                  value={subForm.relation}
                  onChange={(e) => setSubForm({ ...subForm, relation: e.target.value })}
                  style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569' }}>Age</label>
                  <input 
                    type="number"
                    placeholder="e.g. 24"
                    value={subForm.age}
                    onChange={(e) => setSubForm({ ...subForm, age: e.target.value })}
                    style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569' }}>Gender</label>
                  <select 
                    value={subForm.gender}
                    onChange={(e) => setSubForm({ ...subForm, gender: e.target.value })}
                    style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem', color: '#475569' }}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button 
                  type="button"
                  onClick={() => setShowSubModal(false)}
                  style={{ background: '#f1f5f9', color: '#475569', border: 'none', padding: '10px 18px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  style={{ background: 'var(--primary-color)', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Save Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RENDER MODAL: Detailed Printable Receipt */}
      {showReceiptModal && currentReceipt && (
        <div className="modal-backdrop animate-fade-in" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div className="modal-content animate-scale-up" style={{ width: '100%', maxWidth: '580px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '24px', padding: '36px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', maxHeight: '90vh', overflowY: 'auto' }}>
            
            {/* Modal Actions Area */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', fontWeight: '800' }}>🌲 Payment Receipt Invoice</h3>
              <button 
                onClick={() => setShowReceiptModal(false)}
                style={{ background: '#f1f5f9', border: 'none', color: '#64748b', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800' }}
              >
                ✕
              </button>
            </div>

            {/* Printable Receipt layout */}
            <div id="receipt-visual-content" style={{ border: '2px solid #cbd5e1', borderRadius: '16px', padding: '24px', background: '#f8fafc', color: '#0f172a', fontFamily: 'monospace' }}>
              <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '1px dashed #cbd5e1', paddingBottom: '16px' }}>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '1.3rem', fontWeight: 'bold' }}>DENALAI VILLAGE COUNCIL</h2>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Central Treasury & Financial Office</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                  RECEIPT NUMBER: #{currentReceipt.receiptNumber}
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', marginBottom: '20px', borderBottom: '1px dashed #cbd5e1', paddingBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Household Head:</span>
                  <strong>{currentReceipt.memberId?.name}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Family ID Code:</span>
                  <strong>#{currentReceipt.memberId?.familyId}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Member Pass ID:</span>
                  <strong>{currentReceipt.memberId?.memberId}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Payment Date:</span>
                  <strong>{new Date(currentReceipt.paymentDate).toLocaleString('en-IN')}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Paid Channel:</span>
                  <strong style={{ textTransform: 'uppercase' }}>{currentReceipt.paymentMode}</strong>
                </div>
                {currentReceipt.cashierId?.name && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Council Cashier:</span>
                    <strong>{currentReceipt.cashierId.name}</strong>
                  </div>
                )}
              </div>

              {/* Fund Breakdown table */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #cbd5e1', paddingBottom: '6px', fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b' }}>
                  <span>CONTRIBUTION / FUND DETAIL</span>
                  <span>AMOUNT ALLOCATED</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                  {currentReceipt.splitDetails?.map((split, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span>{fundDisplayName(split.fundId)}</span>
                      <strong>₹{split.amountAllocated.toLocaleString()}</strong>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #0f172a', paddingTop: '12px', fontSize: '1.1rem', fontWeight: 'bold', color: '#10b981' }}>
                <span>TOTAL SETTLED</span>
                <span>₹{currentReceipt.totalAmountPaid.toLocaleString()}</span>
              </div>

              {currentReceipt.notes && (
                <div style={{ marginTop: '20px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px', fontSize: '0.8rem' }}>
                  <span style={{ color: '#64748b', display: 'block', fontWeight: 'bold', marginBottom: '2px' }}>OFFICE REMARKS</span>
                  {currentReceipt.notes}
                </div>
              )}
            </div>

            {/* Hidden printable receipt wrapper */}
            <div id="receipt-print-area" style={{ display: 'none' }}>
              <div style={{ padding: '40px', fontFamily: 'monospace', color: '#000', background: '#fff' }}>
                <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '2px dashed #000', paddingBottom: '20px' }}>
                  <h1 style={{ margin: '0 0 6px 0', fontSize: '1.7rem' }}>DENALAI VILLAGE COUNCIL</h1>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem' }}>CENTRAL COUNTER RECEIPT</h3>
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>Central Treasury Office, Denalai Village Council</p>
                  <p style={{ margin: '8px 0 0 0', fontSize: '1rem', fontWeight: 'bold' }}>RECEIPT NUMBER: #{currentReceipt.receiptNumber}</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.95rem', marginBottom: '30px', borderBottom: '2px dashed #000', paddingBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>HOUSEHOLD HEAD:</span>
                    <strong>{currentReceipt.memberId?.name}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>FAMILY ID CODE:</span>
                    <strong>#{currentReceipt.memberId?.familyId}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>MEMBER ID:</span>
                    <strong>{currentReceipt.memberId?.memberId}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>PAYMENT DATE:</span>
                    <strong>{new Date(currentReceipt.paymentDate).toLocaleString('en-IN')}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>CHANNEL:</span>
                    <strong style={{ textTransform: 'uppercase' }}>{currentReceipt.paymentMode}</strong>
                  </div>
                  {currentReceipt.cashierId?.name && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>CASHIER ASSIGNED:</span>
                      <strong>{currentReceipt.cashierId.name}</strong>
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: '30px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: '8px', fontSize: '0.9rem', fontWeight: 'bold' }}>
                    <span>CONTRIBUTION / FUND DETAIL</span>
                    <span>AMOUNT ALLOCATED</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                    {currentReceipt.splitDetails?.map((split, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                        <span>{fundDisplayName(split.fundId)?.toUpperCase()}</span>
                        <strong>INR {split.amountAllocated.toLocaleString()}.00</strong>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '3px solid #000', paddingTop: '15px', fontSize: '1.25rem', fontWeight: 'bold' }}>
                  <span>TOTAL PAID SETTLED</span>
                  <span>INR {currentReceipt.totalAmountPaid.toLocaleString()}.00</span>
                </div>

                {currentReceipt.notes && (
                  <div style={{ marginTop: '30px', border: '1px solid #000', padding: '15px', fontSize: '0.9rem' }}>
                    <strong style={{ display: 'block', marginBottom: '5px' }}>OFFICE REMARKS:</strong>
                    {currentReceipt.notes}
                  </div>
                )}

                <div style={{ marginTop: '60px', textAlign: 'center', borderTop: '1px solid #ccc', paddingTop: '20px', fontSize: '0.85rem', color: '#666' }}>
                  <p>Council Authorized Digital Receipt • Signature Not Required</p>
                  <p>Thank you for contributing towards Denalai Village development and welfare.</p>
                </div>
              </div>
            </div>

            {/* Modal Controls */}
            <div style={{ marginTop: '28px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                onClick={handlePrintReceipt}
                style={{ background: 'var(--primary-color)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 10px rgba(79, 70, 229, 0.2)' }}
              >
                <Printer size={16} /> Print / Export PDF
              </button>
              <button 
                onClick={() => setShowReceiptModal(false)}
                style={{ background: '#f1f5f9', color: '#334155', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: '800', cursor: 'pointer' }}
              >
                Close View
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default MemberDashboard;
