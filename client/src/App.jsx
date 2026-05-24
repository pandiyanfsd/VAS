import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import CashierDashboard from './pages/CashierDashboard';
import MemberDashboard from './pages/MemberDashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        {/* The AdminDashboard handles its own nested routes inside */}
        <Route path="/admin/*" element={<AdminDashboard />} />
        
        <Route path="/cashier/*" element={<CashierDashboard />} />
        <Route path="/member/*" element={<MemberDashboard />} />
        
        {/* Default route redirects to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
