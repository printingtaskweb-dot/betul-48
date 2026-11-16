import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Landmark, Globe, ArrowLeft, Plus, LogOut } from 'lucide-react';

interface CivicHeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  backTo?: string;
  actionButton?: React.ReactNode;
}

export const CivicHeader: React.FC<CivicHeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  backTo,
  actionButton,
}) => {
  const { language, setLanguage, user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleBack = () => {
    if (backTo) {
      navigate(backTo);
    } else {
      navigate(-1);
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'hi' : 'en');
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <header className="sticky top-0 z-40 bg-sand-50/95 backdrop-blur-md border-b border-sand-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Left: Back button + Crest & Brand */}
        <div className="flex items-center gap-3 min-w-0">
          {showBack && (
            <button
              type="button"
              onClick={handleBack}
              className="w-9 h-9 rounded-full bg-white hover:bg-sand-100 text-civic-900 border border-sand-200 flex items-center justify-center transition shadow-2xs shrink-0 cursor-pointer active:scale-95"
              aria-label="Go Back"
              title="Go Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <Link to="/" className="flex items-center gap-3 min-w-0 text-decoration-none">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-civic-600 to-civic-800 text-white flex items-center justify-center shadow-sm shrink-0">
              <Landmark className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-civic-950 truncate">
                  Betul 311
                </span>
                <span className="hidden sm:inline-block text-[11px] font-semibold px-2 py-0.5 rounded-md bg-civic-100 text-civic-800">
                  betulnagar.co.in
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium truncate">
                {subtitle ||
                  (language === 'hi'
                    ? 'जिला बैतूल • नगर पालिका परिषद'
                    : 'Jila Betul • Nagar Palika Parishad')}
              </p>
            </div>
          </Link>

          {title && (
            <div className="hidden md:flex items-center pl-2 border-l border-sand-200">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-civic-100 text-civic-900 border border-civic-200">
                {title}
              </span>
            </div>
          )}
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <nav className="hidden lg:flex items-center gap-1 mr-2 bg-white/90 p-1 rounded-full border border-sand-200 shadow-2xs">
            <Link
              to="/"
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-600 hover:text-civic-900 hover:bg-sand-100 transition text-decoration-none"
            >
              {language === 'hi' ? 'होम' : 'Home'}
            </Link>
            <Link
              to="/complaint/new"
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-600 hover:text-civic-900 hover:bg-sand-100 transition text-decoration-none"
            >
              {language === 'hi' ? 'शिकायत' : 'Report'}
            </Link>
            <Link
              to="/track"
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-600 hover:text-civic-900 hover:bg-sand-100 transition text-decoration-none"
            >
              {language === 'hi' ? 'ट्रैक' : 'Track'}
            </Link>
            <Link
              to="/news"
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-600 hover:text-civic-900 hover:bg-sand-100 transition text-decoration-none"
            >
              {language === 'hi' ? 'समाचार' : 'News'}
            </Link>
          </nav>

          {actionButton}

          <button
            type="button"
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white hover:bg-civic-50 text-civic-900 border border-sand-200 shadow-2xs text-xs sm:text-sm font-semibold transition active:scale-95 cursor-pointer"
            aria-label="Switch Language"
          >
            <Globe className="w-4 h-4 text-civic-600" />
            <span>{language === 'en' ? 'हिन्दी' : 'English'}</span>
          </button>

          {!actionButton && (
            <Link
              to="/complaint/new"
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-full bg-civic-700 hover:bg-civic-800 text-white text-xs sm:text-sm font-bold shadow-sm transition active:scale-95 text-decoration-none"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'hi' ? 'समस्या दर्ज करें' : 'Report Issue'}</span>
            </Link>
          )}

          {user ? (
            <div className="flex items-center gap-1.5 ml-1">
              <Link
                to="/profile"
                className="w-9 h-9 rounded-full bg-civic-700 text-white flex items-center justify-center font-bold text-xs shadow-xs text-decoration-none"
                title={user.email || 'Profile'}
              >
                {profile?.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="w-8 h-8 rounded-full bg-sand-100 hover:bg-sand-200 text-slate-700 flex items-center justify-center transition cursor-pointer"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/auth"
              className="px-3.5 py-1.5 rounded-full text-xs font-bold text-civic-800 bg-sand-100 hover:bg-civic-50 border border-sand-200 text-decoration-none transition"
            >
              {language === 'hi' ? 'लॉगिन' : 'Login'}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
