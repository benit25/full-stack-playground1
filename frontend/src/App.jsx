import React, { useEffect, useMemo, useState } from 'react';
import { authAPI, businessAuthAPI, contentAPI, creatorAPI, messagesAPI } from './api.js';

const initialPost = { content_type: 'article', title: '', body: '', media_url: '', is_published: false };

function Banner({ message, type = 'info', onClose }) {
  if (!message) return null;
  const bg = type === 'error' ? '#fee2e2' : type === 'success' ? '#dcfce7' : '#dbeafe';
  const color = type === 'error' ? '#7f1d1d' : type === 'success' ? '#14532d' : '#1e3a8a';
  return (
    <div style={{ background: bg, color, border: `1px solid ${color}33`, borderRadius: 8, padding: 12, marginBottom: 12, display: 'flex', justifyContent: 'space-between', gap: 10 }}>
      <span>{message}</span>
      {onClose && <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>x</button>}
    </div>
  );
}

function Modal({ open, title, children, onCancel, onConfirm, confirmText = 'Confirm' }) {
  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header"><h3>{title}</h3></div>
        <div className="modal-body">{children}</div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          {onConfirm && <button className="btn btn-danger" onClick={onConfirm}>{confirmText}</button>}
        </div>
      </div>
    </div>
  );
}

function LegalScreen({ title, text, onBack }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '2rem' }}>
      <div className="card" style={{ maxWidth: 860, margin: '0 auto' }}>
        <h2>{title}</h2>
        <p style={{ whiteSpace: 'pre-wrap' }}>{text}</p>
        <button className="btn btn-secondary" onClick={onBack}>Back</button>
      </div>
    </div>
  );
}

function AuthForm({
  title,
  subtitle,
  onSubmit,
  business = false,
  onTerms,
  onPrivacy,
  onBack,
  defaults = {},
  hasName = true,
  hasAgree = false,
  onSwitch,
  switchLabel,
  onForgot,
  forgotLabel = 'Forgot password?'
}) {
  const [form, setForm] = useState({
    name: defaults.name || '',
    email: defaults.email || '',
    password: defaults.password || '',
    slug: defaults.slug || '',
    agree: false
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (hasName && !form.name.trim()) return setError('Name is required');
    if (!form.email.trim()) return setError('Email is required');
    if (form.password.length < 8) return setError('Password must be at least 8 characters');
    if (hasAgree && !form.agree) return setError('You must agree to Terms and Privacy');
    setLoading(true);
    try {
      await onSubmit(form);
    } catch (err) {
      if (err?.data?.error === 'ACCOUNT_SUSPENDED') {
        setError(err?.data?.message || 'Your account is suspended.');
      } else {
        setError(err.message || 'Request failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="card" style={{ width: '100%', maxWidth: 430 }}>
        <h2>{title}</h2>
        <p style={{ color: 'var(--text-light)' }}>{subtitle}</p>
        <Banner message={error} type="error" onClose={() => setError('')} />
        <form onSubmit={submit}>
          {hasName && <input aria-label="name" placeholder={business ? 'Business name' : 'Name'} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />}
          <input aria-label="email" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input aria-label="password" type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          {hasName && <input aria-label="slug" placeholder="Slug (optional)" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />}
          {hasAgree && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <input type="checkbox" checked={form.agree} onChange={(e) => setForm({ ...form, agree: e.target.checked })} />
              <span>I agree to Terms and Privacy</span>
            </label>
          )}
          <button className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>{loading ? 'Please wait...' : title}</button>
        </form>
        <p style={{ marginTop: 12, fontSize: 14 }}>
          <button onClick={onTerms} style={{ border: 'none', background: 'transparent', color: 'var(--primary)', cursor: 'pointer' }}>Terms</button>
          {' | '}
          <button onClick={onPrivacy} style={{ border: 'none', background: 'transparent', color: 'var(--primary)', cursor: 'pointer' }}>Privacy</button>
        </p>
        {onForgot && (
          <button type="button" onClick={onForgot} style={{ border: 'none', background: 'transparent', color: 'var(--primary)', cursor: 'pointer', padding: 0, marginTop: 6 }}>
            {forgotLabel}
          </button>
        )}
        {onSwitch && <button className="btn btn-secondary" onClick={onSwitch} style={{ width: '100%', marginTop: 10 }}>{switchLabel}</button>}
        {onBack && <button type="button" className="btn btn-secondary" onClick={onBack} style={{ width: '100%', marginTop: 10 }}>Back</button>}
      </div>
    </div>
  );
}

function ForgotPasswordScreen({ title, subtitle, defaultEmail = '', onRequestReset, onResetPassword, onBack }) {
  const [email, setEmail] = useState(defaultEmail);
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('request');
  const [banner, setBanner] = useState({ message: '', type: 'info' });

  const requestReset = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setBanner({ message: 'Email is required', type: 'error' });
      return;
    }
    setLoading(true);
    try {
      const res = await onRequestReset(email.trim());
      const returnedToken = res?.data?.resetToken || '';
      const returnedExpiry = res?.data?.resetTokenExpiresAt || '';
      setBanner({
        message: returnedToken
          ? `Reset token generated. Expires at: ${new Date(returnedExpiry).toLocaleString()}`
          : 'If the account exists, reset instructions have been sent.',
        type: 'success'
      });
      if (returnedToken) {
        setToken(returnedToken);
        setMode('reset');
      }
    } catch (err) {
      setBanner({ message: err.message || 'Unable to start reset', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    if (!token.trim()) {
      setBanner({ message: 'Reset token is required', type: 'error' });
      return;
    }
    if (newPassword.length < 8) {
      setBanner({ message: 'Password must be at least 8 characters', type: 'error' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setBanner({ message: 'Passwords do not match', type: 'error' });
      return;
    }
    setLoading(true);
    try {
      await onResetPassword(token.trim(), newPassword);
      setBanner({ message: 'Password reset successful. You can now log in.', type: 'success' });
      setMode('request');
      setToken('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setBanner({ message: err.message || 'Unable to reset password', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="card" style={{ width: '100%', maxWidth: 430 }}>
        <h2>{title}</h2>
        <p style={{ color: 'var(--text-light)' }}>{subtitle}</p>
        <Banner message={banner.message} type={banner.type} onClose={() => setBanner({ ...banner, message: '' })} />
        {mode === 'request' ? (
          <form onSubmit={requestReset}>
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Please wait...' : 'Send reset instructions'}
            </button>
          </form>
        ) : (
          <form onSubmit={resetPassword}>
            <input placeholder="Reset token" value={token} onChange={(e) => setToken(e.target.value)} />
            <input type="password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <input type="password" placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            <button className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Please wait...' : 'Reset password'}
            </button>
          </form>
        )}
        <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
          {mode !== 'reset' ? (
            <button className="btn btn-secondary" onClick={() => setMode('reset')}>I already have a token</button>
          ) : (
            <button className="btn btn-secondary" onClick={() => setMode('request')}>Need a new token</button>
          )}
          <button className="btn btn-secondary" onClick={onBack}>Back</button>
        </div>
      </div>
    </div>
  );
}

function Landing({ navigate }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1600&q=80)', backgroundSize: 'cover', backgroundPosition: 'center', minHeight: 520, position: 'relative', color: 'white' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(rgba(9,12,24,.6), rgba(9,12,24,.85))' }} />
        <div style={{ position: 'relative', zIndex: 1, padding: '2rem', maxWidth: 960, margin: '0 auto' }}>
          <h1 style={{ color: 'white' }}>Where creators and brands connect in sports</h1>
          <p style={{ color: '#e2e8f0', maxWidth: 620 }}>Publish content, discover opportunities, and manage moderation in one platform.</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => navigate('creator-signup')}>Get Started</button>
            <button className="btn btn-secondary" onClick={() => navigate('business-signup')}>I&apos;m a Business</button>
            <button className="btn btn-secondary" onClick={() => navigate('creator-login')}>Creator Login</button>
          </div>
        </div>
      </header>
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 12 }}>
          {['Moderation', 'Analytics', 'Opportunities', 'Secure Admin'].map((f) => <div key={f} className="card"><h3>{f}</h3><p>Built-in controls and clear workflows.</p></div>)}
        </div>
      </main>
    </div>
  );
}

function homeViewForUser(user) {
  return user?.role === 'BUSINESS' ? 'business-home' : 'feed';
}

function BusinessHome({ user, setView }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <nav>
        <strong>PLXYGROUND</strong>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => setView('feed')}>Browse Feed</button>
          <button className="btn btn-secondary" onClick={() => setView('discovery')}>Discover Creators</button>
          <button className="btn btn-secondary" onClick={() => setView('comms')}>Communications</button>
          <button className="btn btn-secondary" onClick={() => setView('profile')}>Business Profile</button>
          <button className="btn btn-secondary" onClick={() => setView('settings')}>Settings</button>
        </div>
      </nav>
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '2rem' }}>
        <div className="card" style={{ marginBottom: 12 }}>
          <h2 style={{ marginBottom: 8 }}>Business Dashboard</h2>
          <p style={{ color: 'var(--text-light)' }}>
            Signed in as <strong>{user?.name || 'Business'}</strong> ({user?.email})
          </p>
          <p style={{ marginTop: 10 }}>
            Start by discovering creators, browsing the feed, or managing your account settings.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
          <div className="card">
            <h3>Creator Discovery</h3>
            <p>Search creators and content to find the right partners.</p>
            <button className="btn btn-primary" onClick={() => setView('discovery')}>Open Discovery</button>
          </div>
          <div className="card">
            <h3>Browse Feed</h3>
            <p>Explore recent posts and trending content.</p>
            <button className="btn btn-primary" onClick={() => setView('feed')}>Open Feed</button>
          </div>
          <div className="card">
            <h3>Account Settings</h3>
            <p>Log out, read Terms and Privacy, and adjust preferences.</p>
            <button className="btn btn-primary" onClick={() => setView('settings')}>Open Settings</button>
          </div>
        </div>
      </main>
    </div>
  );
}

function Communications({ user, setView }) {
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState('');
  const [activeParticipants, setActiveParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);

  const loadConversations = async (preserveActive = true) => {
    try {
      setError('');
      setLoading(true);
      const res = await messagesAPI.listConversations(50, 0);
      const list = res.data.data || [];
      setConversations(list);
      if (!preserveActive || !activeId) {
        const first = list[0]?.id || '';
        setActiveId(first);
        setActiveParticipants(list[0]?.participants || []);
      } else {
        const current = list.find((c) => c.id === activeId);
        if (current) setActiveParticipants(current.participants || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId) => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    try {
      setLoadingThread(true);
      setError('');
      const res = await messagesAPI.listMessages(conversationId, 200, 0);
      setMessages(res.data.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load messages');
    } finally {
      setLoadingThread(false);
    }
  };

  useEffect(() => {
    loadConversations(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadMessages(activeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const startChat = async (peer) => {
    try {
      setError('');
      const res = await messagesAPI.createConversation(peer.id);
      const id = res.data.data?.id;
      await loadConversations(true);
      setActiveId(id);
      setSearch('');
      setResults([]);
    } catch (err) {
      setError(err.message || 'Failed to create conversation');
    }
  };

  const doSearch = async () => {
    const q = search.trim();
    if (!q) return;
    try {
      setSearching(true);
      setError('');
      const res = await creatorAPI.getAll(20, 0, q);
      const list = (res.data.data || []).filter((c) => c.id !== user.id);
      setResults(list);
    } catch (err) {
      setError(err.message || 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  const send = async (e) => {
    e?.preventDefault?.();
    const text = draft.trim();
    if (!activeId || !text) return;
    try {
      setDraft('');
      const now = new Date().toISOString();
      const optimistic = {
        id: `local_${now}`,
        conversation_id: activeId,
        sender_id: user.id,
        body: text,
        created_at: now,
        sender_name: user.name,
        sender_role: user.role
      };
      setMessages((prev) => [...prev, optimistic]);
      await messagesAPI.sendMessage(activeId, text);
      await loadConversations(true);
      await loadMessages(activeId);
    } catch (err) {
      setError(err.message || 'Send failed');
    }
  };

  const otherLabel = activeParticipants?.length
    ? activeParticipants.map((p) => `${p.name} (${p.role})`).join(', ')
    : 'New conversation';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <nav>
        <strong>PLXYGROUND</strong>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => setView(homeViewForUser(user))}>Home</button>
          <button className="btn btn-secondary" onClick={() => setView('feed')}>Feed</button>
          <button className="btn btn-secondary" onClick={() => setView('discovery')}>Discovery</button>
          <button className="btn btn-secondary" onClick={() => loadConversations(true)}>Refresh</button>
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 16 }}>
        {error && <Banner message={error} type="error" onClose={() => setError('')} />}

        <div className="comms-grid">
          <aside className="comms-sidebar card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
              <h3 style={{ marginBottom: 0 }}>Communications</h3>
              <span className="badge badge-success">{conversations.length}</span>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input placeholder="Find coaches, businesses, creators..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ marginBottom: 0 }} />
              <button className="btn btn-secondary" onClick={doSearch} disabled={searching}>{searching ? '...' : 'Search'}</button>
            </div>

            {results.length > 0 && (
              <div className="comms-results">
                {results.map((p) => (
                  <button key={p.id} className="comms-result" onClick={() => startChat(p)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <strong>{p.name}</strong>
                      <span className="badge">{p.role}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-light)' }}>{p.location || p.profile_slug || p.id}</div>
                  </button>
                ))}
              </div>
            )}

            <div className="comms-list">
              {loading && <p style={{ marginBottom: 0 }}>Loading...</p>}
              {!loading && conversations.length === 0 && <p style={{ marginBottom: 0 }}>No conversations yet. Search to start one.</p>}
              {conversations.map((c) => {
                const label = (c.participants || []).map((p) => p.name).join(', ') || 'Conversation';
                const subtitle = c.last_message ? c.last_message.slice(0, 70) : 'No messages yet';
                const active = c.id === activeId;
                return (
                  <button
                    key={c.id}
                    className={`comms-item ${active ? 'active' : ''}`}
                    onClick={() => { setActiveId(c.id); setActiveParticipants(c.participants || []); }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <strong style={{ textAlign: 'left' }}>{label}</strong>
                      <span style={{ fontSize: 12, color: 'var(--text-light)' }}>{new Date(c.last_message_at).toLocaleDateString()}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-light)', textAlign: 'left' }}>{subtitle}</div>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="comms-thread card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
              <div>
                <h3 style={{ marginBottom: 2 }}>{otherLabel}</h3>
                <div style={{ fontSize: 12, color: 'var(--text-light)' }}>
                  Your role: <strong style={{ color: 'var(--text)' }}>{user.role}</strong>
                </div>
              </div>
              {user?.role === 'BUSINESS' && <button className="btn btn-secondary" onClick={() => setView('business-home')}>Back to Business</button>}
            </div>

            <div className="comms-messages">
              {loadingThread && <p style={{ marginBottom: 0 }}>Loading thread...</p>}
              {!loadingThread && !activeId && <p style={{ marginBottom: 0 }}>Pick a conversation or search to start chatting.</p>}
              {!loadingThread && activeId && messages.length === 0 && <p style={{ marginBottom: 0 }}>No messages yet. Say hello.</p>}
              {messages.map((m) => {
                const mine = m.sender_id === user.id;
                return (
                  <div key={m.id} className={`comms-bubble ${mine ? 'mine' : 'theirs'}`}>
                    <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>
                      <strong>{mine ? 'You' : (m.sender_name || 'User')}</strong>
                      <span style={{ marginLeft: 8, color: 'var(--text-light)' }}>{new Date(m.created_at).toLocaleString()}</span>
                    </div>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{m.body}</div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={send} style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <input
                placeholder={activeId ? 'Write a message...' : 'Select a conversation first'}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={!activeId}
                style={{ marginBottom: 0 }}
              />
              <button className="btn btn-primary" disabled={!activeId || !draft.trim()}>Send</button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}

function Feed({ user, setView, setEditingContent }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [banner, setBanner] = useState({ message: '', type: 'info' });
  const [toDelete, setToDelete] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await contentAPI.getAll(50, 0, debounced);
      setItems(res.data.data || []);
    } catch {
      setError('Failed to load feed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [debounced]);

  const mine = useMemo(() => items.filter((x) => x.creator_id === user.id), [items, user.id]);

  const handleDelete = async () => {
    try {
      await contentAPI.delete(toDelete.id);
      setBanner({ message: 'Post deleted', type: 'success' });
      setToDelete(null);
      fetchData();
    } catch {
      setBanner({ message: 'Delete failed', type: 'error' });
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <nav>
        <strong>PLXYGROUND</strong>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {user?.role === 'BUSINESS' && <button className="btn btn-secondary" onClick={() => setView('business-home')}>Business</button>}
          <button className="btn btn-secondary" onClick={() => setView('comms')}>Communications</button>
          <button className="btn btn-secondary" onClick={() => setView('create')}>Create</button>
          <button className="btn btn-secondary" onClick={() => setView('profile')}>Profile</button>
          <button className="btn btn-secondary" onClick={() => setView('discovery')}>Discovery</button>
          <button className="btn btn-secondary" onClick={() => setView('settings')}>Settings</button>
        </div>
      </nav>
      <div style={{ maxWidth: 920, margin: '0 auto', padding: 16 }}>
        <Banner message={banner.message} type={banner.type} onClose={() => setBanner({ ...banner, message: '' })} />
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input placeholder="Search title, creator, body" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="btn btn-secondary" onClick={() => { setSearch(''); setDebounced(''); }}>Clear</button>
          <button className="btn btn-secondary" onClick={fetchData}>Refresh</button>
        </div>
        {error && <Banner message={error} type="error" />}
        {loading && <p>Loading...</p>}
        {!loading && items.length === 0 && <p>No content found.</p>}
        {items.map((c) => (
          <article key={c.id} className="card" style={{ marginBottom: 12 }}>
            <img
              src={c.media_url}
              alt={c.title}
              style={{
                width: '100%',
                aspectRatio: '16 / 9',
                maxHeight: 320,
                objectFit: 'cover',
                borderRadius: 10,
                marginBottom: 10
              }}
              onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/960x540?text=Media+Unavailable'; }}
            />
            <h3>{c.title}</h3>
            <p style={{ marginBottom: 6, color: 'var(--text-light)' }}>by {c.creator_name}</p>
            <p style={{ marginBottom: 8 }}><span className="badge badge-success">{c.content_type}</span></p>
            <p style={{ whiteSpace: 'pre-wrap' }}>{c.body}</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <button className="btn btn-secondary" onClick={() => setView({ type: 'detail', id: c.id })}>Open</button>
              {mine.some((m) => m.id === c.id) && <button className="btn btn-secondary" onClick={() => { setEditingContent(c); setView('edit'); }}>Edit</button>}
              {mine.some((m) => m.id === c.id) && <button className="btn btn-danger" onClick={() => setToDelete(c)}>Delete</button>}
            </div>
          </article>
        ))}
      </div>
      <Modal open={!!toDelete} title="Delete post?" onCancel={() => setToDelete(null)} onConfirm={handleDelete} confirmText="Delete">
        <p>This action cannot be undone.</p>
      </Modal>
    </div>
  );
}

function PostForm({ title, initial, onSubmit, onBack }) {
  const [form, setForm] = useState(initial || initialPost);
  const [banner, setBanner] = useState({ message: '', type: 'info' });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.media_url.trim()) return setBanner({ message: 'Media URL is required', type: 'error' });
    if (!form.title.trim() || !form.body.trim()) return setBanner({ message: 'Title and body are required', type: 'error' });
    setLoading(true);
    try {
      await onSubmit(form);
      setBanner({ message: 'Saved successfully', type: 'success' });
    } catch (err) {
      setBanner({ message: err.message || 'Save failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: 16 }}>
      <div className="card" style={{ maxWidth: 860, margin: '0 auto' }}>
        <h2>{title}</h2>
        <Banner message={banner.message} type={banner.type} onClose={() => setBanner({ ...banner, message: '' })} />
        <form onSubmit={submit}>
          <select value={form.content_type} onChange={(e) => setForm({ ...form, content_type: e.target.value })}>
            <option value="article">article</option>
            <option value="video_embed">video_embed</option>
            <option value="image_story">image_story</option>
          </select>
          <input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea placeholder="Body" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          <input placeholder="Media URL (required)" value={form.media_url} onChange={(e) => setForm({ ...form, media_url: e.target.value })} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} />
            Publish now
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
            <button type="button" className="btn btn-secondary" onClick={onBack}>Back</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ContentDetail({ id, onBack }) {
  const [item, setItem] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    (async () => {
      try {
        const res = await contentAPI.getById(id);
        setItem(res.data);
      } catch {
        setError('Content not found');
      }
    })();
  }, [id]);
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: 16 }}>
      <div className="card" style={{ maxWidth: 860, margin: '0 auto' }}>
        <button className="btn btn-secondary" onClick={onBack}>Back</button>
        {error && <Banner message={error} type="error" />}
        {item && (
          <>
            <img
              src={item.media_url}
              alt={item.title}
              style={{
                width: '100%',
                aspectRatio: '16 / 9',
                maxHeight: 420,
                objectFit: 'cover',
                borderRadius: 10,
                marginTop: 10
              }}
            />
            <h2>{item.title}</h2>
            <p>{item.creator_name}</p>
            <p style={{ whiteSpace: 'pre-wrap' }}>{item.body}</p>
          </>
        )}
      </div>
    </div>
  );
}

function Profile({ user, onBack }) {
  const [creator, setCreator] = useState(null);
  const [form, setForm] = useState({ bio: '', location: '', profile_image_url: '', social_links: { instagram: '', website: '' } });
  const [banner, setBanner] = useState({ message: '', type: 'info' });

  useEffect(() => {
    (async () => {
      const res = await creatorAPI.getById(user.id);
      setCreator(res.data);
      setForm({
        bio: res.data.bio || '',
        location: res.data.location || '',
        profile_image_url: res.data.profile_image_url || '',
        social_links: {
          instagram: res.data.social_links?.instagram || '',
          website: res.data.social_links?.website || ''
        }
      });
    })();
  }, [user.id]);

  const save = async () => {
    try {
      await creatorAPI.update(user.id, form);
      setBanner({ message: 'Profile updated', type: 'success' });
    } catch (err) {
      setBanner({ message: err.message || 'Update failed', type: 'error' });
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: 16 }}>
      <div className="card" style={{ maxWidth: 860, margin: '0 auto' }}>
        <button className="btn btn-secondary" onClick={onBack}>Back</button>
        <h2>Profile</h2>
        <Banner message={banner.message} type={banner.type} onClose={() => setBanner({ ...banner, message: '' })} />
        {creator && (
          <>
            <div style={{ marginBottom: 14 }}>
              <img
                src={form.profile_image_url || 'https://via.placeholder.com/240x240?text=Profile'}
                alt="Profile"
                style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 9999, border: '3px solid var(--border)' }}
                onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/240x240?text=Profile'; }}
              />
            </div>
            <p><strong>{creator.name}</strong> ({creator.role})</p>
            <input placeholder="Profile image URL" value={form.profile_image_url} onChange={(e) => setForm({ ...form, profile_image_url: e.target.value })} />
            <textarea placeholder="Bio" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
            <input placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            <input placeholder="Instagram URL" value={form.social_links.instagram} onChange={(e) => setForm({ ...form, social_links: { ...form.social_links, instagram: e.target.value } })} />
            <input placeholder="Website URL" value={form.social_links.website} onChange={(e) => setForm({ ...form, social_links: { ...form.social_links, website: e.target.value } })} />
            <button className="btn btn-primary" onClick={save}>Save Profile</button>
            <h3 style={{ marginTop: 18 }}>Posts</h3>
            {(creator.content || []).map((post) => <p key={post.id}>{post.title}</p>)}
          </>
        )}
      </div>
    </div>
  );
}

function Discovery({ onBack }) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [creators, setCreators] = useState([]);
  const [content, setContent] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(t);
  }, [query]);
  useEffect(() => {
    (async () => {
      try {
        const [cr, ct] = await Promise.all([creatorAPI.getAll(20, 0, debounced), contentAPI.getAll(20, 0, debounced)]);
        setCreators(cr.data.data || []);
        setContent(ct.data.data || []);
      } catch {
        setError('Search failed');
      }
    })();
  }, [debounced]);
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: 16 }}>
      <div className="card" style={{ maxWidth: 860, margin: '0 auto' }}>
        <button className="btn btn-secondary" onClick={onBack}>Back</button>
        <h2>Discovery</h2>
        {error && <Banner message={error} type="error" />}
        <input placeholder="Search creators/content" value={query} onChange={(e) => setQuery(e.target.value)} />
        <h3>Creators</h3>
        {creators.length === 0 ? <p>No creators</p> : creators.map((x) => <p key={x.id}>{x.name} ({x.role})</p>)}
        <h3>Content</h3>
        {content.length === 0 ? <p>No content</p> : content.map((x) => <p key={x.id}>{x.title}</p>)}
      </div>
    </div>
  );
}

function Settings({ onBack, onLogout, onTerms, onPrivacy, theme, onToggleTheme }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: 16 }}>
      <div className="card" style={{ maxWidth: 860, margin: '0 auto' }}>
        <div style={{ marginBottom: 8 }}>
          <button className="btn btn-secondary" onClick={onBack}>← Back</button>
        </div>
        <h2>Settings</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="btn btn-secondary" onClick={onToggleTheme}>Theme: {theme === 'dark' ? 'Dark' : 'Light'}</button>
          <button className="btn btn-secondary" onClick={onTerms}>📄 Terms</button>
          <button className="btn btn-secondary" onClick={onPrivacy}>🔒 Privacy</button>
          <button className="btn btn-danger" onClick={onLogout}>🚪 Logout</button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('landing');
  const [editingContent, setEditingContent] = useState(null);
  const [theme, setTheme] = useState(localStorage.getItem('theme_mode') || 'light');

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const userData = localStorage.getItem('user_data');
    if (token && userData) {
      try {
        const parsed = JSON.parse(userData);
        setUser(parsed);
        setView(homeViewForUser(parsed));
      } catch {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
      }
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme_mode', theme);
  }, [theme]);

  const loginSuccess = (res) => {
    localStorage.setItem('auth_token', res.data.token);
    localStorage.setItem('user_data', JSON.stringify(res.data.user));
    setUser(res.data.user);
    setView(homeViewForUser(res.data.user));
  };
  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    setUser(null);
    setView('landing');
  };
  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  const homeView = homeViewForUser(user);

  let screen = null;
  if (view === 'terms') {
    screen = <LegalScreen title="Terms of Service" text={'PLXYGROUND Terms\n\n1) Post lawful content only.\n2) Media URL is mandatory for content submissions.\n3) Abuse and impersonation are prohibited.\n4) Admin moderation decisions are enforceable.'} onBack={() => setView(user ? homeView : 'landing')} />;
  } else if (view === 'privacy') {
    screen = <LegalScreen title="Privacy Policy" text={'PLXYGROUND Privacy\n\nWe store account data, profile data, and content required to operate this platform. Passwords are hashed using bcrypt. We do not expose private credentials through public endpoints.'} onBack={() => setView(user ? homeView : 'landing')} />;
  } else if (!user) {
    if (view === 'creator-signup') screen = <AuthForm title="Creator Signup" subtitle="Create your creator account" hasAgree onTerms={() => setView('terms')} onPrivacy={() => setView('privacy')} onBack={() => setView('landing')} onSwitch={() => setView('creator-login')} switchLabel="Have an account? Login" onSubmit={async (form) => loginSuccess(await authAPI.signup(form.email, form.password, form.name, form.slug))} />;
    else if (view === 'creator-login') screen = <AuthForm title="Creator Login" subtitle="Access your creator account" hasName={false} onTerms={() => setView('terms')} onPrivacy={() => setView('privacy')} onBack={() => setView('landing')} onSwitch={() => setView('creator-signup')} switchLabel="Need an account? Signup" defaults={{ email: 'sarahjohnson@plxyground.local', password: 'Password1!' }} onForgot={() => setView('creator-forgot')} onSubmit={async (form) => loginSuccess(await authAPI.login(form.email, form.password))} />;
    else if (view === 'creator-forgot') screen = <ForgotPasswordScreen title="Creator Password Reset" subtitle="Request or apply a reset token" defaultEmail="sarahjohnson@plxyground.local" onRequestReset={(email) => authAPI.requestPasswordReset(email)} onResetPassword={(token, newPassword) => authAPI.resetPassword(token, newPassword)} onBack={() => setView('creator-login')} />;
    else if (view === 'business-signup') screen = <AuthForm title="Business Signup" subtitle="Create your business account" business hasAgree onTerms={() => setView('terms')} onPrivacy={() => setView('privacy')} onBack={() => setView('landing')} onSwitch={() => setView('business-login')} switchLabel="Business login" defaults={{ email: 'nike@plxyground.local', password: 'Password1!' }} onSubmit={async (form) => loginSuccess(await businessAuthAPI.signup(form.email, form.password, form.name, form.slug))} />;
    else if (view === 'business-login') screen = <AuthForm title="Business Login" subtitle="Sign in as business" business hasName={false} onTerms={() => setView('terms')} onPrivacy={() => setView('privacy')} onBack={() => setView('landing')} onSwitch={() => setView('business-signup')} switchLabel="Business signup" defaults={{ email: 'nike@plxyground.local', password: 'Password1!' }} onForgot={() => setView('business-forgot')} onSubmit={async (form) => loginSuccess(await businessAuthAPI.login(form.email, form.password))} />;
    else if (view === 'business-forgot') screen = <ForgotPasswordScreen title="Business Password Reset" subtitle="Request or apply a reset token" defaultEmail="nike@plxyground.local" onRequestReset={(email) => businessAuthAPI.requestPasswordReset(email)} onResetPassword={(token, newPassword) => businessAuthAPI.resetPassword(token, newPassword)} onBack={() => setView('business-login')} />;
    else screen = <Landing navigate={setView} />;
  } else if (view === 'business-home') {
    screen = <BusinessHome user={user} setView={setView} />;
  } else if (view === 'comms') {
    screen = <Communications user={user} setView={setView} />;
  } else if (typeof view === 'object' && view?.type === 'detail') {
    screen = <ContentDetail id={view.id} onBack={() => setView(homeView)} />;
  } else if (view === 'create') {
    screen = <PostForm title="Create Post" onBack={() => setView(homeView)} onSubmit={async (form) => { await contentAPI.create(form.content_type, form.title, form.body, form.media_url); setView(homeView); }} />;
  } else if (view === 'edit') {
    screen = <PostForm title="Edit Post" initial={editingContent || initialPost} onBack={() => setView(homeView)} onSubmit={async (form) => { await contentAPI.update(editingContent.id, form.content_type, form.title, form.body, form.media_url, form.is_published); setView(homeView); }} />;
  } else if (view === 'profile') {
    screen = <Profile user={user} onBack={() => setView(homeView)} />;
  } else if (view === 'discovery') {
    screen = <Discovery onBack={() => setView(homeView)} />;
  } else if (view === 'settings') {
    screen = <Settings onBack={() => setView(homeView)} onLogout={logout} onTerms={() => setView('terms')} onPrivacy={() => setView('privacy')} theme={theme} onToggleTheme={toggleTheme} />;
  } else {
    screen = <Feed user={user} setView={setView} setEditingContent={setEditingContent} />;
  }

  return (
    <>
      {screen}
      <button className="btn btn-secondary theme-toggle" onClick={toggleTheme}>
        {theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
      </button>
    </>
  );
}
