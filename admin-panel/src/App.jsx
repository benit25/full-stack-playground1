import React, { useState, useEffect } from 'react';
import {
  adminAuthAPI,
  adminQueueAPI,
  adminContentAPI,
  adminUsersAPI,
  adminAuditAPI,
  adminAnalyticsAPI,
  adminAlertsAPI
} from './api.js';
import './App.css';

const colors = {
  primary: '#2563eb',
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  bg: '#f8fafc',
  border: '#e2e8f0',
  text: '#1e293b'
};

// ===== Login Component =====
function LoginPage({ onLoginSuccess }) {
  const [email, setEmail] = useState('admin@plxyground.local');
  const [password, setPassword] = useState('Internet2026@');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await adminAuthAPI.login(email, password);
      const { token, user } = response.data;

      localStorage.setItem('admin_token', token);
      localStorage.setItem('admin_user', JSON.stringify(user));

      onLoginSuccess(user);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await adminAuthAPI.requestPasswordReset(email);
      const resetToken = response?.data?.resetToken;
      const expiry = response?.data?.resetTokenExpiresAt;
      if (resetToken) {
        setToken(resetToken);
        setSuccess(`Reset token generated. Expires at: ${new Date(expiry).toLocaleString()}`);
        setMode('reset');
      } else {
        setSuccess('If an account exists for that email, reset instructions have been sent.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Reset request failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    if (!token.trim()) {
      setLoading(false);
      setError('Reset token is required');
      return;
    }
    if (newPassword.length < 8) {
      setLoading(false);
      setError('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setLoading(false);
      setError('Passwords do not match');
      return;
    }
    try {
      await adminAuthAPI.resetPassword(token.trim(), newPassword);
      setSuccess('Password reset successful. You can now log in.');
      setMode('login');
      setPassword('');
      setToken('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.response?.data?.error || 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>🛡️ PLXYGROUND Admin</h1>
        <p>Management & Moderation Portal</p>

        {error && <div className="error-banner">{error}</div>}
        {success && <div className="badge badge-success" style={{ display: 'block', marginBottom: 16, padding: 10 }}>{success}</div>}

        {mode === 'login' && (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
              />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        )}

        {mode === 'forgot' && (
          <form onSubmit={handleRequestReset}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                disabled={loading}
              />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Please wait...' : 'Send reset instructions'}
            </button>
          </form>
        )}

        {mode === 'reset' && (
          <form onSubmit={handleResetPassword}>
            <div className="form-group">
              <label>Reset Token</label>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste reset token"
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label>Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
              />
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Please wait...' : 'Reset password'}
            </button>
          </form>
        )}

        <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {mode !== 'login' ? (
            <button className="btn btn-secondary" onClick={() => { setMode('login'); setError(''); setSuccess(''); }}>
              Back to login
            </button>
          ) : (
            <button className="btn btn-secondary" onClick={() => { setMode('forgot'); setError(''); setSuccess(''); }}>
              Forgot password?
            </button>
          )}
          {mode !== 'reset' && (
            <button className="btn btn-secondary" onClick={() => { setMode('reset'); setError(''); setSuccess(''); }}>
              I have a token
            </button>
          )}
        </div>

        <p className="help-text">Demo: admin@plxyground.local / Internet2026@</p>
      </div>
    </div>
  );
}

// ===== Toast Component =====
function Toast({ message, type, visible, onDismiss }) {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onDismiss, 3000);
      return () => clearTimeout(timer);
    }
  }, [visible, onDismiss]);

  if (!visible) return null;

  return (
    <div className={`toast toast-${type}`}>
      {message}
      <button onClick={onDismiss}>×</button>
    </div>
  );
}

function ConfirmModal({ visible, title, message, onConfirm, onCancel }) {
  if (!visible) return null;
  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header"><h3>{title}</h3></div>
        <div className="modal-body"><p>{message}</p></div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn btn-error" onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

function encodeBody(input) {
  const text = String(input || '');
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

// ===== Navigation =====
function Navigation({ currentPage, onNavigate, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>🛡️ PLXYGROUND</h2>
      </div>

      <nav className="sidebar-nav">
        <button
          className={`nav-item ${currentPage === 'queue' ? 'active' : ''}`}
          onClick={() => onNavigate('queue')}
        >
          📋 Queue
        </button>

        <button
          className={`nav-item ${currentPage === 'content' ? 'active' : ''}`}
          onClick={() => onNavigate('content')}
        >
          📝 Content
        </button>

        <button
          className={`nav-item ${currentPage === 'users' ? 'active' : ''}`}
          onClick={() => onNavigate('users')}
        >
          👥 Users
        </button>

        <button
          className={`nav-item ${currentPage === 'audit' ? 'active' : ''}`}
          onClick={() => onNavigate('audit')}
        >
          📊 Audit Log
        </button>

        <button
          className={`nav-item ${currentPage === 'analytics' ? 'active' : ''}`}
          onClick={() => onNavigate('analytics')}
        >
          📈 Analytics
        </button>

        <button
          className={`nav-item ${currentPage === 'alerts' ? 'active' : ''}`}
          onClick={() => onNavigate('alerts')}
        >
          🔔 Live Alerts
        </button>

        <button
          className={`nav-item ${currentPage === 'security' ? 'active' : ''}`}
          onClick={() => onNavigate('security')}
        >
          🔐 Admin Security
        </button>

        <hr />

        <button className="nav-item logout" onClick={onLogout}>
          🚪 Sign Out
        </button>
      </nav>
    </aside>
  );
}

// ===== Queue Panel =====
function QueuePanel() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });

  useEffect(() => {
    fetchQueue();
  }, []);

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const response = await adminQueueAPI.get('pending');
      setItems(response.data.data || []);
    } catch (err) {
      setToast({ visible: true, message: 'Failed to load queue', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action) => {
    if (selected.size === 0) {
      setToast({ visible: true, message: 'Select items first', type: 'warning' });
      return;
    }

    try {
      await adminQueueAPI.bulkAction(Array.from(selected), action);
      setToast({ visible: true, message: `Bulk ${action} completed`, type: 'success' });
      setSelected(new Set());
      await fetchQueue();
    } catch (err) {
      setToast({ visible: true, message: `Failed to ${action}`, type: 'error' });
    }
  };

  const toggleItemSelection = (itemId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const toggleAllSelection = (checked) => {
    setSelected(checked ? new Set(items.map((item) => item.id)) : new Set());
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="panel">
      <h2>📋 Moderation Queue</h2>

      <p style={{ color: '#64748b', marginBottom: 12 }}>
        Click any row or its checkbox to select queue items for bulk moderation.
      </p>

      <div className="panel-actions">
        <button className="btn btn-success" onClick={() => handleAction('approve')}>
          ✓ Approve Selected
        </button>
        <button className="btn btn-error" onClick={() => handleAction('reject')}>
          ✗ Reject Selected
        </button>
        <button className="btn btn-warning" onClick={() => handleAction('delete')}>
          🗑️ Delete Selected
        </button>
        <button className="btn btn-secondary" onClick={() => handleAction('assign')}>
          👤 Assign Selected
        </button>
        <button className="btn btn-secondary" onClick={fetchQueue}>
          🔄 Refresh
        </button>
        <span className="badge">Selected: {selected.size}</span>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                checked={items.length > 0 && selected.size === items.length}
                onChange={(e) => toggleAllSelection(e.target.checked)}
              />
            </th>
            <th>Type</th>
            <th>Title</th>
            <th>Submitted By</th>
            <th>Status</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr
              key={item.id}
              className={selected.has(item.id) ? 'is-selected selectable-row' : 'selectable-row'}
              onClick={() => toggleItemSelection(item.id)}
            >
              <td>
                <input
                  type="checkbox"
                  checked={selected.has(item.id)}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => toggleItemSelection(item.id)}
                />
              </td>
              <td>{item.type}</td>
              <td>{item.title_or_name}</td>
              <td>{item.submitted_by}</td>
              <td><span className={`badge badge-${item.status}`}>{item.status}</span></td>
              <td>{new Date(item.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {items.length === 0 && <p className="empty-state">No pending items</p>}

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast({ ...toast, visible: false })}
      />
    </div>
  );
}

// ===== Content Management Panel =====
function ContentPanel() {
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });
  const [confirmState, setConfirmState] = useState({ visible: false, id: null });
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', body: '', media_url: '', content_type: 'article', is_published: false });

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      setLoading(true);
      const response = await adminContentAPI.get(2000);
      setContent(response.data.data || []);
    } catch (err) {
      setToast({ visible: true, message: 'Failed to load content', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (item) => {
    try {
      await adminContentAPI.update(item.id, {
        is_published: true,
        title: item.title,
        body: item.body,
        media_url: item.media_url,
        content_type: item.content_type
      });
      setToast({ visible: true, message: 'Published', type: 'success' });
      await fetchContent();
    } catch (err) {
      setToast({ visible: true, message: 'Failed to publish', type: 'error' });
    }
  };

  const handleUnpublish = async (item) => {
    try {
      await adminContentAPI.update(item.id, {
        is_published: false,
        title: item.title,
        body: item.body,
        media_url: item.media_url,
        content_type: item.content_type
      });
      setToast({ visible: true, message: 'Unpublished', type: 'success' });
      await fetchContent();
    } catch (err) {
      setToast({ visible: true, message: 'Failed to unpublish', type: 'error' });
    }
  };

  const handleDelete = async (id) => {
    try {
      await adminContentAPI.delete(id);
      setToast({ visible: true, message: 'Deleted', type: 'success' });
      await fetchContent();
    } catch (err) {
      setToast({ visible: true, message: 'Failed to delete', type: 'error' });
    }
  };

  const openEdit = (item) => {
    setEditing(item.id);
    setEditForm({
      title: item.title || '',
      body: item.body || '',
      media_url: item.media_url || '',
      content_type: item.content_type || 'article',
      is_published: !!item.is_published
    });
  };

  const submitEdit = async () => {
    if (!editForm.media_url.trim()) {
      setToast({ visible: true, message: 'Media URL is required', type: 'error' });
      return;
    }
    try {
      await adminContentAPI.update(editing, editForm);
      setToast({ visible: true, message: 'Content updated', type: 'success' });
      setEditing(null);
      await fetchContent();
    } catch (err) {
      setToast({ visible: true, message: err.response?.data?.error || 'Failed to update content', type: 'error' });
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="panel">
      <h2>📝 Content Management</h2>
      <button className="btn btn-secondary" onClick={fetchContent}>🔄 Refresh</button>

      <div className="content-list">
        {content.map(item => (
          <div className="content-item" key={item.id}>
            <div className="content-header">
              <h3>{item.title}</h3>
              <div className="badges">
                <span className={`badge ${item.is_published ? 'badge-success' : 'badge-warning'}`}>
                  {item.is_published ? 'Published' : 'Draft'}
                </span>
              </div>
            </div>

            <p className="content-meta">
              Creator: <strong>{item.creator_name}</strong> | Type: {item.content_type}
            </p>

            <pre className="content-body">{encodeBody(item.body)}</pre>

            {item.media_url && (
              <p className="content-media">
                <a href={item.media_url} target="_blank" rel="noopener noreferrer">
                  📷 View Media
                </a>
              </p>
            )}

            <div className="content-actions">
              {!item.is_published && (
                <button className="btn btn-sm btn-success" onClick={() => handlePublish(item)}>
                  ✓ Publish
                </button>
              )}
              {item.is_published && (
                <button className="btn btn-sm btn-warning" onClick={() => handleUnpublish(item)}>
                  ✕ Unpublish
                </button>
              )}
              <button className="btn btn-sm btn-secondary" onClick={() => openEdit(item)}>
                ✏️ Edit
              </button>
              <button className="btn btn-sm btn-error" onClick={() => setConfirmState({ visible: true, id: item.id })}>
                🗑️ Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {content.length === 0 && <p className="empty-state">No content</p>}

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast({ ...toast, visible: false })}
      />
      <ConfirmModal
        visible={confirmState.visible}
        title="Delete Content"
        message="Delete this content item permanently?"
        onCancel={() => setConfirmState({ visible: false, id: null })}
        onConfirm={async () => {
          const id = confirmState.id;
          setConfirmState({ visible: false, id: null });
          if (id) await handleDelete(id);
        }}
      />
      {editing && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header"><h3>Edit Content</h3></div>
            <div className="modal-body">
              <div className="form-group">
                <label>Title</label>
                <input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Body</label>
                <textarea value={editForm.body} onChange={(e) => setEditForm({ ...editForm, body: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Media (Required)</label>
                <div style={{ marginBottom: 12 }}>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          setEditForm({ ...editForm, media_url: event.target?.result });
                        };
                        reader.readAsDataURL(file);
                      }
                    }} 
                  />
                </div>
                {editForm.media_url && (
                  <div style={{ marginBottom: 12 }}>
                    <img src={editForm.media_url} alt="Preview" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 4 }} />
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>Content Type</label>
                <select value={editForm.content_type} onChange={(e) => setEditForm({ ...editForm, content_type: e.target.value })}>
                  <option value="article">article</option>
                  <option value="video_embed">video_embed</option>
                  <option value="image_story">image_story</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={submitEdit}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Users Panel =====
function UsersPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });
  const [passwordModal, setPasswordModal] = useState({ open: false, userId: '', password: '' });
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ limit: 100, offset: 0, total: 0 });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async (options = {}) => {
    try {
      setLoading(true);
      setError('');
      const nextSearch = options.search ?? search;
      const nextLimit = options.limit ?? pagination.limit;
      const nextOffset = options.offset ?? pagination.offset;
      const response = await adminUsersAPI.get(nextSearch, nextLimit, nextOffset);
      setUsers(response.data.data || []);
      setPagination(response.data.pagination || { limit: nextLimit, offset: nextOffset, total: 0 });
    } catch (err) {
      const message = err.response?.data?.error || err.message || 'Failed to load users';
      setError(message);
      setToast({ visible: true, message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async (userId, reason) => {
    try {
      await adminUsersAPI.suspend(userId, reason);
      setToast({ visible: true, message: 'User suspended', type: 'success' });
      await fetchUsers();
    } catch (err) {
      setToast({ visible: true, message: 'Failed to suspend', type: 'error' });
    }
  };

  const handleReactivate = async (userId) => {
    try {
      await adminUsersAPI.reactivate(userId);
      setToast({ visible: true, message: 'User reactivated', type: 'success' });
      await fetchUsers();
    } catch (err) {
      setToast({ visible: true, message: 'Failed to reactivate', type: 'error' });
    }
  };

  const handleRoleChange = async (userId, role) => {
    try {
      await adminUsersAPI.setRole(userId, role);
      setToast({ visible: true, message: `Role set to ${role}`, type: 'success' });
      await fetchUsers();
    } catch (err) {
      setToast({ visible: true, message: err.response?.data?.error || 'Failed to change role', type: 'error' });
    }
  };

  const handleVerifyToggle = async (userId) => {
    try {
      await adminUsersAPI.verify(userId);
      setToast({ visible: true, message: 'Email verified', type: 'success' });
      await fetchUsers();
    } catch (err) {
      setToast({ visible: true, message: 'Failed to verify', type: 'error' });
    }
  };

  const handleResetPassword = async () => {
    if (!passwordModal.password || passwordModal.password.length < 8) {
      setToast({ visible: true, message: 'Password must be at least 8 characters', type: 'error' });
      return;
    }
    try {
      await adminUsersAPI.resetPassword(passwordModal.userId, passwordModal.password);
      setToast({ visible: true, message: 'Password reset', type: 'success' });
      setPasswordModal({ open: false, userId: '', password: '' });
    } catch (err) {
      setToast({ visible: true, message: 'Reset failed', type: 'error' });
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  const formatMaybeDate = (value) => {
    if (!value) return '-';
    const d = new Date(value);
    // If the value is a non-ISO timestamp, Date parsing may fail. Fall back to raw.
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString();
  };

  const creatorCount = users.filter((u) => u.role === 'CREATOR').length;
  const businessCount = users.filter((u) => u.role === 'BUSINESS').length;
  const suspendedCount = users.filter((u) => !!u.is_suspended).length;
  const verifiedCount = users.filter((u) => !!u.is_approved).length;
  const activeProfileCount = users.filter((u) => !!u.is_active).length;

  const statCards = [
    { label: 'Total Users', value: pagination.total || users.length, tone: 'default' },
    { label: 'Creators', value: creatorCount, tone: 'default' },
    { label: 'Businesses', value: businessCount, tone: 'default' },
    { label: 'Verified', value: verifiedCount, tone: 'success' },
    { label: 'Active Profiles', value: activeProfileCount, tone: 'success' },
    { label: 'Suspended', value: suspendedCount, tone: 'warning' }
  ];

  const renderUserIdentity = (user) => (
    <div className="user-cell">
      <div className="user-avatar">
        {(user.name || user.email || '?').trim().charAt(0).toUpperCase()}
      </div>
      <div>
        <div className="user-primary">{user.name || 'Unnamed user'}</div>
        <div className="user-secondary">{user.email}</div>
        <div className="user-meta-row">
          <span>{user.profile_slug ? `@${user.profile_slug}` : 'No slug'}</span>
          <span>{user.location || 'No location'}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="panel">
      <h2>👥 User Management</h2>
      <p style={{ color: '#64748b', marginBottom: 12 }}>
        View creator/business accounts, verify email, suspend/reactivate, change role, and reset passwords.
      </p>

      <div className="stats-grid" style={{ marginBottom: 18 }}>
        {statCards.map((stat) => (
          <div key={stat.label} className={`stat-card ${stat.tone}`}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </div>
        ))}
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="panel-actions">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email, name, slug, or location..."
            style={{ width: 280, marginBottom: 0 }}
          />
          <button className="btn btn-secondary" onClick={() => fetchUsers({ offset: 0, search })}>Search</button>
          <button className="btn btn-secondary" onClick={() => { setSearch(''); fetchUsers({ offset: 0, search: '' }); }}>Clear</button>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="badge">Total: {pagination.total || users.length}</span>
          <button className="btn btn-secondary" onClick={() => fetchUsers()}>🔄 Refresh</button>
        </div>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Role</th>
            <th>Account</th>
            <th>Content</th>
            <th>Dates</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td>
                {renderUserIdentity(user)}
              </td>
              <td>
                <div className="user-meta-stack">
                  <span className="badge">{user.role}</span>
                  <span className={`badge ${user.is_active ? 'badge-success' : 'badge-warning'}`}>
                    {user.is_active ? 'Profile Active' : 'Profile Inactive'}
                  </span>
                </div>
              </td>
              <td>
                <div className="user-meta-stack">
                  <span className={`badge ${user.is_approved ? 'badge-success' : 'badge-warning'}`}>
                    {user.is_approved ? 'Verified' : 'Unverified'}
                  </span>
                  <span className={`badge ${user.is_suspended ? 'badge-error' : 'badge-success'}`}>
                    {user.is_suspended ? 'Suspended' : 'Active'}
                  </span>
                </div>
              </td>
              <td>
                <div className="user-meta-stack">
                  <span>{user.content_count || 0} posts</span>
                  <span className="user-secondary">
                    {user.last_content_at ? `Latest: ${formatMaybeDate(user.last_content_at)}` : 'No content yet'}
                  </span>
                </div>
              </td>
              <td>
                <div className="user-meta-stack">
                  <span>Joined: {formatMaybeDate(user.created_at)}</span>
                  <span className="user-secondary">Updated: {formatMaybeDate(user.updated_at)}</span>
                </div>
              </td>
              <td>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {/*
                    Admin user-management endpoints expect :userId to be creator_id (not account id).
                    We keep this resilient in case shape changes.
                  */}
                  {(() => {
                    const userId = user.creator_id || user.id;
                    return user.is_suspended ? (
                      <button className="btn btn-sm btn-success" onClick={() => handleReactivate(userId)}>Reactivate</button>
                    ) : (
                      <button className="btn btn-sm btn-error" onClick={() => handleSuspend(userId, 'Admin suspension')}>Suspend</button>
                    );
                  })()}
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => handleRoleChange(user.creator_id || user.id, user.role === 'CREATOR' ? 'BUSINESS' : 'CREATOR')}
                  >
                    Role: {user.role === 'CREATOR' ? 'Set Business' : 'Set Creator'}
                  </button>
                  <button className="btn btn-sm btn-secondary" onClick={() => handleVerifyToggle(user.creator_id || user.id)}>
                    {user.is_approved ? 'Verified' : 'Verify'}
                  </button>
                  <button className="btn btn-sm btn-warning" onClick={() => setPasswordModal({ open: true, userId: user.creator_id || user.id, password: '' })}>Reset Password</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {users.length === 0 && (
        <div className="empty-state">
          <p>No users found yet.</p>
          <p style={{ marginTop: 6, color: '#64748b' }}>
            This page now shows live account details, verification state, profile status, and content counts.
            <br />
            To populate it, either create accounts via the main app signup, or seed demo data:
            <br />
            <code>cd backend &amp;&amp; npm run seed</code>
          </p>
        </div>
      )}

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast({ ...toast, visible: false })}
      />
      <Modal
        open={passwordModal.open}
        title="Reset User Password"
        onCancel={() => setPasswordModal({ open: false, userId: '', password: '' })}
        onConfirm={handleResetPassword}
        confirmText="Reset"
      >
        <input
          type="password"
          value={passwordModal.password}
          onChange={(e) => setPasswordModal({ ...passwordModal, password: e.target.value })}
          placeholder="New password"
        />
      </Modal>
    </div>
  );
}

// ===== Audit Log Panel =====
function AuditPanel() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });

  useEffect(() => {
    const fetchAudit = async () => {
      try {
        const response = await adminAuditAPI.get(100);
        setLogs(response.data.data || []);
      } catch (err) {
        console.error('Failed to load audit logs', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAudit();
  }, []);

  const exportAudit = async () => {
    try {
      const response = await adminAuditAPI.export();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'audit-export.csv';
      a.click();
      window.URL.revokeObjectURL(url);
      setToast({ visible: true, message: 'Export complete', type: 'success' });
    } catch (err) {
      setToast({ visible: true, message: 'Export failed', type: 'error' });
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="panel">
      <h2>📊 Audit Log</h2>
      <button className="btn btn-secondary" onClick={exportAudit}>Export CSV</button>

      <table className="data-table">
        <thead>
          <tr>
            <th>Action</th>
            <th>Actor</th>
            <th>Target</th>
            <th>Before</th>
            <th>After</th>
            <th>Reason</th>
            <th>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(log => (
            <tr key={log.id}>
              <td>{log.action_type}</td>
              <td>{log.actor}</td>
              <td>{log.target}</td>
              <td><pre style={{ maxWidth: 240, whiteSpace: 'pre-wrap' }}>{log.before_snapshot ? JSON.stringify(log.before_snapshot, null, 2) : '-'}</pre></td>
              <td><pre style={{ maxWidth: 240, whiteSpace: 'pre-wrap' }}>{log.after_snapshot ? JSON.stringify(log.after_snapshot, null, 2) : '-'}</pre></td>
              <td>{log.reason}</td>
              <td>{new Date(log.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {logs.length === 0 && <p className="empty-state">No audit logs</p>}
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onDismiss={() => setToast({ ...toast, visible: false })} />
    </div>
  );
}

// ===== Analytics Panel =====
function AnalyticsPanel() {
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMockData, setIsMockData] = useState(false);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await adminAnalyticsAPI.get();
        setKpis(response.data.kpis);
        setIsMockData(!!response.data.isMockData);
      } catch (err) {
        console.error('Failed to load analytics', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="panel">
      <h2>📈 Analytics Dashboard</h2>
      {isMockData && <p className="badge badge-warning">Mock Analytics Data</p>}

      {kpis && (
        <div className="kpi-grid">
          <div className="kpi-card">
            <h3>{kpis.totalCreators}</h3>
            <p>Total Creators</p>
          </div>
          <div className="kpi-card">
            <h3>{kpis.totalBusinesses}</h3>
            <p>Businesses</p>
          </div>
          <div className="kpi-card">
            <h3>{kpis.totalContent}</h3>
            <p>Total Content</p>
          </div>
          <div className="kpi-card">
            <h3>{kpis.publishedContent}</h3>
            <p>Published</p>
          </div>
          <div className="kpi-card">
            <h3>{kpis.pendingContent}</h3>
            <p>Pending</p>
          </div>
          <div className="kpi-card">
            <h3>{kpis.last7DaysContent}</h3>
            <p>Last 7 Days</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Live Alerts Panel =====
function AlertsPanel() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMockData, setIsMockData] = useState(false);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const response = await adminAlertsAPI.get();
        setAlerts(response.data.data || []);
        setIsMockData(!!response.data.isMockData);
      } catch (err) {
        console.error('Failed to load alerts', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
    // Auto-refresh every 30s
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="panel">
      <h2>🔔 Live Alerts</h2>
      {isMockData && <p className="badge badge-warning">Mock Live Alerts</p>}

      <div className="alerts-list">
        {alerts.map((alert, idx) => (
          <div className="alert-item" key={idx}>
            <span className="alert-type">
              {alert.type === 'new_content' ? '📝' : '👤'}
            </span>
            <div className="alert-content">
              <p>{alert.type === 'new_content' ? '📝 New Post' : '👤 New User'}</p>
              <p className="alert-detail">{alert.title_or_name}</p>
              <p className="alert-time">{new Date(alert.created_at).toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>

      {alerts.length === 0 && <p className="empty-state">No alerts</p>}
    </div>
  );
}

// ===== Security Panel =====
function SecurityPanel() {
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setToast({ visible: true, message: 'Password change not yet implemented', type: 'warning' });
  };

  return (
    <div className="panel">
      <h2>🔐 Admin Security</h2>

      <div className="form-section">
        <h3>Change Password</h3>
        <form onSubmit={handlePasswordChange}>
          <div className="form-group">
            <label>Current Password</label>
            <input type="password" placeholder="••••••••" />
          </div>

          <div className="form-group">
            <label>New Password</label>
            <input type="password" placeholder="••••••••" />
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <input type="password" placeholder="••••••••" />
          </div>

          <button type="submit" className="btn btn-primary">
            Update Password
          </button>
        </form>
      </div>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast({ ...toast, visible: false })}
      />
    </div>
  );
}

// ===== Admin App Component =====
export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentPage, setCurrentPage] = useState('queue');
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    const userData = localStorage.getItem('admin_user');
    if (token && userData) {
      setIsLoggedIn(true);
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setIsLoggedIn(false);
    setUser(null);
    setCurrentPage('queue');
  };

  if (!isLoggedIn) {
    return <LoginPage onLoginSuccess={(user) => {
      setIsLoggedIn(true);
      setUser(user);
    }} />;
  }

  const pages = {
    queue: <QueuePanel />,
    content: <ContentPanel />,
    users: <UsersPanel />,
    audit: <AuditPanel />,
    analytics: <AnalyticsPanel />,
    alerts: <AlertsPanel />,
    security: <SecurityPanel />
  };

  return (
    <div className="admin-app">
      <Navigation
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        onLogout={handleLogout}
      />

      <main className="main-content">
        <div className="topbar">
          <h1>{currentPage === 'queue' ? '📋 Queue' : currentPage === 'content' ? '📝 Content' : currentPage === 'users' ? '👥 Users' : currentPage === 'audit' ? '📊 Audit' : currentPage === 'analytics' ? '📈 Analytics' : currentPage === 'alerts' ? '🔔 Alerts' : '🔐 Security'}</h1>
          <div className="user-info">Logged in as <strong>{user?.email}</strong></div>
        </div>

        {pages[currentPage]}
      </main>
    </div>
  );
}
