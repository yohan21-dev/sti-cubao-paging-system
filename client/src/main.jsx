import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';

import Outside from './pages/Outside.jsx';
import Faculty from './pages/Faculty.jsx';
import Login   from './pages/Login.jsx';
import Admin   from './pages/Admin.jsx';
import { AuthProvider, useAuth } from './components/AuthContext.jsx';

function PrivateRoute({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/admin/login" replace />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/outside" element={<Outside />} />
          <Route path="/faculty" element={<Faculty />} />
          <Route path="/admin/login" element={<Login />} />
          <Route path="/admin/*" element={
            <PrivateRoute><Admin /></PrivateRoute>
          } />
          <Route path="*" element={<Navigate to="/outside" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);
