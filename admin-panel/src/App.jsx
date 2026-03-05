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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

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

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>🛡️ PLXYGROUND Admin</h1>
        <p>Management & Moderation Portal</p>

        {error && <div className="error-banner">{error}</div>}

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

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="panel">
      <h2>📋 Moderation Queue</h2>

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
        <button className="btn btn-secondary" onClick={fetchQueue}>
          🔄 Refresh
        </button>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelected(new Set(items.map(i => i.id)));
                  } else {
                    setSelected(new Set());
                  }
                }}
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
            <tr key={item.id}>
              <td>
                <input
                  type="checkbox"
                  checked={selected.has(item.id)}
                  onChange={(e) => {
                    const newSelected = new Set(selected);
                    if (e.target.checked) {
                      newSelected.add(item.id);
                    } else {
                      newSelected.delete(item.id);
                    }
                    setSelected(newSelected);
                  }}
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

  const handlePublish = async (id) => {
    try {
      await adminContentAPI.update(id, { is_published: true });
      setToast({ visible: true, message: 'Published', type: 'success' });
      await fetchContent();
    } catch (err) {
      setToast({ visible: true, message: 'Failed to publish', type: 'error' });
    }
  };

  const handleUnpublish = async (id) => {
    try {
      await adminContentAPI.update(id, { is_published: false });
      setToast({ visible: true, message: 'Unpublished', type: 'success' });
      await fetchContent();
    } catch (err) {
      setToast({ visible: true, message: 'Failed to unpublish', type: 'error' });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this content?')) return;
    try {
      await adminContentAPI.delete(id);
      setToast({ visible: true, message: 'Deleted', type: 'success' });
      await fetchContent();
    } catch (err) {
      setToast({ visible: true, message: 'Failed to delete', type: 'error' });
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

            <p className="content-body">{item.body}</p>

            {item.media_url && (
              <p className="content-media">
                <a href={item.media_url} target="_blank" rel="noopener noreferrer">
                  📷 View Media
                </a>
              </p>
            )}

            <div className="content-actions">
              {!item.is_published && (
                <button className="btn btn-sm btn-success" onClick={() => handlePublish(item.id)}>
                  ✓ Publish
                </button>
              )}
              {item.is_published && (
                <button className="btn btn-sm btn-warning" onClick={() => handleUnpublish(item.id)}>
                  ✕ Unpublish
                </button>
              )}
              <button className="btn btn-sm btn-error" onClick={() => handleDelete(item.id)}>
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
    </div>
  );
}

// ===== Users Panel =====
function UsersPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await adminUsersAPI.get('', 100);
      setUsers(response.data.data || []);
    } catch (err) {
      setToast({ visible: true, message: 'Failed to load users', type: 'error' });
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

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="panel">
      <h2>👥 User Management</h2>
      <button className="btn btn-secondary" onClick={fetchUsers}>🔄 Refresh</button>

      <table className="data-table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Name</th>
            <th>Role</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td>{user.email}</td>
              <td>{user.name}</td>
              <td>{user.role}</td>
              <td>
                <span className={`badge ${user.is_suspended ? 'badge-error' : 'badge-success'}`}>
                  {user.is_suspended ? 'Suspended' : 'Active'}
                </span>
              </td>
              <td>
                {user.is_suspended ? (
                  <button
                    className="btn btn-sm btn-success"
                    onClick={() => handleReactivate(user.creator_id)}
                  >
                    Reactivate
                  </button>
                ) : (
                  <button
                    className="btn btn-sm btn-error"
                    onClick={() => handleSuspend(user.creator_id, 'Admin suspension')}
                  >
                    Suspend
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {users.length === 0 && <p className="empty-state">No users</p>}

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast({ ...toast, visible: false })}
      />
    </div>
  );
}

// ===== Audit Log Panel =====
function AuditPanel() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="panel">
      <h2>📊 Audit Log</h2>

      <table className="data-table">
        <thead>
          <tr>
            <th>Action</th>
            <th>Actor</th>
            <th>Target</th>
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
              <td>{log.reason}</td>
              <td>{new Date(log.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {logs.length === 0 && <p className="empty-state">No audit logs</p>}
    </div>
  );
}

// ===== Analytics Panel =====
function AnalyticsPanel() {
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await adminAnalyticsAPI.get();
        setKpis(response.data.kpis);
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

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const response = await adminAlertsAPI.get();
        setAlerts(response.data.data || []);
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
