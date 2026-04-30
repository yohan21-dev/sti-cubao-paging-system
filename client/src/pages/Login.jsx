import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../components/AuthContext.jsx';
import STILogo from '../components/STILogo.jsx';

export default function Login() {
  const [form, setForm]   = useState({ username:'', password:'' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login }   = useAuth();
  const navigate    = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const data = await api.login(form);
      login(data.token, data.user);
      navigate('/admin');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'linear-gradient(135deg, #003320 0%, #006837 60%, #1a8a50 100%)',
      padding:16,
    }}>
      <div style={{ background:'#fff', borderRadius:20, padding:40, width:'100%', maxWidth:400, boxShadow:'0 24px 60px rgba(0,0,0,.25)' }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <STILogo size={64} />
          <h1 style={{ marginTop:16, fontSize:'1.3rem', fontWeight:800, color:'var(--sti-dark)' }}>Admin Login</h1>
          <p style={{ color:'var(--gray-500)', fontSize:'.85rem', marginTop:4 }}>STI College Cubao — Paging System</p>
        </div>

        {error && (
          <div style={{ background:'var(--red-light)', color:'var(--red)', borderRadius:8, padding:'10px 14px', fontSize:'.85rem', marginBottom:20, fontWeight:500 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input className="form-input" autoFocus autoComplete="username"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" autoComplete="current-password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-lg" style={{ width:'100%', marginTop:8 }} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
