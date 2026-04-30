import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { isAuthenticated, logout } = useAuth();
  const location = useLocation();

  const isDisplay = location.pathname === '/display';
  if (isDisplay) return null;

  const linkClass = (path) =>
    `text-sm font-medium transition-colors duration-150 px-3 py-1.5 rounded-md ${
      location.pathname === path
        ? 'bg-sti-gold text-sti-blue'
        : 'text-white hover:bg-white/10'
    }`;

  return (
    <nav className="bg-sti-blue shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-sti-gold rounded-full flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <span className="text-sti-blue font-black text-sm leading-none">STI</span>
            </div>
            <div className="leading-tight">
              <p className="text-white font-bold text-base">STI Cubao</p>
              <p className="text-sti-gold text-[10px] font-medium tracking-wider uppercase">
                Faculty Paging System
              </p>
            </div>
          </Link>

          {/* Nav Links */}
          <div className="flex items-center gap-1">
            <Link to="/" className={linkClass('/')}>
              Student Paging
            </Link>
            <Link to="/display" className={linkClass('/display')}>
              Display Screen
            </Link>
            {isAuthenticated ? (
              <>
                <Link to="/admin" className={linkClass('/admin')}>
                  Dashboard
                </Link>
                <button
                  onClick={logout}
                  className="ml-2 text-sm font-medium text-sti-blue bg-sti-gold hover:bg-sti-gold-dark px-3 py-1.5 rounded-md transition-colors duration-150"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link to="/admin/login" className={linkClass('/admin/login')}>
                Admin
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
