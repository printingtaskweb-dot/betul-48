import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { useAuth } from '../contexts/AuthContext';
import { getStaffPortalNavMeta, mergeUserRoleProfile } from '../lib/roleDefinitions';
import { StaffPortalNavButton } from '../components/common/StaffPortalButton';
import { StatsSection } from '../components/StatsSection';
import { ServicesGrid } from '../components/ServicesGrid';
import { WardCoverageSection } from '../components/WardCoverageSection';
import { LocalNewsSection } from '../components/LocalNewsSection';
import { RecentComplaints } from '../components/RecentComplaints';
import { BottomNav } from '../components/BottomNav';
import { LiveTicketTracker } from '../components/common/LiveTicketTracker';
import {
  Landmark,
  Globe,
  Bell,
  Search,
  Camera,
  Radar,
  ArrowUpRight,
  ChevronRight,
  MapPin,
  HardHat,
  ShieldCheck,
  Leaf,
  Truck,
  ArrowRight,
  X,
} from 'lucide-react';

export const Home: React.FC = () => {
  const { language, setLanguage, user, profile, isAdmin } = useAuth();
  const navigate = useNavigate();

  const effectiveProfile = mergeUserRoleProfile(profile, user);
  const portalMeta = user
    ? isAdmin
      ? getStaffPortalNavMeta({ role: 'admin', is_admin: true }, user.email)
      : getStaffPortalNavMeta(effectiveProfile, user.email)
    : null;
  const staffDestination = portalMeta && portalMeta.kind !== 'citizen' ? portalMeta.route : null;

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Live Track Modal State
  const [trackModalOpen, setTrackModalOpen] = useState(false);
  const [activeModalTicket, setActiveModalTicket] = useState<string>('');

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [notificationsActive, setNotificationsActive] = useState(false);

  useEffect(() => {
    const checkState = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          const perm = await PushNotifications.checkPermissions();
          setNotificationsActive(perm.receive === 'granted');
        } catch {}
      } else if (typeof Notification !== 'undefined') {
        setNotificationsActive(Notification.permission === 'granted');
      }
    };
    checkState();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const toggleLanguage = () => {
    const nextLang = language === 'en' ? 'hi' : 'en';
    setLanguage(nextLang);
    showToast(nextLang === 'hi' ? 'भाषा हिन्दी में बदली गई' : 'Language switched to English');
  };

  // Tracking logic
  const openTrackModalFor = (ticketId?: string) => {
    const cleanId = (ticketId || '').replace('#', '').trim().toUpperCase();
    setActiveModalTicket(cleanId);
    setTrackModalOpen(true);
  };

  // Hero search logic
  const SEARCH_ITEMS = [
    { title: 'Water Supply & Pipeline', hi: 'पेयजल आपूर्ति', dept: 'Water', route: '/complaint/new?dept=water' },
    { title: 'Streetlight & LED Repair', hi: 'स्ट्रीट लाइट', dept: 'Streetlight', route: '/complaint/new?dept=streetlight' },
    { title: 'Green Waste & Garden Pruning', hi: 'हरित कचरा', dept: 'Green City', route: '/department/green' },
    { title: 'Drainage & Sewage Cleaning', hi: 'सीवेज एवं नाली', dept: 'Sewage', route: '/complaint/new?dept=sewage' },
    { title: 'Garbage & Solid Waste Pickup', hi: 'कचरा संग्रहण', dept: 'Solid Waste', route: '/complaint/new?dept=solid-waste' },
    { title: 'Roads & Potholes Repair', hi: 'सड़क मरम्मत', dept: 'Roads', route: '/complaint/new?dept=roads' },
  ];

  const filteredSearch = searchQuery.trim()
    ? SEARCH_ITEMS.filter(
        (item) =>
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.hi.includes(searchQuery)
      )
    : [];

  const handleSearchSelect = (item: (typeof SEARCH_ITEMS)[0]) => {
    setShowSearchDropdown(false);
    setSearchQuery('');
    navigate(item.route);
  };

  return (
    <div className="min-h-screen bg-sand-50 text-civic-950 font-sans pb-28 lg:pb-12">
      {/* ===================================================================== */}
      {/* 1. MINIMALIST STICKY HEADER                                           */}
      {/* ===================================================================== */}
      <header className="sticky top-0 z-40 bg-sand-50/95 backdrop-blur-md border-b border-sand-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          {/* Brand Crest & Title */}
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
                {language === 'hi'
                  ? 'जिला बैतूल • नगर पालिका परिषद'
                  : 'Jila Betul • Nagar Palika Parishad'}
              </p>
            </div>
          </Link>

          {/* Clean Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1 bg-white/90 p-1 rounded-full border border-sand-200 shadow-2xs">
            <a
              href="#top"
              className="px-4 py-1.5 rounded-full text-sm font-semibold bg-civic-700 text-white transition text-decoration-none"
            >
              {language === 'hi' ? 'होम' : 'Home'}
            </a>
            <a
              href="#services-section"
              className="px-4 py-1.5 rounded-full text-sm font-medium text-slate-600 hover:text-civic-900 hover:bg-sand-100 transition text-decoration-none"
            >
              {language === 'hi' ? 'हमारी सेवाएं' : 'Our Services'}
            </a>
            <a
              href="#wards-section"
              className="px-4 py-1.5 rounded-full text-sm font-medium text-slate-600 hover:text-civic-900 hover:bg-sand-100 transition text-decoration-none"
            >
              {language === 'hi' ? '33 वार्ड' : '33 Wards'}
            </a>
            <a
              href="#feed-section"
              className="px-4 py-1.5 rounded-full text-sm font-medium text-slate-600 hover:text-civic-900 hover:bg-sand-100 transition text-decoration-none"
            >
              {language === 'hi' ? 'हालिया शिकायतें' : 'Recent Complaints'}
            </a>
            <Link
              to="/news"
              className="px-4 py-1.5 rounded-full text-sm font-medium text-slate-600 hover:text-civic-900 hover:bg-sand-100 transition text-decoration-none"
            >
              {language === 'hi' ? 'स्थानीय समाचार' : 'Local News'}
            </Link>
            <StaffPortalNavButton variant="desktop-nav" />
          </nav>

          {/* Right Controls: Dedicated Role Portal, Notifications, Translator & Profile */}
          <div className="flex items-center gap-2 shrink-0">
            <StaffPortalNavButton variant="header-pill" />
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('betul:open-notifications'))}
              className={`w-10 h-10 rounded-full border shadow-2xs flex items-center justify-center transition active:scale-95 cursor-pointer relative ${
                notificationsActive
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-white hover:bg-civic-50 text-civic-900 border-sand-200'
              }`}
              aria-label={language === 'hi' ? 'नवीनतम अपडेट और सूचनाएं' : 'Latest Updates & Notifications'}
              title={language === 'hi' ? 'नवीनतम अपडेट और सूचनाएं' : 'Latest Updates & Notifications'}
            >
              <Bell className={`w-4.5 h-4.5 ${notificationsActive ? 'text-emerald-700' : 'text-civic-600'}`} />
              <span
                className={`absolute top-2 right-2 w-2 h-2 rounded-full ${
                  notificationsActive ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                }`}
              />
            </button>

            <button
              type="button"
              onClick={toggleLanguage}
              className="w-10 h-10 rounded-full bg-white hover:bg-civic-50 text-civic-900 border border-sand-200 shadow-2xs flex items-center justify-center transition active:scale-95 cursor-pointer"
              aria-label={language === 'en' ? 'हिन्दी में बदलें' : 'Switch to English'}
              title={language === 'en' ? 'हिन्दी' : 'English'}
            >
              <Globe className="w-4.5 h-4.5 text-civic-600" />
            </button>

            {user ? (
              <Link
                to="/profile"
                className="w-10 h-10 rounded-full bg-civic-700 hover:bg-civic-800 text-white flex items-center justify-center font-bold text-xs shadow-xs text-decoration-none transition active:scale-95 ml-1"
                title={user.email || 'Profile'}
              >
                {profile?.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      {/* ===================================================================== */}
      {/* 2. HERO SECTION (Clean Typography + Framed Civic Photography)         */}
      {/* ===================================================================== */}
      <main id="top" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 space-y-8 sm:space-y-10">
        <section className="relative rounded-3xl bg-white border border-sand-200 p-6 sm:p-8 lg:p-10 shadow-soft overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left 7 Columns: Headline, Search Bar & Two Primary Action Cards */}
            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-civic-50 border border-civic-100 text-civic-800 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>
                  {language === 'hi'
                    ? '33 नगरीय वार्ड • 100% सत्यापित निराकरण • शून्य विलंब'
                    : '33 Municipal Wards • 100% Verified Resolution • Zero Delay'}
                </span>
              </div>

              <div className="space-y-2.5">
                <h1
                  className="font-extrabold tracking-tight leading-[1.12] text-civic-950"
                  style={{ fontSize: 'clamp(1.85rem, 4.2vw, 3rem)' }}
                >
                  {language === 'hi' ? 'एक कदम, ' : 'One Step, '}
                  <span className="text-civic-700">
                    {language === 'hi' ? 'बड़े परिणाम।' : 'Big Results.'}
                  </span>
                </h1>
                <p className="text-slate-600 text-sm sm:text-base max-w-xl leading-relaxed">
                  {language === 'hi'
                    ? 'लाइव जीपीएस और फोटो प्रमाण के साथ नागरिक समस्याएं दर्ज करें, फील्ड इंजीनियरों की स्थिति ट्रैक करें और बैतूल को स्वच्छ रखें।'
                    : 'Report civic issues with live GPS and photo proof, track municipal field engineers in real time, and help keep Betul clean and green.'}
                </p>
              </div>

              {/* Instant Ticket ID & Service Search Bar */}
              <div className="relative max-w-xl">
                <div className="flex items-center bg-sand-50 rounded-2xl p-1.5 border border-sand-200 focus-within:bg-white focus-within:border-civic-500 focus-within:ring-4 focus-within:ring-civic-500/10 transition">
                  <div className="pl-3 pr-2 text-slate-400">
                    <Search className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSearchDropdown(true);
                    }}
                    onFocus={() => setShowSearchDropdown(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const q = searchQuery.trim();
                        if (/^#?[A-Z]{2,6}-\d{4}-\d+/i.test(q) || q.toUpperCase().includes('BTL-') || q.toUpperCase().includes('IMC-')) {
                          setShowSearchDropdown(false);
                          openTrackModalFor(q);
                        } else if (filteredSearch[0]) {
                          handleSearchSelect(filteredSearch[0]);
                        }
                      }
                    }}
                    placeholder={
                      language === 'hi'
                        ? 'विभाग या टिकट नंबर खोजें (#BTL-2026-00020)...'
                        : 'Search department or Ticket ID (#BTL-2026-00020)...'
                    }
                    className="w-full bg-transparent text-slate-900 placeholder-slate-400 text-sm py-2 px-1 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const q = searchQuery.trim();
                      if (/^#?[A-Z]{2,6}-\d{4}-\d+/i.test(q) || q.toUpperCase().includes('BTL-') || q.toUpperCase().includes('IMC-')) {
                        setShowSearchDropdown(false);
                        openTrackModalFor(q);
                      } else if (filteredSearch[0]) {
                        handleSearchSelect(filteredSearch[0]);
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-civic-800 hover:bg-civic-900 text-white font-semibold text-xs sm:text-sm transition shrink-0 cursor-pointer"
                  >
                    <span>{language === 'hi' ? 'खोजें' : 'Search'}</span>
                  </button>
                </div>

                {/* Search Dropdown */}
                {showSearchDropdown && searchQuery.trim() && (
                  <div className="absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-float border border-sand-200 text-slate-800 overflow-hidden z-30">
                    {filteredSearch.length === 0 ? (
                      <div className="p-3.5 text-xs text-slate-500 flex items-center justify-between">
                        <span>No exact match for "{searchQuery}".</span>
                        <Link to="/complaint/new" className="text-civic-700 font-bold hover:underline">
                          + Report Issue
                        </Link>
                      </div>
                    ) : (
                      filteredSearch.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSearchSelect(item)}
                          className="w-full px-4 py-2.5 text-left hover:bg-civic-50 flex items-center justify-between border-b border-sand-100 last:border-0 transition cursor-pointer"
                        >
                          <div>
                            <span className="text-xs font-bold text-civic-950">{item.title}</span>
                            <div className="text-[11px] text-slate-400">{item.hi}</div>
                          </div>
                          <span className="text-[11px] font-semibold text-civic-700">Open →</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Two Primary Action Cards (Report Issue & Track Complaint) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1 max-w-xl">
                <Link
                  to="/complaint/new"
                  className="group text-left p-4 rounded-2xl bg-civic-800 hover:bg-civic-900 text-white transition shadow-sm flex items-center justify-between gap-3 active:scale-[0.99] text-decoration-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-white/15 text-white flex items-center justify-center shrink-0">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-sm sm:text-base">
                        {language === 'hi' ? 'समस्या दर्ज करें' : 'Report Issue'}
                      </div>
                      <div className="text-xs text-civic-200">
                        {language === 'hi' ? 'फोटो + जीपीएस' : 'Photo + GPS'}
                      </div>
                    </div>
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-civic-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
                </Link>

                <button
                  type="button"
                  onClick={() => openTrackModalFor('')}
                  className="group text-left p-4 rounded-2xl bg-sand-50 hover:bg-civic-50 text-civic-950 border border-sand-200 hover:border-civic-300 transition flex items-center justify-between gap-3 active:scale-[0.99] cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-white text-civic-700 border border-sand-200 flex items-center justify-center shrink-0">
                      <Radar className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-sm sm:text-base">
                        {language === 'hi' ? 'शिकायत ट्रैक करें' : 'Track Complaint'}
                      </div>
                      <div className="text-xs text-slate-500">
                        {language === 'hi' ? 'लाइव स्थिति' : 'Live Status'}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-civic-700 transition" />
                </button>
              </div>
            </div>

            {/* Right 5 Columns: Curated Real-World Civic Photography Collage */}
            <div className="lg:col-span-5">
              <div className="grid grid-cols-12 gap-3">
                {/* Main Large Civic Road & Greenery Photo */}
                <div className="col-span-7 relative rounded-2xl overflow-hidden h-64 sm:h-72 bg-gradient-to-br from-civic-700 to-civic-900 shadow-card group">
                  <img
                    src="https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=800&q=80"
                    alt="Clean Urban Infrastructure and Streetlights"
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-civic-950/80 via-civic-950/20 to-transparent"></div>
                  <div className="absolute bottom-3 left-3 right-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/95 text-civic-950 text-[11px] font-bold shadow-xs">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{language === 'hi' ? 'जीपीएस फोटो साक्ष्य' : 'GPS Photo Evidence'}</span>
                    </span>
                  </div>
                </div>

                {/* Right Stacked Two Civic Maintenance & Green City Photos */}
                <div className="col-span-5 flex flex-col gap-3 h-64 sm:h-72">
                  <div className="relative flex-1 rounded-2xl overflow-hidden bg-gradient-to-br from-sky-700 to-civic-900 shadow-card group">
                    <img
                      src="https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=600&q=80"
                      alt="Municipal Field Engineer Inspection"
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-civic-950/75 via-transparent to-transparent"></div>
                    <div className="absolute bottom-2.5 left-2.5 right-2.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-civic-900/90 text-white text-[10px] font-semibold backdrop-blur-xs">
                        <HardHat className="w-3 h-3 text-amber-400" />
                        <span>{language === 'hi' ? 'फील्ड टीम ऑन-साइट' : 'Field Team Dispatch'}</span>
                      </span>
                    </div>
                  </div>

                  <div className="relative flex-1 rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-700 to-teal-900 shadow-card group">
                    <img
                      src="https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=600&q=80"
                      alt="Green City and Clean Parks Initiative"
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-civic-950/75 via-transparent to-transparent"></div>
                    <div className="absolute bottom-2.5 left-2.5 right-2.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-900/90 text-emerald-100 text-[10px] font-semibold backdrop-blur-xs">
                        <ShieldCheck className="w-3 h-3 text-emerald-300" />
                        <span>{language === 'hi' ? '33 वार्ड लाइव' : '33 Wards Live'}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================================== */}
        {/* 3. LIVE METRICS BAR (Total, Pending, Verified, Resolved)              */}
        {/* ===================================================================== */}
        <StatsSection />

        {/* ===================================================================== */}
        {/* 4. FEATURED SERVICE BANNER: GREEN WASTE COLLECTION                    */}
        {/* ===================================================================== */}
        <section className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-civic-900 via-civic-800 to-teal-900 text-white shadow-soft border border-civic-700/50">
          <div className="grid grid-cols-1 md:grid-cols-12 items-center">
            <div className="md:col-span-8 p-6 sm:p-8 space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-teal-200 text-[11px] font-bold uppercase tracking-wider">
                <Leaf className="w-3.5 h-3.5 text-emerald-300" />
                <span>{language === 'hi' ? 'विशिष्ट नागरिक सेवा' : 'Featured Service'}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                {language === 'hi' ? 'हरित कचरा संग्रहण' : 'Green Waste Collection'}
              </h2>
              <p className="text-civic-100 text-xs sm:text-sm max-w-xl leading-relaxed">
                {language === 'hi'
                  ? 'बैतूल के सभी 33 वार्डों में घर-घर से जैविक, सूखे पत्ते और बगीचे के कचरे के संग्रहण हेतु पिकअप का अनुरोध करें।'
                  : 'Report biodegradable & garden waste for scheduled doorstep municipal pickup across all 33 wards in Betul.'}
              </p>
              <div className="pt-1">
                <Link
                  to="/department/green"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-civic-950 hover:bg-civic-50 font-bold text-xs sm:text-sm shadow-sm transition active:scale-95 text-decoration-none"
                >
                  <Truck className="w-4 h-4 text-emerald-600" />
                  <span>{language === 'hi' ? 'पिकअप अनुरोध करें' : 'REQUEST PICKUP'}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Real Garden/Green Waste Photography Side Panel */}
            <div className="md:col-span-4 h-44 md:h-full relative bg-emerald-950">
              <img
                src="https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=700&q=80"
                alt="Green Garden Waste Pickup"
                className="w-full h-full object-cover opacity-85"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-teal-900 via-teal-900/30 to-transparent"></div>
            </div>
          </div>
        </section>

        {/* ===================================================================== */}
        {/* 5. OUR SERVICES (12 Standardized Departments Grid)                    */}
        {/* ===================================================================== */}
        <ServicesGrid />

        {/* ===================================================================== */}
        {/* 6. WARD COVERAGE & LIVE SLA RESOLUTION (Real Photo + Ward Pills)      */}
        {/* ===================================================================== */}
        <WardCoverageSection />

        {/* ===================================================================== */}
        {/* 7. LOCAL NEWS & RECENT COMPLAINTS (Side-by-Side 12-Column Grid)       */}
        {/* ===================================================================== */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Left 5 Columns: Local News */}
          <div className="lg:col-span-5">
            <LocalNewsSection />
          </div>

          {/* Right 7 Columns: Recent Complaints Feed */}
          <div className="lg:col-span-7">
            <RecentComplaints onTrackTicket={openTrackModalFor} />
          </div>
        </section>
      </main>

      {/* ===================================================================== */}
      {/* 8. CITIZEN MUNICIPAL FOOTER                                           */}
      {/* ===================================================================== */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-8">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-sand-200 shadow-soft flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-civic-800 text-white flex items-center justify-center font-extrabold text-lg shadow-xs">
              B
            </div>
            <div>
              <div className="font-extrabold text-sm sm:text-base text-civic-950">
                Nagar Palika Parishad Betul
              </div>
              <p className="text-xs text-slate-500">
                {language === 'hi'
                  ? 'नागरिक शिकायत समाधान एवं नगरपालिका सेवा प्रबंधन पोर्टल'
                  : 'Digital Civic Grievance Redressal and Department Management'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600">
            <Link to="/complaint/new" className="hover:text-civic-800 text-decoration-none">
              {language === 'hi' ? 'समस्या दर्ज करें' : 'Report Issue'}
            </Link>
            <Link to="/track" className="hover:text-civic-800 text-decoration-none">
              {language === 'hi' ? 'शिकायत ट्रैक करें' : 'Track Status'}
            </Link>
            <Link to="/department/green" className="hover:text-civic-800 text-decoration-none">
              {language === 'hi' ? 'हरित कचरा' : 'Green Waste'}
            </Link>
            <Link
              to={staffDestination || '/dept/login'}
              className="text-civic-700 hover:text-civic-900 text-decoration-none font-bold"
            >
              {portalMeta && staffDestination
                ? language === 'hi'
                  ? portalMeta.labelHi
                  : portalMeta.labelEn
                : language === 'hi'
                ? 'स्टाफ पोर्टल'
                : 'Department Staff'}
            </Link>
          </div>
        </div>
      </footer>

      {/* ===================================================================== */}
      {/* 9. FLOATING BOTTOM NAVIGATION (Mobile Only)                           */}
      {/* ===================================================================== */}
      <BottomNav />

      {/* ===================================================================== */}
      {/* MODAL: TRACK TICKET STATUS (Step-by-Step Resolution Timeline)         */}
      {/* ===================================================================== */}
      {trackModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-civic-950/60 backdrop-blur-xs">
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl border border-sand-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 bg-civic-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-teal-300">
                  Live SLA Status
                </span>
                <h3 className="text-lg font-extrabold">Track Complaint</h3>
              </div>
              <button
                type="button"
                onClick={() => setTrackModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto">
              <LiveTicketTracker
                mode="modal"
                initialTicket={activeModalTicket}
                language={language}
                onOpenFullTrack={(ticketNo) => {
                  setTrackModalOpen(false);
                  navigate(`/track?ticket=${encodeURIComponent(ticketNo)}`);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TOAST NOTIFICATION                                                    */}
      {/* ===================================================================== */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 max-w-sm w-full">
          <div className="bg-civic-900 border border-civic-700 text-white text-xs sm:text-sm font-semibold px-4 py-3 rounded-2xl shadow-float flex items-center justify-between gap-3 animate-fade-in">
            <span>{toastMessage}</span>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-white/70 hover:text-white font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
