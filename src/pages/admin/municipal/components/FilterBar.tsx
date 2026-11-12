import React, { useState } from 'react';
import { Search, Compass, SlidersHorizontal, X, RotateCcw } from 'lucide-react';
import { card, field, primaryBtn } from '../styles';
import { PRIMARY } from '../constants';
import type { DepartmentRow } from '../types';
import type { Ward } from '../../../../lib/wardTypes';

interface Props {
  query: string; setQuery: (v: string) => void;
  statusFilter: string; setStatusFilter: (v: string) => void;
  deptFilter: string; setDeptFilter: (v: string) => void;
  wardFilter: string; setWardFilter: (v: string) => void;
  departments: DepartmentRow[];
  wards: Ward[];
  isDeputyOrHigher: boolean;
  showRadar: boolean;
  onToggleRadar: () => void;
}

export const FilterBar: React.FC<Props> = ({
  query, setQuery, statusFilter, setStatusFilter,
  deptFilter, setDeptFilter, wardFilter, setWardFilter,
  departments, wards, isDeputyOrHigher, showRadar, onToggleRadar,
}) => {
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const activeFilterCount =
    (statusFilter !== 'all' ? 1 : 0) +
    (deptFilter !== 'all' ? 1 : 0) +
    (wardFilter !== 'all' ? 1 : 0) +
    (query.trim() ? 1 : 0);

  const handleResetFilters = () => {
    setStatusFilter('all');
    if (isDeputyOrHigher) setDeptFilter('all');
    setWardFilter('all');
    setQuery('');
  };

  return (
    <>
      <style>{`
        .filter-bar-desktop {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: center;
          justify-content: space-between;
        }
        .filter-bar-mobile {
          display: none;
        }
        @media (max-width: 768px) {
          .filter-bar-desktop {
            display: none !important;
          }
          .filter-bar-mobile {
            display: flex !important;
            flex-direction: column;
            gap: 10px;
          }
        }
      `}</style>

      {/* ── Desktop Inline Filter Bar ── */}
      <div className="filter-bar-desktop" style={{ ...card, padding: '14px 18px' }}>
        <div style={{ flex: '1 1 260px', position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-500)' }} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search ticket #, citizen, staff, address, keyword..."
            style={{ ...field, width: '100%', paddingLeft: 36 }}
          />
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ ...field, cursor: 'pointer' }}>
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>

          {isDeputyOrHigher && (
            <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} style={{ ...field, cursor: 'pointer' }}>
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          )}

          {wards.length > 0 && (
            <select value={wardFilter} onChange={(e) => setWardFilter(e.target.value)} style={{ ...field, cursor: 'pointer' }}>
              <option value="all">All Wards</option>
              {wards.map((w) => (
                <option key={w.id} value={w.id}>Ward {w.ward_number} · {w.name}</option>
              ))}
            </select>
          )}

          {activeFilterCount > 0 && (
            <button
              onClick={handleResetFilters}
              style={{
                ...field,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                color: '#dc2626',
                borderColor: '#fca5a5',
                cursor: 'pointer',
                fontWeight: 700,
              }}
              title="Reset all filters"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          )}

          <button
            onClick={onToggleRadar}
            style={{
              ...primaryBtn,
              background: showRadar ? PRIMARY : 'var(--theme-bg, #F6F1F1)',
              color: showRadar ? '#fff' : PRIMARY,
              border: `1.5px solid ${PRIMARY}`,
            }}
          >
            <Compass size={14} />
            <span>Radar Scanner</span>
          </button>
        </div>
      </div>

      {/* ── Mobile Compact Modular Filter Bar ── */}
      <div className="filter-bar-mobile" style={{ ...card, padding: '12px 14px' }}>
        {/* Top line: Search box + Filter toggle + Radar */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-500)' }} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search complaints..."
              style={{ ...field, width: '100%', paddingLeft: 30, fontSize: '0.8rem', height: 38 }}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', padding: 2, cursor: 'pointer', color: 'var(--gray-400)',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <button
            onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
            style={{
              height: 38,
              padding: '0 12px',
              borderRadius: 'var(--radius-md, 8px)',
              border: activeFilterCount > (query ? 1 : 0) ? `1.5px solid ${PRIMARY}` : '1.5px solid #cbd5e1',
              background: activeFilterCount > (query ? 1 : 0) ? `${PRIMARY}15` : '#fff',
              color: activeFilterCount > (query ? 1 : 0) ? PRIMARY : '#475569',
              fontWeight: 800,
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <SlidersHorizontal size={14} />
            <span>Filter</span>
            {activeFilterCount > 0 && (
              <span
                style={{
                  background: PRIMARY,
                  color: '#fff',
                  borderRadius: 999,
                  padding: '1px 6px',
                  fontSize: '0.65rem',
                  fontWeight: 900,
                }}
              >
                {activeFilterCount}
              </span>
            )}
          </button>

          <button
            onClick={onToggleRadar}
            style={{
              width: 38,
              height: 38,
              borderRadius: 'var(--radius-md, 8px)',
              border: `1.5px solid ${PRIMARY}`,
              background: showRadar ? PRIMARY : '#fff',
              color: showRadar ? '#fff' : PRIMARY,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
            title="Radar Scanner"
          >
            <Compass size={17} />
          </button>
        </div>

        {/* Collapsible Mobile Filter Drawer */}
        {mobileFilterOpen && (
          <div
            style={{
              paddingTop: 10,
              marginTop: 6,
              borderTop: '1px dashed #cbd5e1',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                Refine Complaints
              </span>
              {activeFilterCount > 0 && (
                <button
                  onClick={handleResetFilters}
                  style={{
                    background: 'none', border: 'none', color: '#dc2626',
                    fontSize: '0.72rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer',
                  }}
                >
                  <RotateCcw size={11} /> Clear All
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#64748b', marginBottom: 3 }}>
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{ ...field, width: '100%', fontSize: '0.78rem', height: 36, padding: '6px 8px' }}
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>

              {wards.length > 0 && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#64748b', marginBottom: 3 }}>
                    Ward
                  </label>
                  <select
                    value={wardFilter}
                    onChange={(e) => setWardFilter(e.target.value)}
                    style={{ ...field, width: '100%', fontSize: '0.78rem', height: 36, padding: '6px 8px' }}
                  >
                    <option value="all">All Wards</option>
                    {wards.map((w) => (
                      <option key={w.id} value={w.id}>Ward {w.ward_number}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {isDeputyOrHigher && (
              <div>
                <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#64748b', marginBottom: 3 }}>
                  Department
                </label>
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  style={{ ...field, width: '100%', fontSize: '0.78rem', height: 36, padding: '6px 8px' }}
                >
                  <option value="all">All Departments ({departments.length})</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};
