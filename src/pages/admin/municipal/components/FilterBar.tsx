import React from 'react';
import { Search, Compass } from 'lucide-react';
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
}) => (
  <div style={{ ...card, padding: '14px 18px', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
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
);
