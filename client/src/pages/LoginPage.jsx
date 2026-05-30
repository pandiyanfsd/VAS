import React, { useState } from 'react';
import { UserCircle, Shield, CreditCard, Lock, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import './LoginPage.css';

const LoginPage = () => {
  const [role, setRole] = useState('member'); // member, cashier, admin
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [showPassword, setShowPassword] = useState(false);


  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let payload = { password };
      if (role === 'admin') payload.name = identifier;
      else if (role === 'cashier') payload.phone = identifier;
      else payload.identifier = identifier;

      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/${role}/login`, payload);
      
      // Store token
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      localStorage.setItem('role', res.data.role);

      // Redirect based on role
      if (role === 'admin') window.location.href = '/admin';
      else if (role === 'cashier') window.location.href = '/cashier';
      else window.location.href = '/member';

    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Decorative background elements */}
      <div className="blob blob-1"></div>
      <div className="blob blob-2"></div>

      <div className="glass-panel login-card animate-fade-in">
        <div className="login-header">
          <h2>Denalai Village Portal</h2>
          <p>Sign in to your account</p>
        </div>

        <div className="role-selector">
          <button 
            type="button"
            className={`role-btn ${role === 'member' ? 'active' : ''}`}
            onClick={() => { setRole('member'); setIdentifier(''); setError(''); }}
          >
            <UserCircle size={18} /> Member
          </button>
          <button 
            type="button"
            className={`role-btn ${role === 'cashier' ? 'active' : ''}`}
            onClick={() => { setRole('cashier'); setIdentifier(''); setError(''); }}
          >
            <CreditCard size={18} /> Cashier
          </button>
          <button 
            type="button"
            className={`role-btn ${role === 'admin' ? 'active' : ''}`}
            onClick={() => { setRole('admin'); setIdentifier(''); setError(''); }}
          >
            <Shield size={18} /> Admin
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label>
              {role === 'admin' ? 'Username' : role === 'cashier' ? 'Phone Number' : 'Member ID / Phone'}
            </label>
            <input 
              type="text" 
              className="input-field" 
              placeholder={`Enter your ${role === 'admin' ? 'username' : 'identifier'}`}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </div>
          
          <div className="input-group">
            <label>Password</label>
            <div className="password-wrapper" style={{ position: 'relative' }}>
              <Lock size={18} className="input-icon" />
              <input 
                type={showPassword ? "text" : "password"}
                className="input-field with-icon" 
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary login-submit" disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
