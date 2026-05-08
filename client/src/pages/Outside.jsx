// client/src/pages/Outside.jsx  (UPDATED — student lookup + faculty search + schedule status)
import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api.js';
import socket from '../socket.js';
import FacultyAvatar from '../components/FacultyAvatar.jsx';
import STILogo from '../components/STILogo.jsx';
import { useToast } from '../components/useToast.jsx';

const PURPOSES = ['Consultation', 'Document Signing', 'Grade Inquiry', 'Requirements', 'Complaint', 'Others'];
const IDLE_TIMEOUT = 35000;

const STEPS = ['Find Teacher', 'Your Details', 'Confirm'];

// ── Step indicators ────────────────────────────────────────────
function StepBar({ step }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:0, marginBottom:32 }}>
      {STEPS.map((label, i) => {
        const active = i === step;
        const done   = i <  step;
        return (
          <div key={i} style={{ display:'flex', alignItems:'center', flex: i < STEPS.length-1 ? 1 : 'none' }}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, minWidth:64 }}>
              <div style={{
                width:32, height:32, borderRadius:'50%',
                background: done ? 'var(--sti-blue)' : active ? 'var(--sti-yellow)' : 'var(--gray-200)',
                color: done ? '#fff' : active ? 'var(--sti-dark)' : 'var(--gray-500)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontWeight:700, fontSize:'.85rem', transition:'all .2s',
              }}>
                {done ? '✓' : i + 1}
              </div>
              <span style={{ fontSize:'.72rem', fontWeight:600, color: active ? 'var(--sti-blue)' : 'var(--gray-500)', whiteSpace:'nowrap' }}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex:1, height:2, background: done ? 'var(--sti-blue)' : 'var(--gray-200)', margin:'0 4px', marginBottom:20, transition:'background .2s' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Idle countdown bar ─────────────────────────────────────────
function IdleBar({ seconds }) {
  const pct = Math.min((seconds * 1000 / IDLE_TIMEOUT) * 100, 100);
  const remaining = Math.max(0, Math.ceil((IDLE_TIMEOUT - seconds * 1000) / 1000));
  return (
    <div style={{ position:'fixed', bottom:0, left:0, right:0 }}>
      <div style={{ height:4, background:'var(--gray-200)' }}>
        <div style={{ height:4, background:'var(--sti-blue)', width:`${100 - pct}%`, transition:'width 1s linear' }} />
      </div>
      <div style={{ background:'var(--gray-50)', padding:'8px 0', textAlign:'center', fontSize:'.8rem', color:'var(--gray-500)' }}>
        Screen resets in <strong>{remaining}s</strong> due to inactivity
      </div>
    </div>
  );
}

// ── Schedule status badge ──────────────────────────────────────
function ScheduleBadge({ slot }) {
  if (!slot) return null;
  const isBusy = ['lecture','laboratory'].includes(slot.schedule_type);
  const fmtTime = (t) => {
    const [h, m] = t.split(':');
    const hr = parseInt(h);
    return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
  };
  return (
    <div style={{
      fontSize:'.72rem', padding:'3px 10px', borderRadius:99, fontWeight:600,
      background: isBusy ? '#FEE2E2' : '#D1FAE5',
      color:      isBusy ? '#991B1B'  : '#065F46',
      display:'inline-flex', alignItems:'center', gap:4,
    }}>
      {isBusy ? '🚫' : '✅'}
      {isBusy
        ? `In ${slot.schedule_type} until ${fmtTime(slot.time_end)}`
        : `${slot.schedule_type === 'consultation' ? 'Consultation' : slot.schedule_type} until ${fmtTime(slot.time_end)}`
      }
    </div>
  );
}

// ── Ticket screen ──────────────────────────────────────────────
function TicketScreen({ entry, onDone }) {
  const [status,     setStatus]     = useState(entry.status);
  const [position,   setPosition]   = useState(entry.position);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const updated = await api.getQueueEntry(entry.id);
        setStatus(updated.status);
        setPosition(updated.position);
        if (['done','cancelled'].includes(updated.status)) clearInterval(interval);
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [entry.id]);

  async function handleCancel() {
    setCancelling(true);
    try { await api.cancelQueue(entry.id); onDone(); }
    catch { setCancelling(false); }
  }

  const statusMessages = {
    waiting:      { icon:'⏳', label:'Waiting',   desc:'Please wait — the teacher will be notified.',          color:'var(--amber)' },
    acknowledged: { icon:'👀', label:'Seen!',      desc:'The teacher acknowledged your request. Please proceed.', color:'var(--blue)' },
    done:         { icon:'✅', label:'Done',        desc:'Your visit has been completed. Have a great day!',     color:'var(--sti-green)' },
    cancelled:    { icon:'❌', label:'Cancelled',  desc:'This request was cancelled.',                          color:'var(--red)' },
  };
  const s = statusMessages[status] || statusMessages.waiting;

  return (
    <div style={{ textAlign:'center', maxWidth:480, margin:'0 auto' }}>
      <div style={{ fontSize:64, marginBottom:12 }}>{s.icon}</div>
      <div style={{ fontSize:'1.6rem', fontWeight:800, color:s.color, marginBottom:8 }}>{s.label}</div>
      <div style={{ fontSize:'1rem', color:'var(--gray-500)', marginBottom:28 }}>{s.desc}</div>
      <div style={{ background:'var(--gray-50)', border:'1px solid var(--gray-200)', borderRadius:12, padding:20, marginBottom:24, textAlign:'left' }}>
        <InfoRow label="Teacher"     value={entry.faculty_name} />
        <InfoRow label="Queue #"     value={`#${entry.queue_number}`} />
        {status === 'waiting' && position > 1 && <InfoRow label="People ahead" value={position - 1} />}
        <InfoRow label="Student"     value={entry.student_name} />
        {entry.student_id && <InfoRow label="ID" value={entry.student_id} />}
        <InfoRow label="Purpose"     value={entry.purpose} />
      </div>
      {['waiting','acknowledged'].includes(status) && (
        <button className="btn btn-danger btn-lg" onClick={handleCancel} disabled={cancelling} style={{ width:'100%' }}>
          {cancelling ? 'Cancelling…' : 'Cancel My Request'}
        </button>
      )}
      {['done','cancelled'].includes(status) && (
        <button className="btn btn-primary btn-lg" onClick={onDone} style={{ width:'100%' }}>Back to Home</button>
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid var(--gray-100)', fontSize:'.9rem' }}>
      <span style={{ color:'var(--gray-500)', fontWeight:500 }}>{label}</span>
      <span style={{ fontWeight:600 }}>{value}</span>
    </div>
  );
}

// ── Student Number Lookup component ───────────────────────────
function StudentLookup({ onFound, onSkip }) {
  const [sn,      setSn]      = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const inputRef = useRef();

  useEffect(() => { inputRef.current?.focus(); }, []);

  async function handleLookup() {
    const trimmed = sn.trim();
    if (!trimmed) { setError('Please enter your student number'); return; }
    setLoading(true);
    setError('');
    try {
      const student = await api.lookupStudent(trimmed);
      onFound(student);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth:460, margin:'0 auto' }}>
      <div style={{ textAlign:'center', marginBottom:28 }}>
        <div style={{ fontSize:48, marginBottom:8 }}>🎓</div>
        <h2 style={{ fontSize:'1.4rem', fontWeight:800, color:'var(--sti-dark)', marginBottom:4 }}>
          Enter Your Student Number
        </h2>
        <p style={{ color:'var(--gray-500)', fontSize:'.9rem' }}>
          Your details will be filled in automatically.
        </p>
      </div>

      <div className="form-group">
        <label className="form-label">Student Number</label>
        <input
          ref={inputRef}
          className="form-input"
          placeholder="e.g. 02000123456"
          value={sn}
          onChange={e => { setSn(e.target.value); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && handleLookup()}
          style={{ fontSize:'1.1rem', padding:'12px 16px', letterSpacing:'.05em' }}
        />
        {error && (
          <div style={{ marginTop:8, color:'var(--red)', fontSize:'.85rem', fontWeight:500 }}>
            ⚠️ {error}
          </div>
        )}
      </div>

      <button
        className="btn btn-primary btn-lg"
        style={{ width:'100%', marginBottom:12 }}
        onClick={handleLookup}
        disabled={loading || !sn.trim()}
      >
        {loading ? 'Looking up…' : 'Continue →'}
      </button>

      <button
        className="btn btn-secondary"
        style={{ width:'100%', fontSize:'.85rem' }}
        onClick={onSkip}
      >
        Skip — I'll enter my details manually
      </button>
    </div>
  );
}

// ── Faculty Search / Browse component ─────────────────────────
function FacultyFinder({ onSelect }) {
  const [mode,           setMode]           = useState('search'); // 'search' | 'browse'
  const [searchQ,        setSearchQ]        = useState('');
  const [allFaculty,     setAllFaculty]     = useState([]);
  const [departments,    setDepartments]    = useState([]);
  const [activeDept,     setActiveDept]     = useState(null);
  const [deptFaculty,    setDeptFaculty]    = useState([]);
  const [loadingDept,    setLoadingDept]    = useState(false);
  const [scheduleStatus, setScheduleStatus] = useState({}); // facultyId → slot | null

  useEffect(() => {
    api.getFacultyDisplay().then(setAllFaculty).catch(() => {});
    api.getDepartments().then(setDepartments).catch(() => {});
  }, []);

  // Fetch today's schedule status for visible faculty
  async function fetchScheduleForFaculty(facultyList) {
    for (const f of facultyList) {
      if (scheduleStatus[f.id] !== undefined) continue;
      try {
        const data = await api.getFacultyTodaySchedule(f.id);
        setScheduleStatus(prev => ({ ...prev, [f.id]: data.current }));
      } catch {
        setScheduleStatus(prev => ({ ...prev, [f.id]: null }));
      }
    }
  }

  // Search results
  const searchResults = searchQ.trim().length >= 2
    ? allFaculty.filter(f =>
        f.name.toLowerCase().includes(searchQ.toLowerCase()) ||
        (f.designation||'').toLowerCase().includes(searchQ.toLowerCase()) ||
        f.department_name.toLowerCase().includes(searchQ.toLowerCase())
      )
    : [];

  useEffect(() => {
    if (searchResults.length > 0) fetchScheduleForFaculty(searchResults);
  }, [searchQ, allFaculty]); // eslint-disable-line

  async function pickDept(dept) {
    setActiveDept(dept);
    setLoadingDept(true);
    try {
      const list = await api.getFacultyByDept(dept.id);
      setDeptFaculty(list);
      fetchScheduleForFaculty(list);
    } catch {}
    setLoadingDept(false);
  }

  function renderFacultyCard(f, compact = false) {
    const slot      = scheduleStatus[f.id];
    const inClass   = slot && ['lecture','laboratory'].includes(slot.schedule_type);
    const unavail   = f.dnd || !f.available || inClass;

    const fmtEnd = (t) => {
      if (!t) return '';
      const [h, m] = t.split(':');
      const hr = parseInt(h);
      return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
    };

    let statusLabel = '';
    let statusColor = '';
    let statusBg    = '';
    if (f.dnd) {
      statusLabel = 'Do Not Disturb'; statusColor = 'var(--red)'; statusBg = '#FEE2E2';
    } else if (!f.available) {
      statusLabel = 'Unavailable'; statusColor = 'var(--gray-500)'; statusBg = 'var(--gray-100)';
    } else if (inClass) {
      const label = slot.schedule_type === 'lecture' ? 'In Lecture' : 'In Lab';
      statusLabel = `${label} until ${fmtEnd(slot?.time_end)}`; statusColor = '#DC2626'; statusBg = '#FEE2E2';
    } else if (slot && slot.schedule_type === 'consultation') {
      statusLabel = 'Consultation Hours'; statusColor = '#059669'; statusBg = '#D1FAE5';
    } else if (f.queue_count > 0) {
      statusLabel = `${f.queue_count} in queue`; statusColor = '#D97706'; statusBg = '#FEF3C7';
    } else {
      statusLabel = 'Available'; statusColor = '#059669'; statusBg = '#D1FAE5';
    }

    return (
      <button
        key={f.id}
        onClick={() => !unavail && onSelect(f)}
        disabled={unavail}
        style={{
          display:'flex', alignItems:'center', gap:12,
          padding:'14px 16px', borderRadius:12,
          border:`2px solid ${unavail ? 'var(--gray-200)' : 'var(--gray-200)'}`,
          background: unavail ? 'var(--gray-50)' : '#fff',
          opacity: unavail ? .6 : 1,
          cursor: unavail ? 'not-allowed' : 'pointer',
          textAlign:'left', transition:'all .15s',
          width: compact ? '100%' : undefined,
        }}
        onMouseEnter={e => { if (!unavail) { e.currentTarget.style.borderColor='var(--sti-blue)'; e.currentTarget.style.transform='translateY(-1px)'; } }}
        onMouseLeave={e => { e.currentTarget.style.borderColor='var(--gray-200)'; e.currentTarget.style.transform='none'; }}
      >
        <FacultyAvatar photo={f.photo} name={f.name} size={48} />
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:700, fontSize:'.92rem', color:'var(--gray-900)' }}>{f.name}</div>
          {f.designation && <div style={{ fontSize:'.75rem', color:'var(--gray-500)' }}>{f.designation}</div>}
          <div style={{ fontSize:'.72rem', color:'var(--gray-400)' }}>{f.department_name}</div>
          <span style={{ display:'inline-block', marginTop:4, padding:'2px 8px', borderRadius:99, fontSize:'.68rem', fontWeight:700, background:statusBg, color:statusColor }}>
            {statusLabel}
          </span>
        </div>
      </button>
    );
  }

  return (
    <div>
      {/* Mode toggle */}
      <div style={{ display:'flex', gap:0, marginBottom:24, border:'2px solid var(--gray-200)', borderRadius:10, overflow:'hidden', width:'fit-content' }}>
        {[['search','🔍 Search Teacher'], ['browse','🏫 Browse by Dept.']].map(([m, lbl]) => (
          <button key={m} onClick={() => setMode(m)}
            style={{
              padding:'10px 20px', border:'none', cursor:'pointer', fontWeight:600, fontSize:'.88rem',
              background: mode === m ? 'var(--sti-blue)' : '#fff',
              color: mode === m ? '#fff' : 'var(--gray-600)',
              transition:'all .15s',
            }}
          >
            {lbl}
          </button>
        ))}
      </div>

      {/* ── Search mode ── */}
      {mode === 'search' && (
        <div>
          <div className="form-group">
            <input
              className="form-input"
              placeholder="Type teacher name, subject, or department…"
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              autoFocus
              style={{ fontSize:'1rem', padding:'12px 16px' }}
            />
          </div>

          {searchQ.trim().length < 2 ? (
            <div style={{ textAlign:'center', padding:'32px 0', color:'var(--gray-400)' }}>
              <div style={{ fontSize:36, marginBottom:8 }}>🔍</div>
              <div style={{ fontSize:'.9rem' }}>Type at least 2 characters to search</div>
            </div>
          ) : searchResults.length === 0 ? (
            <div style={{ textAlign:'center', padding:'32px 0', color:'var(--gray-400)' }}>
              <div style={{ fontSize:36, marginBottom:8 }}>😔</div>
              <div>No teachers found for "<strong>{searchQ}</strong>"</div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div style={{ fontSize:'.8rem', color:'var(--gray-500)', marginBottom:4 }}>
                {searchResults.length} teacher{searchResults.length !== 1 ? 's' : ''} found
              </div>
              {searchResults.map(f => renderFacultyCard(f, true))}
            </div>
          )}
        </div>
      )}

      {/* ── Browse mode ── */}
      {mode === 'browse' && !activeDept && (
        <div>
          <h3 style={{ fontSize:'1.1rem', fontWeight:700, color:'var(--sti-dark)', marginBottom:16 }}>Select Department</h3>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:12 }}>
            {departments.map(d => (
              <button key={d.id} onClick={() => pickDept(d)}
                style={{
                  padding:'20px 16px', borderRadius:12, border:'2px solid var(--gray-200)',
                  background:'var(--gray-50)', fontWeight:700, fontSize:'.95rem',
                  color:'var(--sti-dark)', cursor:'pointer', textAlign:'left', transition:'all .15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor='var(--sti-blue)'; e.currentTarget.style.background='var(--sti-light)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='var(--gray-200)'; e.currentTarget.style.background='var(--gray-50)'; }}
              >
                <div style={{ fontSize:28, marginBottom:8 }}>🏫</div>
                {d.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === 'browse' && activeDept && (
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => { setActiveDept(null); setDeptFaculty([]); }}>
              ← Back
            </button>
            <div>
              <div style={{ fontWeight:800, fontSize:'1.1rem', color:'var(--sti-dark)' }}>{activeDept.name}</div>
              <div style={{ fontSize:'.8rem', color:'var(--gray-500)' }}>Select a teacher</div>
            </div>
          </div>
          {loadingDept ? (
            <div style={{ padding:40, textAlign:'center' }}><div className="spinner" /></div>
          ) : deptFaculty.length === 0 ? (
            <div style={{ textAlign:'center', padding:40, color:'var(--gray-500)' }}>No faculty in this department.</div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px,1fr))', gap:12 }}>
              {deptFaculty.map(f => renderFacultyCard(f))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Outside Page ─────────────────────────────────────────
export default function Outside() {
  // step: 0=student-lookup, 1=find-teacher, 2=details, 3=confirm
  const [step,       setStep]       = useState(0);
  const [student,    setStudent]    = useState(null); // from DB lookup or null
  const [skipLookup, setSkipLookup] = useState(false);
  const [selected,   setSelected]   = useState({ teacher: null, dept: null });
  const [form,       setForm]       = useState({ student_name:'', student_id:'', purpose:'Consultation', note:'' });
  const [submitting, setSubmitting] = useState(false);
  const [ticket,     setTicket]     = useState(null);
  const [idleSeconds,setIdleSeconds]= useState(0);
  const idleTimer  = useRef(null);
  const { show, ToastContainer } = useToast();

  // ── Socket.io ──
  useEffect(() => {
    socket.emit('join:outside');
    return () => {};
  }, []);

  // ── Idle reset ──
  const resetIdle = useCallback(() => {
    setIdleSeconds(0);
    clearTimeout(idleTimer.current);
    if (step > 0 && !ticket) {
      idleTimer.current = setTimeout(resetAll, IDLE_TIMEOUT);
    }
  }, [step, ticket]); // eslint-disable-line

  useEffect(() => {
    if (step > 0 && !ticket) {
      idleTimer.current = setTimeout(resetAll, IDLE_TIMEOUT);
      const tick = setInterval(() => setIdleSeconds(s => s + 1), 1000);
      return () => { clearTimeout(idleTimer.current); clearInterval(tick); };
    }
  }, [step, ticket]); // eslint-disable-line

  function resetAll() {
    setStep(0); setTicket(null); setStudent(null); setSkipLookup(false);
    setSelected({ teacher:null, dept:null });
    setForm({ student_name:'', student_id:'', purpose:'Consultation', note:'' });
    setIdleSeconds(0);
    clearTimeout(idleTimer.current);
  }

  // ── Student lookup found ──
  function handleStudentFound(studentData) {
    setStudent(studentData);
    setForm(f => ({
      ...f,
      student_name: studentData.full_name,
      student_id:   studentData.student_number,
    }));
    setStep(1); // go to find teacher
    resetIdle();
  }

  // ── Skip student lookup ──
  function handleSkipLookup() {
    setSkipLookup(true);
    setStep(1);
    resetIdle();
  }

  // ── Teacher selected ──
  function handleTeacherSelect(teacher) {
    const inClass = ['lecture','laboratory'].includes(teacher.currentSlot?.schedule_type);
    if (teacher.dnd || !teacher.available || inClass) return;
    setSelected({ teacher });
    setStep(2);
    resetIdle();
  }

  // ── Submit page ──
  async function handleSubmit() {
    setSubmitting(true);
    try {
      const entry = await api.createPage({
        faculty_id:   selected.teacher.id,
        student_name: form.student_name.trim(),
        student_id:   form.student_id.trim() || null,
        purpose:      form.purpose,
        note:         form.note.trim() || null,
      });
      setTicket(entry);
      clearTimeout(idleTimer.current);
    } catch (err) {
      show(err.message || 'Failed to send page', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  const showIdle = step > 0 && !ticket;

  return (
    <div
      style={{
        minHeight:'100vh',
        background:'linear-gradient(135deg, #062f52 0%, #0b5793 60%, #4da3e0 100%)',
        display:'flex', flexDirection:'column',
      }}
      onMouseMove={resetIdle} onKeyDown={resetIdle} onTouchStart={resetIdle}
    >
      <ToastContainer />

      {/* Header */}
      <header style={{ padding:'20px 32px', display:'flex', alignItems:'center', gap:16 }}>
        <STILogo size={48} />
        <div>
          <div style={{ color:'#fff', fontWeight:800, fontSize:'1.15rem', lineHeight:1 }}>STI College Cubao</div>
          <div style={{ color:'rgba(255,255,255,.65)', fontSize:'.8rem', marginTop:2 }}>Faculty Paging System</div>
        </div>
        <div style={{ marginLeft:'auto', color:'rgba(255,255,255,.7)', fontSize:'.85rem' }}>
          {new Date().toLocaleDateString('en-PH', { weekday:'long', month:'long', day:'numeric', year:'numeric' })}
        </div>
      </header>

      {/* Main card */}
      <main style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:`0 24px ${showIdle ? 80 : 40}px` }}>
        <div style={{ background:'#fff', borderRadius:20, padding:36, width:'100%', maxWidth:820, boxShadow:'0 24px 60px rgba(0,0,0,.25)' }}>

          {ticket ? (
            <TicketScreen entry={ticket} onDone={resetAll} />
          ) : (
            <>
              {/* Step 0: Student Lookup */}
              {step === 0 && (
                <StudentLookup
                  onFound={handleStudentFound}
                  onSkip={handleSkipLookup}
                />
              )}

              {/* Step 1: Find Teacher */}
              {step === 1 && (
                <div>
                  <StepBar step={0} />
                  <FacultyFinder onSelect={handleTeacherSelect} />
                </div>
              )}

              {/* Step 2: Student Details */}
              {step === 2 && (
                <div style={{ maxWidth:460, margin:'0 auto' }}>
                  <StepBar step={1} />
                  <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setStep(1)}>← Back</button>
                    <div>
                      <h2 style={{ fontSize:'1.3rem', fontWeight:800, color:'var(--sti-dark)' }}>Your Details</h2>
                      <p style={{ color:'var(--gray-500)', fontSize:'.85rem' }}>
                        Paging: <strong>{selected.teacher?.name}</strong>
                      </p>
                    </div>
                  </div>

                  {student && (
                    <div style={{ background:'var(--sti-light)', borderRadius:10, padding:'10px 14px', marginBottom:16, fontSize:'.85rem', color:'var(--sti-dark)' }}>
                      ✅ Details auto-filled from student records.{' '}
                      {student.program && <span style={{ color:'var(--gray-500)' }}>{student.program} – {student.section}</span>}
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input
                      className="form-input"
                      placeholder="e.g. Juan dela Cruz"
                      value={form.student_name}
                      onChange={e => setForm(f => ({ ...f, student_name: e.target.value }))}
                      readOnly={!!student}
                      style={student ? { background:'var(--gray-50)', cursor:'default' } : {}}
                      autoFocus={!student}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Student ID</label>
                    <input
                      className="form-input"
                      placeholder="e.g. 02000123456"
                      value={form.student_id}
                      onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))}
                      readOnly={!!student}
                      style={student ? { background:'var(--gray-50)', cursor:'default' } : {}}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Purpose of Visit *</label>
                    <select className="form-select" value={form.purpose}
                      onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}>
                      {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Additional Note <span style={{ color:'var(--gray-400)' }}>(optional)</span></label>
                    <textarea className="form-textarea"
                      placeholder="Anything the teacher should know?"
                      value={form.note}
                      onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                    />
                  </div>
                  <button
                    className="btn btn-primary btn-lg"
                    style={{ width:'100%' }}
                    onClick={() => {
                      if (!form.student_name.trim()) { show('Please enter your name', 'error'); return; }
                      setStep(3); resetIdle();
                    }}
                  >
                    Next →
                  </button>
                </div>
              )}

              {/* Step 3: Confirm */}
              {step === 3 && (
                <div style={{ maxWidth:460, margin:'0 auto', textAlign:'center' }}>
                  <StepBar step={2} />
                  <div style={{ marginBottom:20 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setStep(2)} style={{ display:'inline-flex' }}>← Back</button>
                  </div>
                  <FacultyAvatar photo={selected.teacher?.photo} name={selected.teacher?.name} size={88} />
                  <div style={{ marginTop:12, marginBottom:24 }}>
                    <h2 style={{ fontSize:'1.4rem', fontWeight:800, color:'var(--sti-dark)' }}>{selected.teacher?.name}</h2>
                    {selected.teacher?.designation && (
                      <div style={{ color:'var(--gray-500)', fontSize:'.9rem' }}>{selected.teacher.designation}</div>
                    )}
                    <div style={{ color:'var(--gray-500)', fontSize:'.85rem' }}>{selected.teacher?.department_name}</div>
                  </div>
                  <div style={{ background:'var(--gray-50)', border:'1px solid var(--gray-200)', borderRadius:12, padding:20, marginBottom:24, textAlign:'left' }}>
                    <InfoRow label="Your Name"   value={form.student_name} />
                    {form.student_id && <InfoRow label="Student ID" value={form.student_id} />}
                    {student?.program && <InfoRow label="Program" value={`${student.program} – ${student.section}`} />}
                    <InfoRow label="Purpose"     value={form.purpose} />
                    {form.note && <InfoRow label="Note" value={form.note} />}
                  </div>
                  <p style={{ fontSize:'.85rem', color:'var(--gray-500)', marginBottom:16 }}>
                    By confirming, you will be placed in the teacher's queue.
                  </p>
                  <button className="btn btn-primary btn-lg" style={{ width:'100%' }}
                    onClick={handleSubmit} disabled={submitting}>
                    {submitting ? 'Sending…' : '📣 Confirm & Page Teacher'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {showIdle && <IdleBar seconds={idleSeconds} />}
    </div>
  );
}