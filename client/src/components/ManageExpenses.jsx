import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { Receipt, Plus, Search, Filter, Edit, Trash2, CheckCircle, AlertCircle, Clock, X, DollarSign, Tag, Calendar, User, Download, Printer } from 'lucide-react';

const ManageExpenses = ({ isCashier = false, currentCashier = null }) => {
  const [expenses, setExpenses] = useState([]);
  const [cashiers, setCashiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Notification states
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Create & Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [selectedExpense, setSelectedExpense] = useState(null);
  
  // Form fields
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category: 'Infrastructure & Roads',
    subDetails: '',
    cashierId: '',
    status: isCashier ? 'pending' : 'approved'
  });

  // Delete Modal state
  const [expenseToDelete, setExpenseToDelete] = useState(null);

  const categories = [
    'Infrastructure & Roads',
    'Water Supply & Sanitation',
    'Electricity & Utilities',
    'Festivals & Community Events',
    'Administrative & Legal',
    'Emergency & Medical Relief',
    'Miscellaneous / Other'
  ];

  const fetchExpensesAndCashiers = async () => {
    setLoading(true);
    try {
      const expensesUrl = isCashier
        ? `/api/expenses?cashierId=${currentCashier?._id}`
        : `/api/expenses`;
      
      const promises = [axios.get(expensesUrl)];
      if (!isCashier) {
        promises.push(axios.get(`/api/cashiers`));
      }
      
      const results = await Promise.all(promises);
      setExpenses(results[0].data);
      
      if (!isCashier) {
        setCashiers(results[1].data);
        if (results[1].data.length > 0) {
          setFormData(prev => ({ ...prev, cashierId: results[1].data[0]._id }));
        }
      } else {
        setFormData(prev => ({ 
          ...prev, 
          cashierId: currentCashier?._id || '',
          status: 'pending'
        }));
      }
    } catch (error) {
      console.error('Error fetching expenses/cashiers:', error);
      setErrorMsg('Failed to load expenses data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isCashier && !currentCashier) return;
    fetchExpensesAndCashiers();
  }, [isCashier, currentCashier]);

  const handleOpenCreateModal = () => {
    setModalMode('create');
    setSelectedExpense(null);
    setFormData({
      title: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      category: 'Infrastructure & Roads',
      subDetails: '',
      cashierId: isCashier ? currentCashier?._id : (cashiers.length > 0 ? cashiers[0]._id : ''),
      status: isCashier ? 'pending' : 'approved'
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (expense) => {
    setModalMode('edit');
    setSelectedExpense(expense);
    setFormData({
      title: expense.title || '',
      amount: expense.amount || '',
      date: expense.date ? new Date(expense.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      category: expense.category || 'Infrastructure & Roads',
      subDetails: expense.subDetails || '',
      cashierId: expense.cashierId?._id || expense.cashierId || (isCashier ? currentCashier?._id : (cashiers.length > 0 ? cashiers[0]._id : '')),
      status: expense.status || (isCashier ? 'pending' : 'approved')
    });
    setIsModalOpen(true);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.amount || Number(formData.amount) <= 0) {
      setErrorMsg('Please provide a valid title and positive amount.');
      return;
    }

    try {
      const payload = {
        title: formData.title,
        amount: Number(formData.amount),
        date: formData.date,
        category: formData.category,
        subDetails: formData.subDetails,
        cashierId: formData.cashierId || undefined,
        status: formData.status
      };

      if (modalMode === 'create') {
        await axios.post(`/api/expenses`, payload);
        setSuccessMsg(`Successfully logged expense: "${formData.title}" (₹${Number(formData.amount).toLocaleString()})`);
      } else {
        await axios.put(`/api/expenses/${selectedExpense._id}`, payload);
        setSuccessMsg(`Successfully updated expense: "${formData.title}"`);
      }

      setIsModalOpen(false);
      fetchExpensesAndCashiers();
    } catch (error) {
      setErrorMsg(error.response?.data?.error || 'Failed to save expense record.');
    }
  };

  const confirmDeleteExpense = async () => {
    if (!expenseToDelete) return;
    try {
      await axios.delete(`/api/expenses/${expenseToDelete._id}`);
      setSuccessMsg(`Successfully deleted expense: "${expenseToDelete.title}"`);
      setExpenseToDelete(null);
      fetchExpensesAndCashiers();
    } catch (error) {
      setErrorMsg(error.response?.data?.error || 'Failed to delete expense.');
    }
  };

  const filteredExpenses = expenses.filter(exp => {
    const matchesSearch = !searchTerm || (exp.title && exp.title.toLowerCase().includes(searchTerm.toLowerCase())) || (exp.subDetails && exp.subDetails.toLowerCase().includes(searchTerm.toLowerCase())) || (exp.category && exp.category.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || exp.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || (exp.status || 'approved') === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const totalExpenseAmount = filteredExpenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const totalApprovedAmount = filteredExpenses.filter(e => (e.status || 'approved') === 'approved').reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const totalPendingAmount = filteredExpenses.filter(e => e.status === 'pending').reduce((acc, curr) => acc + (curr.amount || 0), 0);

  const exportToCSV = () => {
    if (filteredExpenses.length === 0) {
      setErrorMsg('No expenses available to export based on current filters.');
      return;
    }

    const headers = ['Date', 'Title', 'Category', 'Logged By', 'Amount (INR)', 'Status', 'Details & Voucher Ref'];
    const rows = filteredExpenses.map(exp => [
      new Date(exp.date).toLocaleDateString('en-IN'),
      `"${(exp.title || '').replace(/"/g, '""')}"`,
      `"${exp.category || 'General'}"`,
      `"${exp.cashierId?.name || 'Admin Treasury'}"`,
      exp.amount || 0,
      (exp.status || 'approved').toUpperCase(),
      `"${(exp.subDetails || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `village_expenses_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    if (filteredExpenses.length === 0) {
      setErrorMsg('No expenses available to print based on current filters.');
      return;
    }

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Village Expenses Audit Report</title>
          <style>
            body { font-family: 'Inter', sans-serif; color: #0f172a; padding: 40px; margin: 0; background: #ffffff; }
            .header { text-align: center; border-bottom: 3px solid #e2e8f0; padding-bottom: 24px; margin-bottom: 32px; }
            h1 { font-size: 2.2rem; color: #1e293b; margin: 0 0 8px 0; }
            .meta { font-size: 0.95rem; color: #64748b; margin-bottom: 16px; }
            .summary-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 16px; margin-bottom: 32px; display: flex; justify-content: space-around; font-size: 1.1rem; }
            .summary-box strong { color: #e11d48; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 40px; font-size: 0.95rem; }
            th { background: #f1f5f9; color: #334155; padding: 16px 12px; text-align: left; font-weight: 700; border-bottom: 2px solid #cbd5e1; }
            td { padding: 16px 12px; border-bottom: 1px solid #e2e8f0; color: #1e293b; }
            .footer { text-align: center; font-size: 0.85rem; color: #94a3b8; margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div className="header">
            <h1>Denalai Village Administration</h1>
            <div className="meta">Official Expenditure & Disbursement Audit Report • Generated on ${new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}</div>
            <div style="font-size: 0.9rem; color: #475569;">
              Active Filters: Category [${categoryFilter}] | Status [${statusFilter}]
            </div>
          </div>
          <div className="summary-box">
            <div>Total Records: <strong>${filteredExpenses.length}</strong></div>
            <div>Total Expenditures: <strong style="color: #9f1239;">₹${totalExpenseAmount.toLocaleString()}</strong></div>
            <div>Approved & Disbursed: <strong style="color: #10b981;">₹${totalApprovedAmount.toLocaleString()}</strong></div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Expense Title / Payee</th>
                <th>Category</th>
                <th>Logged By</th>
                <th style="text-align: right;">Amount (₹)</th>
                <th style="text-align: center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${filteredExpenses.map(exp => `
                <tr>
                  <td style="white-space: nowrap;">${new Date(exp.date).toLocaleDateString('en-IN')}</td>
                  <td>
                    <strong>${exp.title}</strong>
                    ${exp.subDetails ? `<div style="font-size: 0.85rem; color: #64748b; margin-top: 4px;">${exp.subDetails}</div>` : ''}
                  </td>
                  <td>${exp.category || 'General'}</td>
                  <td>${exp.cashierId?.name || 'Admin Treasury'}</td>
                  <td style="text-align: right; font-weight: 700; color: #e11d48;">₹${(exp.amount || 0).toLocaleString()}</td>
                  <td style="text-align: center;">
                    <span style="padding: 4px 8px; border-radius: 6px; font-size: 0.8rem; font-weight: 700; background: ${(exp.status || 'approved') === 'approved' ? '#d1fae5' : '#fef3c7'}; color: ${(exp.status || 'approved') === 'approved' ? '#065f46' : '#92400e'};">
                      ${(exp.status || 'approved').toUpperCase()}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div className="footer">
            Denalai Village Financial Transparency Committee • System Generated Audit Trail
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  return (
    <div className="manage-expenses-container animate-fade-in" style={{ padding: '20px 0', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Overview Banner */}
      <div className="expenses-overview glass-panel mb-8" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(16px)', color: '#0f172a', padding: '32px', borderRadius: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05)', border: '1px solid rgba(203, 213, 225, 0.8)' }}>
        <div style={{ padding: '24px', background: 'rgba(225, 29, 72, 0.08)', borderRadius: '20px', border: '1px solid rgba(225, 29, 72, 0.25)', boxShadow: '0 4px 12px rgba(225, 29, 72, 0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{ padding: '10px', background: '#e11d48', borderRadius: '12px', color: '#ffffff', boxShadow: '0 4px 10px rgba(225,29,72,0.4)' }}>
              <Receipt size={24} />
            </div>
            <span style={{ fontSize: '0.9rem', color: '#be123c', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '800' }}>Filtered Expenses Total</span>
          </div>
          <strong style={{ fontSize: '2.5rem', color: '#9f1239', fontWeight: '900' }}>₹{totalExpenseAmount.toLocaleString()}</strong>
          <span style={{ fontSize: '0.85rem', color: '#881337', display: 'block', marginTop: '6px', fontWeight: '600' }}>Across {filteredExpenses.length} transaction records</span>
        </div>

        <div style={{ padding: '24px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '20px', border: '1px solid rgba(16, 185, 129, 0.25)', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{ padding: '10px', background: '#10b981', borderRadius: '12px', color: '#ffffff', boxShadow: '0 4px 10px rgba(16,185,129,0.4)' }}>
              <CheckCircle size={24} />
            </div>
            <span style={{ fontSize: '0.9rem', color: '#047857', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '800' }}>Approved & Disbursed</span>
          </div>
          <strong style={{ fontSize: '2.5rem', color: '#10b981', fontWeight: '900' }}>₹{totalApprovedAmount.toLocaleString()}</strong>
          <span style={{ fontSize: '0.85rem', color: '#065f46', display: 'block', marginTop: '6px', fontWeight: '600' }}>Official village budget allocations</span>
        </div>

        <div style={{ padding: '24px', background: 'rgba(245, 158, 11, 0.08)', borderRadius: '20px', border: '1px solid rgba(245, 158, 11, 0.25)', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{ padding: '10px', background: '#f59e0b', borderRadius: '12px', color: '#ffffff', boxShadow: '0 4px 10px rgba(245,158,11,0.4)' }}>
              <Clock size={24} />
            </div>
            <span style={{ fontSize: '0.9rem', color: '#b45309', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '800' }}>Pending Verification</span>
          </div>
          <strong style={{ fontSize: '2.5rem', color: '#d97706', fontWeight: '900' }}>₹{totalPendingAmount.toLocaleString()}</strong>
          <span style={{ fontSize: '0.85rem', color: '#92400e', display: 'block', marginTop: '6px', fontWeight: '600' }}>Awaiting treasury committee approval</span>
        </div>
      </div>

      {/* Toolbar & Filter Controls */}
      <div className="toolbar glass-panel mb-8" style={{ padding: '24px', borderRadius: '24px', background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(16px)', border: '1px solid #cbd5e1', display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={handleOpenCreateModal} className="btn-primary" style={{ height: '52px', padding: '0 28px', borderRadius: '16px', background: '#2563eb', color: '#ffffff', fontWeight: '800', fontSize: '1.05rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 4px 12px rgba(37,99,235,0.3)', boxSizing: 'border-box', transition: 'all 0.2s' }}>
            <Plus size={22} /> Log New Expense
          </button>
          <button onClick={exportToCSV} style={{ height: '52px', padding: '0 24px', borderRadius: '16px', background: '#10b981', color: '#ffffff', fontWeight: '800', fontSize: '1.05rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 4px 12px rgba(16,185,129,0.3)', boxSizing: 'border-box', transition: 'all 0.2s' }}>
            <Download size={20} /> Export CSV
          </button>
          <button onClick={exportToPDF} style={{ height: '52px', padding: '0 24px', borderRadius: '16px', background: '#0f172a', color: '#ffffff', fontWeight: '800', fontSize: '1.05rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 4px 12px rgba(15,23,42,0.3)', boxSizing: 'border-box', transition: 'all 0.2s' }}>
            <Printer size={20} /> Export / Print PDF
          </button>
        </div>

        <div className="filter-controls" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', flex: '1', justifyContent: 'flex-end', alignItems: 'center' }}>
          {/* Search Bar */}
          <div className="search-box" style={{ position: 'relative', minWidth: '300px', flex: '1', maxWidth: '420px', height: '52px' }}>
            <Search size={20} style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', color: searchTerm ? '#6366f1' : '#94a3b8', transition: 'color 0.2s' }} />
            <input 
              type="text" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              placeholder="Search vouchers, titles or categories..." 
              style={{ 
                width: '100%', 
                height: '52px', 
                padding: '0 48px', 
                borderRadius: '16px', 
                border: '1px solid #cbd5e1', 
                fontSize: '0.95rem', 
                fontWeight: '600', 
                color: '#0f172a', 
                outline: 'none', 
                background: '#ffffff', 
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', 
                boxSizing: 'border-box' 
              }}
              onFocus={e => {
                e.target.style.borderColor = '#6366f1';
                e.target.style.boxShadow = '0 0 0 4px rgba(99, 102, 241, 0.15)';
              }}
              onBlur={e => {
                e.target.style.borderColor = '#cbd5e1';
                e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.03)';
              }}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                style={{ 
                  position: 'absolute', 
                  right: '16px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  background: '#f1f5f9', 
                  border: 'none', 
                  borderRadius: '50%', 
                  width: '24px', 
                  height: '24px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: '#64748b', 
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={e => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#0f172a'; }}
                onMouseOut={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '52px' }}>
            <Filter size={18} color="#64748b" />
            <select 
              value={categoryFilter} 
              onChange={e => setCategoryFilter(e.target.value)}
              style={{ height: '52px', padding: '0 20px', borderRadius: '16px', border: '2px solid #cbd5e1', fontSize: '0.95rem', fontWeight: '700', color: '#334155', background: '#f8fafc', outline: 'none', cursor: 'pointer', transition: 'all 0.2s', boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = '#2563eb'}
              onBlur={e => e.target.style.borderColor = '#cbd5e1'}
            >
              <option value="all">📁 All Categories ({expenses.length})</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Status Filter */}
          <select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
            style={{ height: '52px', padding: '0 20px', borderRadius: '16px', border: '2px solid #cbd5e1', fontSize: '0.95rem', fontWeight: '700', color: '#334155', background: '#f8fafc', outline: 'none', cursor: 'pointer', transition: 'all 0.2s', boxSizing: 'border-box' }}
            onFocus={e => e.target.style.borderColor = '#2563eb'}
            onBlur={e => e.target.style.borderColor = '#cbd5e1'}
          >
            <option value="all">⚡ All Statuses</option>
            <option value="approved">🟢 Approved Only</option>
            <option value="pending">🟡 Pending Only</option>
            <option value="rejected">🔴 Rejected Only</option>
          </select>
        </div>
      </div>

      {/* Expenses Ledger Table */}
      <div className="section-title mb-6" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.6rem', color: '#0f172a', fontWeight: '800' }}>Village Expenditure Records</h2>
        <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '700' }}>Showing {filteredExpenses.length} transactions</span>
      </div>

      {loading ? (
        <div className="text-center py-12 glass-panel" style={{ padding: '40px 0', color: '#64748b' }}>Loading expense transactions...</div>
      ) : (
        <div className="ledger-card glass-panel mb-12" style={{ background: '#ffffff', borderRadius: '24px', padding: '28px', border: '1px solid #cbd5e1', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                <th style={{ padding: '18px 16px', textAlign: 'left', color: '#334155', fontWeight: '800', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px' }}>Date</th>
                <th style={{ padding: '18px 16px', textAlign: 'left', color: '#334155', fontWeight: '800', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Title & Description</th>
                <th style={{ padding: '18px 16px', textAlign: 'left', color: '#334155', fontWeight: '800', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Category</th>
                <th style={{ padding: '18px 16px', textAlign: 'left', color: '#334155', fontWeight: '800', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Logged By</th>
                <th style={{ padding: '18px 16px', textAlign: 'right', color: '#334155', fontWeight: '800', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amount</th>
                <th style={{ padding: '18px 16px', textAlign: 'center', color: '#334155', fontWeight: '800', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                <th style={{ padding: '18px 16px', textAlign: 'center', color: '#334155', fontWeight: '800', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', borderTopRightRadius: '12px', borderBottomRightRadius: '12px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map((exp, idx) => (
                <tr key={exp._id || idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                  <td style={{ padding: '16px 12px', color: '#1e293b', fontWeight: '700', whiteSpace: 'nowrap' }}>
                    {new Date(exp.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td style={{ padding: '16px 12px' }}>
                    <strong style={{ color: '#0f172a', display: 'block', fontSize: '1.05rem', fontWeight: '800' }}>{exp.title}</strong>
                    {exp.subDetails && <span style={{ fontSize: '0.85rem', color: '#64748b', display: 'block', marginTop: '4px', fontStyle: 'italic', maxWidth: '360px' }}>{exp.subDetails}</span>}
                  </td>
                  <td style={{ padding: '16px 12px' }}>
                    <span style={{ display: 'inline-block', background: '#f1f5f9', color: '#334155', fontWeight: '700', fontSize: '0.8rem', padding: '6px 12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      {exp.category || 'General'}
                    </span>
                  </td>
                  <td style={{ padding: '16px 12px', color: '#475569', fontWeight: '600' }}>
                    {exp.cashierId?.name || 'Admin Treasury'}
                  </td>
                  <td style={{ padding: '16px 12px', textAlign: 'right' }}>
                    <strong style={{ color: '#e11d48', fontSize: '1.2rem', fontWeight: '900' }}>₹{(exp.amount || 0).toLocaleString()}</strong>
                  </td>
                  <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                    <span style={{ 
                      display: 'inline-flex', alignItems: 'center', gap: '6px', 
                      background: (exp.status || 'approved') === 'approved' ? 'rgba(16, 185, 129, 0.15)' : (exp.status === 'pending' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)'), 
                      color: (exp.status || 'approved') === 'approved' ? '#10b981' : (exp.status === 'pending' ? '#d97706' : '#ef4444'), 
                      fontWeight: '800', fontSize: '0.8rem', padding: '6px 12px', borderRadius: '12px' 
                    }}>
                      {(exp.status || 'approved').toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                      <button 
                        onClick={() => handleOpenEditModal(exp)}
                        disabled={isCashier && exp.status !== 'pending'}
                        style={{ 
                          background: isCashier && exp.status !== 'pending' ? '#f1f5f9' : '#eff6ff', 
                          color: isCashier && exp.status !== 'pending' ? '#94a3b8' : '#2563eb', 
                          border: isCashier && exp.status !== 'pending' ? '1px solid #cbd5e1' : '1px solid #bfdbfe', 
                          borderRadius: '12px', padding: '8px 12px', fontWeight: '700', fontSize: '0.8rem', 
                          cursor: isCashier && exp.status !== 'pending' ? 'not-allowed' : 'pointer', 
                          transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px' 
                        }}
                      >
                        <Edit size={14} /> Edit
                      </button>
                      <button 
                        onClick={() => setExpenseToDelete(exp)}
                        disabled={isCashier && exp.status !== 'pending'}
                        style={{ 
                          background: isCashier && exp.status !== 'pending' ? '#f1f5f9' : '#fef2f2', 
                          color: isCashier && exp.status !== 'pending' ? '#94a3b8' : '#ef4444', 
                          border: isCashier && exp.status !== 'pending' ? '1px solid #cbd5e1' : '1px solid #fecaca', 
                          borderRadius: '12px', padding: '8px 12px', fontWeight: '700', fontSize: '0.8rem', 
                          cursor: isCashier && exp.status !== 'pending' ? 'not-allowed' : 'pointer', 
                          transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px' 
                        }}
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ padding: '60px 0', textAlign: 'center', color: '#94a3b8', fontSize: '1.1rem' }}>No matching expense records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && createPortal(
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)} style={{ zIndex: 9999 }}>
          <div className="modal-content glass-panel animate-fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px', width: '100%', borderRadius: '28px', padding: '36px', background: 'rgba(255, 255, 255, 0.95)', border: '1px solid #cbd5e1', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.6rem', color: '#0f172a', fontWeight: '900', margin: 0 }}>
                  {modalMode === 'create' ? 'Log New Village Expenditure' : 'Edit Expenditure Record'}
                </h2>
                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Treasury Audit & Payment Voucher Form</span>
              </div>
              <button onClick={() => setIsModalOpen(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', padding: '10px', cursor: 'pointer', color: '#64748b', transition: 'all 0.2s' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '20px' }}>
                {/* Title */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '800', color: '#1e293b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Expense Title / Payee</label>
                  <input 
                    type="text" 
                    value={formData.title} 
                    onChange={e => setFormData({...formData, title: e.target.value})} 
                    placeholder="e.g. Borewell Pump Motor Repair" 
                    required 
                    style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '2px solid #cbd5e1', fontSize: '1.05rem', fontWeight: '700', color: '#0f172a', outline: 'none', background: '#ffffff', transition: 'all 0.2s' }}
                    onFocus={e => e.target.style.borderColor = '#2563eb'}
                    onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                  />
                </div>

                {/* Amount */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '800', color: '#1e293b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amount (₹)</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <span style={{ position: 'absolute', left: '16px', fontSize: '1.3rem', color: '#e11d48', fontWeight: '800' }}>₹</span>
                    <input 
                      type="number" 
                      value={formData.amount} 
                      onChange={e => setFormData({...formData, amount: e.target.value})} 
                      placeholder="5000" 
                      required 
                      min="1"
                      style={{ width: '100%', padding: '16px 16px 16px 40px', borderRadius: '16px', border: '2px solid #cbd5e1', fontSize: '1.15rem', fontWeight: '800', color: '#e11d48', outline: 'none', background: '#ffffff', transition: 'all 0.2s' }}
                      onFocus={e => e.target.style.borderColor = '#2563eb'}
                      onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                {/* Date Picker */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '800', color: '#1e293b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Expenditure Date</label>
                  <input 
                    type="date" 
                    value={formData.date} 
                    onChange={e => setFormData({...formData, date: e.target.value})} 
                    required 
                    style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '2px solid #cbd5e1', fontSize: '1rem', fontWeight: '700', color: '#0f172a', outline: 'none', background: '#ffffff', transition: 'all 0.2s' }}
                    onFocus={e => e.target.style.borderColor = '#2563eb'}
                    onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                  />
                </div>

                {/* Category Dropdown */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '800', color: '#1e293b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Budget Category</label>
                  <select 
                    value={formData.category} 
                    onChange={e => setFormData({...formData, category: e.target.value})} 
                    style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '2px solid #cbd5e1', fontSize: '1rem', fontWeight: '700', color: '#334155', background: '#ffffff', outline: 'none', cursor: 'pointer', transition: 'all 0.2s' }}
                    onFocus={e => e.target.style.borderColor = '#2563eb'}
                    onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                {/* Logged By Cashier Dropdown */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '800', color: '#1e293b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Logged By / Disbursed Via</label>
                  <select 
                    value={formData.cashierId} 
                    onChange={e => setFormData({...formData, cashierId: e.target.value})} 
                    disabled={isCashier}
                    style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '2px solid #cbd5e1', fontSize: '1rem', fontWeight: '700', color: '#334155', background: isCashier ? '#f1f5f9' : '#ffffff', outline: 'none', cursor: isCashier ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
                    onFocus={e => e.target.style.borderColor = '#2563eb'}
                    onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                  >
                    {isCashier ? (
                      <option value={currentCashier?._id || ''}>👤 {currentCashier?.name || 'You'} (You)</option>
                    ) : (
                      <>
                        <option value="">🏛️ Admin Treasury (Direct)</option>
                        {cashiers.map(cashier => <option key={cashier._id} value={cashier._id}>👤 {cashier.name} (ID: #{cashier.cashierId})</option>)}
                      </>
                    )}
                  </select>
                </div>

                {/* Voucher Approval Status */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '800', color: '#1e293b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Approval Status</label>
                  <select 
                    value={formData.status} 
                    onChange={e => setFormData({...formData, status: e.target.value})} 
                    disabled={isCashier}
                    style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '2px solid #cbd5e1', fontSize: '1rem', fontWeight: '800', color: formData.status === 'approved' ? '#10b981' : (formData.status === 'pending' ? '#d97706' : '#ef4444'), background: isCashier ? '#f1f5f9' : '#ffffff', outline: 'none', cursor: isCashier ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
                    onFocus={e => e.target.style.borderColor = '#2563eb'}
                    onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                  >
                    {isCashier ? (
                      <option value={formData.status}>
                        {formData.status === 'approved' && '🟢 APPROVED'}
                        {formData.status === 'pending' && '🟡 PENDING COMMITTEE REVIEW'}
                        {formData.status === 'rejected' && '🔴 REJECTED CLAIM'}
                      </option>
                    ) : (
                      <>
                        <option value="approved">🟢 APPROVED & DISBURSED</option>
                        <option value="pending">🟡 PENDING COMMITTEE REVIEW</option>
                        <option value="rejected">🔴 REJECTED CLAIM</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Sub Details / Description */}
              <div style={{ marginBottom: '32px' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '800', color: '#1e293b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Detailed Explanation & Voucher Ref #</label>
                <textarea 
                  value={formData.subDetails} 
                  onChange={e => setFormData({...formData, subDetails: e.target.value})} 
                  placeholder="Include vendor details, bill reference numbers, or purpose explanation..." 
                  rows="3"
                  style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '2px solid #cbd5e1', fontSize: '0.95rem', fontWeight: '600', color: '#334155', outline: 'none', background: '#ffffff', transition: 'all 0.2s', resize: 'vertical' }}
                  onFocus={e => e.target.style.borderColor = '#2563eb'}
                  onBlur={e => e.target.style.borderColor = '#cbd5e1'}
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
                  style={{ padding: '14px 32px', borderRadius: '16px', background: '#2563eb', color: '#ffffff', fontWeight: '800', fontSize: '1rem', border: 'none', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(37,99,235,0.3)' }}
                >
                  {modalMode === 'create' ? 'Save & Record Voucher' : 'Update Expenditure Record'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {expenseToDelete && createPortal(
        <div className="modal-overlay" onClick={() => setExpenseToDelete(null)} style={{ zIndex: 9999 }}>
          <div className="modal-content glass-panel animate-fade-in" style={{ maxWidth: '440px', borderRadius: '28px', padding: '36px', textAlign: 'center', background: 'rgba(255, 255, 255, 0.95)', border: '1px solid #cbd5e1', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
            <div style={{ color: '#ef4444', marginBottom: '20px' }}>
              <div style={{ display: 'inline-flex', background: 'rgba(239, 68, 68, 0.15)', borderRadius: '50%', padding: '20px' }}>
                <AlertCircle size={56} />
              </div>
            </div>
            <h2 style={{ fontSize: '1.8rem', color: '#0f172a', fontWeight: '900', marginBottom: '12px' }}>Confirm Deletion</h2>
            <p style={{ color: '#475569', fontSize: '1.05rem', lineHeight: '1.6', marginBottom: '28px', fontWeight: '600' }}>
              Are you sure you want to permanently delete the expenditure record for <strong style={{color: '#0f172a'}}>"{expenseToDelete.title}"</strong> (₹{expenseToDelete.amount?.toLocaleString()})? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '16px' }}>
              <button style={{ flex: '1', padding: '16px', borderRadius: '16px', border: '1px solid #cbd5e1', background: '#f1f5f9', color: '#475569', fontWeight: '800', fontSize: '1.05rem', cursor: 'pointer' }} onClick={() => setExpenseToDelete(null)}>
                Keep Record
              </button>
              <button style={{ flex: '1', padding: '16px', borderRadius: '16px', border: 'none', background: '#ef4444', color: '#ffffff', fontWeight: '800', fontSize: '1.05rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(239,68,68,0.3)' }} onClick={confirmDeleteExpense}>
                Yes, Delete
              </button>
            </div>
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
            <h2 style={{ fontSize: '1.8rem', color: '#0f172a', fontWeight: '900', marginBottom: '12px' }}>Success!</h2>
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
            <h2 style={{ fontSize: '1.8rem', color: '#0f172a', fontWeight: '900', marginBottom: '12px' }}>Action Failed</h2>
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

export default ManageExpenses;
