import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken]   = useState(() => localStorage.getItem('ps_token'));
  const [user,  setUser]    = useState(null);
  const [ready, setReady]   = useState(false);

  useEffect(() => {
    if (!token) { setReady(true); return; }
    api.me(token)
      .then(u => { setUser(u); setReady(true); })
      .catch(() => { logout(); setReady(true); });
  }, []); // eslint-disable-line

  function login(tok, userData) {
    localStorage.setItem('ps_token', tok);
    setToken(tok);
    setUser(userData);
  }

  function logout() {
    localStorage.removeItem('ps_token');
    setToken(null);
    setUser(null);
  }

  if (!ready) return null;

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
