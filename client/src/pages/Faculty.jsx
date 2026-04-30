import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../api.js';
import socket from '../socket.js';
import FacultyAvatar from '../components/FacultyAvatar.jsx';
import STILogo from '../components/STILogo.jsx';

const CHIME_URL = 'https://cdn.freesound.org/previews/220/220174_4100837-lq.mp3';

// ── Sound / TTS helpers ────────────────────────────────────────
function playChime() {
  try {
    const audio = new Audio(CHIME_URL);
    audio.volume = 0.8;
    audio.play().catch(() => {});
  } catch {}
}

function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang  = 'en-PH';
  utt.rate  = 0.88;
  utt.pitch = 1.05;
  window.speechSynthesis.speak(utt);
}

// ── Page-alert popup card ─────────────────────────────────────
function PageAlert({ entry, onAcknowledge, onDone }) {
  const [acking,  setAcking]  = useState(false);
  const [marking, setMarking] = useState(false);

  async function handleAck() {
    setAcking(true);
    try { await api.acknowledgeQueue(entry.id); }
    catch { setAcking(false); }
  }
  async function handleDone() {
    setMarking(true);
    try { await api.doneQueue(entry.id); }
    catch { setMarking(false); }
  }

  const purposeColors = {
    Consultation:       { bg:'#DBEAFE', color:'#1D4ED8' },
    'Document Signing': { bg:'#FEF3C7', color:'#92400E' },
    'Grade Inquiry':    { bg:'#D1FAE5', color:'#065F46' },
    Requirements:       { bg:'#EDE9FE', color:'#5B21B6' },
    Complaint:          { bg:'#FEE2E2', color:'#991B1B' },
    Others:             { bg:'#F3F4F6', color:'#374151' },
  };
  const pc = purposeColors[entry.purpose] || purposeColors.Others;

  return (
    <div style={{
      background:'#fff', borderRadius:16, padding:24,
      boxShadow:'0 8px 32px rgba(0,0,0,.18)',
      border:'3px solid var(--sti-green)',
      display:'flex', flexDirection:'column', gap:14,
      animation:'popIn .3s cubic-bezier(.34,1.56,.64,1)',
      position:'relative', overflow:'hidden',
    }}>
      {/* Green accent bar */}
      <div style={{ position:'absolute', top:0, left:0, right:0, height:4, background:'var(--sti-green)' }} />

      {/* Faculty info */}
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <FacultyAvatar photo={entry.faculty_photo} name={entry.faculty_name} size={52} />
        <div>
          <div style={{ fontWeight:800, fontSize:'1rem', color:'var(--sti-dark)' }}>{entry.faculty_name}</div>
          <div style={{ fontSize:'.78rem', color:'var(--gray-500)' }}>{entry.department_name}</div>
        </div>
        <span style={{ marginLeft:'auto', fontWeight:800, fontSize:'1.4rem', color:'var(--sti-green)' }}>
          #{entry.queue_number}
        </span>
      </div>

      <hr style={{ border:'none', borderTop:'1px solid var(--gray-100)' }} />

      {/* Student info */}
      <div>
        <div style={{ fontSize:'.72rem', fontWeight:700, color:'var(--gray-400)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>Student</div>
        <div style={{ fontWeight:700, fontSize:'1.05rem' }}>{entry.student_name}</div>
        {entry.student_id && <div style={{ fontSize:'.82rem', color:'var(--gray-500)' }}>ID: {entry.student_id}</div>}
      </div>

      {/* Purpose */}
      <div style={{ display:'inline-flex', alignItems:'center' }}>
        <span style={{ padding:'4px 12px', borderRadius:99, fontSize:'.8rem', fontWeight:700, background:pc.bg, color:pc.color }}>
          {entry.purpose}
        </span>
      </div>

      {entry.note && (
        <div style={{ background:'var(--gray-50)', borderRadius:8, padding:'8px 12px', fontSize:'.82rem', color:'var(--gray-600)', fontStyle:'italic' }}>
          "{entry.note}"
        </div>
      )}

      {/* Status badge */}
      {entry.status === 'acknowledged' && (
        <span className="badge badge-blue" style={{ alignSelf:'flex-start' }}>👀 Acknowledged</span>
      )}

      {/* Actions */}
      <div style={{ display:'flex', gap:8 }}>
        {entry.status === 'waiting' && (
          <button className="btn btn-primary btn-sm" style={{ flex:1 }} onClick={handleAck} disabled={acking}>
            {acking ? '…' : '👀 Acknowledge'}
          </button>
        )}
        <button className="btn btn-secondary btn-sm" style={{ flex:1 }} onClick={handleDone} disabled={marking}>
          {marking ? '…' : '✅ Mark Done'}
        </button>
      </div>

      <div style={{ fontSize:'.72rem', color:'var(--gray-400)', textAlign:'right' }}>
        {new Date(entry.created_at).toLocaleTimeString('en-PH', { hour:'2-digit', minute:'2-digit' })}
      </div>
    </div>
  );
}

// ── DND faculty row ────────────────────────────────────────────
function FacultyRow({ f, onToggleDND }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0', borderBottom:'1px solid var(--gray-100)' }}>
      <FacultyAvatar photo={f.photo} name={f.name} size={36} />
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight:600, fontSize:'.88rem', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{f.name}</div>
        <div style={{ fontSize:'.72rem', color:'var(--gray-500)' }}>{f.designation || f.department_name}</div>
      </div>
      {f.queue_count > 0 && (
        <span className="badge badge-amber" style={{ fontSize:'.7rem' }}>{f.queue_count}</span>
      )}
      <button
        onClick={() => onToggleDND(f)}
        style={{
          padding:'4px 10px', borderRadius:99, fontSize:'.72rem', fontWeight:700, border:'1.5px solid',
          borderColor: f.dnd ? 'var(--red)' : 'var(--gray-300)',
          background: f.dnd ? 'var(--red-light)' : 'var(--gray-50)',
          color: f.dnd ? 'var(--red)' : 'var(--gray-500)',
          cursor:'pointer', whiteSpace:'nowrap',
        }}
      >
        {f.dnd ? '🔕 DND' : '🔔 Active'}
      </button>
    </div>
  );
}

// ── Main Faculty Room Page ─────────────────────────────────────
export default function Faculty() {
  const [queue,   setQueue]   = useState([]);   // active page entries
  const [faculty, setFaculty] = useState([]);   // all faculty for sidebar
  const [settings, setSettings] = useState({ sound_mode:'both' });
  const [time, setTime]       = useState(new Date());
  const soundEnabled = useRef(true);

  // ── Clock ──
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Initial load ──
  useEffect(() => {
    api.getActiveQueue().then(setQueue).catch(() => {});
    api.getFacultyDisplay().then(setFaculty).catch(() => {});
    api.getSettings().then(s => setSettings(s)).catch(() => {});
  }, []);

  // ── Notification ──
  const notify = useCallback((entry) => {
    const mode = settings.sound_mode;
    if ((mode === 'chime' || mode === 'both') && soundEnabled.current) playChime();
    if (mode === 'tts' || mode === 'both') {
      const msg = `Attention, ${entry.faculty_name}. A student is waiting for you. ${entry.student_name}, ${entry.purpose}.`;
      speak(msg);
    }
    // Browser notification
    if (Notification.permission === 'granted') {
      new Notification(`📣 Page for ${entry.faculty_name}`, {
        body: `${entry.student_name} — ${entry.purpose}`,
        icon: '/favicon.ico',
      });
    }
  }, [settings]);

  // ── Request notification permission ──
  useEffect(() => {
    if (Notification.permission === 'default') Notification.requestPermission();
  }, []);

  // ── Socket.io ──
  useEffect(() => {
    socket.emit('join:faculty-room');

    socket.on('page:new', (entry) => {
      setQueue(prev => {
        if (prev.find(q => q.id === entry.id)) return prev;
        return [...prev, entry];
      });
      setFaculty(prev => prev.map(f =>
        f.id === entry.faculty_id ? { ...f, queue_count: (f.queue_count || 0) + 1 } : f
      ));
      notify(entry);
    });

    socket.on('page:acknowledged', ({ id }) => {
      setQueue(prev => prev.map(q => q.id === id ? { ...q, status:'acknowledged' } : q));
    });

    socket.on('page:done', ({ id }) => {
      setQueue(prev => {
        const entry = prev.find(q => q.id === id);
        if (entry) {
          setFaculty(f => f.map(fc =>
            fc.id === entry.faculty_id ? { ...fc, queue_count: Math.max(0, (fc.queue_count||1) - 1) } : fc
          ));
        }
        return prev.filter(q => q.id !== id);
      });
    });

    socket.on('page:cancelled', ({ id }) => {
      setQueue(prev => prev.filter(q => q.id !== id));
    });

    socket.on('faculty:dnd-update', ({ facultyId, dnd }) => {
      setFaculty(prev => prev.map(f => f.id === facultyId ? { ...f, dnd } : f));
    });

    return () => {
      socket.off('page:new');
      socket.off('page:acknowledged');
      socket.off('page:done');
      socket.off('page:cancelled');
      socket.off('faculty:dnd-update');
    };
  }, [notify]);

  async function toggleDND(f) {
    const newDND = !f.dnd;
    setFaculty(prev => prev.map(fc => fc.id === f.id ? { ...fc, dnd: newDND } : fc));
    try { await api.setDND(f.id, newDND); }
    catch { setFaculty(prev => prev.map(fc => fc.id === f.id ? { ...fc, dnd: f.dnd } : fc)); }
  }

  const alertEntries = queue.filter(q => ['waiting','acknowledged'].includes(q.status));

  return (
    <div style={{ display:'flex', height:'100vh', background:'var(--gray-100)', overflow:'hidden' }}>
      <style>{`
        @keyframes popIn {
          from { transform: scale(.85) translateY(20px); opacity: 0; }
          to   { transform: scale(1)   translateY(0);    opacity: 1; }
        }
      `}</style>

      {/* ── Left: Active Alerts ── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {/* Header */}
        <div style={{ background:'var(--sti-green)', padding:'16px 24px', display:'flex', alignItems:'center', gap:14, flexShrink:0 }}>
          <STILogo size={40} />
          <div style={{ color:'#fff' }}>
            <div style={{ fontWeight:800, fontSize:'1.1rem' }}>Faculty Room Display</div>
            <div style={{ fontSize:'.8rem', opacity:.75 }}>STI College Cubao</div>
          </div>
          <div style={{ marginLeft:'auto', color:'#fff', textAlign:'right' }}>
            <div style={{ fontWeight:700, fontSize:'1.4rem', lineHeight:1 }}>
              {time.toLocaleTimeString('en-PH', { hour:'2-digit', minute:'2-digit', second:'2-digit' })}
            </div>
            <div style={{ fontSize:'.75rem', opacity:.75 }}>
              {time.toLocaleDateString('en-PH', { weekday:'short', month:'short', day:'numeric' })}
            </div>
          </div>
        </div>

        {/* Alerts grid */}
        <div style={{ flex:1, overflowY:'auto', padding:20 }}>
          {alertEntries.length === 0 ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', color:'var(--gray-400)' }}>
              <div style={{ fontSize:72, marginBottom:12 }}>🔔</div>
              <div style={{ fontSize:'1.1rem', fontWeight:600 }}>No active pages</div>
              <div style={{ fontSize:'.85rem', marginTop:4 }}>Student pages will appear here in real-time</div>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:16 }}>
              {alertEntries.map(entry => (
                <PageAlert key={entry.id} entry={entry}
                  onAcknowledge={() => {}}
                  onDone={() => {}}
                />
              ))}
            </div>
          )}
        </div>

        {/* Sound toggle bar */}
        <div style={{ background:'#fff', borderTop:'1px solid var(--gray-200)', padding:'10px 20px', display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
          <span style={{ fontSize:'.82rem', color:'var(--gray-500)', fontWeight:500 }}>Sound:</span>
          <button
            onClick={() => { soundEnabled.current = !soundEnabled.current; }}
            style={{ padding:'4px 14px', borderRadius:99, fontSize:'.8rem', fontWeight:600, border:'1.5px solid var(--gray-200)', background:'var(--gray-50)', cursor:'pointer' }}
          >
            🔊 Toggle Sound
          </button>
          <span style={{ fontSize:'.75rem', color:'var(--gray-400)', marginLeft:'auto' }}>
            Mode: <strong>{settings.sound_mode}</strong>
          </span>
          <span style={{ fontSize:'.75rem', color:'var(--gray-400)' }}>
            Active alerts: <strong>{alertEntries.length}</strong>
          </span>
        </div>
      </div>

      {/* ── Right: Faculty sidebar ── */}
      <div style={{ width:300, background:'#fff', borderLeft:'1px solid var(--gray-200)', display:'flex', flexDirection:'column', overflow:'hidden', flexShrink:0 }}>
        <div style={{ padding:'16px 16px 12px', borderBottom:'1px solid var(--gray-100)', background:'var(--sti-light)' }}>
          <div style={{ fontWeight:700, fontSize:'.95rem', color:'var(--sti-dark)' }}>Faculty Status</div>
          <div style={{ fontSize:'.75rem', color:'var(--gray-500)', marginTop:2 }}>Toggle DND per teacher</div>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'0 16px' }}>
          {faculty.map(f => (
            <FacultyRow key={f.id} f={f} onToggleDND={toggleDND} />
          ))}
        </div>
        <div style={{ padding:'12px 16px', borderTop:'1px solid var(--gray-100)', background:'var(--gray-50)' }}>
          <div style={{ fontSize:'.72rem', color:'var(--gray-400)', textAlign:'center' }}>
            DND hides teacher from student kiosk
          </div>
        </div>
      </div>
    </div>
  );
}
