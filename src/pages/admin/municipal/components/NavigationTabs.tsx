import React from 'react';
import {
  BarChart3,
  Briefcase,
  TrendingUp,
  MapPin,
  Building2,
  Layers,
  Compass,
  ChevronRight,
} from 'lucide-react';
import type { ViewTab } from '../types';

interface Props {
  activeTab: ViewTab;
  setActiveTab: (t: ViewTab) => void;
  filteredCount: number;
  wardsCount: number;
  mode?: 'desktop' | 'mobile-hub' | 'mobile-pills' | 'auto';
}

export interface ServiceTabItem {
  id: ViewTab;
  label: string;
  sublabel?: string;
  badge?: number | string;
  icon: React.ReactNode;
  gradient: string;
  activeBorder: string;
}

export const NavigationTabs: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  filteredCount,
  wardsCount,
  mode = 'auto',
}) => {
  const desktopTabs: ServiceTabItem[] = [
    {
      id: 'overview',
      label: 'Executive Overview',
      sublabel: 'KPIs & Workload',
      icon: <BarChart3 size={22} />,
      gradient: 'linear-gradient(135deg, #146C94, #19A7CE)',
      activeBorder: '#146C94',
    },
    {
      id: 'complaints',
      label: 'Task Allocation',
      sublabel: 'Grievance Dispatch',
      badge: filteredCount,
      icon: <Briefcase size={22} />,
      gradient: 'linear-gradient(135deg, #7c3aed, #a855f7)',
      activeBorder: '#7c3aed',
    },
    {
      id: 'analytics',
      label: 'Employee Leaderboard',
      sublabel: 'Officer Rank & Speed',
      icon: <TrendingUp size={22} />,
      gradient: 'linear-gradient(135deg, #059669, #10b981)',
      activeBorder: '#059669',
    },
    {
      id: 'wards',
      label: 'Wards',
      sublabel: 'Zones & Boundaries',
      badge: wardsCount,
      icon: <MapPin size={22} />,
      gradient: 'linear-gradient(135deg, #d97706, #f59e0b)',
      activeBorder: '#d97706',
    },
    {
      id: 'departments',
      label: 'Departments',
      sublabel: 'Civic Portfolios',
      icon: <Building2 size={22} />,
      gradient: 'linear-gradient(135deg, #0f766e, #14b8a6)',
      activeBorder: '#0f766e',
    },
    {
      id: 'ward-manager',
      label: 'Ward Registration',
      sublabel: 'Geofence & Areas',
      icon: <Layers size={22} />,
      gradient: 'linear-gradient(135deg, #dc2626, #f87171)',
      activeBorder: '#dc2626',
    },
    {
      id: 'location-viewer',
      label: 'Location Filter',
      sublabel: 'Map Radar & GPS',
      icon: <Compass size={22} />,
      gradient: 'linear-gradient(135deg, #475569, #64748b)',
      activeBorder: '#475569',
    },
  ];

  // Mobile Hub Tiles: tapping "Executive Overview" routes to dedicated 'workload' page
  const mobileHubTabs: ServiceTabItem[] = [
    {
      id: 'complaints',
      label: 'Task Allocation',
      sublabel: 'Grievance Dispatch',
      badge: filteredCount,
      icon: <Briefcase size={16} />,
      gradient: 'linear-gradient(135deg, #7c3aed, #a855f7)',
      activeBorder: '#7c3aed',
    },
    {
      id: 'workload',
      label: 'Executive Overview',
      sublabel: 'Charts & Hotspots',
      icon: <BarChart3 size={16} />,
      gradient: 'linear-gradient(135deg, #146C94, #19A7CE)',
      activeBorder: '#146C94',
    },
    {
      id: 'analytics',
      label: 'Employee Leaderboard',
      sublabel: 'Officer Rank & Speed',
      icon: <TrendingUp size={16} />,
      gradient: 'linear-gradient(135deg, #059669, #10b981)',
      activeBorder: '#059669',
    },
    {
      id: 'wards',
      label: 'Wards',
      sublabel: 'Zones & Boundaries',
      badge: wardsCount,
      icon: <MapPin size={16} />,
      gradient: 'linear-gradient(135deg, #d97706, #f59e0b)',
      activeBorder: '#d97706',
    },
    {
      id: 'departments',
      label: 'Departments',
      sublabel: 'Civic Portfolios',
      icon: <Building2 size={16} />,
      gradient: 'linear-gradient(135deg, #0f766e, #14b8a6)',
      activeBorder: '#0f766e',
    },
    {
      id: 'ward-manager',
      label: 'Ward Registration',
      sublabel: 'Geofence & Areas',
      icon: <Layers size={16} />,
      gradient: 'linear-gradient(135deg, #dc2626, #f87171)',
      activeBorder: '#dc2626',
    },
    {
      id: 'location-viewer',
      label: 'Location Filter',
      sublabel: 'Map Radar & GPS',
      icon: <Compass size={16} />,
      gradient: 'linear-gradient(135deg, #475569, #64748b)',
      activeBorder: '#475569',
    },
  ];

  // Quick Switcher Pills for inside dedicated pages
  const mobilePillsTabs: ServiceTabItem[] = [
    {
      id: 'overview',
      label: 'Hub',
      icon: <BarChart3 size={14} />,
      gradient: 'linear-gradient(135deg, #146C94, #19A7CE)',
      activeBorder: '#146C94',
    },
    {
      id: 'complaints',
      label: 'Tasks',
      badge: filteredCount,
      icon: <Briefcase size={14} />,
      gradient: 'linear-gradient(135deg, #7c3aed, #a855f7)',
      activeBorder: '#7c3aed',
    },
    {
      id: 'workload',
      label: 'Charts',
      icon: <BarChart3 size={14} />,
      gradient: 'linear-gradient(135deg, #146C94, #19A7CE)',
      activeBorder: '#146C94',
    },
    {
      id: 'analytics',
      label: 'Team',
      icon: <TrendingUp size={14} />,
      gradient: 'linear-gradient(135deg, #059669, #10b981)',
      activeBorder: '#059669',
    },
    {
      id: 'wards',
      label: 'Wards',
      badge: wardsCount,
      icon: <MapPin size={14} />,
      gradient: 'linear-gradient(135deg, #d97706, #f59e0b)',
      activeBorder: '#d97706',
    },
    {
      id: 'departments',
      label: 'Depts',
      icon: <Building2 size={14} />,
      gradient: 'linear-gradient(135deg, #0f766e, #14b8a6)',
      activeBorder: '#0f766e',
    },
    {
      id: 'ward-manager',
      label: 'Ward Reg',
      icon: <Layers size={14} />,
      gradient: 'linear-gradient(135deg, #dc2626, #f87171)',
      activeBorder: '#dc2626',
    },
    {
      id: 'location-viewer',
      label: 'Radar',
      icon: <Compass size={14} />,
      gradient: 'linear-gradient(135deg, #475569, #64748b)',
      activeBorder: '#475569',
    },
  ];

  return (
    <>
      <style>{`
        .nav-tabs-desktop {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
          gap: 10px;
        }
        .nav-tab-desktop-btn:hover {
          background: #faf9f6 !important;
          border-color: #b7dae4 !important;
        }
        .nav-tab-desktop-btn.is-active:hover {
          background: #ffffff !important;
          border-color: #146C94 !important;
        }
        .nav-tabs-mobile-hub {
          display: none;
        }
        .nav-tabs-mobile-pills {
          display: none;
        }

        @media (max-width: 768px) {
          .nav-tabs-desktop {
            display: none !important;
          }
          .nav-tabs-mobile-hub {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr);
            gap: 7px;
          }
          .nav-tabs-mobile-pills {
            display: flex !important;
            gap: 5px;
            overflow-x: auto;
            padding-bottom: 3px;
            scrollbar-width: none;
            -webkit-overflow-scrolling: touch;
          }
          .nav-tabs-mobile-pills::-webkit-scrollbar {
            display: none;
          }
        }
      `}</style>

      {/* ── 1. Desktop Betul Editorial Tab Grid ── */}
      {(mode === 'desktop' || mode === 'auto') && (
        <div className="nav-tabs-desktop" style={{ marginBottom: 4 }}>
          {desktopTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={`nav-tab-desktop-btn ${isActive ? 'is-active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  padding: '12px 10px 10px',
                  borderRadius: 14,
                  border: isActive ? '1.5px solid #146C94' : '1px solid #e6e2d8',
                  background: '#ffffff',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.15s ease',
                  boxShadow: isActive
                    ? '0 4px 12px rgba(20, 108, 148, 0.12)'
                    : '0 1px 3px rgba(15, 37, 49, 0.04)',
                }}
              >
                {tab.badge !== undefined && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      background: isActive ? '#146C94' : '#f3f1ec',
                      color: isActive ? '#ffffff' : '#475569',
                      border: isActive ? 'none' : '1px solid #e6e2d8',
                      borderRadius: 999,
                      padding: '1px 6px',
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {tab.badge}
                  </span>
                )}

                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: isActive ? 'linear-gradient(135deg, #146C94, #19A7CE)' : '#f0f7f9',
                    border: isActive ? 'none' : '1px solid #b7dae4',
                    color: isActive ? '#ffffff' : '#146C94',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 6,
                    transition: 'all 0.15s ease',
                    boxShadow: isActive ? '0 2px 8px rgba(20, 108, 148, 0.25)' : 'none',
                  }}
                >
                  {tab.icon}
                </div>

                <span
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: isActive ? 800 : 700,
                    color: isActive ? '#0f2531' : '#475569',
                    lineHeight: 1.25,
                    marginBottom: 2,
                  }}
                >
                  {tab.label}
                </span>

                {tab.sublabel && (
                  <span
                    style={{
                      fontSize: '0.65rem',
                      color: '#64748b',
                      fontWeight: 500,
                      lineHeight: 1.1,
                    }}
                  >
                    {tab.sublabel}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ── 2. Mobile Feature Grid for Hub View ── */}
      {(mode === 'mobile-hub' || (mode === 'auto' && activeTab === 'overview')) && (
        <div className="nav-tabs-mobile-hub">
          {mobileHubTabs.map((tab) => {
            const isComplaints = tab.id === 'complaints';
            return (
              <div
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  background: '#ffffff',
                  borderRadius: 12,
                  padding: '9px 10px',
                  border: isComplaints ? '1.5px solid #146C94' : '1px solid #e6e2d8',
                  boxShadow: '0 1px 4px rgba(15, 37, 49, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  position: 'relative',
                  minHeight: 76,
                  transition: 'transform 0.15s ease',
                }}
              >
                {tab.badge !== undefined && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 7,
                      right: 7,
                      background: isComplaints ? '#146C94' : tab.activeBorder,
                      color: '#fff',
                      borderRadius: 999,
                      padding: '1px 5px',
                      fontSize: '0.6rem',
                      fontWeight: 900,
                    }}
                  >
                    {tab.badge}
                  </span>
                )}

                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: tab.gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    marginBottom: 5,
                  }}
                >
                  {tab.icon}
                </div>

                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.75rem', color: '#0f2531', lineHeight: 1.15 }}>
                    {tab.label}
                  </div>
                  {tab.sublabel && (
                    <div style={{ fontSize: '0.62rem', color: '#64748b', marginTop: 1, lineHeight: 1.1 }}>
                      {tab.sublabel}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    marginTop: 4,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    fontSize: '0.64rem',
                    fontWeight: 800,
                    color: '#146C94',
                  }}
                >
                  Open <ChevronRight size={11} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 3. Mobile Horizontal Switcher Pills (when inside a feature) ── */}
      {(mode === 'mobile-pills' || (mode === 'auto' && activeTab !== 'overview')) && (
        <div className="nav-tabs-mobile-pills">
          {mobilePillsTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  whiteSpace: 'nowrap',
                  padding: '6px 12px',
                  borderRadius: 999,
                  border: '1px solid',
                  borderColor: isActive ? '#146C94' : '#e6e2d8',
                  background: isActive ? 'linear-gradient(135deg, #146C94, #0E526F)' : '#ffffff',
                  color: isActive ? '#ffffff' : '#475569',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  boxShadow: isActive ? '0 2px 8px rgba(20, 108, 148, 0.2)' : 'none',
                }}
              >
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    style={{
                      background: isActive ? 'rgba(255,255,255,0.22)' : '#f3f1ec',
                      color: isActive ? '#ffffff' : '#0f2531',
                      padding: '1px 5px',
                      borderRadius: 10,
                      fontSize: '0.62rem',
                      fontWeight: 900,
                    }}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
};
