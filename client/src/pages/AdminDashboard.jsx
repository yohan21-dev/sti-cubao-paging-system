import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios.js';
import { useSocket } from '../hooks/useSocket.js';

// ─── Shared helpers ────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString();
}

function StatusBadge({ status }) {
  const map = { pending: 'badge-pending', resolved: 'badge-resolved', cancelled: 'badge-cancelled' };
  return <span className={map[status] || 'badge-pending'}>{status?.charAt(0).toUpperCase() + status?.slice(1)}</span>;
}

function Spinner() {
  return (
    <svg className="w-5 h-5 animate-spin text-sti-blue" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

function EmptyState({ icon, title, subtitle }) {
  return (
    <div className="text-center py-16 text-gray-400">
      <div className="text-5xl mb-3">{icon}</div>
      <p className="font-semibold text-gray-500">{title}</p>
      {subtitle && <p className="text-sm mt-1">{subtitle}</p>}
    </div>
  );
}

function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="card p-6 w-full max-w-sm animate-fade-in">
        <h3 className="font-bold text-gray-900 text-lg mb-2">Confirm Action</h3>
        <p className="text-gray-600 text-sm mb-5">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-outline flex-1">Cancel</button>
          <button onClick={onConfirm} className="btn-danger flex-1">Confirm</button>
        </div>
      </div>
    </div>
  );
}

// ─── Departments Tab ────────────────────────────────────────────────────────────

function DepartmentsTab() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(null);

  const fetchDepts = useCallback(async () => {
    try {
      const res = await api.get('/api/departments');
      setDepartments(res.data);
    } catch {
      setError('Failed to load departments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDepts(); }, [fetchDepts]);

  const resetForm = () => { setFormName(''); setFormDesc(''); setEditId(null); setError(''); };

  const startEdit = (dept) => {
    setEditId(dept.id);
    setFormName(dept.name);
    setFormDesc(dept.description || '');
    setError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formName.trim()) return;
    setSaving(true);
    setError('');
    try {
      if (editId) {
        const res = await api.put(`/api/departments/${editId}`, { name: formName.trim(), description: formDesc.trim() });
        setDepartments((prev) => prev.map((d) => (d.id === editId ? res.data : d)));
      } else {
        const res = await api.post('/api/departments', { name: formName.trim(), description: formDesc.trim() });
        setDepartments((prev) => [...prev, res.data]);
      }
      resetForm();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save department.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/departments/${id}`);
      setDepartments((prev) => prev.filter((d) => d.id !== id));
    } catch {
      setError('Failed to delete department.');
    } finally {
      setConfirm(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Form */}
      <div className="card p-5">
        <h3 className="font-bold text-gray-900 mb-4">{editId ? 'Edit Department' : 'Add Department'}</h3>
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} className="input-field" placeholder="e.g. Computer Studies" required disabled={saving} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} className="input-field resize-none" rows={3} placeholder="Optional description" disabled={saving} />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-2 pt-1">
            {editId && <button type="button" onClick={resetForm} className="btn-outline flex-1" disabled={saving}>Cancel</button>}
            <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2" disabled={saving}>
              {saving ? <><Spinner /> Saving...</> : editId ? 'Update' : 'Add Department'}
            </button>
          </div>
        </form>
      </div>

      {/* List */}
      <div className="lg:col-span-2 card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Departments ({departments.length})</h3>
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : departments.length === 0 ? (
          <EmptyState icon="🏢" title="No departments yet" subtitle="Add your first department using the form." />
        ) : (
          <ul className="divide-y divide-gray-100">
            {departments.map((dept) => (
              <li key={dept.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{dept.name}</p>
                  {dept.description && <p className="text-xs text-gray-500 mt-0.5">{dept.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => startEdit(dept)} className="text-xs font-medium text-sti-blue hover:underline px-2 py-1 rounded hover:bg-blue-50 transition-colors">Edit</button>
                  <button onClick={() => setConfirm({ id: dept.id, name: dept.name })} className="text-xs font-medium text-red-600 hover:underline px-2 py-1 rounded hover:bg-red-50 transition-colors">Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {confirm && (
        <ConfirmModal
          message={`Delete department "${confirm.name}"? This may affect teachers assigned to it.`}
          onConfirm={() => handleDelete(confirm.id)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

// ─── Teachers Tab ───────────────────────────────────────────────────────────────

function TeachersTab() {
  const [teachers, setTeachers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filterDept, setFilterDept] = useState('');
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ first_name: '', last_name: '', email: '', status: 'available', department_id: '' });
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAll = useCallback(async () => {
    try {
      const [tRes, dRes] = await Promise.all([api.get('/api/teachers'), api.get('/api/departments')]);
      setTeachers(tRes.data);
      setDepartments(dRes.data);
    } catch {
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const resetForm = () => { setFormData({ first_name: '', last_name: '', email: '', status: 'available', department_id: '' }); setEditId(null); setError(''); };

  const startEdit = (t) => {
    setEditId(t.id);
    setFormData({
      first_name: t.first_name || '',
      last_name: t.last_name || '',
      email: t.email || '',
      status: t.status || 'available',
      department_id: String(t.department_id || ''),
    });
    setError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.first_name.trim() || !formData.last_name.trim() || !formData.department_id) return;
    setSaving(true);
    setError('');
    const payload = {
      first_name: formData.first_name.trim(),
      last_name: formData.last_name.trim(),
      department_id: parseInt(formData.department_id, 10),
      email: formData.email.trim() || undefined,
      status: formData.status,
    };
    try {
      if (editId) {
        const res = await api.put(`/api/teachers/${editId}`, payload);
        setTeachers((prev) => prev.map((t) => (t.id === editId ? res.data : t)));
      } else {
        const res = await api.post('/api/teachers', payload);
        setTeachers((prev) => [...prev, res.data]);
      }
      resetForm();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Failed to save teacher.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/teachers/${id}`);
      setTeachers((prev) => prev.filter((t) => t.id !== id));
    } catch {
      setError('Failed to delete teacher.');
    } finally {
      setConfirm(null);
    }
  };

  const filtered = teachers.filter((t) => {
    const matchDept = !filterDept || String(t.department_id) === filterDept;
    const fullName = [t.first_name, t.last_name].filter(Boolean).join(' ').toLowerCase();
    const matchSearch = !searchQuery || fullName.includes(searchQuery.toLowerCase());
    return matchDept && matchSearch;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Form */}
      <div className="card p-5">
        <h3 className="font-bold text-gray-900 mb-4">{editId ? 'Edit Teacher' : 'Add Teacher'}</h3>
        <form onSubmit={handleSave} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
              <input type="text" value={formData.first_name} onChange={(e) => setFormData((p) => ({ ...p, first_name: e.target.value }))} className="input-field" placeholder="First" required disabled={saving} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
              <input type="text" value={formData.last_name} onChange={(e) => setFormData((p) => ({ ...p, last_name: e.target.value }))} className="input-field" placeholder="Last" required disabled={saving} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={formData.email} onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))} className="input-field" placeholder="teacher@sti.edu" disabled={saving} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
            <select value={formData.department_id} onChange={(e) => setFormData((p) => ({ ...p, department_id: e.target.value }))} className="input-field" required disabled={saving}>
              <option value="">Select department</option>
              {departments.map((d) => (
                <option key={d.id} value={String(d.id)}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select value={formData.status} onChange={(e) => setFormData((p) => ({ ...p, status: e.target.value }))} className="input-field" disabled={saving}>
              <option value="available">Available</option>
              <option value="unavailable">Unavailable</option>
            </select>
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-2 pt-1">
            {editId && <button type="button" onClick={resetForm} className="btn-outline flex-1" disabled={saving}>Cancel</button>}
            <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2" disabled={saving}>
              {saving ? <><Spinner /> Saving...</> : editId ? 'Update' : 'Add Teacher'}
            </button>
          </div>
        </form>
      </div>

      {/* List */}
      <div className="lg:col-span-2 card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap gap-3 items-center">
          <h3 className="font-bold text-gray-900 flex-1">Teachers ({filtered.length})</h3>
          <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-sti-blue">
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={String(d.id)}>{d.name}</option>
            ))}
          </select>
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search..." className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-sti-blue w-36" />
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="👨‍🏫" title="No teachers found" subtitle="Add teachers using the form." />
        ) : (
          <ul className="divide-y divide-gray-100 max-h-[520px] overflow-y-auto">
            {filtered.map((t) => {
              const fullName = [t.first_name, t.last_name].filter(Boolean).join(' ');
              const initials = ((t.first_name?.[0] || '') + (t.last_name?.[0] || '')).toUpperCase();
              return (
                <li key={t.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sti-blue to-sti-blue-light flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-xs">{initials || '?'}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{fullName}</p>
                      <p className="text-xs text-gray-500">
                        {t.status === 'unavailable' && <span className="text-amber-600 font-medium">Unavailable · </span>}
                        {t.department_name || '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => startEdit(t)} className="text-xs font-medium text-sti-blue hover:underline px-2 py-1 rounded hover:bg-blue-50 transition-colors">Edit</button>
                    <button onClick={() => setConfirm({ id: t.id, name: fullName })} className="text-xs font-medium text-red-600 hover:underline px-2 py-1 rounded hover:bg-red-50 transition-colors">Delete</button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {confirm && (
        <ConfirmModal
          message={`Remove teacher "${confirm.name}" from the system?`}
          onConfirm={() => handleDelete(confirm.id)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

// ─── Pages Tab ──────────────────────────────────────────────────────────────────

function PagesTab() {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [confirm, setConfirm] = useState(null);
  const socketRef = useSocket('admin');

  const fetchPages = useCallback(async () => {
    try {
      const url = filterStatus ? `/api/pages?status=${filterStatus}` : '/api/pages';
      const res = await api.get(url);
      setPages(res.data);
    } catch {
      setError('Failed to load pages.');
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { fetchPages(); }, [fetchPages]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.on('new_page', (page) => {
      setPages((prev) => {
        const exists = prev.some((p) => p.id === page.id);
        return exists ? prev : [page, ...prev];
      });
    });
    socket.on('page_resolved', (updated) => {
      setPages((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    });
    socket.on('page_deleted', (id) => {
      setPages((prev) => prev.filter((p) => p.id !== id));
    });
    return () => {
      socket.off('new_page');
      socket.off('page_resolved');
      socket.off('page_deleted');
    };
  }, [socketRef]);

  const handleResolve = async (id) => {
    try {
      const res = await api.patch(`/api/pages/${id}/resolve`);
      setPages((prev) => prev.map((p) => (p.id === id ? res.data : p)));
    } catch {
      setError('Failed to resolve page.');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/pages/${id}`);
      setPages((prev) => prev.filter((p) => p.id !== id));
    } catch {
      setError('Failed to delete page.');
    } finally {
      setConfirm(null);
    }
  };

  const filtered = filterStatus ? pages.filter((p) => p.status === filterStatus) : pages;

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap gap-3 items-center">
        <h3 className="font-bold text-gray-900 flex-1">Page Requests ({filtered.length})</h3>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-sti-blue">
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="resolved">Resolved</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button onClick={fetchPages} className="text-sm text-sti-blue hover:underline font-medium px-2 py-1">↻ Refresh</button>
      </div>
      {error && <p className="text-red-500 text-sm px-5 py-3">{error}</p>}
      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="📋" title="No page requests" subtitle="Requests from students will appear here." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-5 py-3">Teacher</th>
                <th className="px-5 py-3">Student</th>
                <th className="px-5 py-3">Message</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Time</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((page) => {
                const teacherName = [page.first_name, page.last_name].filter(Boolean).join(' ') || '—';
                return (
                <tr key={page.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-gray-900">{teacherName}</p>
                    <p className="text-xs text-gray-500">{page.department_name || ''}</p>
                  </td>
                  <td className="px-5 py-3.5 text-gray-600">{page.student_name || <span className="text-gray-400 italic">Anonymous</span>}</td>
                  <td className="px-5 py-3.5 text-gray-500 max-w-[180px] truncate">{page.message || '—'}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={page.status} /></td>
                  <td className="px-5 py-3.5 text-gray-400 whitespace-nowrap">{timeAgo(page.created_at)}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      {page.status === 'pending' && (
                        <button onClick={() => handleResolve(page.id)} className="text-xs font-medium text-green-700 hover:underline px-2 py-1 rounded hover:bg-green-50 transition-colors">Resolve</button>
                      )}
                      <button onClick={() => setConfirm({ id: page.id })} className="text-xs font-medium text-red-600 hover:underline px-2 py-1 rounded hover:bg-red-50 transition-colors">Delete</button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {confirm && (
        <ConfirmModal
          message="Delete this page request? This action cannot be undone."
          onConfirm={() => handleDelete(confirm.id)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────────────────────────

const TABS = [
  { id: 'departments', label: 'Departments', icon: '🏢' },
  { id: 'teachers', label: 'Teachers', icon: '👨‍🏫' },
  { id: 'pages', label: 'Page Requests', icon: '📋' },
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('departments');

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50">
      {/* Header */}
      <div className="bg-sti-blue text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-extrabold">Admin Dashboard</h1>
          <p className="text-blue-200 text-sm mt-0.5">Manage departments, faculty, and page requests</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab navigation */}
        <div className="flex gap-1 mb-6 bg-white rounded-xl shadow-sm border border-gray-100 p-1 w-fit">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
                activeTab === tab.id
                  ? 'bg-sti-blue text-white shadow-sm'
                  : 'text-gray-600 hover:text-sti-blue hover:bg-gray-50'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="animate-fade-in">
          {activeTab === 'departments' && <DepartmentsTab />}
          {activeTab === 'teachers' && <TeachersTab />}
          {activeTab === 'pages' && <PagesTab />}
        </div>
      </div>
    </div>
  );
}
