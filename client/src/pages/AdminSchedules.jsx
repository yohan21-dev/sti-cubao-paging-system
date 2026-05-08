// client/src/pages/AdminSchedules.jsx
import { useState, useEffect, useRef } from 'react';
import { api } from '../api.js';
import { useToast } from '../components/useToast.jsx';
import FacultyAvatar from '../components/FacultyAvatar.jsx';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WORK_DAYS = [1, 2, 3, 4, 5, 6]; // Mon–Sat (common in PH schools)

const TYPE_META = {
  lecture:        { label: 'Lecture',        color: '#DC2626', bg: '#FEE2E2',  icon: '📚' },
  laboratory:     { label: 'Laboratory',     color: '#B45309', bg: '#FEF3C7',  icon: '🔬' },
  administrative: { label: 'Administrative', color: '#2563EB', bg: '#DBEAFE',  icon: '📋' },
  consultation:   { label: 'Consultation',   color: '#059669', bg: '#D1FAE5',  icon: '💬' },
  other:          { label: 'Other',          color: '#6B7280', bg: '#F3F4F6',  icon: '📌' },
};

// ── Time utils ─────────────────────────────────────────────
function fmtTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hr = parseInt(h);
  const ampm = hr >= 12 ? 'PM' : 'AM';
  return `${hr % 12 || 12}:${m} ${ampm}`;
}

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// ── CSV Template helpers ───────────────────────────────────
const CSV_HEADERS = ['faculty_id','day_of_week','time_start','time_end','subject_code','subject_name','room','section','schedule_type'];
const CSV_EXAMPLE = [
  '1,1,08:00,10:00,IT101,Introduction to Computing,Room 201,BSIT-1A,lecture',
  '1,1,10:00,12:00,IT102,Computer Programming,Lab 301,BSIT-1B,laboratory',
  '1,2,08:00,09:00,,,,Administrative Work,,administrative',
  '2,3,13:00,15:00,CS201,Data Structures,Room 105,BSCS-2A,lecture',
].join('\n');

function downloadCsvTemplate(faculty) {
  const rows = [CSV_HEADERS.join(','), '# Example rows (delete this line before importing):'];

  if (faculty.length > 0) {
    rows.push(`# Available faculty IDs:`);
    faculty.forEach(f => rows.push(`# ${f.id} = ${f.name}`));
  }
  rows.push('# day_of_week: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat');
  rows.push('# schedule_type: lecture | laboratory | administrative | consultation | other');
  rows.push(CSV_EXAMPLE);

  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'faculty_schedule_template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function parseCsv(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  if (!lines.length) throw new Error('CSV is empty');

  const firstLine = lines[0].toLowerCase().replace(/\s/g, '');
  const hasHeader = firstLine.includes('faculty_id') || firstLine.includes('day_of_week');
  const dataLines = hasHeader ? lines.slice(1) : lines;

  return dataLines.map((line, i) => {
    const cols = line.split(',').map(c => c.trim());
    if (cols.length < 4) throw new Error(`Row ${i + 1}: not enough columns`);
    const [faculty_id, day_of_week, time_start, time_end, subject_code, subject_name, room, section, schedule_type] = cols;

    const fid = parseInt(faculty_id);
    const dow = parseInt(day_of_week);
    if (isNaN(fid) || fid <= 0) throw new Error(`Row ${i + 1}: invalid faculty_id "${faculty_id}"`);
    if (isNaN(dow) || dow < 0 || dow > 6) throw new Error(`Row ${i + 1}: day_of_week must be 0–6`);
    if (!time_start?.match(/^\d{1,2}:\d{2}$/)) throw new Error(`Row ${i + 1}: invalid time_start "${time_start}"`);
    if (!time_end?.match(/^\d{1,2}:\d{2}$/)) throw new Error(`Row ${i + 1}: invalid time_end "${time_end}"`);

    const validTypes = ['lecture','laboratory','administrative','consultation','other'];
    const stype = (schedule_type || 'lecture').toLowerCase();
    if (!validTypes.includes(stype)) throw new Error(`Row ${i + 1}: invalid schedule_type "${schedule_type}". Use: ${validTypes.join(', ')}`);

    return {
      faculty_id: fid,
      day_of_week: dow,
      time_start: time_start.padStart(5, '0').replace(/^(\d):/, '0$1:'),
      time_end:   time_end.padStart(5, '0').replace(/^(\d):/, '0$1:'),
      subject_code:  subject_code  || null,
      subject_name:  subject_name  || null,
      room:          room          || null,
      section:       section       || null,
      schedule_type: stype,
    };
  });
}

// ── Schedule Entry Modal ───────────────────────────────────
function ScheduleModal({ schedule, faculty, onSave, onClose, token }) {
  const isEdit = !!schedule;
  const [form, setForm] = useState({
    faculty_id:    schedule?.faculty_id    || (faculty[0]?.id || ''),
    day_of_week:   schedule?.day_of_week   ?? 1,
    time_start:    schedule?.time_start?.slice(0,5) || '08:00',
    time_end:      schedule?.time_end?.slice(0,5)   || '10:00',
    subject_code:  schedule?.subject_code  || '',
    subject_name:  schedule?.subject_name  || '',
    room:          schedule?.room          || '',
    section:       schedule?.section       || '',
    schedule_type: schedule?.schedule_type || 'lecture',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  async function handleSave() {
    setError('');
    if (!form.faculty_id) { setError('Select a faculty member'); return; }
    if (form.time_start >= form.time_end) { setError('End time must be after start time'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        faculty_id:  parseInt(form.faculty_id),
        day_of_week: parseInt(form.day_of_week),
        subject_code: form.subject_code || null,
        subject_name: form.subject_name || null,
        room:         form.room         || null,
        section:      form.section      || null,
      };
      if (isEdit) await api.updateSchedule(schedule.id, payload, token);
      else        await api.createSchedule(payload, token);
      onSave();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  const f = v => e => setForm(p => ({ ...p, [v]: e.target.value }));

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <h2 className="modal-title">{isEdit ? 'Edit Schedule Entry' : 'Add Schedule Entry'}</h2>
        {error && (
          <div style={{ background:'var(--red-light)', color:'var(--red)', borderRadius:8, padding:'8px 12px', fontSize:'.85rem', marginBottom:16 }}>
            {error}
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
          <div className="form-group" style={{ gridColumn:'1/-1' }}>
            <label className="form-label">Faculty Member *</label>
            <select className="form-select" value={form.faculty_id} onChange={f('faculty_id')}>
              {faculty.map(fac => <option key={fac.id} value={fac.id}>{fac.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Day *</label>
            <select className="form-select" value={form.day_of_week} onChange={f('day_of_week')}>
              {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Type *</label>
            <select className="form-select" value={form.schedule_type} onChange={f('schedule_type')}>
              {Object.entries(TYPE_META).map(([k, v]) => (
                <option key={k} value={k}>{v.icon} {v.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Start Time *</label>
            <input type="time" className="form-input" value={form.time_start} onChange={f('time_start')} />
          </div>

          <div className="form-group">
            <label className="form-label">End Time *</label>
            <input type="time" className="form-input" value={form.time_end} onChange={f('time_end')} />
          </div>

          <div className="form-group">
            <label className="form-label">Subject Code</label>
            <input className="form-input" placeholder="e.g. IT101" value={form.subject_code} onChange={f('subject_code')} />
          </div>

          <div className="form-group">
            <label className="form-label">Section</label>
            <input className="form-input" placeholder="e.g. BSIT-1A" value={form.section} onChange={f('section')} />
          </div>

          <div className="form-group" style={{ gridColumn:'1/-1' }}>
            <label className="form-label">Subject / Activity Name</label>
            <input className="form-input" placeholder="e.g. Introduction to Computing" value={form.subject_name} onChange={f('subject_name')} />
          </div>

          <div className="form-group">
            <label className="form-label">Room</label>
            <input className="form-input" placeholder="e.g. Room 201, Lab 3" value={form.room} onChange={f('room')} />
          </div>
        </div>

        {/* Type legend */}
        <div style={{ background:'var(--gray-50)', borderRadius:8, padding:'10px 14px', fontSize:'.78rem', marginBottom:16 }}>
          <strong style={{ color:'var(--gray-700)' }}>Note:</strong>{' '}
          <span style={{ color:'var(--red)' }}>Lecture</span> and{' '}
          <span style={{ color:'#B45309' }}>Laboratory</span> types will block student pages during that time slot.
          <span style={{ color:'#2563EB' }}> Administrative</span>,{' '}
          <span style={{ color:'#059669' }}>Consultation</span>, and{' '}
          <span style={{ color:'var(--gray-500)' }}>Other</span> remain pageable.
        </div>

        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Entry'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── CSV Import Modal ───────────────────────────────────────
function CsvImportModal({ faculty, onImport, onClose, token }) {
  const [raw,      setRaw]      = useState('');
  const [parsed,   setParsed]   = useState(null);
  const [parseErr, setParseErr] = useState('');
  const [replaceId,setReplaceId]= useState('');
  const [importing,setImporting]= useState(false);
  const fileRef = useRef();

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { setRaw(ev.target.result); setParsed(null); setParseErr(''); };
    reader.readAsText(file);
  }

  function handleParse() {
    try {
      const rows = parseCsv(raw);
      setParsed(rows);
      setParseErr('');
    } catch (err) {
      setParseErr(err.message);
      setParsed(null);
    }
  }

  async function handleImport() {
    if (!parsed || parsed.length === 0) return;
    setImporting(true);
    try {
      const payload = {
        schedules: parsed,
        replace_faculty_id: replaceId ? parseInt(replaceId) : null,
      };
      const result = await api.bulkCreateSchedules(payload, token);
      onImport(result.inserted);
    } catch (err) {
      setParseErr(err.message);
    } finally {
      setImporting(false);
    }
  }

  const facultyMap = Object.fromEntries(faculty.map(f => [f.id, f.name]));

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 680 }}>
        <h2 className="modal-title">📥 Import Schedules from CSV</h2>

        {/* Instructions */}
        <div style={{ background:'var(--blue-light)', borderRadius:8, padding:'12px 16px', fontSize:'.82rem', marginBottom:16, color:'#1e40af' }}>
          <strong>CSV Format:</strong> Each row must have these columns in order:<br />
          <code style={{ fontSize:'.78rem' }}>{CSV_HEADERS.join(', ')}</code><br /><br />
          <strong>day_of_week:</strong> 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat<br />
          <strong>schedule_type:</strong> lecture | laboratory | administrative | consultation | other<br />
          <strong>Lecture &amp; Laboratory</strong> = blocks paging. Others = still pageable.
        </div>

        <div style={{ display:'flex', gap:10, marginBottom:16 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => downloadCsvTemplate(faculty)}>
            ⬇ Download Template
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => fileRef.current.click()}>
            📂 Load CSV File
          </button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display:'none' }} onChange={handleFile} />
        </div>

        <div className="form-group">
          <label className="form-label">CSV Content (paste or load file)</label>
          <textarea
            className="form-textarea"
            style={{ minHeight: 140, fontFamily:'monospace', fontSize:'.78rem' }}
            placeholder={`faculty_id,day_of_week,time_start,time_end,subject_code,subject_name,room,section,schedule_type\n1,1,08:00,10:00,IT101,Intro to Computing,Room 201,BSIT-1A,lecture`}
            value={raw}
            onChange={e => { setRaw(e.target.value); setParsed(null); setParseErr(''); }}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Replace existing schedules for faculty (optional)</label>
          <select className="form-select" value={replaceId} onChange={e => setReplaceId(e.target.value)}>
            <option value="">— Add to existing schedules —</option>
            {faculty.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <small style={{ color:'var(--gray-400)', fontSize:'.75rem' }}>
            If selected, all existing schedules for that faculty will be replaced with the imported ones.
          </small>
        </div>

        {parseErr && (
          <div style={{ background:'var(--red-light)', color:'var(--red)', borderRadius:8, padding:'8px 12px', fontSize:'.82rem', marginBottom:12 }}>
            ❌ {parseErr}
          </div>
        )}

        {parsed && (
          <div style={{ marginBottom:16 }}>
            <div style={{ color:'#059669', fontWeight:600, fontSize:'.85rem', marginBottom:8 }}>
              ✅ Parsed {parsed.length} schedule {parsed.length === 1 ? 'entry' : 'entries'} — preview:
            </div>
            <div style={{ maxHeight:180, overflowY:'auto', border:'1px solid var(--gray-200)', borderRadius:8 }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'.78rem' }}>
                <thead>
                  <tr style={{ background:'var(--gray-50)' }}>
                    <th style={{ padding:'6px 10px', textAlign:'left' }}>Faculty</th>
                    <th style={{ padding:'6px 10px', textAlign:'left' }}>Day</th>
                    <th style={{ padding:'6px 10px', textAlign:'left' }}>Time</th>
                    <th style={{ padding:'6px 10px', textAlign:'left' }}>Subject</th>
                    <th style={{ padding:'6px 10px', textAlign:'left' }}>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.map((r, i) => (
                    <tr key={i} style={{ borderTop:'1px solid var(--gray-100)' }}>
                      <td style={{ padding:'5px 10px' }}>{facultyMap[r.faculty_id] || `#${r.faculty_id}`}</td>
                      <td style={{ padding:'5px 10px' }}>{SHORT_DAYS[r.day_of_week]}</td>
                      <td style={{ padding:'5px 10px' }}>{fmtTime(r.time_start)} – {fmtTime(r.time_end)}</td>
                      <td style={{ padding:'5px 10px' }}>{r.subject_code || ''} {r.subject_name || ''}</td>
                      <td style={{ padding:'5px 10px' }}>
                        <span style={{
                          padding:'2px 8px', borderRadius:99, fontSize:'.72rem', fontWeight:600,
                          background: TYPE_META[r.schedule_type]?.bg,
                          color:      TYPE_META[r.schedule_type]?.color,
                        }}>
                          {TYPE_META[r.schedule_type]?.icon} {TYPE_META[r.schedule_type]?.label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          {!parsed ? (
            <button className="btn btn-primary" onClick={handleParse} disabled={!raw.trim()}>
              Preview Import
            </button>
          ) : (
            <button className="btn btn-primary" onClick={handleImport} disabled={importing}>
              {importing ? 'Importing…' : `Import ${parsed.length} Entries`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Week Grid view ─────────────────────────────────────────
function WeekGrid({ schedules, onEdit, onDelete }) {
  // Group by faculty then by day
  const byFaculty = {};
  for (const s of schedules) {
    if (!byFaculty[s.faculty_id]) byFaculty[s.faculty_id] = { name: s.faculty_name, slots: {} };
    if (!byFaculty[s.faculty_id].slots[s.day_of_week]) byFaculty[s.faculty_id].slots[s.day_of_week] = [];
    byFaculty[s.faculty_id].slots[s.day_of_week].push(s);
  }

  if (Object.keys(byFaculty).length === 0) return (
    <div style={{ padding:40, textAlign:'center', color:'var(--gray-400)' }}>
      No schedules added yet. Click "Add Entry" or "Import CSV" to get started.
    </div>
  );

  return (
    <div style={{ overflowX:'auto' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', background:'#fff', fontSize:'.8rem' }}>
        <thead>
          <tr>
            <th style={{ padding:'10px 12px', textAlign:'left', background:'var(--gray-50)', borderBottom:'2px solid var(--gray-200)', width:160 }}>Faculty</th>
            {WORK_DAYS.map(d => (
              <th key={d} style={{ padding:'10px 8px', textAlign:'center', background:'var(--gray-50)', borderBottom:'2px solid var(--gray-200)', minWidth:110 }}>
                {DAYS[d]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.entries(byFaculty).map(([fid, { name, slots }]) => (
            <tr key={fid} style={{ borderBottom:'1px solid var(--gray-100)' }}>
              <td style={{ padding:'8px 12px', fontWeight:600, verticalAlign:'top', color:'var(--sti-dark)' }}>
                {name}
              </td>
              {WORK_DAYS.map(d => (
                <td key={d} style={{ padding:'4px 6px', verticalAlign:'top' }}>
                  {(slots[d] || []).sort((a,b) => a.time_start.localeCompare(b.time_start)).map(s => {
                    const meta = TYPE_META[s.schedule_type] || TYPE_META.other;
                    return (
                      <div key={s.id}
                        style={{
                          background: meta.bg, borderLeft:`3px solid ${meta.color}`,
                          borderRadius:'0 6px 6px 0', padding:'4px 7px',
                          marginBottom:3, cursor:'pointer',
                          transition:'opacity .15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '.8'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                        onClick={() => onEdit(s)}
                      >
                        <div style={{ fontWeight:700, color:meta.color, fontSize:'.72rem' }}>
                          {fmtTime(s.time_start)} – {fmtTime(s.time_end)}
                        </div>
                        {(s.subject_code || s.subject_name) && (
                          <div style={{ color:meta.color, fontSize:'.68rem', opacity:.85, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:100 }}>
                            {s.subject_code || ''} {s.subject_name ? `· ${s.subject_name}` : ''}
                          </div>
                        )}
                        {s.section && (
                          <div style={{ fontSize:'.65rem', color:meta.color, opacity:.7 }}>{s.section}</div>
                        )}
                        <div style={{ display:'flex', gap:4, marginTop:3 }}>
                          <button
                            style={{ fontSize:'.6rem', padding:'1px 5px', borderRadius:4, border:`1px solid ${meta.color}`, background:'transparent', color:meta.color, cursor:'pointer' }}
                            onClick={e => { e.stopPropagation(); onDelete(s); }}
                          >✕</button>
                        </div>
                      </div>
                    );
                  })}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Schedules Tab ─────────────────────────────────────
export default function SchedulesTab({ token }) {
  const [schedules,    setSchedules]    = useState([]);
  const [faculty,      setFaculty]      = useState([]);
  const [modal,        setModal]        = useState(null); // null | 'add' | schedule obj
  const [csvModal,     setCsvModal]     = useState(false);
  const [confirm,      setConfirm]      = useState(null);
  const [filterFaculty,setFilterFaculty]= useState('all');
  const [view,         setView]         = useState('grid'); // 'grid' | 'list'
  const [loading,      setLoading]      = useState(false);
  const { show, ToastContainer }        = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [s, f] = await Promise.all([
        api.getAllSchedules(token),
        api.getAllFaculty(token),
      ]);
      setSchedules(s);
      setFaculty(f);
    } catch (err) { show(err.message, 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [token]); // eslint-disable-line

  async function handleDelete(s) {
    try {
      await api.deleteSchedule(s.id, token);
      show('Schedule entry deleted', 'success');
      load();
    } catch (err) { show(err.message, 'error'); }
    setConfirm(null);
  }

  const filtered = filterFaculty === 'all'
    ? schedules
    : schedules.filter(s => s.faculty_id === parseInt(filterFaculty));

  return (
    <div>
      <ToastContainer />

      {modal !== null && (
        <ScheduleModal
          schedule={modal === 'add' ? null : modal}
          faculty={faculty}
          token={token}
          onSave={() => { setModal(null); load(); show('Saved', 'success'); }}
          onClose={() => setModal(null)}
        />
      )}

      {csvModal && (
        <CsvImportModal
          faculty={faculty}
          token={token}
          onImport={(count) => { setCsvModal(false); load(); show(`Imported ${count} schedule entries`, 'success'); }}
          onClose={() => setCsvModal(false)}
        />
      )}

      {confirm && (
        <div className="modal-backdrop">
          <div className="modal" style={{ maxWidth:360 }}>
            <p style={{ fontSize:'1rem', color:'var(--gray-700)', marginBottom:24 }}>
              Delete this schedule entry? This cannot be undone.
            </p>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setConfirm(null)}>Cancel</button>
              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(confirm)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16, flexWrap:'wrap' }}>
        <div>
          <h2 style={{ fontSize:'1.25rem', fontWeight:800 }}>Faculty Schedules</h2>
          <p style={{ fontSize:'.8rem', color:'var(--gray-500)', marginTop:2 }}>
            Students cannot page faculty during <span style={{ color:'var(--red)', fontWeight:600 }}>Lecture</span> or{' '}
            <span style={{ color:'#B45309', fontWeight:600 }}>Laboratory</span> slots.
          </p>
        </div>
        <div style={{ marginLeft:'auto', display:'flex', gap:8, flexWrap:'wrap' }}>
          <select className="form-select" value={filterFaculty} onChange={e => setFilterFaculty(e.target.value)} style={{ width:200 }}>
            <option value="all">All Faculty</option>
            {faculty.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setView(v => v === 'grid' ? 'list' : 'grid')}
          >
            {view === 'grid' ? '📋 List View' : '🗓 Grid View'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setCsvModal(true)}>
            📥 Import CSV
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setModal('add')}>
            + Add Entry
          </button>
        </div>
      </div>

      {/* Type legend */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:16 }}>
        {Object.entries(TYPE_META).map(([k, v]) => (
          <span key={k} style={{
            padding:'3px 12px', borderRadius:99, fontSize:'.75rem', fontWeight:600,
            background:v.bg, color:v.color,
          }}>
            {v.icon} {v.label}
            {(k === 'lecture' || k === 'laboratory') && ' 🚫'}
          </span>
        ))}
        <span style={{ fontSize:'.72rem', color:'var(--gray-400)', alignSelf:'center' }}>
          🚫 = blocks paging
        </span>
      </div>

      {loading ? (
        <div style={{ padding:40, textAlign:'center' }}><div className="spinner" /></div>
      ) : view === 'grid' ? (
        <div style={{ border:'1px solid var(--gray-200)', borderRadius:12, overflow:'hidden' }}>
          <WeekGrid
            schedules={filtered}
            onEdit={s => setModal(s)}
            onDelete={s => setConfirm(s)}
          />
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Faculty</th><th>Day</th><th>Time</th><th>Type</th>
                <th>Subject</th><th>Room</th><th>Section</th>
                <th style={{ textAlign:'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign:'center', color:'var(--gray-400)', padding:24 }}>No schedules found</td></tr>
              )}
              {filtered
                .sort((a,b) => a.faculty_name.localeCompare(b.faculty_name) || a.day_of_week - b.day_of_week || a.time_start.localeCompare(b.time_start))
                .map(s => {
                  const meta = TYPE_META[s.schedule_type] || TYPE_META.other;
                  return (
                    <tr key={s.id}>
                      <td style={{ fontWeight:600 }}>{s.faculty_name}</td>
                      <td>{DAYS[s.day_of_week]}</td>
                      <td style={{ whiteSpace:'nowrap' }}>{fmtTime(s.time_start)} – {fmtTime(s.time_end)}</td>
                      <td>
                        <span style={{ padding:'3px 10px', borderRadius:99, fontSize:'.75rem', fontWeight:600, background:meta.bg, color:meta.color }}>
                          {meta.icon} {meta.label}
                        </span>
                      </td>
                      <td style={{ color:'var(--gray-600)' }}>
                        {[s.subject_code, s.subject_name].filter(Boolean).join(' — ') || '—'}
                      </td>
                      <td style={{ color:'var(--gray-500)' }}>{s.room || '—'}</td>
                      <td style={{ color:'var(--gray-500)' }}>{s.section || '—'}</td>
                      <td style={{ textAlign:'right' }}>
                        <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => setModal(s)}>Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => setConfirm(s)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              }
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}