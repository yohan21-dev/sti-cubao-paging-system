import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../api/axios.js';
import { useSocket } from '../hooks/useSocket.js';

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString();
}

function StatusBadge({ status }) {
  const map = {
    pending: 'badge-pending',
    resolved: 'badge-resolved',
    cancelled: 'badge-cancelled',
  };
  return (
    <span className={map[status] || 'badge-pending'}>
      {status?.charAt(0).toUpperCase() + status?.slice(1)}
    </span>
  );
}

function PageEntry({ page, isNew }) {
  return (
    <div
      className={`card p-5 transition-all duration-500 ${
        isNew ? 'animate-pulse-gold border-sti-gold border-2 animate-fade-in' : 'animate-fade-in'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sti-blue to-sti-blue-light flex items-center justify-center flex-shrink-0 shadow-md">
            <span className="text-white font-bold text-sm">
              {(page.teacher?.name || page.teacherName || '?')
                .split(' ')
                .slice(0, 2)
                .map((n) => n[0])
                .join('')
                .toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="font-bold text-gray-900 text-base leading-tight">
              {page.teacher?.name || page.teacherName || 'Unknown Teacher'}
            </p>
            <p className="text-sm text-sti-blue font-medium">
              {page.teacher?.department?.name || page.departmentName || ''}
            </p>
            {page.studentName && (
              <p className="text-sm text-gray-500 mt-0.5">
                <span className="font-medium text-gray-600">From:</span> {page.studentName}
              </p>
            )}
            {page.message && (
              <p className="text-sm text-gray-500 mt-1 italic">"{page.message}"</p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <StatusBadge status={page.status} />
          <span className="text-xs text-gray-400">{timeAgo(page.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}

export default function DisplayScreen() {
  const [pages, setPages] = useState([]);
  const [newPageIds, setNewPageIds] = useState(new Set());
  const [isConnected, setIsConnected] = useState(false);
  const [clock, setClock] = useState(new Date());
  const socketRef = useSocket('display');
  const newPageTimeout = useRef({});

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchPages = useCallback(async () => {
    try {
      const res = await api.get('/api/pages?status=pending');
      setPages(res.data);
    } catch {
      // silently ignore on display screen
    }
  }, []);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    socket.on('new_page', (page) => {
      setPages((prev) => {
        const exists = prev.some((p) => (p._id || p.id) === (page._id || page.id));
        return exists ? prev : [page, ...prev];
      });
      const id = page._id || page.id;
      setNewPageIds((prev) => new Set([...prev, id]));
      if (newPageTimeout.current[id]) clearTimeout(newPageTimeout.current[id]);
      newPageTimeout.current[id] = setTimeout(() => {
        setNewPageIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }, 5000);
    });

    socket.on('page_updated', (updated) => {
      setPages((prev) =>
        prev.map((p) => ((p._id || p.id) === (updated._id || updated.id) ? updated : p))
      );
    });

    socket.on('page_deleted', (id) => {
      setPages((prev) => prev.filter((p) => (p._id || p.id) !== id));
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('new_page');
      socket.off('page_updated');
      socket.off('page_deleted');
    };
  }, [socketRef]);

  const pendingPages = pages.filter((p) => p.status === 'pending');

  return (
    <div className="min-h-screen bg-sti-blue flex flex-col">
      {/* Top bar */}
      <div className="bg-sti-blue-dark border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-sti-gold rounded-full flex items-center justify-center shadow-lg">
              <span className="text-sti-blue font-black text-sm">STI</span>
            </div>
            <div>
              <p className="text-white font-black text-xl tracking-tight">STI College Cubao</p>
              <p className="text-sti-gold text-xs font-semibold tracking-widest uppercase">
                Faculty Paging System
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-white font-mono text-2xl font-bold tabular-nums">
              {clock.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
            <p className="text-blue-300 text-sm">
              {clock.toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      {/* Incoming Pages Header */}
      <div className="bg-sti-gold py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-7 h-7 text-sti-blue animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <h1 className="text-sti-blue font-black text-2xl tracking-wide uppercase">
              Incoming Pages
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 text-sm font-semibold ${isConnected ? 'text-sti-blue' : 'text-red-700'}`}>
              <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-green-600' : 'bg-red-600'} ${isConnected ? 'animate-pulse' : ''}`} />
              {isConnected ? 'Live' : 'Reconnecting...'}
            </div>
            <span className="bg-sti-blue text-white text-sm font-bold px-3 py-1 rounded-full">
              {pendingPages.length} pending
            </span>
          </div>
        </div>
      </div>

      {/* Pages list */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-6 py-6">
        {pendingPages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-white/40 select-none">
            <svg className="w-20 h-20 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <p className="text-xl font-semibold">No pending pages</p>
            <p className="text-sm mt-1">Waiting for incoming page requests...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {pendingPages.map((page) => (
              <PageEntry
                key={page._id || page.id}
                page={page}
                isNew={newPageIds.has(page._id || page.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Ticker footer */}
      <div className="bg-sti-blue-dark border-t border-white/10 py-3 overflow-hidden">
        <div className="flex animate-[marquee_30s_linear_infinite] whitespace-nowrap">
          {Array.from({ length: 4 }).map((_, i) => (
            <span key={i} className="text-sti-gold/70 text-sm font-medium px-8">
              STI College Cubao • Faculty Paging System • For inquiries, approach the nearest faculty office •&nbsp;
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
