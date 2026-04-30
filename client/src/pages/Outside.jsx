import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api.js';
import socket from '../socket.js';
import FacultyAvatar from '../components/FacultyAvatar.jsx';
import STILogo from '../components/STILogo.jsx';
import { useToast } from '../components/useToast.jsx';

const PURPOSES = ['Consultation', 'Document Signing', 'Grade Inquiry', 'Requirements', 'Complaint', 'Others'];
const IDLE_TIMEOUT = 35000; // ms — auto-reset on idle

// ── Step indicators ────────────────────────────────────────────
const STEPS = ['Department', 'Teacher', 'Details', 'Confirm'];

function StepBar({ step }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:0, marginBottom:32 }}>
      {STEPS.map((label, i) => {
        const active   = i === step;
        const done     = i <  step;
        return (
          <div key={i} style={{ display:'flex', alignItems:'center', flex: i < STEPS.length-1 ? 1 : 'none' }}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, minWidth:64 }}>
              <div style={{
                width:32, height:32, borderRadius:'50%',
                background: done ? 'var(--sti-green)' : active ? 'var(--sti-yellow)' : 'var(--gray-200)',
                color: done ? '#fff' : active ? 'var(--sti-dark)' : 'var(--gray-500)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontWeight:700, fontSize:'.85rem',
                transition:'all .2s',
              }}>
                {done ? '✓' : i + 1}
              </div>
              <span style={{ fontSize:'.72rem', fontWeight:600, color: active ? 'var(--sti-green)' : 'var(--gray-500)', whiteSpace:'nowrap' }}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex:1, height:2, background: done ? 'var(--sti-green)' : 'var(--gray-200)', margin:'0 4px', marginBottom:20, transition:'background .2s' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Idle countdown bar ─────────────────────────────────────────
function IdleBar({ seconds, total }) {
  const pct = ((total - seconds * 1000) / total) * 100;
  return (
    <div style={{ position:'fixed', bottom:0, left:0, right:0 }}>
      <div style={{ height:4, background:'var(--gray-200)' }}>
        <div style={{ height:4, background:'var(--sti-green)', width:`${100 - pct}%`, transition:'width 1s linear' }} />
      </div>
      <div style={{ background:'var(--gray-50)', padding:'8px 0', textAlign:'center', fontSize:'.8rem', color:'var(--gray-500)' }}>
        Screen resets in <strong>{Math.ceil((IDLE_TIMEOUT - pct / 100 * IDLE_TIMEOUT) / 1000)}s</strong> due to inactivity
      </div>
    </div>
  );
}

// ── Ticket / confirmation screen ──────────────────────────────
function TicketScreen({ entry, onDone }) {
  const [status, setStatus] = useState(entry.status);
  const [position, setPosition] = useState(entry.position);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    // Poll for status updates
    const interval = setInterval(async () => {
      try {
        const updated = await api.getQueueEntry(entry.id);
        setStatus(updated.status);
        setPosition(updated.position);
        if (['done', 'cancelled'].includes(updated.status)) {
          clearInterval(interval);
        }
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [entry.id]);

  async function handleCancel() {
    setCancelling(true);
    try {
      await api.cancelQueue(entry.id);
      onDone();
    } catch { setCancelling(false); }
  }

  const statusMessages = {
    waiting:      { icon:'⏳', label:'Waiting', desc:'Please wait — the teacher will be notified.', color:'var(--amber)' },
    acknowledged: { icon:'👀', label:'Seen!', desc:'The teacher has acknowledged your request. Please proceed.', color:'var(--blue)' },
    done:         { icon:'✅', label:'Done', desc:'Your visit has been completed. Have a great day!', color:'var(--sti-green)' },
    cancelled:    { icon:'❌', label:'Cancelled', desc:'This request was cancelled.', color:'var(--red)' },
  };
  const s = statusMessages[status] || statusMessages.waiting;

  return (
    <div style={{ textAlign:'center', maxWidth:480, margin:'0 auto' }}>
      <div style={{ fontSize:64, marginBottom:12 }}>{s.icon}</div>
      <div style={{ fontSize:'1.6rem', fontWeight:800, color:s.color, marginBottom:8 }}>{s.label}</div>
      <div style={{ fontSize:'1rem', color:'var(--gray-500)', marginBottom:28 }}>{s.desc}</div>

      <div style={{ background:'var(--gray-50)', border:'1px solid var(--gray-200)', borderRadius:12, padding:20, marginBottom:24, textAlign:'left' }}>
        <Row label="Teacher" value={entry.faculty_name} />
        <Row label="Queue #" value={`#${entry.queue_number}`} />
        {status === 'waiting' && position > 1 && (
          <Row label="People ahead" value={position - 1} />
        )}
        <Row label="Student" value={entry.student_name} />
        {entry.student_id && <Row label="ID" value={entry.student_id} />}
        <Row label="Purpose" value={entry.purpose} />
      </div>

      {['waiting', 'acknowledged'].includes(status) && (
        <button className="btn btn-danger btn-lg" onClick={handleCancel} disabled={cancelling} style={{ width:'100%' }}>
          {cancelling ? 'Cancelling…' : 'Cancel My Request'}
        </button>
      )}
      {['done', 'cancelled'].includes(status) && (
        <button className="btn btn-primary btn-lg" onClick={onDone} style={{ width:'100%' }}>
          Back to Home
        </button>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid var(--gray-100)', fontSize:'.9rem' }}>
      <span style={{ color:'var(--gray-500)', fontWeight:500 }}>{label}</span>
      <span style={{ fontWeight:600 }}>{value}</span>
    </div>
  );
}

// ── Main Outside Page ─────────────────────────────────────────
export default function Outside() {
  const [step, setStep]               = useState(0);
  const [departments, setDepartments] = useState([]);
  const [faculty, setFaculty]         = useState([]);
  const [selected, setSelected]       = useState({ dept:null, teacher:null });
  const [form, setForm]               = useState({ student_name:'', student_id:'', purpose:'Consultation', note:'' });
  const [submitting, setSubmitting]   = useState(false);
  const [ticket, setTicket]           = useState(null);
  const [loadingFaculty, setLoadingFaculty] = useState(false);
  const [idleSeconds, setIdleSeconds] = useState(0);
  const idleTimer   = useRef(null);
  const idleDisplay = useRef(null);
  const { show, ToastContainer } = useToast();

  // ── Load departments ──
  useEffect(() => {
    api.getDepartments().then(setDepartments).catch(() => {});
  }, []);

  // ── Socket.io — listen for DND updates ──
  useEffect(() => {
    socket.emit('join:outside');
    socket.on('faculty:dnd-update', ({ facultyId, dnd }) => {
      setFaculty(prev => prev.map(f => f.id === facultyId ? { ...f, dnd } : f));
    });
    return () => socket.off('faculty:dnd-update');
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
    setStep(0); setTicket(null);
    setSelected({ dept:null, teacher:null });
    setForm({ student_name:'', student_id:'', purpose:'Consultation', note:'' });
    setIdleSeconds(0);
    clearTimeout(idleTimer.current);
  }

  // ── Step 0 → 1: pick department ──
  async function pickDept(dept) {
    setSelected({ dept, teacher:null });
    setLoadingFaculty(true);
    setStep(1);
    try {
      const list = await api.getFacultyByDept(dept.id);
      setFaculty(list);
    } catch {
      show('Failed to load faculty', 'error');
    } finally {
      setLoadingFaculty(false);
    }
    resetIdle();
  }

  // ── Step 1 → 2: pick teacher ──
  function pickTeacher(teacher) {
    if (teacher.dnd) { show('This teacher is currently unavailable.', 'error'); return; }
    if (!teacher.available) { show('This teacher is not available right now.', 'error'); return; }
    setSelected(s => ({ ...s, teacher }));
    setStep(2);
    resetIdle();
  }

  // ── Step 2 → 3: fill form ──
  function handleFormNext(e) {
    e.preventDefault();
    if (!form.student_name.trim()) { show('Please enter your name', 'error'); return; }
    setStep(3);
    resetIdle();
  }

  // ── Step 3: submit ──
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

  // ── Render ──
  return (
    <div
      style={{ minHeight:'100vh', background:'linear-gradient(135deg, #003320 0%, #006837 60%, #1a8a50 100%)', display:'flex', flexDirection:'column' }}
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
      <main style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 24px 80px' }}>
        <div style={{ background:'#fff', borderRadius:20, padding:36, width:'100%', maxWidth:780, boxShadow:'0 24px 60px rgba(0,0,0,.25)' }}>

          {ticket ? (
            <TicketScreen entry={ticket} onDone={resetAll} />
          ) : (
            <>
              <StepBar step={step} />

              {/* Step 0 — Department */}
              {step === 0 && (
                <div>
                  <h2 style={{ fontSize:'1.4rem', fontWeight:800, marginBottom:6, color:'var(--sti-dark)' }}>Select Department</h2>
                  <p style={{ color:'var(--gray-500)', marginBottom:24, fontSize:'.9rem' }}>Which department is your teacher in?</p>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:14 }}>
                    {departments.map(d => (
                      <button key={d.id} onClick={() => pickDept(d)}
                        style={{
                          padding:'20px 16px', borderRadius:12, border:'2px solid var(--gray-200)',
                          background:'var(--gray-50)', fontWeight:700, fontSize:'1rem',
                          color:'var(--sti-dark)', cursor:'pointer', textAlign:'left',
                          transition:'all .15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor='var(--sti-green)'; e.currentTarget.style.background='var(--sti-light)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor='var(--gray-200)'; e.currentTarget.style.background='var(--gray-50)'; }}
                      >
                        <div style={{ fontSize:28, marginBottom:8 }}>🏫</div>
                        {d.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 1 — Pick Teacher */}
              {step === 1 && (
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setStep(0)}>← Back</button>
                    <div>
                      <h2 style={{ fontSize:'1.3rem', fontWeight:800, color:'var(--sti-dark)' }}>
                        {selected.dept?.name}
                      </h2>
                      <p style={{ color:'var(--gray-500)', fontSize:'.85rem' }}>Select a teacher to page</p>
                    </div>
                  </div>
                  {loadingFaculty ? (
                    <div style={{ padding:40, textAlign:'center' }}><div className="spinner" /></div>
                  ) : faculty.length === 0 ? (
                    <div style={{ textAlign:'center', padding:40, color:'var(--gray-500)' }}>No faculty found in this department.</div>
                  ) : (
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px,1fr))', gap:14 }}>
                      {faculty.map(f => {
                        const unavail = f.dnd || !f.available;
                        return (
                          <button key={f.id} onClick={() => pickTeacher(f)}
                            disabled={unavail}
                            style={{
                              padding:'20px 12px', borderRadius:12,
                              border:`2px solid ${unavail ? 'var(--gray-200)' : 'var(--gray-200)'}`,
                              background: unavail ? 'var(--gray-50)' : '#fff',
                              opacity: unavail ? .55 : 1,
                              cursor: unavail ? 'not-allowed' : 'pointer',
                              display:'flex', flexDirection:'column', alignItems:'center', gap:10,
                              transition:'all .15s',
                            }}
                            onMouseEnter={e => { if (!unavail) { e.currentTarget.style.borderColor='var(--sti-green)'; e.currentTarget.style.transform='translateY(-2px)'; } }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor='var(--gray-200)'; e.currentTarget.style.transform='none'; }}
                          >
                            <FacultyAvatar photo={f.photo} name={f.name} size={64} />
                            <div style={{ textAlign:'center' }}>
                              <div style={{ fontWeight:700, fontSize:'.88rem', color:'var(--gray-900)', lineHeight:1.3 }}>{f.name}</div>
                              {f.designation && <div style={{ fontSize:'.75rem', color:'var(--gray-500)', marginTop:2 }}>{f.designation}</div>}
                            </div>
                            {unavail
                              ? <span className="badge badge-red">{f.dnd ? 'Do Not Disturb' : 'Unavailable'}</span>
                              : f.queue_count > 0
                                ? <span className="badge badge-amber">{f.queue_count} in queue</span>
                                : <span className="badge badge-green">Available</span>
                            }
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Step 2 — Student Details */}
              {step === 2 && (
                <div style={{ maxWidth:460, margin:'0 auto' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setStep(1)}>← Back</button>
                    <div>
                      <h2 style={{ fontSize:'1.3rem', fontWeight:800, color:'var(--sti-dark)' }}>Your Details</h2>
                      <p style={{ color:'var(--gray-500)', fontSize:'.85rem' }}>Paging: <strong>{selected.teacher?.name}</strong></p>
                    </div>
                  </div>
                  <form onSubmit={handleFormNext}>
                    <div className="form-group">
                      <label className="form-label">Full Name *</label>
                      <input className="form-input" placeholder="e.g. Juan dela Cruz"
                        value={form.student_name}
                        onChange={e => setForm(f => ({ ...f, student_name: e.target.value }))}
                        autoFocus
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Student ID <span style={{ color:'var(--gray-400)' }}>(optional)</span></label>
                      <input className="form-input" placeholder="e.g. 2023-12345"
                        value={form.student_id}
                        onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))}
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
                      <textarea className="form-textarea" placeholder="Anything else the teacher should know?"
                        value={form.note}
                        onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                      />
                    </div>
                    <button type="submit" className="btn btn-primary btn-lg" style={{ width:'100%' }}>
                      Next →
                    </button>
                  </form>
                </div>
              )}

              {/* Step 3 — Confirm */}
              {step === 3 && (
                <div style={{ maxWidth:460, margin:'0 auto', textAlign:'center' }}>
                  <div style={{ marginBottom:20 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setStep(2)} style={{ display:'inline-flex' }}>← Back</button>
                  </div>
                  <FacultyAvatar photo={selected.teacher?.photo} name={selected.teacher?.name} size={88} />
                  <div style={{ marginTop:12, marginBottom:24 }}>
                    <h2 style={{ fontSize:'1.4rem', fontWeight:800, color:'var(--sti-dark)' }}>{selected.teacher?.name}</h2>
                    {selected.teacher?.designation && (
                      <div style={{ color:'var(--gray-500)', fontSize:'.9rem' }}>{selected.teacher.designation}</div>
                    )}
                    <div style={{ color:'var(--gray-500)', fontSize:'.85rem' }}>{selected.dept?.name}</div>
                  </div>
                  <div style={{ background:'var(--gray-50)', border:'1px solid var(--gray-200)', borderRadius:12, padding:20, marginBottom:24, textAlign:'left' }}>
                    <Row label="Your Name"   value={form.student_name} />
                    {form.student_id && <Row label="Student ID" value={form.student_id} />}
                    <Row label="Purpose"     value={form.purpose} />
                    {form.note && <Row label="Note" value={form.note} />}
                  </div>
                  <p style={{ fontSize:'.85rem', color:'var(--gray-500)', marginBottom:16 }}>
                    By confirming, you will be placed in the teacher's queue and they will be notified.
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

      {/* Idle bar */}
      {step > 0 && !ticket && (
        <IdleBar seconds={idleSeconds} total={IDLE_TIMEOUT} />
      )}
    </div>
  );
}
