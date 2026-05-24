import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Calendar, 
  Filter, 
  Printer, 
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Download,
  Search,
  BookOpen,
  Users
} from 'lucide-react';
import './DetailedReports.css';

const DetailedReports = () => {
  const formatDateLocal = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [activeTab, setActiveTab] = useState('income'); // income, expenses, balance
  const [loading, setLoading] = useState(false);
  const [funds, setFunds] = useState([]);
  
  // Filter States
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedFundId, setSelectedFundId] = useState('');
  const [selectedFundType, setSelectedFundType] = useState('');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState('');
  const [activeRange, setActiveRange] = useState('all_time');
  
  // Data States
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [dues, setDues] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [familyViewTab, setFamilyViewTab] = useState('unpaid');
  const [summary, setSummary] = useState({
    totalCollected: 0,
    totalSpent: 0,
    currentBalance: 0,
    totalPendingDues: 0,
    duesBreakdown: []
  });

  // Dynamic live search query filters for instant on-screen updates
  const filteredPayments = payments.filter(p => {
    // 1. Search Query Filter
    const memberName = p.memberId?.name?.toLowerCase() || '';
    const memberId = p.memberId?.memberId?.toLowerCase() || '';
    const receiptNum = p.receiptNumber?.toLowerCase() || '';
    const fundName = p.splitDetails?.map(sd => sd.fundId?.name).join(', ')?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    const matchesSearch = memberName.includes(query) || memberId.includes(query) || receiptNum.includes(query) || fundName.includes(query);

    // 2. Fund Type Filter
    const matchesFundType = !selectedFundType || p.splitDetails?.some(sd => sd.fundId?.fundType?.toLowerCase() === selectedFundType.toLowerCase());

    return matchesSearch && matchesFundType;
  });

  const filteredExpenses = expenses.filter(e => {
    const title = e.title?.toLowerCase() || '';
    const category = e.category?.toLowerCase() || '';
    const desc = e.subDetails?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    return title.includes(query) || category.includes(query) || desc.includes(query);
  });

  // Fetch initial funds list for filtering
  useEffect(() => {
    const fetchFunds = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/funds`);
        setFunds(res.data);
      } catch (err) {
        console.error("Error fetching funds", err);
      }
    };
    fetchFunds();
    
    // Set default date range to Start of Application (Jan 1, 2026) and current date (Today)
    const today = formatDateLocal(new Date());
    setStartDate('2026-01-01');
    setEndDate(today);
    setActiveRange('all_time');
  }, []);

  // Fetch report data based on active filters
  const fetchReportData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Summary
      const summaryRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/reports/summary`);
      setSummary(summaryRes.data);

      // 2. Fetch Payments (Income)
      let paymentsUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/payments?`;
      if (startDate) paymentsUrl += `startDate=${startDate}&`;
      if (endDate) paymentsUrl += `endDate=${endDate}&`;
      if (selectedFundId) paymentsUrl += `fundId=${selectedFundId}&`;
      const paymentsRes = await axios.get(paymentsUrl);
      
      // Apply local client-side payment mode filter if selected
      let filteredPayments = paymentsRes.data;
      if (selectedPaymentMode) {
        filteredPayments = filteredPayments.filter(p => p.paymentMode === selectedPaymentMode);
      }
      setPayments(filteredPayments);

      // 3. Fetch Expenses
      let expensesUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/expenses?`;
      if (startDate) expensesUrl += `startDate=${startDate}&`;
      if (endDate) expensesUrl += `endDate=${endDate}&`;
      const expensesRes = await axios.get(expensesUrl);
      setExpenses(expensesRes.data);

      // 4. Fetch all Member Dues for the detailed Audit Sheet
      const duesRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/dues`);
      setDues(duesRes.data);

    } catch (err) {
      console.error("Error fetching report data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (startDate && endDate) {
      fetchReportData();
    }
  }, [startDate, endDate, selectedFundId, selectedFundType, selectedPaymentMode]);

  const handleFundSelect = (e) => {
    const fundId = e.target.value;
    setSelectedFundId(fundId);
    if (fundId) {
      const selectedFund = funds.find(f => f._id === fundId);
      if (selectedFund && selectedFund.fundType) {
        setSelectedFundType(selectedFund.fundType);
      }
    } else {
      setSelectedFundType('');
    }
  };

  // Quick Date Shortcut Helpers
  const handleQuickDate = (range) => {
    const now = new Date();
    let start, end;

    if (range === 'this_month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (range === 'last_3_months') {
      // Timezone-safe start from the 1st day of the month 3 months back
      start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (range === 'this_year') {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31);
    } else if (range === 'all_time') {
      start = new Date(2026, 0, 1); // Start of Application (Jan 1, 2026)
      end = new Date(); // Current date (Today)
    }

    setStartDate(formatDateLocal(start));
    setEndDate(formatDateLocal(end));
    setActiveRange(range);
  };

  // Helper to format fund names dynamically (e.g. MAINTENANCE FUND -> MF Jan 2026)
  const getFundDisplayName = (f) => {
    let name = f.name;
    if (name.toUpperCase().includes('MAINTENANCE FUND')) {
      name = 'MF';
    }
    if (f.month && f.year) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthStr = months[f.month - 1] || '';
      return `${name} ${monthStr} ${f.year}`;
    }
    return name;
  };

  // Calculations for current period (filtered data) using fully filtered lists
  const periodIncome = filteredPayments.reduce((acc, curr) => acc + curr.totalAmountPaid, 0);
  const periodExpense = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const periodNet = periodIncome - periodExpense;

  // Filter dues dynamically based on selected date range, selected specific fund, selected fund type, and search query (Family ID / Name)
  const filteredDuesForExplorer = dues.filter(d => {
    // 1. Date Range Filter (based on Fund's dueDate, fund's createdAt, due's dueDate, or due's createdAt)
    if (startDate && endDate) {
      const fundDateRaw = d.fundId?.dueDate || d.fundId?.createdAt || d.dueDate || d.createdAt;
      if (fundDateRaw) {
        const fundDate = new Date(fundDateRaw);
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        
        if (fundDate < start || fundDate > end) {
          return false;
        }
      }
    }

    // 2. Specific Fund Filter
    const matchesFund = !selectedFundId || (d.fundId?._id || d.fundId) === selectedFundId;

    // 3. Fund Type Filter
    const matchesType = !selectedFundType || d.fundId?.fundType?.toLowerCase() === selectedFundType.toLowerCase();
    
    // 4. Live search query matching Family ID, Name, or Member ID
    const memberName = d.memberId?.name?.toLowerCase() || '';
    const memberId = d.memberId?.memberId?.toLowerCase() || '';
    const familyId = d.memberId?.familyId?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    const matchesSearch = !query || memberName.includes(query) || memberId.includes(query) || familyId.includes(query);

    return matchesFund && matchesType && matchesSearch;
  });

  // Calculate Outstanding Dues (All Time) dynamically but respecting fund/type filters (without date filter)
  const outstandingDuesAllTime = dues.filter(d => {
    const matchesFund = !selectedFundId || (d.fundId?._id || d.fundId) === selectedFundId;
    const matchesType = !selectedFundType || d.fundId?.fundType?.toLowerCase() === selectedFundType.toLowerCase();
    return matchesFund && matchesType;
  }).reduce((acc, curr) => {
    const expected = curr.totalDueAmount || 0;
    const paid = curr.amountPaid || 0;
    return acc + Math.max(0, expected - paid);
  }, 0);

  const getFundStats = (fundId, targetAmount) => {
    const collected = filteredPayments.reduce((acc, p) => {
      const match = p.splitDetails?.find(sd => (sd.fundId?._id || sd.fundId) === fundId);
      const amount = match ? (match.amountAllocated || match.amountPaid || 0) : 0;
      return acc + amount;
    }, 0);
  
    const targetTotal = targetAmount * stats.memberCount;
    const percentage = targetTotal > 0 ? Math.min(100, Math.round((collected / targetTotal) * 100)) : 0;
  
    return { collected, targetTotal, percentage };
  };

  // Calculate dynamic dues breakdown based on filtered dues for Net Balance Sheet
  const dynamicDuesBreakdownMap = {};
  filteredDuesForExplorer.forEach(d => {
    const expected = d.totalDueAmount || 0;
    const paid = d.amountPaid || 0;
    const pending = Math.max(0, expected - paid);
    if (pending > 0 && d.fundId) {
      const fundKey = `${d.fundId.name}_${d.fundId.fundType}`;
      if (!dynamicDuesBreakdownMap[fundKey]) {
        dynamicDuesBreakdownMap[fundKey] = {
          fundName: d.fundId.name,
          fundType: d.fundId.fundType,
          pendingDues: 0
        };
      }
      dynamicDuesBreakdownMap[fundKey].pendingDues += pending;
    }
  });
  const dynamicDuesBreakdown = Object.values(dynamicDuesBreakdownMap).sort((a, b) => b.pendingDues - a.pendingDues);

  const auditExpectedTotal = filteredDuesForExplorer.reduce((acc, curr) => acc + curr.totalDueAmount, 0);
  const auditPaidTotal = filteredDuesForExplorer.reduce((acc, curr) => acc + curr.amountPaid, 0);
  const auditUnpaidTotal = Math.max(0, auditExpectedTotal - auditPaidTotal);

  // Group dues by member/family to get accurate family-level totals
  const familyDuesMap = {};
  filteredDuesForExplorer.forEach(d => {
    if (!d.memberId) return;
    const memId = d.memberId._id || d.memberId;
    if (!familyDuesMap[memId]) {
      familyDuesMap[memId] = {
        memberId: d.memberId.memberId || 'N/A',
        familyId: d.memberId.familyId || 'N/A',
        name: d.memberId.name || 'N/A',
        phone: d.memberId.phone || 'N/A',
        expected: 0,
        paid: 0,
        unpaid: 0,
        fundsCount: 0
      };
    }
    const expected = d.totalDueAmount || 0;
    const paid = d.amountPaid || 0;
    const pending = Math.max(0, expected - paid);
    
    familyDuesMap[memId].expected += expected;
    familyDuesMap[memId].paid += paid;
    familyDuesMap[memId].unpaid += pending;
    if (pending > 0) {
      familyDuesMap[memId].fundsCount += 1;
    }
  });

  const groupedFamilies = Object.values(familyDuesMap);

  // Paid Families
  const auditPaidFamilies = groupedFamilies.filter(f => f.unpaid <= 0 && f.expected > 0);
  // Unpaid Families (unpaid balance > 0)
  const auditUnpaidFamilies = groupedFamilies.filter(f => f.unpaid > 0);

  // Top 5 Highest Due Families/Members sorted descending by their pending dues
  const auditTopDueFamilies = [...auditUnpaidFamilies]
    .sort((a, b) => b.unpaid - a.unpaid)
    .slice(0, 5);

  // Print function
  const handlePrint = () => {
    window.print();
  };

  // CSV Export function
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    
    if (activeTab === 'income') {
      csvContent += "Receipt No,Member Name,Member ID,Payment Mode,Amount Paid,Payment Date,Notes\n";
      payments.forEach(p => {
        const row = [
          p.receiptNumber || 'N/A',
          p.memberId?.name || 'N/A',
          p.memberId?.memberId || 'N/A',
          p.paymentMode?.toUpperCase() || 'N/A',
          p.totalAmountPaid,
          p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : 'N/A',
          `"${p.notes || ''}"`
        ].join(",");
        csvContent += row + "\n";
      });
    } else if (activeTab === 'expenses') {
      csvContent += "Date,Title,Category,Logged By,Description,Amount\n";
      expenses.forEach(e => {
        const row = [
          e.date ? new Date(e.date).toLocaleDateString() : 'N/A',
          `"${e.title}"`,
          e.category || 'N/A',
          e.cashierId?.name || 'N/A',
          `"${e.subDetails || ''}"`,
          e.amount
        ].join(",");
        csvContent += row + "\n";
      });
    } else {
      csvContent += "Financial Metric,Value (INR)\n";
      csvContent += `Overall Collections,${summary.totalCollected}\n`;
      csvContent += `Overall Expenses,${summary.totalSpent}\n`;
      csvContent += `Net Cash Balance,${summary.currentBalance}\n`;
      csvContent += `Outstanding Dues,${summary.totalPendingDues}\n`;
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Denalai_Report_${activeTab}_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="reports-container animate-fade-in">
      
      {/* Printable Invoice-style Header (Only visible on PDF export / Print) */}
      <div className="print-only-header">
        <h1>DENALAI VILLAGE ADMINISTRATION SYSTEM</h1>
        <h3>Financial Report Ledger ({activeTab.toUpperCase()})</h3>
        <div className="print-meta-grid">
          <div><strong>Date Range:</strong> {startDate} to {endDate}</div>
          <div><strong>Generated On:</strong> {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
        <hr className="print-divider" />
      </div>

      {/* 2. Premium Filters Panel */}
      <div className="filters-panel glass-panel">
        <div className="filters-header">
          <Filter size={18} />
          <h4>Advanced Date & Category Filters</h4>
        </div>

        <div className="filters-grid">
          <div className="input-group">
            <label>Start Date</label>
            <input 
              type="date" 
              className="input-field glass-panel" 
              value={startDate} 
              onChange={(e) => {
                setStartDate(e.target.value);
                setActiveRange('');
              }} 
            />
          </div>

          <div className="input-group">
            <label>End Date</label>
            <input 
              type="date" 
              className="input-field glass-panel" 
              value={endDate} 
              onChange={(e) => {
                setEndDate(e.target.value);
                setActiveRange('');
              }} 
            />
          </div>

          <div className="input-group">
            <label>Filter by Specific Fund</label>
            <select 
              className="input-field glass-panel" 
              value={selectedFundId} 
              onChange={handleFundSelect}
              disabled={activeTab === 'expenses'}
            >
              <option value="">All Funds</option>
              {funds.map(f => (
                <option key={f._id} value={f._id}>{getFundDisplayName(f)}</option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label>Filter by Fund Type</label>
            <select 
              className="input-field glass-panel" 
              value={selectedFundType} 
              onChange={(e) => setSelectedFundType(e.target.value)}
              disabled={activeTab === 'expenses'}
            >
              <option value="">All Fund Types</option>
              <option value="Monthly">Monthly</option>
              <option value="Yearly">Yearly</option>
              <option value="One-time">One-time</option>
              <option value="Death Fund">Death Fund</option>
              <option value="Festival">Festival</option>
              <option value="Donation">Donation</option>
              <option value="Others">Others</option>
            </select>
          </div>

          <div className="input-group">
            <label>Filter by Payment Mode</label>
            <select 
              className="input-field glass-panel" 
              value={selectedPaymentMode} 
              onChange={(e) => setSelectedPaymentMode(e.target.value)}
              disabled={activeTab === 'expenses'}
            >
              <option value="">All Modes</option>
              <option value="cash">Cash</option>
              <option value="online">Online</option>
              <option value="qr">QR Code</option>
            </select>
          </div>
        </div>

        {/* Date Shortcuts & Export Actions */}
        <div className="shortcuts-row">
          <div className="date-shortcuts">
            <button className={`shortcut-btn glass-panel ${activeRange === 'this_month' ? 'active' : ''}`} onClick={() => handleQuickDate('this_month')}>This Month</button>
            <button className={`shortcut-btn glass-panel ${activeRange === 'last_3_months' ? 'active' : ''}`} onClick={() => handleQuickDate('last_3_months')}>Last 3 Months</button>
            <button className={`shortcut-btn glass-panel ${activeRange === 'this_year' ? 'active' : ''}`} onClick={() => handleQuickDate('this_year')}>This Year</button>
            <button className={`shortcut-btn glass-panel ${activeRange === 'all_time' ? 'active' : ''}`} onClick={() => handleQuickDate('all_time')}>All Time</button>
          </div>

          <div className="action-buttons">
            <button className="action-btn glass-panel csv-btn" onClick={handleExportCSV}>
              <Download size={16} /> Export CSV
            </button>
            <button className="action-btn glass-panel print-btn" onClick={handlePrint}>
              <Printer size={16} /> Export PDF / Print
            </button>
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="tabs-header">
        <button 
          className={`tab-item ${activeTab === 'income' ? 'active' : ''}`} 
          onClick={() => setActiveTab('income')}
        >
          📈 Income / Collections ({filteredPayments.length})
        </button>
        <button 
          className={`tab-item ${activeTab === 'expenses' ? 'active' : ''}`} 
          onClick={() => setActiveTab('expenses')}
        >
          📉 Expenses Logged ({filteredExpenses.length})
        </button>
        <button 
          className={`tab-item ${activeTab === 'balance' ? 'active' : ''}`} 
          onClick={() => setActiveTab('balance')}
        >
          🏛️ Net Balance Sheet
        </button>
        <button 
          className={`tab-item ${activeTab === 'dues_explorer' ? 'active' : ''}`} 
          onClick={() => setActiveTab('dues_explorer')}
        >
          🔍 Family Dues Explorer ({filteredDuesForExplorer.length})
        </button>
      </div>

      {/* 4. Tab Content */}
      <div className="tab-content">
        {loading ? (
          <div className="loading-state text-center py-8">
            <div className="spinner"></div>
            <p>Loading financial reports...</p>
          </div>
        ) : (
          <>
            {/* LIVE DYNAMIC SEARCH BAR */}
            {activeTab !== 'balance' && (
              <div className="search-bar-wrapper glass-panel animate-fade-in">
                <div className="search-input-container">
                  <span className="search-icon">🔍</span>
                  <input 
                    type="text" 
                    placeholder={
                      activeTab === 'income' 
                        ? "Search collections by member name, member ID, receipt number or fund..." 
                        : activeTab === 'dues_explorer'
                        ? "Search dues by Family ID, household head name, or Member ID..."
                        : "Search expenses by title, category, cashier or description..."
                    }
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="table-search-input"
                  />
                  {searchQuery && (
                    <button className="clear-search-btn" onClick={() => setSearchQuery('')}>✕</button>
                  )}
                </div>
                {searchQuery && (
                  <span className="search-results-badge">
                    Found {
                      activeTab === 'income' 
                        ? filteredPayments.length 
                        : activeTab === 'dues_explorer'
                        ? filteredDuesForExplorer.length
                        : filteredExpenses.length
                    } records
                  </span>
                )}
              </div>
            )}

            {/* INCOME TAB */}
            {activeTab === 'income' && (
              <div className="table-wrapper glass-panel animate-fade-in">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Receipt No</th>
                      <th>Member Name</th>
                      <th>Member ID</th>
                      <th>Fund Name</th>
                      <th>Payment Mode</th>
                      <th>Amount Paid</th>
                      <th>Payment Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map((p, idx) => (
                      <tr key={p._id} className={idx % 2 === 0 ? 'row-even' : 'row-odd'}>
                        <td><span className="receipt-tag">{p.receiptNumber || 'N/A'}</span></td>
                        <td><strong>{p.memberId?.name || 'N/A'}</strong></td>
                        <td><code className="member-id-code">{p.memberId?.memberId || 'N/A'}</code></td>
                        <td>
                          <span className="fund-name-tag">
                            {p.splitDetails?.map(sd => sd.fundId?.name).join(', ') || 'General Fund'}
                          </span>
                        </td>
                        <td>
                          <span className={`mode-badge ${p.paymentMode || 'cash'}`}>
                            {p.paymentMode?.toUpperCase() || 'CASH'}
                          </span>
                        </td>
                        <td className="amount-cell text-teal">₹{p.totalAmountPaid}</td>
                        <td>{new Date(p.paymentDate).toLocaleDateString()}</td>
                      </tr>
                    ))}
                    {filteredPayments.length === 0 && (
                      <tr>
                        <td colSpan="7" className="text-center py-8 text-muted">
                          {searchQuery ? "No records match your search query." : "No collection records found in the selected range."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* EXPENSES TAB */}
            {activeTab === 'expenses' && (
              <div className="table-wrapper glass-panel animate-fade-in">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Title</th>
                      <th>Category</th>
                      <th>Description</th>
                      <th>Logged By</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses.map((e, idx) => (
                      <tr key={e._id} className={idx % 2 === 0 ? 'row-even' : 'row-odd'}>
                        <td>{new Date(e.date).toLocaleDateString()}</td>
                        <td><strong>{e.title}</strong></td>
                        <td><span className="category-badge">{e.category || 'Maintenance'}</span></td>
                        <td><span className="desc-text-muted">{e.subDetails || 'N/A'}</span></td>
                        <td>{e.cashierId?.name || 'Admin'}</td>
                        <td className="amount-cell text-pink">₹{e.amount}</td>
                      </tr>
                    ))}
                    {filteredExpenses.length === 0 && (
                      <tr>
                        <td colSpan="6" className="text-center py-8 text-muted">
                          {searchQuery ? "No records match your search query." : "No expense records found in the selected range."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* BALANCE SHEET TAB */}
            {activeTab === 'balance' && (
              <div className="balance-sheet-wrapper animate-fade-in">
                <div className="grid-2">
                  {/* Ledger Summary */}
                  <div className="summary-section glass-panel">
                    <div className="summary-header-row">
                      <span className="summary-section-icon">🏛️</span>
                      <h3>Overall Ledger Summary</h3>
                    </div>
                    
                    <div className="summary-list">
                      <div className="summary-item">
                        <span>Total Lifetime Collections</span>
                        <strong className="text-teal">₹{summary.totalCollected.toLocaleString()}</strong>
                      </div>
                      
                      <div className="summary-item">
                        <span>Total Lifetime Expenses</span>
                        <strong className="text-pink">₹{summary.totalSpent.toLocaleString()}</strong>
                      </div>

                      <div className="summary-item total-row">
                        <span>Net Current Cash Balance</span>
                        <strong className="balance-badge" style={{ 
                          background: summary.currentBalance >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: summary.currentBalance >= 0 ? '#10b981' : '#ef4444' 
                        }}>
                          ₹{summary.currentBalance.toLocaleString()}
                        </strong>
                      </div>

                      {/* Lifetime Progress Bar */}
                      <div className="progress-container">
                        <div className="progress-info">
                          <span>Treasury Reserve Ratio</span>
                          <strong>
                            {summary.totalCollected > 0 
                              ? Math.max(0, Math.min(100, ((summary.totalCollected - summary.totalSpent) / summary.totalCollected * 100))).toFixed(0)
                              : 0}%
                          </strong>
                        </div>
                        <div className="progress-bar-bg">
                          <div className="progress-bar-fill teal" style={{ 
                            width: `${summary.totalCollected > 0 
                              ? Math.max(0, Math.min(100, ((summary.totalCollected - summary.totalSpent) / summary.totalCollected * 100))) 
                              : 0}%` 
                          }}></div>
                        </div>
                        <p className="progress-helper-text">Indicates the percentage of collections retained as reserve funds</p>
                      </div>
                    </div>
                  </div>

                  {/* Period breakdown */}
                  <div className="summary-section glass-panel">
                    <div className="summary-header-row">
                      <span className="summary-section-icon">📅</span>
                      <h3>Period Analysis</h3>
                    </div>
                    
                    <div className="summary-list">
                      <div className="summary-item">
                        <span>Collections in Period</span>
                        <strong className="text-teal">₹{periodIncome.toLocaleString()}</strong>
                      </div>

                      <div className="summary-item">
                        <span>Expenses in Period</span>
                        <strong className="text-pink">₹{periodExpense.toLocaleString()}</strong>
                      </div>

                      <div className="summary-item total-row">
                        <span>Net Savings in Period</span>
                        <strong className="balance-badge" style={{ 
                          background: periodNet >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: periodNet >= 0 ? '#10b981' : '#ef4444' 
                        }}>
                          ₹{periodNet.toLocaleString()}
                        </strong>
                      </div>

                      {/* Period Progress Bar */}
                      <div className="progress-container">
                        <div className="progress-info">
                          <span>Period Net Profit Margin</span>
                          <strong>
                            {periodIncome > 0 
                              ? Math.max(0, Math.min(100, ((periodIncome - periodExpense) / periodIncome * 100))).toFixed(0)
                              : 0}%
                          </strong>
                        </div>
                        <div className="progress-bar-bg">
                          <div className="progress-bar-fill indigo" style={{ 
                            width: `${periodIncome > 0 
                              ? Math.max(0, Math.min(100, ((periodIncome - periodExpense) / periodIncome * 100))) 
                              : 0}%` 
                          }}></div>
                        </div>
                        <p className="progress-helper-text">Percentage of income saved within the active filter dates</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5. Outstanding Dues Breakdown (Grouped by Fund Type & Name) */}
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
                {dynamicDuesBreakdown && dynamicDuesBreakdown.length > 0 && dynamicDuesBreakdown.some(d => d.pendingDues > 0) ? (
                  dynamicDuesBreakdown.filter(d => d.pendingDues > 0).map((db, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'row-even' : 'row-odd'}>
                      <td style={{ whiteSpace: 'nowrap' }}><strong>{db.fundName}</strong></td>
                      <td style={{ whiteSpace: 'nowrap' }}><span className="fund-name-tag">{db.fundType}</span></td>
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
              </div>
            )}

            {/* FAMILY DUES & FAMILIES AUDIT EXPLORER TAB */}
            {activeTab === 'dues_explorer' && (
              <div className="dues-explorer-wrapper animate-fade-in">
                {/* Summary Cards for Filtered Totals */}
                <div className="summary-cards mb-6 animate-fade-in">
                  <div className="summary-card">
                    <DollarSign size={20} className="icon" />
                    <h4>Total Collected</h4>
                    <p className="text-teal font-bold">₹{periodIncome.toLocaleString()}</p>
                  </div>
                  <div className="summary-card">
                    <TrendingDown size={20} className="icon" />
                    <h4>Total Pending Dues</h4>
                    <p className="text-pink font-bold">₹{auditUnpaidTotal.toLocaleString()}</p>
                  </div>
                  <div className="summary-card">
                    <TrendingUp size={20} className="icon" />
                    <h4>Total Allotted</h4>
                    <p className="text-indigo font-bold">₹{auditExpectedTotal.toLocaleString()}</p>
                  </div>
                </div>
                
                {/* B. Two Column Layout Grid */}
                <div className="grid-2">
                  
                  {/* Left Column: Paid / Unpaid Families List */}
                  <div className="summary-section glass-panel">
                    <div className="summary-header-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="summary-section-icon">👥</span>
                        <h3 style={{ margin: 0 }}>Family Ledger Logs</h3>
                      </div>
                      
                      {/* Nested Toggle Control Buttons */}
                      <div className="shortcuts-row" style={{ margin: 0, padding: 0 }}>
                        <div className="date-shortcuts" style={{ gap: '6px' }}>
                          <button 
                            className={`shortcut-btn glass-panel ${familyViewTab === 'unpaid' ? 'active' : ''}`}
                            onClick={() => setFamilyViewTab('unpaid')}
                            style={{ padding: '4px 10px', fontSize: '0.75rem', fontWeight: '700', borderRadius: '6px' }}
                          >
                            ❌ Not Paid ({auditUnpaidFamilies.length})
                          </button>
                          <button 
                            className={`shortcut-btn glass-panel ${familyViewTab === 'paid' ? 'active' : ''}`}
                            onClick={() => setFamilyViewTab('paid')}
                            style={{ padding: '4px 10px', fontSize: '0.75rem', fontWeight: '700', borderRadius: '6px' }}
                          >
                            ✅ Paid ({auditPaidFamilies.length})
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="table-wrapper mt-4">
                      {familyViewTab === 'unpaid' ? (
                          <table className="report-table">
                            <thead>
                              <tr>
                                <th>Family ID</th>
                                <th>Name (Head)</th>
                                <th style={{ textAlign: 'right' }}>Expected</th>
                                <th style={{ textAlign: 'right' }}>Unpaid Dues</th>
                              </tr>
                            </thead>
                            <tbody>
                              {auditUnpaidFamilies.length > 0 ? (
                                auditUnpaidFamilies.map((d, idx) => (
                                  <tr key={idx} className={idx % 2 === 0 ? 'row-even' : 'row-odd'}>
                                    <td><strong>{d.familyId || 'N/A'}</strong></td>
                                    <td>{d.name || 'N/A'}</td>
                                    <td style={{ textAlign: 'right' }}>₹{d.expected.toLocaleString()}</td>
                                    <td className="amount-cell text-pink" style={{ textAlign: 'right', fontWeight: '700' }}>
                                      ₹{d.unpaid.toLocaleString()}
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan="4" className="text-center py-6 text-muted">
                                    All families have fully paid for this filter selection!
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        ) : (
                          <table className="report-table">
                            <thead>
                              <tr>
                                <th>Family ID</th>
                                <th>Name (Head)</th>
                                <th style={{ textAlign: 'right' }}>Amount Paid</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {auditPaidFamilies.length > 0 ? (
                                auditPaidFamilies.map((d, idx) => (
                                  <tr key={idx} className={idx % 2 === 0 ? 'row-even' : 'row-odd'}>
                                    <td><strong>{d.familyId || 'N/A'}</strong></td>
                                    <td>{d.name || 'N/A'}</td>
                                    <td className="amount-cell text-teal" style={{ textAlign: 'right', fontWeight: '700' }}>
                                      ₹{d.paid.toLocaleString()}
                                    </td>
                                    <td>
                                      <span className="fund-name-tag" style={{ background: 'rgba(20, 184, 166, 0.1)', color: '#14b8a6', fontWeight: '800' }}>
                                        PAID
                                      </span>
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan="4" className="text-center py-6 text-muted">
                                    No families have paid yet for this filter selection!
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>

                  {/* Right Column: Highest Due Family & Leaderboard */}
                  <div className="summary-section glass-panel">
                    <div className="summary-header-row">
                      <span className="summary-section-icon">🏆</span>
                      <h3>Highest Outstanding Due Families</h3>
                    </div>

                    {/* Top Highlight Card */}
                    {auditTopDueFamilies.length > 0 ? (
                      <div className="fund-progress-card glass-panel mt-4 animate-fade-in" style={{ borderLeft: '4px solid #db2777', background: 'rgba(251, 242, 245, 0.5) !important' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#db2777', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              ⚠️ Absolute Highest Due Family
                            </span>
                            <h3 style={{ margin: '5px 0 2px 0', color: '#111827', fontSize: '1.25rem', fontWeight: '800' }}>
                              {auditTopDueFamilies[0].name}
                            </h3>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#4b5563' }}>
                              Family ID: <strong>{auditTopDueFamilies[0].familyId}</strong> • Phone: {auditTopDueFamilies[0].phone}
                            </p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '0.7rem', color: '#6b7280', display: 'block' }}>Pending Balance</span>
                            <strong style={{ fontSize: '1.4rem', color: '#db2777', fontWeight: '900' }}>
                              ₹{auditTopDueFamilies[0].unpaid.toLocaleString()}
                            </strong>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="fund-progress-card glass-panel mt-4 text-center text-muted py-6">
                        No outstanding dues present! High five! 🎉
                      </div>
                    )}

                    {/* Leaderboard list of top 5 */}
                    <div className="activity-list mt-6">
                      <h4 style={{ fontSize: '0.85rem', fontWeight: '800', color: '#374151', textTransform: 'uppercase', marginBottom: '8px' }}>
                        Top Outstanding Leaderboard
                      </h4>
                      {auditTopDueFamilies.slice(0, 5).map((d, idx) => (
                        <div key={idx} className="activity-item" style={{ background: 'rgba(255, 255, 255, 0.5)', padding: '10px 14px' }}>
                          <div className="activity-avatar" style={{ background: 'rgba(219, 39, 119, 0.1)', color: '#db2777' }}>
                            #{idx + 1}
                          </div>
                          <div className="activity-details">
                            <strong>{d.name || 'N/A'}</strong>
                            <span>Family ID: {d.familyId || 'N/A'} • {d.fundsCount} {d.fundsCount === 1 ? 'Fund' : 'Funds'} Unpaid</span>
                          </div>
                          <div className="activity-amount text-pink">
                            ₹{d.unpaid.toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default DetailedReports;
