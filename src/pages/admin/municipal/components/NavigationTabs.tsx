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

      {/* ── 1. Desktop Standard Grid ── */}
      {(mode === 'desktop' || mode === 'auto') && (
        <div className="nav-tabs-desktop" style={{ marginBottom: 4 }}>
          {desktopTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  padding: '12px 10px',
                  borderRadius: 14,
                  border: isActive
                    ? `2px solid ${tab.activeBorder}`
                    : '1px solid #e2e8f0',
                  background: isActive ? '#ffffff' : '#f8fafc',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.18s ease',
                  boxShadow: isActive
                    ? '0 6px 18px rgba(0, 0, 0, 0.08)'
                    : '0 1px 3px rgba(0,0,0,0.03)',
                  transform: isActive ? 'translateY(-2px)' : 'none',
                }}
              >
                {tab.badge !== undefined && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      background: isActive ? tab.activeBorder : '#64748b',
                      color: '#fff',
                      borderRadius: 12,
                      padding: '1px 6px',
                      fontSize: '0.65rem',
                      fontWeight: 800,
                    }}
                  >
                    {tab.badge}
                  </span>
                )}

                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: tab.gradient,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 8,
                    boxShadow: isActive
                      ? '0 4px 12px rgba(0,0,0,0.18)'
                      : '0 2px 6px rgba(0,0,0,0.08)',
                    transition: 'transform 0.18s ease',
                    transform: isActive ? 'scale(1.05)' : 'scale(1)',
                  }}
                >
                  {tab.icon}
                </div>

                <span
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: isActive ? 800 : 700,
                    color: isActive ? '#0f172a' : '#475569',
                    lineHeight: 1.25,
                    marginBottom: 2,
                  }}
                >
                  {tab.label}
                </span>

                {tab.sublabel && (
                  <span
                    style={{
                      fontSize: '0.66rem',
                      color: '#94a3b8',
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
                  border: isComplaints ? '1.5px solid #a855f7' : '1px solid #e2e8f0',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
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
                      background: tab.activeBorder,
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
                    borderRadius: 7,
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
                  <div style={{ fontWeight: 800, fontSize: '0.75rem', color: '#0f172a', lineHeight: 1.15 }}>
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
                    color: tab.activeBorder,
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
                  border: '1.5px solid',
                  borderColor: isActive ? tab.activeBorder : '#e2e8f0',
                  background: isActive ? tab.activeBorder : '#ffffff',
                  color: isActive ? '#ffffff' : '#475569',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  boxShadow: isActive ? '0 2px 6px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    style={{
                      background: isActive ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                      color: isActive ? '#ffffff' : '#0f172a',
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
