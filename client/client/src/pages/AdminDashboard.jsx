import React, { useEffect, useState } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, CreditCard, Wallet, LogOut, Menu, X, BarChart, PieChart, Coins, Receipt } from 'lucide-react';
import './AdminDashboard.css';

import ManageMembers from '../components/ManageMembers';
import ManageCashiers from '../components/ManageCashiers';
import ManageFunds from '../components/ManageFunds';
import DetailedReports from '../components/DetailedReports';
import Overview from '../components/Overview';
import Summary from '../components/Summary';
import TreasuryHandover from '../components/TreasuryHandover';
import ManageExpenses from '../components/ManageExpenses';

const AdminDashboard = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Validate admin token
  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (!token || role !== 'admin') {
      navigate('/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const navLinks = [
    { path: '/admin', name: 'Dashboard / Overview', icon: <LayoutDashboard size={20} /> },
    { path: '/admin/members', name: 'Manage Members', icon: <Users size={20} /> },
    { path: '/admin/cashiers', name: 'Manage Cashiers', icon: <CreditCard size={20} /> },
    { path: '/admin/funds', name: 'Manage Funds', icon: <Wallet size={20} /> },
    { path: '/admin/treasury', name: 'Treasury Handover', icon: <Coins size={20} /> },
    { path: '/admin/expenses', name: 'Manage Expenses', icon: <Receipt size={20} /> },
    { path: '/admin/reports', name: 'Detailed Reports', icon: <BarChart size={20} /> },
    { path: '/admin/summary', name: 'Summary', icon: <PieChart size={20} /> },
  ];

  return (
    <div className="admin-layout">
      {/* Mobile Header */}
      <div className="mobile-header">
        <h2>Denalai Admin</h2>
        <button className="menu-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`sidebar glass-panel ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>Denalai Admin</h2>
        </div>
        
        <nav className="sidebar-nav">
          {navLinks.map((link) => (
            <Link 
              key={link.path}
              to={link.path} 
              className={`nav-item ${location.pathname === link.path ? 'active' : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {link.icon}
              <span>{link.name}</span>
            </Link>
          ))}
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
            {navLinks.find(link => link.path === location.pathname)?.name || 'Admin Dashboard'}
          </h1>
          <div className="user-profile">
            <div className="avatar">A</div>
            <span>Super Admin</span>
          </div>
        </header>

        <div className="content-body animate-fade-in">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/members" element={<ManageMembers />} />
            <Route path="/cashiers" element={<ManageCashiers />} />
            <Route path="/funds" element={<ManageFunds />} />
            <Route path="/treasury" element={<TreasuryHandover />} />
            <Route path="/expenses" element={<ManageExpenses />} />
            <Route path="/reports" element={<DetailedReports />} />
            <Route path="/summary" element={<Summary />} />
          </Routes>
        </div>
      </main>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div className="sidebar-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}
    </div>
  );
};

export default AdminDashboard;
