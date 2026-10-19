import React from 'react';
import {
  BarChart3,
  Briefcase,
  TrendingUp,
  MapPin,
  Building2,
  Layers,
  Compass,
} from 'lucide-react';
import type { ViewTab } from '../types';

interface Props {
  activeTab: ViewTab;
  setActiveTab: (t: ViewTab) => void;
  filteredCount: number;
  wardsCount: number;
}

interface ServiceTabItem {
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
}) => {
  const tabs: ServiceTabItem[] = [
    {
      id: 'overview',
      label: 'Executive Overview',
      sublabel: 'KPIs & Workload',
      icon: <BarChart3 size={24} />,
      gradient: 'linear-gradient(135deg, #146C94, #19A7CE)',
      activeBorder: '#146C94',
    },
    {
      id: 'complaints',
      label: 'Task Allocation',
      sublabel: 'Grievance Dispatch',
      badge: filteredCount,
      icon: <Briefcase size={24} />,
      gradient: 'linear-gradient(135deg, #7c3aed, #a855f7)',
      activeBorder: '#7c3aed',
    },
    {
      id: 'analytics',
      label: 'Employee Leaderboard',
      sublabel: 'Officer Rank & Speed',
      icon: <TrendingUp size={24} />,
      gradient: 'linear-gradient(135deg, #059669, #10b981)',
      activeBorder: '#059669',
    },
    {
      id: 'wards',
      label: 'Wards',
      sublabel: 'Zones & Boundaries',
      badge: wardsCount,
      icon: <MapPin size={24} />,
      gradient: 'linear-gradient(135deg, #d97706, #f59e0b)',
      activeBorder: '#d97706',
    },
    {
      id: 'departments',
      label: 'Departments',
      sublabel: 'Civic Portfolios',
      icon: <Building2 size={24} />,
      gradient: 'linear-gradient(135deg, #0f766e, #14b8a6)',
      activeBorder: '#0f766e',
    },
    {
      id: 'ward-manager',
      label: 'Ward Registration',
      sublabel: 'Geofence & Areas',
      icon: <Layers size={24} />,
      gradient: 'linear-gradient(135deg, #dc2626, #f87171)',
      activeBorder: '#dc2626',
    },
    {
      id: 'location-viewer',
      label: 'Location Filter',
      sublabel: 'Map Radar & GPS',
      icon: <Compass size={24} />,
      gradient: 'linear-gradient(135deg, #475569, #64748b)',
      activeBorder: '#475569',
    },
  ];

  return (
    <div style={{ marginBottom: 4 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: 10,
        }}
        className="municipal-services-grid"
      >
        {tabs.map((tab) => {
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
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = '#f8fafc';
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';
                }
              }}
            >
              {/* Optional badge */}
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

              {/* Service-grid icon wrapper */}
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

              {/* Label */}
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

              {/* Sublabel */}
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
    </div>
  );
};
