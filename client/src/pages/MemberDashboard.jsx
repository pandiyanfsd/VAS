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
import { translations } from '../utils/translations';

const MemberDashboard = () => {
  const navigate = useNavigate();
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'en');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // overview, dues, receipts, card, centralFinancials
  const [member, setMember] = useState(null);

  const t = (key) => {
    if (!key) return '';
    const cleanKey = key.toString().trim();
    
    // Check direct translations dictionary
    if (translations[language]?.[cleanKey]) {
      return translations[language][cleanKey];
    }
    
    // Handle dynamic database values when language is Tamil
    if (language === 'ta') {
      const upperKey = cleanKey.toUpperCase();
      const lowerKey = cleanKey.toLowerCase();
      
      // 1. Member and Family Names from Database
      const nameTranslations = {
        'pandiyan': 'பாண்டியன்',
        'vinesh': 'வினேஷ்',
        'vinesh p': 'வினேஷ் பி',
        'vineshpandiyan': 'வினேஷ் பாண்டியன்',
        'vinesh pandiyan': 'வினேஷ் பாண்டியன்',
        'parvathii': 'பார்வதி',
        'durga': 'துர்கா',
        'ushaa': 'உஷா',
        'ganeshan': 'கணேசன்',
        'test1': 'சோதனை 1',
        'test2': 'சோதனை 2',
        'pandiyanganeshan': 'பாண்டியன் கணேசன்',
        'superadmin': 'சூப்பர் அட்மின்',
        'testing': 'சோதனை',
        'sample': 'மாதிரி',
        'sample name': 'மாதிரி பெயர்'
      };
      if (nameTranslations[lowerKey]) {
        return nameTranslations[lowerKey];
      }
      
      // 2. Relations
      const relationTranslations = {
        'husband': 'கணவர்',
        'wife': 'மனைவி',
        'son': 'மகன்',
        'daughter': 'மகள்',
        'father': 'தந்தை',
        'mother': 'தாய்',
        'brother': 'சகோதரன்',
        'sister': 'சகோதரி',
        'grandson': 'பேரன்',
        'granddaughter': 'பேத்தி',
        'other': 'இதர',
        'member': 'உறுப்பினர்'
      };
      if (relationTranslations[lowerKey]) {
        return relationTranslations[lowerKey];
      }
      
      // 3. Payment Statuses
      const statusTranslations = {
        'paid': 'முழுமையாக செலுத்தப்பட்டது',
        'fully paid': 'முழுமையாக செலுத்தப்பட்டது',
        'fullypaid': 'முழுமையாக செலுத்தப்பட்டது',
        'partially paid': 'பகுதி செலுத்தப்பட்டது',
        'partiallypaid': 'பகுதி செலுத்தப்பட்டது',
        'partial': 'பகுதி செலுத்தப்பட்டது',
        'unpaid': 'செலுத்தப்படாதது',
        'pending': 'நிலுவையில் உள்ளது'
      };
      if (statusTranslations[lowerKey]) {
        return statusTranslations[lowerKey];
      }

      // 4. Payment Modes / Channels
      const modeTranslations = {
        'cash': 'பணம்',
        'upi': 'UPI',
        'card': 'அட்டை'
      };
      if (modeTranslations[lowerKey]) {
        return modeTranslations[lowerKey];
      }

      // 5. Fund Names
      if (cleanKey === '2025-26 YEARLY PAYMENT') {
        return '2025-26 வருடாந்திர கட்டணம்';
      }
      if (cleanKey.includes('YEARLY PAYMENT')) {
        return cleanKey.replace('YEARLY PAYMENT', 'வருடாந்திர கட்டணம்');
      }
      if (cleanKey.includes('MONTHLY PAYMENT')) {
        return cleanKey.replace('MONTHLY PAYMENT', 'மாதாந்திர கட்டணம்');
      }
    }
    
    return translations['en']?.[cleanKey] || cleanKey;
  };
  
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
  const [subError, setSubError] = useState('');

  // Edit Profile Modal State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', age: '', gender: 'male' });
  const [profileError, setProfileError] = useState('');

  // Central Financials settings and data
  const [memberFinancialsVisible, setMemberFinancialsVisible] = useState(false);
  const [centralStats, setCentralStats] = useState({
    totalAllotted: 0,
    totalCollected: 0,
    totalSpent: 0,
    currentBalance: 0,
    totalPendingDues: 0,
    totalDonations: 0
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

  // 2. Fetch all dashboard initial data in a single optimized HTTP round-trip
  const fetchMemberData = async (memberId) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/members/dashboard-init/${memberId}`);
      const { member, dues, payments, showMemberCentralFinancials, centralStats, centralExpenses } = res.data;

      setMember(member);
      setDues(dues || []);
      setPayments(payments || []);
      setMemberFinancialsVisible(!!showMemberCentralFinancials);

      if (showMemberCentralFinancials && centralStats) {
        setCentralStats(centralStats);
        setCentralExpenses(centralExpenses || []);
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

  // 3. Edit Profile Handlers
  const openEditProfileModal = () => {
    setProfileForm({
      name: member?.name || '',
      phone: member?.phone || '',
      age: member?.age || '',
      gender: member?.gender || 'male'
    });
    setProfileError('');
    setShowProfileModal(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!member) return;
    setProfileError('');

    // Client-side verification
    if (profileForm.name.length < 5 || profileForm.name.length > 50) {
      setProfileError("Full Name must be between 5 and 50 characters.");
      return;
    }
    if (profileForm.phone.length !== 10 || !/^\d+$/.test(profileForm.phone)) {
      setProfileError("Phone number must be exactly 10 digits.");
      return;
    }

    try {
      const res = await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/members/${member._id}`, {
        ...member,
        name: profileForm.name,
        phone: profileForm.phone,
        age: profileForm.age ? Number(profileForm.age) : undefined,
        gender: profileForm.gender
      });

      setMember(res.data);
      localStorage.setItem('user', JSON.stringify(res.data));
      setShowProfileModal(false);
    } catch (err) {
      console.error("Failed to save member profile", err);
      setProfileError(err.response?.data?.error || "Failed to update profile. Please verify input values.");
    }
  };

  // 4. Sub Family Member CRUD Handlers
  const openAddSubModal = () => {
    setEditingSubIndex(null);
    setSubForm({ name: '', relation: '', age: '', gender: 'male' });
    setSubError('');
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
    setSubError('');
    setShowSubModal(true);
  };

  const handleSaveSub = async (e) => {
    e.preventDefault();
    if (!member) return;

    try {
      setSubError('');
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
      localStorage.setItem('user', JSON.stringify(res.data));
      setShowSubModal(false);
    } catch (err) {
      console.error("Failed to save sub family member", err);
      setSubError(err.response?.data?.error || "Failed to save family member. Please verify input values.");
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
      localStorage.setItem('user', JSON.stringify(res.data));
    } catch (err) {
      console.error("Failed to delete sub family member", err);
      alert("Failed to delete family member. " + (err.response?.data?.error || ""));
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
    <div className={`member-layout ${language === 'ta' ? 'lang-ta' : ''}`}>
      {/* Mobile Top Header */}
      <div className="mobile-header">
        <h2 style={{ marginRight: 'auto' }}>{t('villagePortal')}</h2>
        <select 
          value={language} 
          onChange={(e) => {
            const newLang = e.target.value;
            setLanguage(newLang);
            localStorage.setItem('language', newLang);
          }}
          style={{
            padding: '4px 6px',
            borderRadius: '6px',
            border: '1px solid var(--panel-border)',
            fontSize: '0.75rem',
            fontWeight: '700',
            cursor: 'pointer',
            background: 'rgba(255, 255, 255, 0.8)'
          }}
        >
          <option value="en">EN</option>
          <option value="ta">தமிழ்</option>
        </select>
        <button className="menu-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`sidebar glass-panel ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h2 style={{ fontSize: '1.4rem' }}>{t('villageName')}</h2>
          <select 
            value={language} 
            onChange={(e) => {
              const newLang = e.target.value;
              setLanguage(newLang);
              localStorage.setItem('language', newLang);
            }}
            style={{
              padding: '4px 8px',
              borderRadius: '8px',
              border: '1px solid var(--panel-border)',
              fontSize: '0.8rem',
              fontWeight: '700',
              cursor: 'pointer',
              background: 'rgba(255, 255, 255, 0.8)'
            }}
          >
            <option value="en">English</option>
            <option value="ta">தமிழ்</option>
          </select>
        </div>
        
        <nav className="sidebar-nav">
          <button 
            onClick={() => { setActiveTab('overview'); setIsMobileMenuOpen(false); }}
            className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
          >
            <User size={20} />
            <span>{t('profileOverview')}</span>
          </button>

          <button 
            onClick={() => { setActiveTab('dues'); setIsMobileMenuOpen(false); }}
            className={`nav-item ${activeTab === 'dues' ? 'active' : ''}`}
          >
            <Clock size={20} />
            <span>{t('myFamilyDues')}</span>
          </button>

          <button 
            onClick={() => { setActiveTab('receipts'); setIsMobileMenuOpen(false); }}
            className={`nav-item ${activeTab === 'receipts' ? 'active' : ''}`}
          >
            <Receipt size={20} />
            <span>{t('myReceiptsLog')}</span>
          </button>

          <button 
            onClick={() => { setActiveTab('card'); setIsMobileMenuOpen(false); }}
            className={`nav-item ${activeTab === 'card' ? 'active' : ''}`}
          >
            <QrCode size={20} />
            <span>{t('membershipCard')}</span>
          </button>

          <button 
            onClick={() => { setActiveTab('password'); setIsMobileMenuOpen(false); }}
            className={`nav-item ${activeTab === 'password' ? 'active' : ''}`}
          >
            <Lock size={20} />
            <span>{t('updatePassword')}</span>
          </button>

          {memberFinancialsVisible && (
            <button 
              onClick={() => { setActiveTab('centralFinancials'); setIsMobileMenuOpen(false); }}
              className={`nav-item ${activeTab === 'centralFinancials' ? 'active' : ''}`}
              style={{ borderTop: '1px solid rgba(79,70,229,0.15)', marginTop: '8px', paddingTop: '16px' }}
            >
              <Coins size={20} color="var(--primary-color)" />
              <span>{t('villageCentralTreasury')}</span>
            </button>
          )}
        </nav>

        <div className="sidebar-footer">
          <button className="nav-item logout-btn" onClick={handleLogout}>
            <LogOut size={20} />
            <span>{t('signOut')}</span>
          </button>
        </div>
      </aside>

      {/* Main Panel Content Area */}
      <main className="main-content">
        <header className="content-header">
          <h1>
            {activeTab === 'overview' && t('myProfileHousehold')}
            {activeTab === 'dues' && t('myFamilyDuesLedger')}
            {activeTab === 'receipts' && t('myPaymentReceiptsHistory')}
            {activeTab === 'card' && t('myDigitalMembershipCard')}
            {activeTab === 'password' && t('accountSecurityPassword')}
            {activeTab === 'centralFinancials' && t('villageCouncilCentralTreasury')}
          </h1>
          <div className="user-profile">
            <div className="avatar">M</div>
            <span>{member?.name ? t(member.name) : t('villagerHead')}</span>
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
                    <span className="demo-label">{t('totalAllottedDues')}</span>
                    <strong className="demo-value">₹{totalAllotted.toLocaleString()}</strong>
                    <span className="demo-sublabel">{t('centralContributionsExpected')}</span>
                  </div>
                  
                  <div className="demo-card">
                    <span className="demo-icon"><CheckCircle2 size={20} color="#34d399" /></span>
                    <span className="demo-label">{t('amountCleared')}</span>
                    <strong className="demo-value" style={{ color: '#34d399' }}>₹{totalPaid.toLocaleString()}</strong>
                    <span className="demo-sublabel">{t('receiptedFundsSettled')}</span>
                  </div>

                  <div className="demo-card">
                    <span className="demo-icon"><Clock size={20} color={totalOutstanding > 0 ? '#f87171' : '#34d399'} /></span>
                    <span className="demo-label">{t('outstandingUnpaid')}</span>
                    <strong className="demo-value" style={{ color: totalOutstanding > 0 ? '#f87171' : '#34d399' }}>
                      ₹{totalOutstanding.toLocaleString()}
                    </strong>
                    <span className="demo-sublabel">
                      {totalOutstanding > 0 ? t('duesCurrentlyPending') : t('clearOfAllDues')}
                    </span>
                  </div>
                </div>

                <div className="profile-grid">
                  {/* Family Head Card */}
                  <div className="profile-card glass-panel p-8">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                      <div className="profile-header" style={{ marginBottom: 0 }}>
                        <div className="profile-avatar">🏡</div>
                        <div className="profile-title">
                          <h3>{t(member?.name)}</h3>
                          <span>{t('householdHeadProfile')}</span>
                        </div>
                      </div>
                      <button 
                        onClick={openEditProfileModal}
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
                        <Edit size={14} /> {t('editProfile')}
                      </button>
                    </div>

                    <div className="info-list">
                      <div className="info-item">
                        <span className="info-label">{t('householdHeadName')}</span>
                        <span className="info-value">{t(member?.name) || 'N/A'}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">{t('age')}</span>
                        <span className="info-value">{member?.age || 'N/A'}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">{t('gender')}</span>
                        <span className="info-value" style={{ textTransform: 'capitalize' }}>
                          {member?.gender === 'male' ? t('male') : member?.gender === 'female' ? t('female') : member?.gender || 'N/A'}
                        </span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">{t('uniqueMemberId')}</span>
                        <span className="info-value" style={{ color: 'var(--primary-color)' }}>{member?.memberId || 'N/A'}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">{t('familyIdCode')}</span>
                        <span className="info-value">{member?.familyId || 'N/A'}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">{t('mobileContact')}</span>
                        <span className="info-value">{member?.phone || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                {/* Sub Family Members List */}
                <div className="family-members-card glass-panel p-8">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Users size={20} color="var(--primary-color)" /> {t('familyMembers')}
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
                      <Plus size={14} /> {t('add')}
                    </button>
                  </div>
                  <p style={{ color: 'var(--text-light)', fontSize: '0.85rem', fontWeight: '600', margin: '0 0 20px 0' }}>
                    {t('subMembersDescription')}
                  </p>

                  <div className="family-members-list">
                    {member?.subFamilyMembers && member.subFamilyMembers.length > 0 ? (
                      member.subFamilyMembers.map((sub, idx) => (
                        <div key={idx} className="family-member-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div className="family-member-avatar">👤</div>
                            <div>
                              <strong style={{ display: 'block', fontSize: '0.95rem' }}>{t(sub.name)}</strong>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', fontWeight: '700' }}>
                                {t(sub.relation || sub.relationship || 'Member')} • {sub.age} {t('yrs')} • {sub.gender === 'male' ? t('male') : sub.gender === 'female' ? t('female') : sub.gender || 'N/A'}
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
                        {t('noOtherFamilyMembers')}
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
                    {t('centralDuesSubscriptions')}
                  </h3>
                  
                  {/* Dynamic Filters bar */}
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ position: 'relative' }}>
                      <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                      <input 
                        type="text"
                        placeholder={t('searchFundNamePlaceholder')}
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
                      <option value="all">{t('allFundTypes')}</option>
                      <option value="monthly">{t('monthly')}</option>
                      <option value="yearly">{t('yearly')}</option>
                      <option value="custom">{t('customOther')}</option>
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
                      <option value="all">{t('allStatuses')}</option>
                      <option value="paid">{t('fullyPaid')}</option>
                      <option value="partial">{t('partiallyPaid')}</option>
                      <option value="unpaid">{t('unpaid')}</option>
                    </select>
                  </div>
                </div>

                <div className="table-wrapper" style={{ overflowX: 'auto' }}>
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>{t('fundContributionName')}</th>
                        <th>{t('type')}</th>
                        <th>{t('targetDue')}</th>
                        <th>{t('amountSettled')}</th>
                        <th>{t('remainingBalance')}</th>
                        <th style={{ textAlign: 'center' }}>{t('dueDate')}</th>
                        <th style={{ textAlign: 'center' }}>{t('paymentStatus')}</th>
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
                                    {t('counterCashier')}: {cashierName}
                                  </div>
                                )}
                              </td>
                              <td>
                                <span style={{ background: 'rgba(79, 70, 229, 0.08)', color: 'var(--primary-color)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '800', textTransform: 'uppercase' }}>
                                  {d.fundId?.fundType === 'Monthly' ? t('monthly') : d.fundId?.fundType === 'Yearly' ? t('yearly') : d.fundId?.fundType || 'General'}
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
                                  {d.fundId?.dueDate ? new Date(d.fundId.dueDate).toLocaleDateString('en-IN') : t('noLimit')}
                                </span>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <span className={`status-badge ${isPaid ? 'paid' : isPartial ? 'partially_paid' : 'unpaid'}`}>
                                  {isPaid ? `✓ ${t('fullyPaid')}` : isPartial ? `⚠️ ${t('partiallyPaid')}` : `⚠️ ${t('unpaid')}`}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="7" className="text-center py-6 text-muted" style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-light)' }}>
                            {t('noDueRecordsMatching')}
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
                  {t('settledContributionReceipts')}
                </h3>
                
                {payments.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-light)', padding: '40px 0', fontWeight: '600' }}>
                    {t('noPaymentHistory')}
                  </p>
                ) : (
                  <div className="table-wrapper" style={{ overflowX: 'auto' }}>
                    <table className="report-table">
                      <thead>
                        <tr>
                          <th>{t('receiptHash')}</th>
                          <th>{t('paymentDate')}</th>
                          <th>{t('method')}</th>
                          <th>{t('duesAllottedBreakdown')}</th>
                          <th>{t('collectedBy')}</th>
                          <th>{t('totalAmountPaid')}</th>
                          <th style={{ textAlign: 'center' }}>{t('actions')}</th>
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
                              {p.paymentMode === 'cash' ? `💵 ${t('male') === 'ஆண்' ? 'பணம்' : 'Cash'}` : p.paymentMode === 'upi' ? '📱 UPI' : `💳 ${t('male') === 'ஆண்' ? 'அட்டை' : 'Card'}`}
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
                                {p.cashierId?.name || t('villageName')}
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
                                <Info size={14} /> {t('printReceipt')}
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
                  {t('digitalVerificationCard')}
                </h3>
                <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', fontWeight: '600', maxWidth: '500px', margin: '0 auto 30px auto' }}>
                  {t('male') === 'ஆண்' ? 'விரைவான நிலுவை சரிபார்ப்புகள் மற்றும் பரிவர்த்தனை பதிவுகளுக்கு இந்த அட்டையை கிராம காசாளர் மேஜையில் வழங்கவும்.' : 'Present this card at the village cashier desk for quick outstanding checks and transaction records.'}
                </p>

                <div className="digital-card-container">
                  <div className="digital-membership-card">
                    <div className="card-bg-glow"></div>
                    <div className="card-header-row">
                      <span className="card-logo">🌲 {t('villageWelfareAssociation').toUpperCase()}</span>
                      <div className="card-chip"></div>
                    </div>

                    <div className="card-body">
                      <h4 className="card-holder-name">{t(member?.name)}</h4>
                      <span className="card-id-badge">{t('familyHeadProfile')}</span>
                    </div>

                    <div className="card-footer-row">
                      <div className="card-label-value">
                        <span className="card-meta-label">{t('familyId')}</span>
                        <span className="card-meta-value">{member?.familyId}</span>
                      </div>
                      
                      <div className="card-label-value" style={{ marginLeft: '20px' }}>
                        <span className="card-meta-label">{t('memberId')}</span>
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
                    {t('villageCouncilCentralTreasury')}
                  </h3>
                  <p style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '600', marginBottom: '24px' }}>
                    {t('male') === 'ஆண்' ? 'நிகழ்நேர அதிகாரப்பூர்வ சபை கருவூல அறிக்கை பொதுக் குறியீடு.' : 'Real-time official council treasury statement public index.'}
                  </p>

                  <div className="profile-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                    <div className="glass-panel p-6" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
                      <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b', fontWeight: '800' }}>
                        {t('totalAllottedDues')}
                      </span>
                      <h2 style={{ fontSize: '1.8rem', fontWeight: '900', color: '#0f172a', margin: '6px 0 0 0' }}>
                        ₹{centralStats.totalAllotted.toLocaleString()}
                      </h2>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginTop: '4px' }}>
                        {t('centralContributionsExpected')}
                      </span>
                    </div>

                    <div className="glass-panel p-6" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
                      <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#10b981', fontWeight: '800' }}>
                        {t('amountCleared')}
                      </span>
                      <h2 style={{ fontSize: '1.8rem', fontWeight: '900', color: '#10b981', margin: '6px 0 0 0' }}>
                        ₹{centralStats.totalCollected.toLocaleString()}
                      </h2>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginTop: '4px' }}>
                        {t('receiptedFundsSettled')}
                      </span>
                    </div>

                    <div className="glass-panel p-6" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
                      <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#ef4444', fontWeight: '800' }}>
                        {t('outstandingUnpaid')}
                      </span>
                      <h2 style={{ fontSize: '1.8rem', fontWeight: '900', color: '#ef4444', margin: '6px 0 0 0' }}>
                        ₹{centralStats.totalPendingDues.toLocaleString()}
                      </h2>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginTop: '4px' }}>
                        {t('male') === 'ஆண்' ? 'நிலுவையில் உள்ள தொகைகள்' : 'Outstanding default reserves'}
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
                        {t('totalSpentFunds')} 🔍
                      </span>
                      <h2 style={{ fontSize: '1.8rem', fontWeight: '900', color: '#b91c1c', margin: '6px 0 0 0' }}>
                        ₹{centralStats.totalSpent.toLocaleString()}
                      </h2>
                      <span style={{ fontSize: '0.72rem', color: showExpenseDetails ? '#b91c1c' : '#94a3b8', display: 'block', marginTop: '4px', fontWeight: '700' }}>
                        {showExpenseDetails ? (t('male') === 'ஆண்' ? '▲ விவரங்களை மறைக்க கிளிக் செய்யவும்' : '▲ Click to hide details') : (t('male') === 'ஆண்' ? '▼ உருப்படி வாரியான விவரங்களைப் பார்க்க கிளிக் செய்யவும்' : '▼ Click to view itemized bills')}
                      </span>
                    </div>

                    <div className="glass-panel p-6" style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '16px' }}>
                      <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#0284c7', fontWeight: '800' }}>
                        {t('totalMemberDonations')}
                      </span>
                      <h2 style={{ fontSize: '1.8rem', fontWeight: '900', color: '#0284c7', margin: '6px 0 0 0' }}>
                        ₹{(centralStats.totalDonations || 0).toLocaleString()}
                      </h2>
                      <span style={{ fontSize: '0.72rem', color: '#0284c7', display: 'block', marginTop: '4px', opacity: 0.8 }}>
                        {t('male') === 'ஆண்' ? 'பொது மக்கள் பங்களிப்புகள்' : 'General public contributions'}
                      </span>
                    </div>

                    <div className="glass-panel p-6" style={{ background: 'linear-gradient(135deg, #ea580c 0%, #f59e0b 100%)', border: 'none', color: '#ffffff', borderRadius: '16px', boxShadow: '0 10px 20px rgba(234, 88, 12, 0.15)' }}>
                      <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#ffedd5', fontWeight: '800' }}>
                        {t('netTreasuryBalance')}
                      </span>
                      <h2 style={{ fontSize: '1.8rem', fontWeight: '900', color: '#ffffff', margin: '6px 0 0 0' }}>
                        ₹{centralStats.currentBalance.toLocaleString()}
                      </h2>
                      <span style={{ fontSize: '0.72rem', color: '#ffedd5', display: 'block', marginTop: '4px' }}>
                        {t('male') === 'ஆண்' ? 'தற்போது மத்திய கணக்குகளில் உள்ள தொகை' : 'Currently held in central accounts'}
                      </span>
                    </div>
                  </div>

                  {/* Expandable itemized expenses details */}
                  {showExpenseDetails && (
                    <div className="glass-panel p-6 mt-6 animate-fade-in" style={{ background: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', marginTop: '24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                        <div>
                          <h4 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                            {t('expenditureLedgerAudit')}
                          </h4>
                          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>
                            {t('male') === 'ஆண்' ? 'அங்கீகரிக்கப்பட்ட அனைத்து செலவுகளின் வெளிப்படையான பட்டியல்.' : 'Transparent itemized list of all approved village outlays.'}
                          </span>
                        </div>
                        
                        {/* Live Filters */}
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                          <div style={{ position: 'relative' }}>
                            <Search size={13} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                            <input 
                              type="text"
                              placeholder={t('searchExpensePlaceholder')}
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
                                {cat === 'all' ? t('allCategories') : cat}
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
                            <option value="all">{t('allDates')}</option>
                            <option value="month">{t('currentMonth')}</option>
                            <option value="year">{t('currentYear')}</option>
                          </select>
                        </div>
                      </div>

                      <div className="table-wrapper" style={{ overflowX: 'auto' }}>
                        <table className="report-table" style={{ width: '100%' }}>
                          <thead>
                            <tr>
                              <th>{t('expenseTitle')}</th>
                              <th>{t('category')}</th>
                              <th>{t('amount')}</th>
                              <th>{t('date')}</th>
                              <th>{t('collectedBy')}</th>
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
                                  {t('noExpenseItems')}
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
                  <Lock size={20} color="var(--primary-color)" /> {t('changePassword')}
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '600', marginBottom: '24px' }}>
                  {t('male') === 'ஆண்' ? 'உங்கள் டிஜிட்டல் கிராம கணக்கைப் பாதுகாக்க உங்கள் உள்நுழைவு நற்சான்றிதழ்களை மாற்றவும்.' : 'Change your login credentials to protect your digital villager account.'}
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
                    <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569' }}>{t('currentPassword')}</label>
                    <input 
                      type="password"
                      required
                      placeholder={t('male') === 'ஆண்' ? 'தற்போதைய கடவுச்சொல்லை உள்ளிடவும்...' : 'Enter current password...'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      style={{ padding: '11px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569' }}>{t('newPassword')}</label>
                    <input 
                      type="password"
                      required
                      placeholder={t('male') === 'ஆண்' ? 'குறைந்தது 5 எழுத்துக்கள்...' : 'Min 5 characters...'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      style={{ padding: '11px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569' }}>{t('confirmPassword')}</label>
                    <input 
                      type="password"
                      required
                      placeholder={t('male') === 'ஆண்' ? 'புதிய கடவுச்சொல்லை உறுதிப்படுத்தவும்...' : 'Confirm new password...'}
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
                    {pwdLoading ? t('updating') : t('changePassword')}
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
                {editingSubIndex !== null ? `✏️ ${t('editFamilyMember')}` : `➕ ${t('addFamilyMember')}`}
              </h3>
              <button 
                onClick={() => setShowSubModal(false)}
                style={{ background: '#f1f5f9', border: 'none', color: '#64748b', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800' }}
              >
                ✕
              </button>
            </div>

            {subError && (
              <div style={{
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: '700',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                background: '#fef2f2',
                color: '#ef4444'
              }}>
                <AlertCircle size={15} />
                <span>{subError}</span>
              </div>
            )}

            <form onSubmit={handleSaveSub} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569' }}>{t('fullName')}</label>
                <input 
                  type="text"
                  required
                  placeholder={t('male') === 'ஆண்' ? 'முழு பெயரை உள்ளிடவும்...' : 'Enter full name...'}
                  value={subForm.name}
                  onChange={(e) => setSubForm({ ...subForm, name: e.target.value })}
                  style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569' }}>{t('relationshipToHead')}</label>
                <select 
                  required
                  value={subForm.relation}
                  onChange={(e) => setSubForm({ ...subForm, relation: e.target.value })}
                  style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem', color: '#475569' }}
                >
                  <option value="" disabled>{t('male') === 'ஆண்' ? 'உறவைத் தேர்ந்தெடுக்கவும்...' : 'Select relationship...'}</option>
                  {["Husband", "Wife", "Son", "Daughter", "Father", "Mother", "Brother", "Sister", "Grandson", "Granddaughter", "Other"].map(opt => {
                    let disp = opt;
                    if (t('male') === 'ஆண்') {
                      const mappings = {
                        "Husband": "கணவர்", "Wife": "மனைவி", "Son": "மகன்", "Daughter": "மகள்",
                        "Father": "தந்தை", "Mother": "தாய்", "Brother": "சகோதரன்", "Sister": "சகோதரி",
                        "Grandson": "பேரன்", "Granddaughter": "பேத்தி", "Other": "இதர"
                      };
                      disp = mappings[opt] || opt;
                    }
                    return <option key={opt} value={opt}>{disp}</option>;
                  })}
                  {subForm.relation && !["Husband", "Wife", "Son", "Daughter", "Father", "Mother", "Brother", "Sister", "Grandson", "Granddaughter", "Other"].includes(subForm.relation) && (
                    <option value={subForm.relation}>{subForm.relation}</option>
                  )}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569' }}>{t('age')}</label>
                  <input 
                    type="number"
                    placeholder="e.g. 24"
                    value={subForm.age}
                    onChange={(e) => setSubForm({ ...subForm, age: e.target.value })}
                    style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569' }}>{t('gender')}</label>
                  <select 
                    value={subForm.gender}
                    onChange={(e) => setSubForm({ ...subForm, gender: e.target.value })}
                    style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem', color: '#475569' }}
                  >
                    <option value="male">{t('male')}</option>
                    <option value="female">{t('female')}</option>
                    <option value="other">{t('other')}</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button 
                  type="button"
                  onClick={() => setShowSubModal(false)}
                  style={{ background: '#f1f5f9', color: '#475569', border: 'none', padding: '10px 18px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  {t('cancel')}
                </button>
                <button 
                  type="submit"
                  style={{ background: 'var(--primary-color)', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  {t('saveFamilyMember')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* RENDER MODAL: Edit Profile */}
      {showProfileModal && (
        <div className="modal-backdrop animate-fade-in" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div className="modal-content animate-scale-up" style={{ width: '100%', maxWidth: '460px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '24px', padding: '30px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a', fontWeight: '800' }}>
                ✏️ {t('editHouseholdProfile')}
              </h3>
              <button 
                onClick={() => setShowProfileModal(false)}
                style={{ background: '#f1f5f9', border: 'none', color: '#64748b', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800' }}
              >
                ✕
              </button>
            </div>

            {profileError && (
              <div style={{
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: '700',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                background: '#fef2f2',
                color: '#ef4444'
              }}>
                <AlertCircle size={15} />
                <span>{profileError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#64748b' }}>{t('uniqueMemberId')}</label>
                  <input 
                    type="text"
                    disabled
                    value={member?.memberId || ''}
                    style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem', background: '#f1f5f9', cursor: 'not-allowed', color: '#64748b' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#64748b' }}>{t('familyId')}</label>
                  <input 
                    type="text"
                    disabled
                    value={member?.familyId || ''}
                    style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem', background: '#f1f5f9', cursor: 'not-allowed', color: '#64748b' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569' }}>{t('fullName')}</label>
                <input 
                  type="text"
                  required
                  placeholder={t('male') === 'ஆண்' ? 'முழு பெயரை உள்ளிடவும்...' : 'Enter full name...'}
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569' }}>{t('mobileNumber')}</label>
                <input 
                  type="text"
                  required
                  placeholder={t('male') === 'ஆண்' ? '10-இலக்க தொலைபேசி எண்...' : '10-digit phone number...'}
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569' }}>{t('age')}</label>
                  <input 
                    type="number"
                    placeholder="e.g. 45"
                    value={profileForm.age}
                    onChange={(e) => setProfileForm({ ...profileForm, age: e.target.value })}
                    style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569' }}>{t('gender')}</label>
                  <select 
                    value={profileForm.gender}
                    onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                    style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem', color: '#475569' }}
                  >
                    <option value="male">{t('male')}</option>
                    <option value="female">{t('female')}</option>
                    <option value="other">{t('other')}</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button 
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  style={{ background: '#f1f5f9', color: '#475569', border: 'none', padding: '10px 18px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  {t('cancel')}
                </button>
                <button 
                  type="submit"
                  style={{ background: 'var(--primary-color)', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  {t('saveChanges')}
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
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', fontWeight: '800' }}>🌲 {t('paymentReceipt')}</h3>
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
                <h2 style={{ margin: '0 0 4px 0', fontSize: '1.3rem', fontWeight: 'bold' }}>{t('villageWelfareAssociation').toUpperCase()}</h2>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>{t('villageName')} Central treasury Office</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                  {t('receiptHash')}: #{currentReceipt.receiptNumber}
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', marginBottom: '20px', borderBottom: '1px dashed #cbd5e1', paddingBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{t('householdHeadName')}:</span>
                  <strong>{t(currentReceipt.memberId?.name)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{t('familyId')}:</span>
                  <strong>#{currentReceipt.memberId?.familyId}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{t('memberId')}:</span>
                  <strong>{currentReceipt.memberId?.memberId}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{t('paymentDate')}:</span>
                  <strong>{new Date(currentReceipt.paymentDate).toLocaleString('en-IN')}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{t('method')}:</span>
                  <strong style={{ textTransform: 'uppercase' }}>
                    {currentReceipt.paymentMode === 'cash' ? (t('male') === 'ஆண்' ? 'பணம்' : 'Cash') : currentReceipt.paymentMode === 'upi' ? 'UPI' : (t('male') === 'ஆண்' ? 'அட்டை' : 'Card')}
                  </strong>
                </div>
                {currentReceipt.cashierId?.name && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{t('collectedBy')}:</span>
                    <strong>{t(currentReceipt.cashierId.name)}</strong>
                  </div>
                )}
              </div>

              {/* Fund Breakdown table */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #cbd5e1', paddingBottom: '6px', fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b' }}>
                  <span>{t('duesAllottedBreakdown')}</span>
                  <span>{t('amount')}</span>
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
                <span>{t('totalAmountPaid')}</span>
                <span>₹{currentReceipt.totalAmountPaid.toLocaleString()}</span>
              </div>

              {currentReceipt.notes && (
                <div style={{ marginTop: '20px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px', fontSize: '0.8rem' }}>
                  <span style={{ color: '#64748b', display: 'block', fontWeight: 'bold', marginBottom: '2px' }}>{t('male') === 'ஆண்' ? 'அலுவலக குறிப்புகள்' : 'OFFICE REMARKS'}</span>
                  {currentReceipt.notes}
                </div>
              )}
            </div>

            {/* Hidden printable receipt wrapper */}
            <div id="receipt-print-area" style={{ display: 'none' }}>
              <div style={{ padding: '40px', fontFamily: 'monospace', color: '#000', background: '#fff' }}>
                <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '2px dashed #000', paddingBottom: '20px' }}>
                  <h1 style={{ margin: '0 0 6px 0', fontSize: '1.7rem' }}>{t('villageWelfareAssociation').toUpperCase()}</h1>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem' }}>{t('paymentReceipt')}</h3>
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>{t('villageName')} Central treasury Office</p>
                  <p style={{ margin: '8px 0 0 0', fontSize: '1rem', fontWeight: 'bold' }}>{t('receiptHash')}: #{currentReceipt.receiptNumber}</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.95rem', marginBottom: '30px', borderBottom: '2px dashed #000', paddingBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{t('householdHeadName').toUpperCase()}:</span>
                    <strong>{t(currentReceipt.memberId?.name)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{t('familyId').toUpperCase()}:</span>
                    <strong>#{currentReceipt.memberId?.familyId}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{t('memberId').toUpperCase()}:</span>
                    <strong>{currentReceipt.memberId?.memberId}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{t('paymentDate').toUpperCase()}:</span>
                    <strong>{new Date(currentReceipt.paymentDate).toLocaleString('en-IN')}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{t('method').toUpperCase()}:</span>
                    <strong style={{ textTransform: 'uppercase' }}>
                      {currentReceipt.paymentMode === 'cash' ? (t('male') === 'ஆண்' ? 'பணம்' : 'Cash') : currentReceipt.paymentMode === 'upi' ? 'UPI' : (t('male') === 'ஆண்' ? 'அட்டை' : 'Card')}
                    </strong>
                  </div>
                  {currentReceipt.cashierId?.name && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{t('collectedBy').toUpperCase()}:</span>
                      <strong>{t(currentReceipt.cashierId.name)}</strong>
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: '30px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: '8px', fontSize: '0.9rem', fontWeight: 'bold' }}>
                    <span>{t('duesAllottedBreakdown')}</span>
                    <span>{t('amount')}</span>
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
                  <span>{t('totalAmountPaid').toUpperCase()}</span>
                  <span>INR {currentReceipt.totalAmountPaid.toLocaleString()}.00</span>
                </div>

                {currentReceipt.notes && (
                  <div style={{ marginTop: '30px', border: '1px solid #000', padding: '15px', fontSize: '0.9rem' }}>
                    <strong style={{ display: 'block', marginBottom: '5px' }}>{t('male') === 'ஆண்' ? 'அலுவலக குறிப்புகள்' : 'OFFICE REMARKS'}:</strong>
                    {currentReceipt.notes}
                  </div>
                )}

                <div style={{ marginTop: '60px', textAlign: 'center', borderTop: '1px solid #ccc', paddingTop: '20px', fontSize: '0.85rem', color: '#666' }}>
                  <p>{t('male') === 'ஆண்' ? 'அங்கீகரிக்கப்பட்ட டிஜிட்டல் ரசீது • கையொப்பம் தேவையில்லை' : 'Council Authorized Digital Receipt • Signature Not Required'}</p>
                  <p>{t('thankYou')}</p>
                </div>
              </div>
            </div>

            {/* Modal Controls */}
            <div style={{ marginTop: '28px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                onClick={handlePrintReceipt}
                style={{ background: 'var(--primary-color)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 10px rgba(79, 70, 229, 0.2)' }}
              >
                <Printer size={16} /> {t('printReceipt')}
              </button>
              <button 
                onClick={() => setShowReceiptModal(false)}
                style={{ background: '#f1f5f9', color: '#334155', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: '800', cursor: 'pointer' }}
              >
                {t('close')}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default MemberDashboard;
