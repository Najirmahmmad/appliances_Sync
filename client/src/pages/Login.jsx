import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import logoLeft from '../assets/ogo-left.jpeg';
import logoRight from '../assets/ogo-right.png';
import { FaEye, FaEyeSlash } from "react-icons/fa";
import './Login.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Simulate a small delay for better UX (optional, can be removed)
      // await new Promise(resolve => setTimeout(resolve, 800)); 

      const result = await login(username, password);
      if (result.success) {
        navigate('/');
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      {/* Left Decoration Side */}
      <div className="login-visual">
        <img src={logoLeft} alt="IFB ERP Visual" className="visual-image" />
        <div className="visual-overlay">
          <h1>Welcome Back</h1>
          <p>Seamless ERP management for your business.</p>
        </div>
      </div>

      {/* Right Form Side */}
      <div className="login-form-container">
        <div className="login-card-modern">
          <div className="brand-header">
            <img src={logoRight} alt="IFB Logo" className="brand-logo" />
            <h2 className="login-title">Sign In</h2>
            <p className="login-subtitle">Access your dashboard</p>
          </div>

          {error && (
            <div className="error-message-modern" role="alert">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="modern-form">
            <div className="input-group">
              <label htmlFor="username">Username</label>
              <div className="input-wrapper">
                <span className="input-icon">👤</span>
                <input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  className="modern-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  //type="password"
                  placeholder="Enter your password"
                  className="modern-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <span
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>

            </div>

            <button type="submit" className={`submit-btn-modern ${loading ? 'loading' : ''}`} disabled={loading}>
              {loading ? <span className="spinner"></span> : 'Log In'}
            </button>
          </form>

          <div className="login-footer">
            <p>© 2024 IFB Industries. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
