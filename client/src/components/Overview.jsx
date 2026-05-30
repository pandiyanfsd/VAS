import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Wallet, 
  TrendingUp, 
  AlertTriangle, 
  ArrowRight,
  Banknote,
  Landmark,
  Clock,
  ArrowUpDown,
  Search,
  Receipt,
  Percent
} from 'lucide-react';
import './DetailedReports.css'; // Leverage our premium layout tokens

const Overview = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    memberCount: 0,
    fundCount: 0,
    totalAllotted: 0,
    totalCollected: 0,
    totalSpent: 0,
    currentBalance: 0,
    totalPendingDues: 0,
    duesBreakdown: []
  });

  const [recentPayments, setRecentPayments] = useState([]);
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [funds, setFunds] = useState([]);
  
  // Ledger States
  const [dues, setDues] = useState([]);
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' (highest first) or 'asc' (lowest first)
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModalFund, setSelectedModalFund] = useState(null);
  const [showFinancials, setShowFinancials] = useState(false);




  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Members
        const membersRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/members`);
        const memberCount = membersRes.data.length;

        // 2. Fetch Funds
        const fundsRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/funds`);
        const fundCount = fundsRes.data.length;
        setFunds(fundsRes.data); // Keep all funds for horizontal slider

        // Calculate total allotted
        let calculatedAllotted = 0;
        fundsRes.data.forEach(fund => {
          calculatedAllotted += (fund.targetAmount || 0) * memberCount;
        });

        // 3. Fetch Financial Summary
        const summaryRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/reports/summary`);
        
        // 4. Fetch Recent Payments (Collections)
        const paymentsRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/payments`);
        // Sort descending by date
        const sortedPayments = paymentsRes.data.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));
        setRecentPayments(sortedPayments);

        // 5. Fetch Recent Expenses
        const expensesRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/expenses`);
        // Sort descending by date
        const sortedExpenses = expensesRes.data.sort((a, b) => new Date(b.date) - new Date(a.date));
        setRecentExpenses(sortedExpenses);

        // 6. Fetch Dues for Ledger
        const duesRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/dues`);
        setDues(duesRes.data);

        // 7. Fetch Member Financials Visibility Setting
        try {
          const settingRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/settings/showMemberCentralFinancials`);
          setShowFinancials(!!settingRes.data.value);
        } catch (err) {
          console.error("Failed to load settings", err);
        }

        setStats({
          memberCount,
          fundCount,
          totalAllotted: calculatedAllotted,
          totalCollected: summaryRes.data.totalCollected || 0,
          totalSpent: summaryRes.data.totalSpent || 0,
          currentBalance: summaryRes.data.currentBalance || 0,
          totalPendingDues: summaryRes.data.totalPendingDues || 0,
          duesBreakdown: summaryRes.data.duesBreakdown || []
        });

      } catch (error) {
        console.error("Error fetching dashboard overview data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const toggleFinancials = async () => {
    try {
      const newValue = !showFinancials;
      await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/settings/showMemberCentralFinancials`, { value: newValue });
      setShowFinancials(newValue);
    } catch (err) {
      console.error("Failed to update settings", err);
    }
  };

  // Helper to calculate total collected amount per fund ID
  const getFundStats = (fundId, targetAmount) => {
    const collected = recentPayments.reduce((acc, p) => {
      const match = p.splitDetails?.find(sd => (sd.fundId?._id || sd.fundId) === fundId);
      const amount = match ? (match.amountAllocated || match.amountPaid || 0) : 0;
      return acc + amount;
    }, 0);

    const targetTotal = targetAmount * stats.memberCount;
    const percentage = targetTotal > 0 ? Math.min(100, Math.round((collected / targetTotal) * 100)) : 0;

    return { collected, targetTotal, percentage };
  };

  const getFundColor = (type = '') => {
    const normalized = type.toLowerCase();
    switch (normalized) {
      case 'monthly': return '#14b8a6'; // Teal
      case 'yearly': return '#4f46e5'; // Indigo
      case 'death fund': return '#374151'; // Charcoal
      case 'festival': return '#db2777'; // Rose
      case 'donation': return '#059669'; // Emerald
      default: return '#64748b'; // Slate
    }
  };

  const showPayments = recentPayments.slice(0, 5);
  const showExpenses = recentExpenses.slice(0, 5);

  // Group dues by member/family for Ledger
  const unpaidFamiliesMap = {};
  dues.forEach(d => {
    if (!d.memberId) return;
    const memId = d.memberId._id;
    const expected = d.totalDueAmount || 0;
    const paid = d.amountPaid || 0;
    const unpaid = expected - paid;

    if (!unpaidFamiliesMap[memId]) {
      unpaidFamiliesMap[memId] = {
        memberId: d.memberId.memberId || 'N/A',
        familyId: d.memberId.familyId || 'N/A',
        name: d.memberId.name || 'N/A',
        phone: d.memberId.phone || 'N/A',
        totalPaid: 0,
        totalUnpaid: 0,
        fundsCount: 0,
        paidFundsCount: 0
      };
    }
    unpaidFamiliesMap[memId].totalPaid += paid;
    if (unpaid > 0) {
      unpaidFamiliesMap[memId].totalUnpaid += unpaid;
      unpaidFamiliesMap[memId].fundsCount += 1;
    } else if (expected > 0 && unpaid <= 0) {
      unpaidFamiliesMap[memId].paidFundsCount += 1;
    }
  });

  const unpaidFamiliesList = Object.values(unpaidFamiliesMap).filter(f => f.totalUnpaid > 0);

  // Filter by search term if any
  const filteredUnpaidFamilies = unpaidFamiliesList.filter(f => 
    f.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    f.familyId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.memberId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.phone && f.phone.includes(searchTerm))
  );

  // Sort according to sortOrder state
  filteredUnpaidFamilies.sort((a, b) => {
    if (sortOrder === 'asc') {
      return a.totalUnpaid - b.totalUnpaid;
    } else {
      return b.totalUnpaid - a.totalUnpaid;
    }
  });

  return (
    <div className="overview-wrapper animate-fade-in">
      {/* Settings Toggle Banner */}
      <div className="glass-panel p-4 mb-6" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.85)', borderRadius: '16px', border: '1px solid rgba(226, 232, 240, 0.8)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '1.25rem' }}>⚙️</span>
          <div>
            <strong style={{ display: 'block', fontSize: '0.92rem', color: '#0f172a' }}>Member Central Financials Visibility</strong>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '500' }}>Control if villagers can view total allotted, paid, pending, total expenses, and net treasury balance in their dashboard</span>
          </div>
        </div>
        <button 
          onClick={toggleFinancials}
          style={{
            background: showFinancials ? '#10b981' : '#cbd5e1',
            color: showFinancials ? '#ffffff' : '#475569',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '12px',
            fontWeight: '800',
            fontSize: '0.85rem',
            cursor: 'pointer',
            boxShadow: showFinancials ? '0 4px 10px rgba(16, 185, 129, 0.2)' : 'none',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: showFinancials ? '#fff' : '#64748b' }}></span>
          {showFinancials ? 'VISIBLE TO MEMBERS' : 'HIDDEN FROM MEMBERS'}
        </button>
      </div>

{/* 1. Dynamic Metric Cards (Unified 8 Core Pillars) */}
      {/* 1. Dynamic Metric Cards (Unified 8 Core Pillars) */}
      <div className="metrics-row mb-6" style={{ marginBottom: '24px' }}>
        <div className="metric-card glass-panel text-teal cursor-pointer" onClick={() => navigate('/admin/members')}>
          <div className="metric-icon"><Users size={24} /></div>
          <div className="metric-info">
            <span className="label">Registered Families</span>
            <h3>{stats.memberCount}</h3>
            <span className="helper-link text-teal">Manage Members <ArrowRight size={12} /></span>
          </div>
        </div>

        <div className="metric-card glass-panel text-indigo cursor-pointer" onClick={() => navigate('/admin/funds')}>
          <div className="metric-icon"><Wallet size={24} /></div>
          <div className="metric-info">
            <span className="label">Active Funds</span>
            <h3>{stats.fundCount}</h3>
            <span className="helper-link text-indigo">Manage Funds <ArrowRight size={12} /></span>
          </div>
        </div>

        <div className="metric-card glass-panel text-pink cursor-pointer" onClick={() => navigate('/admin/funds')}>
          <div className="metric-icon"><Banknote size={24} /></div>
          <div className="metric-info">
            <span className="label">Total Amount Allotted</span>
            <h3>₹{stats.totalAllotted.toLocaleString()}</h3>
            <span className="helper-link text-pink">Expected Target <ArrowRight size={12} /></span>
          </div>
        </div>

        <div className="metric-card glass-panel cursor-pointer" style={{ color: '#e11d48' }} onClick={() => navigate('/admin/reports')}>
          <div className="metric-icon"><Clock size={24} /></div>
          <div className="metric-info">
            <span className="label">Outstanding Unpaid Dues</span>
            <h3>₹{stats.totalPendingDues.toLocaleString()}</h3>
            <span className="helper-link" style={{ color: '#e11d48' }}>Audit Defaulters <ArrowRight size={12} /></span>
          </div>
        </div>
      </div>

      <div className="metrics-row mb-6" style={{ marginBottom: '24px' }}>
        <div className="metric-card glass-panel text-emerald cursor-pointer" onClick={() => navigate('/admin/reports')}>
          <div className="metric-icon"><Landmark size={24} /></div>
          <div className="metric-info">
            <span className="label">Total Amount Collected</span>
            <h3>₹{stats.totalCollected.toLocaleString()}</h3>
            <span className="helper-link text-emerald">View Collections <ArrowRight size={12} /></span>
          </div>
        </div>

        <div className="metric-card glass-panel cursor-pointer" style={{ color: '#be123c' }} onClick={() => navigate('/admin/expenses')}>
          <div className="metric-icon" style={{ background: 'rgba(225, 29, 72, 0.1)', color: '#e11d48' }}><Receipt size={24} /></div>
          <div className="metric-info">
            <span className="label">Total Village Expenses</span>
            <h3 style={{ color: '#9f1239' }}>₹{stats.totalSpent.toLocaleString()}</h3>
            <span className="helper-link" style={{ color: '#e11d48' }}>Manage Expenses <ArrowRight size={12} /></span>
          </div>
        </div>

        <div className="metric-card glass-panel text-indigo cursor-pointer" onClick={() => navigate('/admin/reports')}>
          <div className="metric-icon"><TrendingUp size={24} /></div>
          <div className="metric-info">
            <span className="label">Net Treasury Balance</span>
            <h3>₹{stats.currentBalance.toLocaleString()}</h3>
            <span className="helper-link text-indigo">Balance Sheet <ArrowRight size={12} /></span>
          </div>
        </div>

        <div className="metric-card glass-panel cursor-pointer" style={{ color: '#0284c7' }} onClick={() => navigate('/admin/reports')}>
          <div className="metric-icon" style={{ background: 'rgba(2, 132, 199, 0.1)', color: '#0284c7' }}><Percent size={24} /></div>
          <div className="metric-info">
            <span className="label">Overall Collection Rate</span>
            <h3 style={{ color: '#0369a1' }}>{stats.totalAllotted > 0 ? Math.round((stats.totalCollected / stats.totalAllotted) * 100) : 0}%</h3>
            <span className="helper-link" style={{ color: '#0284c7' }}>Audit Health Rate <ArrowRight size={12} /></span>
          </div>
        </div>
      </div>

      {/* 2. Visual Grids Section */}
      <div className="grid-2 mt-6">
        
        {/* Recent Activity Feeds */}
        <div className="summary-section glass-panel">
          <div className="summary-header-row">
            <span className="summary-section-icon">🔄</span>
            <h3>Recent Collections (Income)</h3>
          </div>
          
          <div className="activity-list">
            {showPayments.length > 0 ? (
              showPayments.map((p) => (
                <div key={p._id} className="activity-item">
                  <div className="activity-avatar">
                    {p.memberId?.name ? p.memberId.name.charAt(0).toUpperCase() : 'M'}
                  </div>
                  <div className="activity-details">
                    <strong>{p.memberId?.name || 'N/A'}</strong>
                    <span>{p.receiptNumber} • {new Date(p.paymentDate).toLocaleDateString()}</span>
                  </div>
                  <div className="activity-amount text-teal">
                    +₹{p.totalAmountPaid}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted text-center py-6">No collections logged yet.</p>
            )}
          </div>
        </div>

        <div className="summary-section glass-panel">
          <div className="summary-header-row">
            <span className="summary-section-icon">📉</span>
            <h3>Recent Expenditures (Expenses)</h3>
          </div>

          <div className="activity-list">
            {showExpenses.length > 0 ? (
              showExpenses.map((e) => (
                <div key={e._id} className="activity-item">
                  <div className="activity-avatar expense-avatar">
                    💸
                  </div>
                  <div className="activity-details">
                    <strong>{e.title}</strong>
                    <span>{e.category} • {new Date(e.date).toLocaleDateString()}</span>
                  </div>
                  <div className="activity-amount text-pink">
                    -₹{e.amount}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted text-center py-6">No expenditures logged yet.</p>
            )}
          </div>
        </div>

      </div>

      {/* 3. Village Collection Progress Section */}
      <div className="dues-breakdown-section glass-panel mt-6">
        <div className="summary-header-row mb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="summary-section-icon">📊</span>
            <h3 style={{ margin: 0 }}>Denalai Active Fund Collection Rates</h3>
          </div>
          <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>← Scroll horizontally to explore all funds • Click any card for audit modal →</span>
        </div>

        <div className="funds-horizontal-slider" style={{ display: 'flex', overflowX: 'auto', gap: '24px', paddingBottom: '20px', paddingTop: '8px', scrollBehavior: 'smooth' }}>
          {funds.length > 0 ? (
            funds.map((f) => {
              const { collected, targetTotal, percentage } = getFundStats(f._id, f.targetAmount);
              const color = getFundColor(f.fundType);

              return (
                <div 
                  key={f._id} 
                  className="fund-progress-card glass-panel cursor-pointer" 
                  onClick={() => setSelectedModalFund({ ...f, collected, targetTotal, percentage })}
                  style={{ 
                    borderLeft: `6px solid ${color}`, 
                    background: 'rgba(255, 255, 255, 0.92)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid #cbd5e1',
                    borderRadius: '20px',
                    padding: '24px',
                    minWidth: '320px', 
                    maxWidth: '350px', 
                    flex: '0 0 auto', 
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
                    cursor: 'pointer',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-6px)';
                    e.currentTarget.style.boxShadow = '0 20px 30px -10px rgba(0, 0, 0, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.08)';
                  }}
                >
                  <div className="fund-progress-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.3rem', color: '#0f172a', fontWeight: '900', letterSpacing: '-0.3px', lineHeight: '1.3' }}>{f.name}</h4>
                      <span className="fund-type-tag" style={{ background: `${color}15`, color: color, marginTop: '6px', display: 'inline-block', padding: '4px 10px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase' }}>
                        {f.fundType}
                      </span>
                    </div>
                    <div className="fund-progress-values" style={{ textAlign: 'right' }}>
                      <strong style={{ fontSize: '1.25rem', color: color, fontWeight: '900' }}>₹{collected.toLocaleString()}</strong>
                      <span style={{ fontSize: '0.8rem', color: '#475569', display: 'block', fontWeight: '600' }}>of ₹{targetTotal.toLocaleString()} expected</span>
                    </div>
                  </div>

                  <div className="progress-container" style={{ borderTop: 'none', marginTop: '16px', paddingTop: '0' }}>
                    <div className="progress-bar-bg" style={{ height: '10px', background: '#e2e8f0', borderRadius: '5px', overflow: 'hidden' }}>
                      <div className="progress-bar-fill" style={{ 
                        width: `${percentage}%`,
                        background: color,
                        height: '100%',
                        borderRadius: '5px',
                        transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}></div>
                    </div>
                    <div className="progress-info" style={{ marginTop: '12px', marginBottom: '0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: '#334155', fontWeight: '600' }}>
                        📅 Due: {f.dueDate ? new Date(f.dueDate).toLocaleDateString('en-IN') : 'No Limit'}
                      </span>
                      <strong style={{ fontSize: '0.9rem', color: color, fontWeight: '900' }}>{percentage}% Completed</strong>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-muted text-center py-6 w-full" style={{ width: '100%', color: '#94a3b8' }}>No active funds found. Create a fund in Manage Funds to begin!</p>
          )}
        </div>
      </div>

      {/* 4. Outstanding Dues Breakdown Section */}
      <div className="dues-breakdown-section glass-panel mt-6">
        <div className="summary-header-row">
          <span className="summary-section-icon">📋</span>
          <h3>Breakdown of Outstanding Dues by Fund & Type</h3>
        </div>

        <div className="table-wrapper">
          <table className="report-table">
            <thead>
              <tr>
                <th style={{ whiteSpace: 'nowrap' }}>Fund Name</th>
                <th style={{ whiteSpace: 'nowrap' }}>Fund Type</th>
                <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Unpaid Amount</th>
              </tr>
            </thead>
            <tbody>
              {stats.duesBreakdown && stats.duesBreakdown.length > 0 ? (
                stats.duesBreakdown.map((db, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'row-even' : 'row-odd'}>
                    <td style={{ whiteSpace: 'nowrap' }}><strong>{db.fundName}</strong></td>
                    <td style={{ whiteSpace: 'nowrap' }}><span className="fund-name-tag" style={{ background: 'rgba(79, 70, 229, 0.1)', color: '#4f46e5' }}>{db.fundType}</span></td>
                    <td className="amount-cell text-pink" style={{ textAlign: 'right', fontWeight: '700', whiteSpace: 'nowrap' }}>
                      ₹{db.pendingDues.toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="text-center py-6 text-muted">
                    No outstanding dues currently pending! Denalai Village is 100% paid.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Unpaid Families Ledger Section (Integrated directly into Overview) */}
      <div className="dues-breakdown-section glass-panel mt-8 animate-fade-in" style={{ marginTop: '32px' }}>
        <div className="summary-header-row flex justify-between items-center flex-wrap gap-4 mb-6" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="summary-section-icon">⚠️</span>
            <h3 style={{ margin: 0 }}>Unpaid Families Ledger</h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div className="search-input-container" style={{ margin: 0, minWidth: '240px' }}>
              <span className="search-icon">🔍</span>
              <input 
                type="text" 
                placeholder="Search by Family ID, Name..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="table-search-input"
                style={{ width: '100%' }}
              />
              {searchTerm && (
                <button className="clear-search-btn" onClick={() => setSearchTerm('')}>✕</button>
              )}
            </div>

            <div className="shortcuts-row" style={{ margin: 0, padding: 0 }}>
              <div className="date-shortcuts" style={{ gap: '8px', display: 'flex' }}>
                <button 
                  className={`shortcut-btn glass-panel ${sortOrder === 'asc' ? 'active' : ''}`}
                  onClick={() => setSortOrder('asc')}
                  style={{ 
                    padding: '8px 16px', 
                    fontSize: '0.85rem', 
                    fontWeight: '700', 
                    borderRadius: '8px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    background: sortOrder === 'asc' ? 'rgba(20, 184, 166, 0.15)' : '',
                    color: sortOrder === 'asc' ? '#14b8a6' : ''
                  }}
                >
                  <ArrowUpDown size={16} /> Ascending
                </button>
                <button 
                  className={`shortcut-btn glass-panel ${sortOrder === 'desc' ? 'active' : ''}`}
                  onClick={() => setSortOrder('desc')}
                  style={{ 
                    padding: '8px 16px', 
                    fontSize: '0.85rem', 
                    fontWeight: '700', 
                    borderRadius: '8px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    background: sortOrder === 'desc' ? 'rgba(239, 68, 68, 0.15)' : '',
                    color: sortOrder === 'desc' ? '#ef4444' : ''
                  }}
                >
                  <ArrowUpDown size={16} /> Descending
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="table-wrapper mt-4">
          <table className="report-table">
            <thead>
              <tr>
                <th>Family ID</th>
                <th>Household Head Name</th>
                <th>Phone</th>
                <th style={{ textAlign: 'center' }}>Paid Funds</th>
                <th style={{ textAlign: 'center' }}>Unpaid Funds</th>
                <th style={{ textAlign: 'right' }}>Total Paid Money</th>
                <th style={{ textAlign: 'right' }}>Total Unpaid Money</th>
              </tr>
            </thead>
            <tbody>
              {filteredUnpaidFamilies.length > 0 ? (
                filteredUnpaidFamilies.map((f, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'row-even' : 'row-odd'}>
                    <td><strong>{f.familyId}</strong></td>
                    <td><strong>{f.name}</strong></td>
                    <td>{f.phone || 'N/A'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="category-badge" style={{ background: 'rgba(20, 184, 166, 0.1)', color: '#14b8a6', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '600' }}>
                        {f.paidFundsCount} {f.paidFundsCount === 1 ? 'Fund' : 'Funds'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="category-badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '600' }}>
                        {f.fundsCount} {f.fundsCount === 1 ? 'Fund' : 'Funds'}
                      </span>
                    </td>
                    <td className="amount-cell text-teal" style={{ textAlign: 'right', fontWeight: '800', fontSize: '1.05rem', color: '#10b981' }}>
                      ₹{f.totalPaid.toLocaleString()}
                    </td>
                    <td className="amount-cell text-pink" style={{ textAlign: 'right', fontWeight: '800', fontSize: '1.05rem', color: '#e11d48' }}>
                      ₹{f.totalUnpaid.toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-muted" style={{ padding: '30px 0', color: '#9ca3af' }}>
                    {searchTerm ? "No unpaid families match your search." : "Wonderful! All families have cleared their dues."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal when a fund is clicked */}
      {selectedModalFund && (
        <div className="modal-backdrop animate-fade-in" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '24px' }}>
          <div className="modal-content animate-scale-up" style={{ width: '100%', maxWidth: '720px', background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.8)', borderRadius: '24px', padding: '36px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(226, 232, 240, 0.8)', paddingBottom: '20px', marginBottom: '24px' }}>
              <div>
                <span style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', background: `${getFundColor(selectedModalFund.fundType)}15`, color: getFundColor(selectedModalFund.fundType), fontWeight: '800', display: 'inline-block', marginBottom: '8px' }}>
                  {selectedModalFund.fundType} Fund
                </span>
                <h2 style={{ fontSize: '1.8rem', fontWeight: '800', margin: 0, color: '#0f172a' }}>{selectedModalFund.name}</h2>
                <span style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  📅 Due Date: {selectedModalFund.dueDate ? new Date(selectedModalFund.dueDate).toLocaleDateString() : 'No Due Date'} • Target per Family: ₹{selectedModalFund.targetAmount?.toLocaleString()}
                </span>
              </div>
              <button 
                onClick={() => setSelectedModalFund(null)} 
                style={{ background: '#f1f5f9', border: 'none', color: '#64748b', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', fontWeight: '700' }} 
                onMouseEnter={(e) => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = '#ffffff'; }} 
                onMouseLeave={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
              <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '6px', fontWeight: '700', textTransform: 'uppercase' }}>Village Target Total</span>
                <strong style={{ fontSize: '1.4rem', color: '#0f172a', fontWeight: '800' }}>₹{selectedModalFund.targetTotal?.toLocaleString()}</strong>
              </div>
              <div style={{ background: 'rgba(20, 184, 166, 0.08)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(20, 184, 166, 0.2)' }}>
                <span style={{ fontSize: '0.8rem', color: '#0d9488', display: 'block', marginBottom: '6px', fontWeight: '700', textTransform: 'uppercase' }}>Collected Treasury</span>
                <strong style={{ fontSize: '1.4rem', color: '#0d9488', fontWeight: '800' }}>₹{selectedModalFund.collected?.toLocaleString()}</strong>
              </div>
              <div style={{ background: 'rgba(244, 63, 94, 0.08)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
                <span style={{ fontSize: '0.8rem', color: '#e11d48', display: 'block', marginBottom: '6px', fontWeight: '700', textTransform: 'uppercase' }}>Outstanding Unpaid</span>
                <strong style={{ fontSize: '1.4rem', color: '#e11d48', fontWeight: '800' }}>₹{Math.max(0, (selectedModalFund.targetTotal || 0) - (selectedModalFund.collected || 0)).toLocaleString()}</strong>
              </div>
            </div>

            <div style={{ marginBottom: '28px', background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '10px', fontWeight: '700' }}>
                <span style={{ color: '#334155' }}>Overall Collection Rate</span>
                <strong style={{ color: getFundColor(selectedModalFund.fundType), fontSize: '1rem' }}>{selectedModalFund.percentage}% Achieved</strong>
              </div>
              <div style={{ height: '12px', background: '#e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${selectedModalFund.percentage}%`, background: getFundColor(selectedModalFund.fundType), borderRadius: '6px', transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' }}></div>
              </div>
            </div>

            {selectedModalFund.description && (
              <div style={{ background: '#f1f5f9', padding: '20px', borderRadius: '16px', marginBottom: '28px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '8px', fontWeight: '800', letterSpacing: '1px' }}>PURPOSE & DESCRIPTION</span>
                <p style={{ margin: 0, fontSize: '1rem', color: '#334155', lineHeight: '1.6' }}>{selectedModalFund.description}</p>
              </div>
            )}

            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a', fontWeight: '800' }}>
                  👥 Household Payment Audit ({dues.filter(d => (d.fundId?._id || d.fundId) === selectedModalFund._id).length} Families)
                </h4>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>Live Database Status</span>
              </div>
              
              <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '8px' }}>
                {dues.filter(d => (d.fundId?._id || d.fundId) === selectedModalFund._id).length > 0 ? (
                  dues.filter(d => (d.fundId?._id || d.fundId) === selectedModalFund._id).map(d => {
                    const isPaid = (d.amountPaid || 0) >= (d.totalDueAmount || 0);
                    return (
                      <div key={d._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: '#ffffff', borderRadius: '12px', borderLeft: `5px solid ${isPaid ? '#10b981' : '#ef4444'}`, border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <strong style={{ fontSize: '1.05rem', color: '#0f172a', fontWeight: '700' }}>{d.memberId?.name || 'Unknown Family Head'}</strong>
                          <span style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>Family ID: {d.memberId?.familyId || 'N/A'} • Phone: {d.memberId?.phone || 'N/A'}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '800', background: isPaid ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)', color: isPaid ? '#10b981' : '#ef4444', display: 'inline-block' }}>
                            {isPaid ? '✓ Fully Paid' : `⚠️ Pending ₹${((d.totalDueAmount || 0) - (d.amountPaid || 0)).toLocaleString()}`}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '36px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                    <p style={{ color: '#64748b', fontSize: '1rem', margin: 0 }}>No household allocations recorded for this fund yet.</p>
                  </div>
                )}
              </div>
            </div>

            <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
              <button 
                onClick={() => setSelectedModalFund(null)} 
                style={{ padding: '12px 32px', borderRadius: '12px', background: '#0f172a', color: '#ffffff', fontWeight: '700', fontSize: '1rem', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.25)', transition: 'all 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                Close Audit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Overview;
