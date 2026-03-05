import React, { useState, useEffect } from 'react';
import { contentAPI, authAPI } from './api.js';

export default function App() {
  const [page, setPage] = useState('landing');
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const userData = localStorage.getItem('user_data');
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
        setPage('feed');
      } catch (e) {
        console.error('Error:', e);
      }
    }
  }, []);

  if (page === 'signup') {
    return <SignupForm onSuccess={(u) => { setUser(u); setPage('feed'); }} onSwitch={() => setPage('login')} onBack={() => setPage('landing')} />;
  }

  if (page === 'login') {
    return <LoginForm onSuccess={(u) => { setUser(u); setPage('feed'); }} onSwitch={() => setPage('signup')} onBack={() => setPage('landing')} />;
  }

  if (page === 'feed' && user) {
    return <FeedView user={user} onLogout={() => { localStorage.removeItem('auth_token'); localStorage.removeItem('user_data'); setUser(null); setPage('landing'); }} />;
  }

  return (
    <div style={{ minHeight: '100vh', background: 'white' }}>
      <div style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1200&q=80)', backgroundSize: 'cover', backgroundPosition: 'center', height: '500px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', textAlign: 'center' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(rgba(9, 12, 24, 0.6), rgba(9, 12, 24, 0.8))' }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '600px', padding: '2rem' }}>
          <h1 style={{ fontSize: '3rem', marginBottom: '1rem', fontWeight: 'bold' }}>🏀 PLXYGROUND</h1>
          <p style={{ fontSize: '1.25rem', marginBottom: '2rem' }}>Where creators and brands connect in sports</p>
          <button onClick={() => setPage('signup')} style={{ padding: '12px 24px', fontSize: '1rem', fontWeight: '600', marginRight: '1rem', borderRadius: '10px', border: 'none', background: '#2563eb', color: 'white', cursor: 'pointer' }}>Get Started</button>
          <button onClick={() => setPage('login')} style={{ padding: '12px 24px', fontSize: '1rem', fontWeight: '600', borderRadius: '10px', border: '2px solid white', background: 'transparent', color: 'white', cursor: 'pointer' }}>I'm a Creator (Login)</button>
        </div>
      </div>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '4rem 2rem' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '3rem', fontSize: '1.875rem' }}>Features</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
          {[{ icon: '🛡️', name: 'Moderation', desc: 'Advanced content moderation' }, { icon: '📊', name: 'Analytics', desc: 'Real-time performance metrics' }, { icon: '💼', name: 'Opportunities', desc: 'Brand & creator partnerships' }, { icon: '🔒', name: 'Secure Admin', desc: 'Role-based access control' }].map((f, i) => (<div key={i} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', textAlign: 'center', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}><div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{f.icon}</div><h3 style={{ marginBottom: '0.5rem', fontSize: '1.5rem', fontWeight: '600' }}>{f.name}</h3><p style={{ color: '#64748b' }}>{f.desc}</p></div>))}
        </div>
      </div>
    </div>
  );
}

function SignupForm({ onSuccess, onSwitch, onBack }) {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.name.trim()) { setError('Name is required'); return; }
    if (!formData.email.trim()) { setError('Email is required'); return; }
    if (formData.password.length < 8) { setError('Password must be 8+ characters'); return; }
    if (formData.password !== formData.confirm) { setError('Passwords do not match'); return; }

    setLoading(true);
    try {
      const res = await authAPI.signup(formData.email, formData.password, formData.name);
      localStorage.setItem('auth_token', res.data.token);
      localStorage.setItem('user_data', JSON.stringify(res.data.user));
      onSuccess(res.data.user);
    } catch (e) {
      setError(e.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: '#fff', padding: '2.5rem', borderRadius: '8px', width: '100%', maxWidth: '400px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <h2 style={{ margin: '0 0 1rem 0' }}>Create Account</h2>
        <p style={{ color: '#666', margin: '0 0 2rem 0' }}>Join PLXYGROUND as a creator</p>
        {error && <div style={{ background: '#fee', border: '1px solid #fcc', color: '#c00', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem' }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <input type="text" placeholder="Your name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '1rem', boxSizing: 'border-box' }} />
          <input type="email" placeholder="Email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '1rem', boxSizing: 'border-box' }} />
          <input type="password" placeholder="Password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '1rem', boxSizing: 'border-box' }} />
          <input type="password" placeholder="Confirm password" value={formData.confirm} onChange={(e) => setFormData({ ...formData, confirm: e.target.value })} style={{ width: '100%', padding: '0.75rem', marginBottom: '1.5rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '1rem', boxSizing: 'border-box' }} />
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '0.75rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem', fontWeight: '600', opacity: loading ? 0.6 : 1 }}>{loading ? 'Creating...' : 'Sign Up'}</button>
        </form>
        <div style={{ marginTop: '1.5rem', textAlign: 'center', paddingTop: '1.5rem', borderTop: '1px solid #eee' }}>
          <p style={{ margin: '0 0 0.75rem 0' }}>Already have an account?</p>
          <button onClick={onSwitch} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '1rem', textDecoration: 'underline', fontWeight: '600' }}>Login</button>
        </div>
        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: '0.9rem' }}>← Back to home</button>
        </div>
      </div>
    </div>
  );
}

function LoginForm({ onSuccess, onSwitch, onBack }) {
  const [email, setEmail] = useState('sarahjohnson@plxyground.local');
  const [password, setPassword] = useState('Password1!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) { setError('Email and password required'); return; }

    setLoading(true);
    try {
      const res = await authAPI.login(email, password);
      if (res.data.error === 'ACCOUNT_SUSPENDED') { setError('Account suspended'); setLoading(false); return; }
      localStorage.setItem('auth_token', res.data.token);
      localStorage.setItem('user_data', JSON.stringify(res.data.user));
      onSuccess(res.data.user);
    } catch (e) {
      setError(e.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: '#fff', padding: '2.5rem', borderRadius: '8px', width: '100%', maxWidth: '400px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <h2 style={{ margin: '0 0 1rem 0' }}>Login</h2>
        <p style={{ color: '#666', margin: '0 0 2rem 0' }}>Welcome back to PLXYGROUND</p>
        {error && <div style={{ background: '#fee', border: '1px solid #fcc', color: '#c00', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem' }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '1rem', boxSizing: 'border-box' }} />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: '0.75rem', marginBottom: '1.5rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '1rem', boxSizing: 'border-box' }} />
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '0.75rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem', fontWeight: '600', opacity: loading ? 0.6 : 1 }}>{loading ? 'Logging in...' : 'Login'}</button>
        </form>
        <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f9f9f9', borderRadius: '4px', textAlign: 'center', fontSize: '0.85rem' }}>
          <p style={{ margin: '0 0 0.5rem 0', fontWeight: '600' }}>Demo Credentials:</p>
          <p style={{ margin: '0.25rem 0' }}>📧 sarahjohnson@plxyground.local</p>
          <p style={{ margin: '0.25rem 0' }}>🔐 Password1!</p>
        </div>
        <div style={{ borderTop: '1px solid #eee', paddingTop: '1.5rem', marginTop: '1.5rem', textAlign: 'center' }}>
          <p style={{ margin: '0 0 0.75rem 0' }}>Don't have an account?</p>
          <button onClick={onSwitch} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '1rem', textDecoration: 'underline', fontWeight: '600' }}>Sign up</button>
        </div>
        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: '0.9rem' }}>← Back to home</button>
        </div>
      </div>
    </div>
  );
}

function FeedView({ user, onLogout }) {
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await contentAPI.getAll(20, 0, '');
        setContent(res.data.data || []);
      } catch (e) {
        setError('Failed to load feed');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #ddd', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>🏀 PLXYGROUND</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span>Welcome, {user?.name}!</span>
          <button onClick={onLogout} style={{ padding: '0.5rem 1rem', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem' }}>Logout</button>
        </div>
      </div>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
        <h2>Creator Feed</h2>
        {error && <div style={{ background: '#fee', border: '1px solid #fcc', color: '#c00', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>{error}</div>}
        {loading ? <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>Loading feed...</div> : content.length === 0 ? <div style={{ background: '#fff', padding: '2rem', textAlign: 'center', borderRadius: '4px', border: '1px solid #ddd' }}><p>No content yet. Be the first to post!</p></div> : <div>{content.map((c) => (<div key={c.id} style={{ background: '#fff', padding: '1.5rem', marginBottom: '1.5rem', borderRadius: '4px', border: '1px solid #ddd' }}>{c.media_url && <img src={c.media_url} alt={c.title} style={{ width: '100%', height: 'auto', maxHeight: '300px', objectFit: 'cover', borderRadius: '4px', marginBottom: '1rem' }} onError={(e) => e.target.style.display = 'none'} />}<h3 style={{ margin: '0 0 0.5rem 0' }}>{c.title}</h3><p style={{ color: '#666', margin: '0 0 1rem 0', fontSize: '0.9rem' }}>by {c.creator_name}</p><p style={{ margin: 0 }}>{c.body}</p></div>))}</div>}
      </div>
    </div>
  );
}
