import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../components/AuthContext.jsx';
import { useToast } from '../components/useToast.jsx';
import FacultyAvatar from '../components/FacultyAvatar.jsx';
import STILogo from '../components/STILogo.jsx';

const TABS = [
  { key:'dashboard',   label:'📊 Dashboard' },
  { key:'faculty',     label:'👨‍🏫 Faculty' },
  { key:'departments', label:'🏫 Departments' },
  { key:'logs',        label:'📋 Logs' },
  { key:'settings',    label:'⚙️ Settings' },
  { key:'users',       label:'👥 Admin Users' },
];

// ── Confirm Dialog ─────────────────────────────────────────────
function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ maxWidth:360 }}>
        <p style={{ fontSize:'1rem', color:'var(--gray-700)', marginBottom:24 }}>{message}</p>
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button className="btn btn-secondary btn-sm" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger btn-sm" onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

// ── Faculty Modal ──────────────────────────────────────────────
function FacultyModal({ faculty, departments, onSave, onClose, token }) {
  const isEdit = !!faculty;
  const [form, setForm]   = useState({
    department_id: faculty?.department_id || (departments[0]?.id || ''),
    name:          faculty?.name          || '',
    designation:   faculty?.designation   || '',
    available:     faculty?.available     ?? 1,
  });
  const [photo, setPhoto]   = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const fileRef = useRef();

  async function handleSave() {
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true); setError('');
    try {
      const fd = new FormData();
      fd.append('department_id', form.department_id);
      fd.append('name',          form.name.trim());
      fd.append('designation',   form.designation.trim());
      fd.append('available',     form.available);
      if (photo) fd.append('photo', photo);

      if (isEdit) await api.updateFaculty(faculty.id, fd, token);
      else        await api.createFaculty(fd, token);
      onSave();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2 className="modal-title">{isEdit ? 'Edit Faculty' : 'Add Faculty'}</h2>
        {error && <div style={{ background:'var(--red-light)', color:'var(--red)', borderRadius:8, padding:'8px 12px', fontSize:'.85rem', marginBottom:16 }}>{error}</div>}

        <div className="form-group">
          <label className="form-label">Department *</label>
          <select className="form-select" value={form.department_id}
            onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Full Name *</label>
          <input className="form-input" placeholder="e.g. Dr. Maria Santos" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
        </div>
        <div className="form-group">
          <label className="form-label">Designation</label>
          <input className="form-input" placeholder="e.g. Professor, Instructor, Dean" value={form.designation}
            onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Availability</label>
          <select className="form-select" value={form.available}
            onChange={e => setForm(f => ({ ...f, available: parseInt(e.target.value) }))}>
            <option value={1}>Available</option>
            <option value={0}>Not Available</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Photo <span style={{ color:'var(--gray-400)' }}>(optional, max 5MB)</span></label>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            {(photo || faculty?.photo) && (
              <FacultyAvatar photo={photo ? URL.createObjectURL(photo) : faculty?.photo} name={form.name} size={48} />
            )}
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileRef.current.click()}>
              {photo ? 'Change Photo' : 'Upload Photo'}
            </button>
            {photo && <span style={{ fontSize:'.8rem', color:'var(--gray-500)' }}>{photo.name}</span>}
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }}
            onChange={e => setPhoto(e.target.files[0] || null)} />
        </div>

        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:8 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Department Modal ───────────────────────────────────────────
function DeptModal({ dept, onSave, onClose, token }) {
  const [name, setName]     = useState(dept?.name || '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (dept) await api.updateDepartment(dept.id, { name: name.trim(), active: dept.active }, token);
      else      await api.createDepartment({ name: name.trim() }, token);
      onSave();
    } catch { setSaving(false); }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth:360 }}>
        <h2 className="modal-title">{dept ? 'Edit Department' : 'Add Department'}</h2>
        <div className="form-group">
          <label className="form-label">Name *</label>
          <input className="form-input" value={name} onChange={e => setName(e.target.value)} autoFocus
            onKeyDown={e => e.key === 'Enter' && handleSave()} />
        </div>
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── User Modal ────────────────────────────────────────────────
function UserModal({ user, onSave, onClose, token }) {
  const isEdit = !!user;
  const [form, setForm]   = useState({ username:'', full_name:'', password:'', confirm:'' });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  async function handleSave() {
    setError('');
    if (!isEdit && (!form.username || !form.password)) { setError('Username and password required'); return; }
    if (form.password && form.password !== form.confirm) { setError('Passwords do not match'); return; }
    setSaving(true);
    try {
      if (isEdit) {
        if (form.password) await api.updateAdminPassword(user.id, { password: form.password }, token);
      } else {
        await api.createAdminUser({ username:form.username, password:form.password, full_name:form.full_name }, token);
      }
      onSave();
    } catch (err) { setError(err.message); setSaving(false); }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2 className="modal-title">{isEdit ? `Change Password — ${user.username}` : 'Add Admin User'}</h2>
        {error && <div style={{ background:'var(--red-light)', color:'var(--red)', borderRadius:8, padding:'8px 12px', fontSize:'.85rem', marginBottom:16 }}>{error}</div>}

        {!isEdit && <>
          <div className="form-group">
            <label className="form-label">Username *</label>
            <input className="form-input" value={form.username} autoFocus
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-input" value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
          </div>
        </>}
        <div className="form-group">
          <label className="form-label">{isEdit ? 'New Password *' : 'Password *'}</label>
          <input className="form-input" type="password" value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Confirm Password *</label>
          <input className="form-input" type="password" value={form.confirm}
            onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} />
        </div>

        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Dashboard Tab ──────────────────────────────────────────────
function DashboardTab({ token }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.getStats(token).then(setStats).catch(() => {});
    const t = setInterval(() => api.getStats(token).then(setStats).catch(() => {}), 15000);
    return () => clearInterval(t);
  }, [token]);

  const cards = stats ? [
    { label:'Pages Today',    value: stats.total,     color:'var(--sti-green)',  icon:'📣' },
    { label:'Completed',      value: stats.done,      color:'var(--blue)',       icon:'✅' },
    { label:'Cancelled',      value: stats.cancelled, color:'var(--red)',        icon:'❌' },
    { label:'Currently Active', value: stats.waiting, color:'var(--amber)',      icon:'⏳' },
  ] : [];

  return (
    <div>
      <h2 style={{ fontSize:'1.25rem', fontWeight:800, marginBottom:20 }}>Today's Overview</h2>
      {!stats ? (
        <div style={{ padding:40, textAlign:'center' }}><div className="spinner" /></div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:16, marginBottom:32 }}>
          {cards.map(c => (
            <div key={c.label} style={{ background:'#fff', borderRadius:12, padding:20, border:'1px solid var(--gray-200)' }}>
              <div style={{ fontSize:28, marginBottom:8 }}>{c.icon}</div>
              <div style={{ fontSize:'2rem', fontWeight:800, color:c.color }}>{c.value}</div>
              <div style={{ fontSize:'.85rem', color:'var(--gray-500)', marginTop:2 }}>{c.label}</div>
            </div>
          ))}
        </div>
      )}
      <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
        <a href="/outside" target="_blank" className="btn btn-secondary">🖥️ Open Student Kiosk</a>
        <a href="/faculty" target="_blank" className="btn btn-secondary">📺 Open Faculty Display</a>
      </div>
    </div>
  );
}

// ── Faculty Tab ────────────────────────────────────────────────
function FacultyTab({ token }) {
  const [faculty, setFaculty]       = useState([]);
  const [departments, setDepts]     = useState([]);
  const [modal, setModal]           = useState(null); // null | 'add' | faculty obj
  const [confirm, setConfirm]       = useState(null);
  const [filterDept, setFilterDept] = useState('all');
  const [search, setSearch]         = useState('');
  const { show, ToastContainer }    = useToast();

  const load = () => {
    api.getAllFaculty(token).then(setFaculty).catch(() => {});
    api.getAllDepartments(token).then(setDepts).catch(() => {});
  };
  useEffect(load, [token]); // eslint-disable-line

  async function handleDelete(f) {
    try {
      await api.deleteFaculty(f.id, token);
      show('Faculty deleted', 'success');
      load();
    } catch (err) { show(err.message, 'error'); }
    setConfirm(null);
  }

  const filtered = faculty
    .filter(f => filterDept === 'all' || f.department_id === parseInt(filterDept))
    .filter(f => f.name.toLowerCase().includes(search.toLowerCase()) ||
                 (f.designation||'').toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <ToastContainer />
      {modal && (
        <FacultyModal
          faculty={modal === 'add' ? null : modal}
          departments={departments}
          token={token}
          onSave={() => { setModal(null); load(); show('Saved successfully', 'success'); }}
          onClose={() => setModal(null)}
        />
      )}
      {confirm && (
        <ConfirmModal message={`Delete ${confirm.name}? This cannot be undone.`}
          onConfirm={() => handleDelete(confirm)} onCancel={() => setConfirm(null)} />
      )}

      <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap', alignItems:'center' }}>
        <h2 style={{ fontSize:'1.25rem', fontWeight:800, flex:1 }}>Faculty Members</h2>
        <input className="form-input" placeholder="🔍 Search…" value={search}
          onChange={e => setSearch(e.target.value)} style={{ width:180 }} />
        <select className="form-select" value={filterDept} onChange={e => setFilterDept(e.target.value)} style={{ width:200 }}>
          <option value="all">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <button className="btn btn-primary btn-sm" onClick={() => setModal('add')}>+ Add Faculty</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Photo</th><th>Name</th><th>Department</th><th>Designation</th>
              <th>Status</th><th style={{ textAlign:'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign:'center', color:'var(--gray-400)', padding:24 }}>No faculty found</td></tr>
            )}
            {filtered.map(f => (
              <tr key={f.id}>
                <td><FacultyAvatar photo={f.photo} name={f.name} size={40} /></td>
                <td style={{ fontWeight:600 }}>{f.name}</td>
                <td style={{ color:'var(--gray-500)' }}>{f.department_name}</td>
                <td style={{ color:'var(--gray-500)' }}>{f.designation || '—'}</td>
                <td>
                  {f.dnd
                    ? <span className="badge badge-red">DND</span>
                    : f.available
                      ? <span className="badge badge-green">Available</span>
                      : <span className="badge badge-gray">Unavailable</span>
                  }
                </td>
                <td style={{ textAlign:'right' }}>
                  <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setModal(f)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => setConfirm(f)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Departments Tab ────────────────────────────────────────────
function DepartmentsTab({ token }) {
  const [depts, setDepts]   = useState([]);
  const [modal, setModal]   = useState(null);
  const [confirm, setConfirm] = useState(null);
  const { show, ToastContainer } = useToast();

  const load = () => api.getAllDepartments(token).then(setDepts).catch(() => {});
  useEffect(load, [token]); // eslint-disable-line

  async function toggleActive(d) {
    try {
      await api.updateDepartment(d.id, { name: d.name, active: d.active ? 0 : 1 }, token);
      load(); show(`${d.name} ${d.active ? 'hidden' : 'shown'}`, 'success');
    } catch {}
  }
  async function handleDelete(d) {
    try { await api.deleteDepartment(d.id, token); load(); show('Deleted', 'success'); }
    catch (err) { show(err.message, 'error'); }
    setConfirm(null);
  }

  return (
    <div>
      <ToastContainer />
      {modal !== null && (
        <DeptModal dept={modal === 'add' ? null : modal} token={token}
          onSave={() => { setModal(null); load(); show('Saved', 'success'); }}
          onClose={() => setModal(null)} />
      )}
      {confirm && (
        <ConfirmModal message={`Delete "${confirm.name}"? All faculty under this department will also be deleted.`}
          onConfirm={() => handleDelete(confirm)} onCancel={() => setConfirm(null)} />
      )}

      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
        <h2 style={{ fontSize:'1.25rem', fontWeight:800, flex:1 }}>Departments</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setModal('add')}>+ Add Department</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Status</th><th style={{ textAlign:'right' }}>Actions</th></tr></thead>
          <tbody>
            {depts.map(d => (
              <tr key={d.id}>
                <td style={{ fontWeight:600 }}>{d.name}</td>
                <td>
                  <span className={`badge ${d.active ? 'badge-green' : 'badge-gray'}`}>
                    {d.active ? 'Active' : 'Hidden'}
                  </span>
                </td>
                <td style={{ textAlign:'right' }}>
                  <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setModal(d)}>Edit</button>
                    <button className="btn btn-warning btn-sm" onClick={() => toggleActive(d)}>
                      {d.active ? 'Hide' : 'Show'}
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => setConfirm(d)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Logs Tab ───────────────────────────────────────────────────
function LogsTab({ token }) {
  const [logs, setLogs]     = useState([]);
  const [date, setDate]     = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await api.getLogs({ date }, token);
      setLogs(data);
    } catch {}
    setLoading(false);
  }
  useEffect(() => { load(); }, [date]); // eslint-disable-line

  const statusBadge = {
    done:      <span className="badge badge-green">Done</span>,
    cancelled: <span className="badge badge-red">Cancelled</span>,
    waiting:   <span className="badge badge-amber">Waiting</span>,
  };

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20, flexWrap:'wrap' }}>
        <h2 style={{ fontSize:'1.25rem', fontWeight:800, flex:1 }}>Page Logs</h2>
        <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} style={{ width:180 }} />
        <button className="btn btn-secondary btn-sm" onClick={load}>Refresh</button>
      </div>
      {loading ? (
        <div style={{ padding:40, textAlign:'center' }}><div className="spinner" /></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Time</th><th>Teacher</th><th>Dept.</th><th>Student</th><th>ID</th><th>Purpose</th><th>Status</th></tr></thead>
            <tbody>
              {logs.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign:'center', color:'var(--gray-400)', padding:24 }}>No logs for this date</td></tr>
              )}
              {logs.map(l => (
                <tr key={l.id}>
                  <td style={{ whiteSpace:'nowrap', color:'var(--gray-500)', fontSize:'.82rem' }}>
                    {new Date(l.created_at).toLocaleTimeString('en-PH', { hour:'2-digit', minute:'2-digit' })}
                  </td>
                  <td style={{ fontWeight:600 }}>{l.faculty_name}</td>
                  <td style={{ color:'var(--gray-500)' }}>{l.department}</td>
                  <td>{l.student_name}</td>
                  <td style={{ color:'var(--gray-500)' }}>{l.student_id || '—'}</td>
                  <td>{l.purpose}</td>
                  <td>{statusBadge[l.status] || l.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Settings Tab ───────────────────────────────────────────────
function SettingsTab({ token }) {
  const [form, setForm]     = useState({ sound_mode:'both', tts_rate:0.9, auto_reset_seconds:30 });
  const [saving, setSaving] = useState(false);
  const { show, ToastContainer } = useToast();

  useEffect(() => {
    api.getSettings().then(s => setForm(f => ({ ...f, ...s }))).catch(() => {});
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await api.updateSettings(form, token);
      show('Settings saved', 'success');
    } catch (err) { show(err.message, 'error'); }
    setSaving(false);
  }

  return (
    <div>
      <ToastContainer />
      <h2 style={{ fontSize:'1.25rem', fontWeight:800, marginBottom:24 }}>System Settings</h2>
      <div style={{ maxWidth:480, background:'#fff', borderRadius:12, padding:24, border:'1px solid var(--gray-200)' }}>
        <div className="form-group">
          <label className="form-label">Notification Sound Mode</label>
          <select className="form-select" value={form.sound_mode}
            onChange={e => setForm(f => ({ ...f, sound_mode: e.target.value }))}>
            <option value="chime">🔔 Chime Only</option>
            <option value="tts">🗣️ Text-to-Speech Only</option>
            <option value="both">🔔🗣️ Both (Chime + TTS)</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">TTS Speech Rate</label>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <input type="range" min="0.5" max="1.5" step="0.05" value={form.tts_rate}
              onChange={e => setForm(f => ({ ...f, tts_rate: parseFloat(e.target.value) }))}
              style={{ flex:1 }} />
            <span style={{ fontWeight:700, width:32 }}>{form.tts_rate.toFixed(2)}</span>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Kiosk Auto-Reset (seconds)</label>
          <input type="number" className="form-input" min={10} max={120} value={form.auto_reset_seconds}
            onChange={e => setForm(f => ({ ...f, auto_reset_seconds: parseInt(e.target.value) }))} />
          <small style={{ color:'var(--gray-400)', fontSize:'.78rem' }}>
            How long before the outside kiosk auto-resets due to inactivity.
          </small>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}

// ── Admin Users Tab ────────────────────────────────────────────
function UsersTab({ token }) {
  const [users, setUsers]   = useState([]);
  const [modal, setModal]   = useState(null);
  const [confirm, setConfirm] = useState(null);
  const { user: me }        = useAuth();
  const { show, ToastContainer } = useToast();

  const load = () => api.getAdminUsers(token).then(setUsers).catch(() => {});
  useEffect(load, [token]); // eslint-disable-line

  async function handleDelete(u) {
    try { await api.deleteAdminUser(u.id, token); load(); show('User deleted', 'success'); }
    catch (err) { show(err.message, 'error'); }
    setConfirm(null);
  }

  return (
    <div>
      <ToastContainer />
      {modal && (
        <UserModal user={modal === 'add' ? null : modal} token={token}
          onSave={() => { setModal(null); load(); show('Saved', 'success'); }}
          onClose={() => setModal(null)} />
      )}
      {confirm && (
        <ConfirmModal message={`Delete admin user "${confirm.username}"?`}
          onConfirm={() => handleDelete(confirm)} onCancel={() => setConfirm(null)} />
      )}

      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
        <h2 style={{ fontSize:'1.25rem', fontWeight:800, flex:1 }}>Admin Users</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setModal('add')}>+ Add User</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Username</th><th>Full Name</th><th>Created</th><th style={{ textAlign:'right' }}>Actions</th></tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td style={{ fontWeight:600 }}>
                  {u.username}
                  {u.id === me?.id && <span className="badge badge-green" style={{ marginLeft:8, fontSize:'.7rem' }}>You</span>}
                </td>
                <td>{u.full_name || '—'}</td>
                <td style={{ color:'var(--gray-500)', fontSize:'.82rem' }}>
                  {new Date(u.created_at).toLocaleDateString('en-PH')}
                </td>
                <td style={{ textAlign:'right' }}>
                  <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setModal(u)}>Change Password</button>
                    {u.id !== me?.id && (
                      <button className="btn btn-danger btn-sm" onClick={() => setConfirm(u)}>Delete</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Admin Page ────────────────────────────────────────────
export default function Admin() {
  const [tab, setTab] = useState('dashboard');
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/admin/login');
  }

  const tabContent = {
    dashboard:   <DashboardTab   token={token} />,
    faculty:     <FacultyTab     token={token} />,
    departments: <DepartmentsTab token={token} />,
    logs:        <LogsTab        token={token} />,
    settings:    <SettingsTab    token={token} />,
    users:       <UsersTab       token={token} />,
  };

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden' }}>
      {/* Sidebar */}
      <aside style={{ width:220, background:'var(--sti-dark)', display:'flex', flexDirection:'column', flexShrink:0 }}>
        <div style={{ padding:'20px 16px 16px', borderBottom:'1px solid rgba(255,255,255,.1)' }}>
          <STILogo size={40} />
          <div style={{ color:'#fff', fontWeight:800, fontSize:'.95rem', marginTop:10 }}>STI Cubao</div>
          <div style={{ color:'rgba(255,255,255,.5)', fontSize:'.75rem' }}>Admin Panel</div>
        </div>
        <nav style={{ flex:1, padding:'8px 0', overflowY:'auto' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{
                display:'block', width:'100%', textAlign:'left',
                padding:'11px 20px', border:'none', cursor:'pointer',
                background: tab === t.key ? 'rgba(255,255,255,.12)' : 'transparent',
                color: tab === t.key ? '#fff' : 'rgba(255,255,255,.6)',
                fontWeight: tab === t.key ? 700 : 400,
                fontSize:'.88rem',
                borderLeft: tab === t.key ? '3px solid var(--sti-yellow)' : '3px solid transparent',
                transition:'all .15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div style={{ padding:'12px 16px', borderTop:'1px solid rgba(255,255,255,.1)' }}>
          <div style={{ color:'rgba(255,255,255,.7)', fontSize:'.78rem', marginBottom:8 }}>
            Signed in as<br /><strong style={{ color:'#fff' }}>{user?.username}</strong>
          </div>
          <button className="btn btn-secondary btn-sm" style={{ width:'100%' }} onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex:1, overflowY:'auto', background:'var(--gray-100)', padding:28 }}>
        {tabContent[tab]}
      </main>
    </div>
  );
}
