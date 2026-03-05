import React, { useState, useEffect } from 'react';
import { contentAPI, authAPI } from './api.js';

export default function App() {
  const [currentPage, setCurrentPage] = useState('landing');
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const userData = localStorage.getItem('user_data');
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
        setCurrentPage('feed');
      } catch (e) {
        console.error('Parse error:', e);
      }
    }
  }, []);

  const show = (page) => {
    console.log('Showing page:', page);
    setCurrentPage(page);
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    setUser(null);
    setCurrentPage('landing');
  };

  if (currentPage === 'landing') {
    return (
      <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', flexDirection: 'column' }}>
        <div style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1000)', backgroundSize: 'cover', backgroundPosition: 'center', height: '400px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5))' }} />
          <div style={{ position: 'relative', textAlign: 'center', color: '#fff' }}>
            <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏀 PLXYGROUND</h1>
            <p style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>Creator & Brand Connections</p>
            <button onClick={() => show('signup')} style={{ padding: '10px 20px', marginRight: '10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '1rem', fontWeight: '600' }}>Sign Up</button>
            <button onClick={() => show('login')} style={{ padding: '10px 20px', background: '#fff', color: '#000', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '1rem', fontWeight: '600' }}>Login</button>
          </div>
        </div>
        <div style={{ flex: 1, padding: '2rem', textAlign: 'center' }}>
          <h2>Platform Features</h2>
          <p>Content creation, moderation, analytics, and more.</p>
        </div>
      </div>
    );
  }

  if (currentPage === 'signup') {
    return <SignupPage onSuccess={(u) => { setUser(u); setCurrentPage('feed'); }} onLogin={() => show('login')} onBack={() => show('landing')} />;
  }

  if (currentPage === 'login') {
    return <LoginPage onSuccess={(u) => { setUser(u); setCurrentPage('feed'); }} onSignup={() => show('signup')} onBack={() => show('landing')} />;
  }

  if (currentPage === 'feed' && user) {
    return <FeedPage user={user} onLogout={logout} />;
  }

  return null;
}

function SignupPage({ onSuccess, onLogin, onBack }) {
  const [data, setData] = useState({ name: '', email: '', password: '', confirm: '' });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = (e) => {
    const { name, value } = e.target;
    setData(p => ({ ...p, [name]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    
    if (!data.name.trim()) return setErr('Name required');
    if (!data.email.trim()) return setErr('Email required');
    if (data.password.length < 8) return setErr('Password min 8 chars');
    if (data.password !== data.confirm) return setErr('Passwords dont match');

    setLoading(true);
    try {
      const res = await authAPI.signup(data.email, data.password, data.name);
      localStorage.setItem('auth_token', res.data.token);
      localStorage.setItem('user_data', JSON.stringify(res.data.user));
      onSuccess(res.data.user);
    } catch (e) {
      setErr(e.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: '#fff', padding: '2rem', borderRadius: '8px', width: '100%', maxWidth: '400px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <h1 style={{ marginBottom: '0.5rem' }}>Create Account</h1>
        <p style={{ color: '#666', marginBottom: '1.5rem' }}>Join PLXYGROUND</p>

        {err && <div style={{ background: '#fee', color: '#c00', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem' }}>{err}</div>}

        <form onSubmit={submit}>
          <input type="text" name="name" placeholder="Your name" value={data.name} onChange={handle} style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box', fontSize: '1rem' }} />
          <input type="email" name="email" placeholder="Email" value={data.email} onChange={handle} style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box', fontSize: '1rem' }} />
          <input type="password" name="password" placeholder="Password" value={data.password} onChange={handle} style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box', fontSize: '1rem' }} />
          <input type="password" name="confirm" placeholder="Confirm password" value={data.confirm} onChange={handle} style={{ width: '100%', padding: '0.75rem', marginBottom: '1.5rem', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box', fontSize: '1rem' }} />
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '0.75rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '1rem', fontWeight: '600', opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Creating...' : 'Sign Up'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <p style={{ marginBottom: '0.5rem' }}>Already have an account? <button onClick={onLogin} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', textDecoration: 'underline', fontSize: '1rem', fontWeight: '600' }}>Login</button></p>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '0.9rem' }}>← Back</button>
        </div>
      </div>
    </div>
  );
}

function LoginPage({ onSuccess, onSignup, onBack }) {
  const [email, setEmail] = useState('sarahjohnson@plxyground.local');
  const [pwd, setPwd] = useState('Password1!');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');

    if (!email.trim() || !pwd.trim()) return setErr('Email and password required');

    setLoading(true);
    try {
      const res = await authAPI.login(email, pwd);
      if (res.data.error === 'ACCOUNT_SUSPENDED') {
        setErr('Account suspended');
        setLoading(false);
        return;
      }
      localStorage.setItem('auth_token', res.data.token);
      localStorage.setItem('user_data', JSON.stringify(res.data.user));
      onSuccess(res.data.user);
    } catch (e) {
      setErr(e.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: '#fff', padding: '2rem', borderRadius: '8px', width: '100%', maxWidth: '400px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <h1 style={{ marginBottom: '0.5rem' }}>Login</h1>
        <p style={{ color: '#666', marginBottom: '1.5rem' }}>Welcome back</p>

        {err && <div style={{ background: '#fee', color: '#c00', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem' }}>{err}</div>}

        <form onSubmit={submit}>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box', fontSize: '1rem' }} />
          <input type="password" placeholder="Password" value={pwd} onChange={(e) => setPwd(e.target.value)} style={{ width: '100%', padding: '0.75rem', marginBottom: '1.5rem', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box', fontSize: '1rem' }} />
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '0.75rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '1rem', fontWeight: '600', opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f0f0f0', borderRadius: '4px', fontSize: '0.85rem', marginBottom: '1rem' }}>
          <p style={{ margin: 0, fontWeight: '600', marginBottom: '0.5rem' }}>Demo Credentials:</p>
          <p style={{ margin: 0 }}>📧 sarahjohnson@plxyground.local</p>
          <p style={{ margin: 0 }}>🔐 Password1!</p>
        </div>

        <div style={{ textAlign: 'center' }}>
          <p style={{ marginBottom: '0.5rem' }}>Don't have an account? <button onClick={onSignup} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', textDecoration: 'underline', fontSize: '1rem', fontWeight: '600' }}>Sign up</button></p>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '0.9rem' }}>← Back</button>
        </div>
      </div>
    </div>
  );
}

function FeedPage({ user, onLogout }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await contentAPI.getAll(20, 0, '');
        setItems(res.data.data || []);
      } catch (e) {
        setErr('Failed to load feed');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <div style={{ background: '#fff', padding: '1rem 2rem', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>🏀 PLXYGROUND</h1>
        <div>
          <span style={{ marginRight: '1rem' }}>Welcome, {user?.name}!</span>
          <button onClick={onLogout} style={{ padding: '0.5rem 1rem', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}>Logout</button>
        </div>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
        <h2>Creator Feed</h2>

        {err && <div style={{ background: '#fee', color: '#c00', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>{err}</div>}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>Loading...</div>
        ) : items.length === 0 ? (
          <div style={{ background: '#fff', padding: '2rem', textAlign: 'center', borderRadius: '4px', border: '1px solid #ddd' }}>
            <p>No content yet</p>
          </div>
        ) : (
          <div>
            {items.map((c) => (
              <div key={c.id} style={{ background: '#fff', padding: '1.5rem', marginBottom: '1.5rem', borderRadius: '4px', border: '1px solid #ddd' }}>
                {c.media_url && (
                  <img src={c.media_url} alt={c.title} style={{ width: '100%', height: '250px', objectFit: 'cover', borderRadius: '4px', marginBottom: '1rem' }} onError={(e) => e.target.style.display = 'none'} />
                )}
                <h3>{c.title}</h3>
                <p style={{ color: '#666', fontSize: '0.9rem' }}>by {c.creator_name}</p>
                <p style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{c.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
