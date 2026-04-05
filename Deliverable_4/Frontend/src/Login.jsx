import { useState } from 'react';
import {useNavigate} from 'react-router-dom';
import './Login.css';

function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.');
      return;
    }

    // TODO: Replace with real authentication flow.
    setError('');

    try{
      const response = await fetch('http://localhost:8000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          username: username,
          password: password
        })
      });

      if (!response.ok) {
        setError('Invalid username or password.');
        return;
      }
      const data = await response.json();
      localStorage.setItem('role', data.user.role);
      localStorage.setItem('email', data.user.email);
      navigate('/dashboard');
    } catch (err) {
      setError('An error occurred. Please try again later.');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-brand">
          <div className="brand-glow" />
          <div>
            <h1>SCEMAS</h1>
            <p>Citywide monitoring dashboard</p>
          </div>
        </div>

        <h2>Sign In</h2>
        <p className="login-subtitle">Access real-time alert insights and sensor analytics.</p>

        {error && <div className="login-error">{error}</div>}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Email</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. user@example.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <div className="login-actions">
            <label className="remember">
              <input type="checkbox" /> Remember me
            </label>
            <a href="#" className="forgot-link">Forgot password?</a>
          </div>

          <button type="submit" className="login-button">Continue</button>
        </form>
      </div>
    </div>
  );
}

export default Login;