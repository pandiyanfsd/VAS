import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend, 
  ArcElement, 
  RadialLinearScale 
} from 'chart.js';
import { Bar, Doughnut, Pie, PolarArea } from 'react-chartjs-2';
import { PieChart, Activity, DollarSign, Users, TrendingUp, RefreshCw } from 'lucide-react';

ChartJS.register(
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend, 
  ArcElement, 
  RadialLinearScale
);

const Summary = () => {
  const [loading, setLoading] = useState(true);
  const [summaryData, setSummaryData] = useState({
    financialStats: { totalCollected: 0, totalPendingDues: 0 },
    expenses: [],
    cashiersSummary: [],
    members: []
  });

  const fetchVisualAnalytics = async () => {
    setLoading(true);
    try {
      const [reportsRes, expensesRes, surrendersRes, membersRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/reports/summary`),
        axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/expenses`),
        axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/surrenders/summary`),
        axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/members`)
      ]);

      setSummaryData({
        financialStats: reportsRes.data || { totalCollected: 0, totalPendingDues: 0 },
        expenses: expensesRes.data || [],
        cashiersSummary: surrendersRes.data || [],
        members: membersRes.data || []
      });
    } catch (error) {
      console.error('Error fetching visual analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisualAnalytics();
  }, []);

  // 1. Financial Health Data (Doughnut)
  const totalCollected = summaryData.financialStats.totalCollected || 0;
  const totalPending = summaryData.financialStats.totalPendingDues || 0;
  const totalExpenses = summaryData.expenses
    .filter(e => (e.status || 'approved') === 'approved')
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const financialHealthChartData = {
    labels: ['Collected Revenue (₹)', 'Pending Dues (₹)', 'Disbursed Expenses (₹)'],
    datasets: [
      {
        data: [totalCollected, totalPending, totalExpenses],
        backgroundColor: ['rgba(16, 185, 129, 0.85)', 'rgba(245, 158, 11, 0.85)', 'rgba(225, 29, 72, 0.85)'],
        borderColor: ['#10b981', '#f59e0b', '#e11d48'],
        borderWidth: 2,
        hoverOffset: 8
      }
    ]
  };

  // 2. Demographic Gender Distribution (Pie)
  let maleCount = 0;
  let femaleCount = 0;

  summaryData.members.forEach(m => {
    const headGender = (m.gender || 'male').toLowerCase();
    if (headGender === 'female') femaleCount++;
    else maleCount++;

    if (m.subMembers && Array.isArray(m.subMembers)) {
      m.subMembers.forEach(sub => {
        const subGender = (sub.gender || 'male').toLowerCase();
        if (subGender === 'female') femaleCount++;
        else maleCount++;
      });
    }
  });

  const demographicChartData = {
    labels: ['Male Villagers', 'Female Villagers'],
    datasets: [
      {
        data: [maleCount || 1, femaleCount || 1],
        backgroundColor: ['rgba(56, 189, 248, 0.85)', 'rgba(236, 72, 153, 0.85)'],
        borderColor: ['#38bdf8', '#ec4899'],
        borderWidth: 2,
        hoverOffset: 8
      }
    ]
  };

  // 3. Cashier Remittance & Collections Performance (Bar Chart)
  const cashierLabels = summaryData.cashiersSummary.map(c => c.name);
  const cashierCollections = summaryData.cashiersSummary.map(c => c.totalCollected);
  const cashierSurrenders = summaryData.cashiersSummary.map(c => c.totalSurrendered);
  const cashierCashInHand = summaryData.cashiersSummary.map(c => c.cashInHand);

  const cashierPerformanceChartData = {
    labels: cashierLabels.length > 0 ? cashierLabels : ['No Cashiers Logged'],
    datasets: [
      {
        label: 'Total Collected (₹)',
        data: cashierCollections.length > 0 ? cashierCollections : [0],
        backgroundColor: 'rgba(56, 189, 248, 0.8)',
        borderColor: '#0284c7',
        borderWidth: 1,
        borderRadius: 8
      },
      {
        label: 'Surrendered to Treasury (₹)',
        data: cashierSurrenders.length > 0 ? cashierSurrenders : [0],
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderColor: '#059669',
        borderWidth: 1,
        borderRadius: 8
      },
      {
        label: 'Cash in Hand (₹)',
        data: cashierCashInHand.length > 0 ? cashierCashInHand : [0],
        backgroundColor: 'rgba(245, 158, 11, 0.8)',
        borderColor: '#d97706',
        borderWidth: 1,
        borderRadius: 8
      }
    ]
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { font: { family: 'Outfit, sans-serif', weight: 'bold', size: 13 } } },
      title: { display: false }
    },
    scales: {
      y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { weight: 'bold' } } },
      x: { grid: { display: false }, ticks: { font: { weight: 'bold' } } }
    }
  };

  // 4. Expense Category Distribution (Polar Area Chart)
  const categoryMap = {};
  summaryData.expenses.forEach(e => {
    const cat = e.category || 'General';
    categoryMap[cat] = (categoryMap[cat] || 0) + (e.amount || 0);
  });

  const expenseCatLabels = Object.keys(categoryMap);
  const expenseCatData = Object.values(categoryMap);

  const expenseCategoryChartData = {
    labels: expenseCatLabels.length > 0 ? expenseCatLabels : ['No Expenses Logged'],
    datasets: [
      {
        data: expenseCatData.length > 0 ? expenseCatData : [100],
        backgroundColor: [
          'rgba(239, 68, 68, 0.75)',
          'rgba(59, 130, 246, 0.75)',
          'rgba(16, 185, 129, 0.75)',
          'rgba(245, 158, 11, 0.75)',
          'rgba(168, 85, 247, 0.75)',
          'rgba(236, 72, 153, 0.75)'
        ],
        borderWidth: 2
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { padding: 20, font: { family: 'Outfit, sans-serif', weight: 'bold', size: 13 } } }
    }
  };

  return (
    <div className="summary-charts-container animate-fade-in" style={{ padding: '20px 0', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Banner */}
      <div className="summary-banner glass-panel mb-8" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(16px)', padding: '28px 36px', borderRadius: '24px', border: '1px solid rgba(203, 213, 225, 0.8)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ padding: '16px', background: 'rgba(99, 102, 241, 0.15)', borderRadius: '20px', color: '#6366f1', boxShadow: '0 8px 16px rgba(99,102,241,0.2)' }}>
            <Activity size={36} />
          </div>
          <div>
            <h1 style={{ fontSize: '2rem', color: '#0f172a', fontWeight: '900', margin: 0 }}>Visual Summary & Activity Analytics</h1>
            <span style={{ fontSize: '1rem', color: '#64748b', fontWeight: '600' }}>Real-time graphical charts for all administrative operations</span>
          </div>
        </div>

        <button 
          onClick={fetchVisualAnalytics} 
          disabled={loading}
          style={{ background: '#ffffff', border: '1px solid #cbd5e1', padding: '14px 24px', borderRadius: '16px', color: '#334155', fontWeight: '800', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', transition: 'all 0.2s' }}
          onMouseOver={e => e.currentTarget.style.borderColor = '#6366f1'}
          onMouseOut={e => e.currentTarget.style.borderColor = '#cbd5e1'}
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> Refresh Charts
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 glass-panel" style={{ padding: '60px 0', color: '#64748b', fontSize: '1.2rem', fontWeight: '600' }}>
          Generating real-time visual charts...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '32px' }}>
          {/* Chart 1: Financial Health */}
          <div className="chart-card glass-panel hover-scale" style={{ background: '#ffffff', borderRadius: '24px', padding: '32px', border: '1px solid #cbd5e1', boxShadow: '0 10px 20px -5px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
              <div style={{ padding: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', borderRadius: '12px' }}><DollarSign size={24} /></div>
              <div>
                <h2 style={{ fontSize: '1.4rem', color: '#0f172a', fontWeight: '800', margin: 0 }}>Village Revenue & Expenditure</h2>
                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Collected revenue vs pending dues and expenses</span>
              </div>
            </div>
            <div style={{ height: '340px', position: 'relative' }}>
              <Doughnut data={financialHealthChartData} options={chartOptions} />
            </div>
          </div>

          {/* Chart 2: Demographic Gender Distribution */}
          <div className="chart-card glass-panel hover-scale" style={{ background: '#ffffff', borderRadius: '24px', padding: '32px', border: '1px solid #cbd5e1', boxShadow: '0 10px 20px -5px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
              <div style={{ padding: '10px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', borderRadius: '12px' }}><Users size={24} /></div>
              <div>
                <h2 style={{ fontSize: '1.4rem', color: '#0f172a', fontWeight: '800', margin: 0 }}>Demographic Distribution</h2>
                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Total village population breakdown by gender</span>
              </div>
            </div>
            <div style={{ height: '340px', position: 'relative' }}>
              <Pie data={demographicChartData} options={chartOptions} />
            </div>
          </div>

          {/* Chart 3: Cashier Remittance Performance */}
          <div className="chart-card glass-panel hover-scale" style={{ gridColumn: '1 / -1', background: '#ffffff', borderRadius: '24px', padding: '32px', border: '1px solid #cbd5e1', boxShadow: '0 10px 20px -5px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
              <div style={{ padding: '10px', background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1', borderRadius: '12px' }}><TrendingUp size={24} /></div>
              <div>
                <h2 style={{ fontSize: '1.4rem', color: '#0f172a', fontWeight: '800', margin: 0 }}>Cashier Collections & Treasury Remittance</h2>
                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Comparing gross collections against surrendered cash across cashiers</span>
              </div>
            </div>
            <div style={{ height: '380px', position: 'relative' }}>
              <Bar data={cashierPerformanceChartData} options={barChartOptions} />
            </div>
          </div>

          {/* Chart 4: Expense Categories Breakdown */}
          <div className="chart-card glass-panel hover-scale" style={{ gridColumn: '1 / -1', background: '#ffffff', borderRadius: '24px', padding: '32px', border: '1px solid #cbd5e1', boxShadow: '0 10px 20px -5px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
              <div style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', borderRadius: '12px' }}><PieChart size={24} /></div>
              <div>
                <h2 style={{ fontSize: '1.4rem', color: '#0f172a', fontWeight: '800', margin: 0 }}>Expenditure Category Breakdown</h2>
                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Budget allocations distributed across operational categories</span>
              </div>
            </div>
            <div style={{ height: '380px', position: 'relative' }}>
              <PolarArea data={expenseCategoryChartData} options={chartOptions} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Summary;
