import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getStaffHomeRoute } from '../lib/roleDefinitions';
import { Home, Newspaper, Plus, Search, User, Briefcase, Building2, ShieldCheck, PhoneCall, ClipboardCheck } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { language, user, profile, isAdmin } = useAuth();
  const location = useLocation();
  const path = location.pathname;

  const staffDestination = user
    ? isAdmin
      ? '/admin/dashboard'
      : getStaffHomeRoute(profile, user.email)
    : '/';

  const renderRoleNavSlot = () => {
    if (staffDestination === '/admin/dashboard') {
      const active = path.startsWith('/admin/dashboard');
      return (
        <Link
          to="/admin/dashboard"
          className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-full text-[11px] transition ${
            active ? 'text-civic-700 bg-civic-50 font-bold' : 'text-slate-500 hover:text-civic-800 font-medium'
          }`}
        >
          <ShieldCheck className="w-4 h-4 mb-0.5" />
          <span>{language === 'hi' ? 'एडमिन' : 'Admin'}</span>
        </Link>
      );
    }

    if (staffDestination === '/municipal/dashboard') {
      const active = path.startsWith('/municipal/dashboard');
      return (
        <Link
          to="/municipal/dashboard"
          className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-full text-[11px] transition ${
            active ? 'text-civic-700 bg-civic-50 font-bold' : 'text-slate-500 hover:text-civic-800 font-medium'
          }`}
        >
          <Building2 className="w-4 h-4 mb-0.5" />
          <span>{language === 'hi' ? 'नगर' : 'Municipal'}</span>
        </Link>
      );
    }

    if (staffDestination === '/control-room') {
      const active = path.startsWith('/control-room');
      return (
        <Link
          to="/control-room"
          className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-full text-[11px] transition ${
            active ? 'text-civic-700 bg-civic-50 font-bold' : 'text-slate-500 hover:text-civic-800 font-medium'
          }`}
        >
          <PhoneCall className="w-4 h-4 mb-0.5" />
          <span>{language === 'hi' ? 'कंट्रोल' : 'Control'}</span>
        </Link>
      );
    }

    if (staffDestination === '/verifier') {
      const active = path.startsWith('/verifier');
      return (
        <Link
          to="/verifier"
          className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-full text-[11px] transition ${
            active ? 'text-civic-700 bg-civic-50 font-bold' : 'text-slate-500 hover:text-civic-800 font-medium'
          }`}
        >
          <ClipboardCheck className="w-4 h-4 mb-0.5" />
          <span>{language === 'hi' ? 'सत्यापन' : 'Verify'}</span>
        </Link>
      );
    }

    if (staffDestination === '/dept/dashboard') {
      const active = path.startsWith('/dept/dashboard');
      return (
        <Link
          to="/dept/dashboard"
          className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-full text-[11px] transition ${
            active ? 'text-civic-700 bg-civic-50 font-bold' : 'text-slate-500 hover:text-civic-800 font-medium'
          }`}
        >
          <Briefcase className="w-4 h-4 mb-0.5" />
          <span>{language === 'hi' ? 'कार्य' : 'Tasks'}</span>
        </Link>
      );
    }

    return (
      <Link
        to="/track"
        className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-full text-[11px] transition ${
          path === '/track' ? 'text-civic-700 bg-civic-50 font-bold' : 'text-slate-500 hover:text-civic-800 font-medium'
        }`}
      >
        <Search className="w-4 h-4 mb-0.5" />
        <span>{language === 'hi' ? 'ट्रैक' : 'Track'}</span>
      </Link>
    );
  };

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bottom-nav-mask pt-4 pb-3 px-4 pointer-events-none">
      <nav className="max-w-md mx-auto bg-white/95 backdrop-blur-md border border-sand-200/90 shadow-float rounded-full px-2 py-1.5 flex items-center justify-between pointer-events-auto">
        <Link
          to="/"
          className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-full text-[11px] transition ${
            path === '/'
              ? 'text-civic-700 bg-civic-50 font-bold'
              : 'text-slate-500 hover:text-civic-800 font-medium'
          }`}
        >
          <Home className="w-4 h-4 mb-0.5" />
          <span>{language === 'hi' ? 'होम' : 'Home'}</span>
        </Link>

        <Link
          to="/news"
          className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-full text-[11px] transition ${
            path === '/news'
              ? 'text-civic-700 bg-civic-50 font-bold'
              : 'text-slate-500 hover:text-civic-800 font-medium'
          }`}
        >
          <Newspaper className="w-4 h-4 mb-0.5" />
          <span>{language === 'hi' ? 'समाचार' : 'News'}</span>
        </Link>

        {/* Center Elevated + Report Button */}
        <div className="px-1 -mt-5">
          <Link
            to="/complaint/new"
            className="w-14 h-14 rounded-full bg-gradient-to-br from-civic-600 to-civic-800 text-white shadow-lg shadow-civic-700/30 border-4 border-white flex flex-col items-center justify-center active:scale-95 transition"
            aria-label={language === 'hi' ? 'समस्या दर्ज करें' : 'Report Civic Issue'}
          >
            <Plus className="w-6 h-6" />
          </Link>
        </div>

        {renderRoleNavSlot()}

        <Link
          to={user ? '/profile' : '/auth'}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-full text-[11px] transition ${
            path === '/profile' || path === '/auth'
              ? 'text-civic-700 bg-civic-50 font-bold'
              : 'text-slate-500 hover:text-civic-800 font-medium'
          }`}
        >
          <User className="w-4 h-4 mb-0.5" />
          <span>{user ? (language === 'hi' ? 'खाता' : 'Account') : (language === 'hi' ? 'लॉगिन' : 'Login')}</span>
        </Link>
      </nav>
    </div>
  );
};
