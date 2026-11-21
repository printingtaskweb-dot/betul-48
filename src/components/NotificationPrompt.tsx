import React, { useState, useEffect } from 'react';
import { Bell, BellRing, X, CheckCircle2, Sparkles, Newspaper, ShieldCheck, MapPin, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { fetchAndRegisterFCMToken } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface NewsItem {
  id: string;
  title: string | null;
  content: string;
  area: string;
  category: string;
  created_at: string;
}

const APP_FEATURES_UPDATES = [
  {
    version: 'v1.0.0 Native',
    tag: 'Latest Release',
    date: 'Today',
    features: [
      {
        icon: '🔥',
        titleEn: 'Official Municipal Flame Logo',
        titleHi: 'नया आधिकारिक ज्वाला लोगो',
        descEn: 'Updated high-definition launcher emblem across Android densities and portal.',
        descHi: 'एंड्रॉइड और पोर्टल पर नया उच्च-रिज़ॉल्यूशन आधिकारिक लोगो।',
      },
      {
        icon: '🔔',
        titleEn: 'Real-Time Complaint & Activity Alerts',
        titleHi: 'रीयल-टाइम शिकायत और गतिविधि सूचनाएं',
        descEn: 'Instant device alerts when complaints are assigned, resolved, or verified.',
        descHi: 'शिकायत आवंटन, समाधान या सत्यापन पर डिवाइस पर तुरंत अलर्ट।',
      },
      {
        icon: '📍',
        titleEn: 'GPS Geofencing & Operational Tracking',
        titleHi: 'जीपीएस जियोफेंसिंग और मैदानी ट्रैकिंग',
        descEn: 'Automatic boundary checking and live staff location verification.',
        descHi: 'वार्ड सीमा जांच और फील्ड स्टाफ के लिए सटीक जीपीएस ट्रैकिंग।',
      },
      {
        icon: '🏛️',
        titleEn: '9 Municipal Hierarchy Roles',
        titleHi: '9 नगर पालिका पदानुक्रम भूमिकाएं',
        descEn: 'Role-specific dashboards from Field Workers & Supervisors to Verifiers.',
        descHi: 'मैदानी कर्मचारियों और पर्यवेक्षकों से लेकर सत्यापनकर्ताओं तक विशेष डैशबोर्ड।',
      },
      {
        icon: '⚡',
        titleEn: 'Lightweight 36 MB Build',
        titleHi: '36 MB हल्का और तेज़ ऐप',
        descEn: 'Removed duplicate packaging bloat for smooth, battery-friendly performance.',
        descHi: 'अनावश्यक डेटा हटाकर तीव्र और सुचारू प्रदर्शन।',
      },
    ],
  },
];

export const NotificationPrompt: React.FC = () => {
  const { user, language } = useAuth();
  const [show, setShow] = useState(false);
  const [isGranted, setIsGranted] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [latestNews, setLatestNews] = useState<NewsItem[]>([]);
  const [activeTab, setActiveTab] = useState<'app_updates' | 'municipal_news'>('app_updates');

  const isHindi = language === 'hi';

  const checkPermissionState = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const perm = await PushNotifications.checkPermissions();
        setIsGranted(perm.receive === 'granted');
        return perm.receive === 'granted';
      } catch {
        return false;
      }
    }
    const granted = typeof Notification !== 'undefined' && Notification.permission === 'granted';
    setIsGranted(granted);
    return granted;
  };

  useEffect(() => {
    checkPermissionState();

    // Fetch latest news announcements
    supabase
      .from('local_news')
      .select('id, title, content, area, category, created_at')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }) => {
        if (data) setLatestNews(data as NewsItem[]);
      });

    const openHandler = async () => {
      await checkPermissionState();
      setShow(true);
    };

    window.addEventListener('betul:open-notifications', openHandler);

    return () => {
      window.removeEventListener('betul:open-notifications', openHandler);
    };
  }, []);

  // Prevent background page from scrolling when notification panel is open
  useEffect(() => {
    if (show) {
      const originalOverflow = document.body.style.overflow;
      const originalOverscroll = document.body.style.overscrollBehavior;
      const originalTouchAction = document.body.style.touchAction;

      document.body.style.overflow = 'hidden';
      document.body.style.overscrollBehavior = 'none';

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.overscrollBehavior = originalOverscroll;
        document.body.style.touchAction = originalTouchAction;
      };
    }
  }, [show]);

  const handleEnableNotifications = async () => {
    setRequesting(true);
    try {
      if (Capacitor.isNativePlatform()) {
        const permRes = await PushNotifications.requestPermissions();
        if (permRes.receive === 'granted') {
          setIsGranted(true);
          try {
            await fetchAndRegisterFCMToken(user?.id);
          } catch (e) {
            console.warn('[FCM] Token deferred:', e);
          }
        }
      } else if (typeof Notification !== 'undefined') {
        const res = await Notification.requestPermission();
        if (res === 'granted') {
          setIsGranted(true);
          await fetchAndRegisterFCMToken(user?.id);
        }
      }
    } catch {
      //
    } finally {
      setRequesting(false);
    }
  };

  if (!show) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) setShow(false);
      }}
      onTouchMove={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
        }
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        touchAction: 'none',
        overscrollBehavior: 'contain',
        animation: 'fadeInOverlay 0.2s ease-out',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <style>{`
        @keyframes fadeInOverlay {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes scaleUpModal {
          from { transform: scale(0.96) translateY(10px); opacity: 0; }
          to   { transform: scale(1) translateY(0); opacity: 1; }
        }
      `}</style>

      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: 20,
          width: '100%',
          maxWidth: 480,
          maxHeight: '85vh',
          height: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
          border: '1.5px solid #e2e8f0',
          overflow: 'hidden',
          overscrollBehavior: 'contain',
          touchAction: 'pan-y',
          animation: 'scaleUpModal 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #146C94, #0E526F)',
            color: '#fff',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: 'rgba(255,255,255,0.15)', padding: '6px 8px', borderRadius: 8 }}>
              <BellRing size={20} color="#fff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, letterSpacing: '-0.01em' }}>
                {isHindi ? 'नवीनतम अपडेट और सूचनाएं' : 'Latest Updates & Alerts'}
              </h3>
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#bae6fd' }}>
                {isHindi ? 'बैतूल 311 मोबाइल ऐप और नगर पालिका अपडेट' : 'Betul 311 Application & City Updates'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShow(false)}
            aria-label="Close"
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              color: '#fff',
              width: 32,
              height: 32,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Push Notification Status Banner */}
        <div
          style={{
            background: isGranted ? '#f0fdf4' : '#fffbeb',
            borderBottom: '1px solid',
            borderColor: isGranted ? '#bbf7d0' : '#fef3c7',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem' }}>
            {isGranted ? (
              <>
                <CheckCircle2 size={16} color="#16a34a" />
                <span style={{ color: '#166534', fontWeight: 700 }}>
                  {isHindi ? 'डिवाइस पर पुश अलर्ट सक्रिय हैं' : 'Push Notifications are Active'}
                </span>
              </>
            ) : (
              <>
                <Bell size={16} color="#d97706" />
                <span style={{ color: '#92400e', fontWeight: 600 }}>
                  {isHindi ? 'पुश सूचनाएं बंद हैं' : 'Notifications are Disabled'}
                </span>
              </>
            )}
          </div>
          {!isGranted && (
            <button
              onClick={handleEnableNotifications}
              disabled={requesting}
              style={{
                background: '#146C94',
                color: '#fff',
                border: 'none',
                padding: '5px 12px',
                borderRadius: 6,
                fontSize: '0.74rem',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              {requesting ? '…' : isHindi ? 'सक्रिय करें' : 'Enable'}
            </button>
          )}
        </div>

        {/* Tab Selector */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
          <button
            onClick={() => setActiveTab('app_updates')}
            style={{
              flex: 1,
              padding: '12px 8px',
              border: 'none',
              background: 'none',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
              borderBottom: activeTab === 'app_updates' ? '2.5px solid #146C94' : '2.5px solid transparent',
              color: activeTab === 'app_updates' ? '#146C94' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <Sparkles size={15} />
            <span>{isHindi ? 'ऐप में नया क्या है' : "What's New in App"}</span>
          </button>
          <button
            onClick={() => setActiveTab('municipal_news')}
            style={{
              flex: 1,
              padding: '12px 8px',
              border: 'none',
              background: 'none',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
              borderBottom: activeTab === 'municipal_news' ? '2.5px solid #146C94' : '2.5px solid transparent',
              color: activeTab === 'municipal_news' ? '#146C94' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <Newspaper size={15} />
            <span>{isHindi ? 'नगर पालिका समाचार' : 'City News & Alerts'}</span>
          </button>
        </div>

        {/* Content Body */}
        <div
          style={{
            padding: '16px 20px',
            overflowY: 'auto',
            flex: 1,
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
            touchAction: 'pan-y',
          }}
          onTouchMove={(e) => {
            e.stopPropagation();
          }}
        >
          {activeTab === 'app_updates' ? (
            <div>
              {APP_FEATURES_UPDATES.map((rel, idx) => (
                <div key={idx}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#146C94' }}>{rel.version}</span>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: 10 }}>
                        {rel.tag}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{rel.date}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {rel.features.map((item, fIdx) => (
                      <div
                        key={fIdx}
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: 12,
                          padding: '10px 14px',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 12,
                        }}
                      >
                        <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>{item.icon}</span>
                        <div>
                          <h4 style={{ margin: '0 0 2px', fontSize: '0.82rem', fontWeight: 800, color: '#1e293b' }}>
                            {isHindi ? item.titleHi : item.titleEn}
                          </h4>
                          <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b', lineHeight: 1.4 }}>
                            {isHindi ? item.descHi : item.descEn}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div>
              {latestNews.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 16px', color: '#64748b' }}>
                  <ShieldCheck size={36} color="#146C94" style={{ margin: '0 auto 8px', opacity: 0.8 }} />
                  <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700 }}>
                    {isHindi ? 'कोई नई सूचना उपलब्ध नहीं है।' : 'No new city alerts at this time.'}
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {latestNews.map((news) => (
                    <div
                      key={news.id}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 12,
                        padding: '12px 14px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#146C94', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={11} /> {news.area}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                          {new Date(news.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 style={{ margin: '0 0 4px', fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
                        {news.title || (isHindi ? 'नगर पालिका सूचना' : 'Municipal Notice')}
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.76rem', color: '#475569', lineHeight: 1.4 }}>
                        {news.content.slice(0, 120)}{news.content.length > 120 ? '…' : ''}
                      </p>
                    </div>
                  ))}
                  <Link
                    to="/news"
                    onClick={() => setShow(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      color: '#146C94',
                      padding: '8px 0',
                      textDecoration: 'none',
                    }}
                  >
                    <span>{isHindi ? 'सभी नगर समाचार देखें' : 'View All City News'}</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={() => setShow(false)}
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              border: 'none',
              background: '#146C94',
              color: '#fff',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            {isHindi ? 'समझ गया' : 'Got it'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationPrompt;
