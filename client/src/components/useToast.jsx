import { useState, useCallback } from 'react';
import ReactDOM from 'react-dom';

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const show = useCallback((message, type = 'default', duration = 2800) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  const ToastContainer = () =>
    ReactDOM.createPortal(
      <div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', display:'flex', flexDirection:'column', gap:8, zIndex:9999 }}>
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>{t.message}</div>
        ))}
      </div>,
      document.body
    );

  return { show, ToastContainer };
}
