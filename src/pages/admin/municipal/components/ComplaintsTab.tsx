import React, { useMemo, useState } from 'react';
import { Eye, Briefcase, CheckSquare, Square, Users, ChevronRight } from 'lucide-react';
import { card, outlineBtn, primaryBtn } from '../styles';
import { BORDER, PRIMARY } from '../constants';
import { isDone, statusStyle } from '../utils/statusStyle';
import { getTier, canAllotComplaint, TIER_LABEL } from '../../../../lib/hierarchy';
import type { StaffMember, Viewer } from '../../../../lib/hierarchy';
import type { Ward } from '../../../../lib/wardTypes';
import type { ComplaintRecord, DepartmentRow } from '../types';

interface Props {
  filtered: ComplaintRecord[];
  wards: Ward[];
  departments: DepartmentRow[];
  staffById: Record<string, StaffMember>;
  staff: StaffMember[];
  viewer: Viewer;
  onShowDetail: (c: ComplaintRecord) => void;
  onAllot: (c: ComplaintRecord) => void;
  onBulkAllot: (ids: string[]) => void;
}

export const ComplaintsTab: React.FC<Props> = ({
  filtered, wards, departments, staffById, staff, viewer, onShowDetail, onAllot, onBulkAllot,
}) => {
  const [selection, setSelection] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    const next = new Set(selection);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelection(next);
  };

  const clearSelection = () => setSelection(new Set());

  const toggleAll = () => {
    if (selection.size === filtered.length) clearSelection();
    else setSelection(new Set(filtered.map((c) => c.id)));
  };

  const selectedList = filtered.filter((c) => selection.has(c.id));

  /** Group selected by department for cascade preview */
  const selectionByDept = useMemo(() => {
    const map: Record<string, ComplaintRecord[]> = {};
    selectedList.forEach((c) => {
      (map[c.department_id] = map[c.department_id] || []).push(c);
    });
    return map;
  }, [selection]);

  return (
    <div style={{ ...card, padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900 }}>
            Task Allocation & Delegation ({filtered.length})
          </h3>
          <p style={{ margin: '3px 0 0', fontSize: '0.76rem', color: 'var(--gray-600)' }}>
            Select one or many complaints → preview cascade (Dept Head → Supervisor → Field) → allot.
          </p>
        </div>

        {selection.size > 0 && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: PRIMARY }}>
              {selection.size} selected
            </span>
            <button onClick={clearSelection} style={outlineBtn}>Clear</button>
            <button onClick={() => onBulkAllot(Array.from(selection))} style={primaryBtn}>
              <Briefcase size={13} /> Bulk Allot
            </button>
          </div>
        )}
      </div>

      {/* Cascade preview */}
      {selection.size > 0 && (
        <div style={{
          padding: '12px 14px', borderRadius: 10,
          background: 'var(--theme-bg, #F6F1F1)', border: `1.5px dashed ${PRIMARY}`,
        }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 900, color: PRIMARY, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Users size={14} /> Cascade Preview — {Object.keys(selectionByDept).length} department(s) affected
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {Object.entries(selectionByDept).map(([deptId, comps]) => {
              const dept = departments.find((d) => d.id === deptId);
              const head = staff.find(
                (s) =>
                  s.linked_department_id === deptId &&
                  getTier(s.role, s.hierarchy_code, s.authority_role) === 2
              );
              return (
                <div key={deptId} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: '0.76rem', flexWrap: 'wrap',
                }}>
                  <b style={{ color: PRIMARY }}>{dept?.icon} {dept?.name || 'Unknown'}</b>
                  <span style={{ color: 'var(--gray-500)' }}>·</span>
                  <span>{comps.length} complaint(s)</span>
                  <ChevronRight size={12} />
                  <span style={{ color: head ? '#15803d' : 'var(--status-pending)', fontWeight: 700 }}>
                    {head ? `→ ${head.full_name} (Dept Head)` : '→ ⚠️ No dept head assigned'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-600)', fontSize: '0.88rem' }}>
          No complaints found matching current filters.
        </div>
      ) : (
        <>
          {/* Select all */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: 'var(--gray-700)' }}>
            <button
              onClick={toggleAll}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: PRIMARY }}
            >
              {selection.size === filtered.length ? <CheckSquare size={16} /> : <Square size={16} />}
            </button>
            <span>Select all</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map((c) => {
              const sSt = statusStyle(c.status);
              const canAllot = canAllotComplaint(viewer, c.department_id);
              const assignedStaff = c.assigned_to ? staffById[c.assigned_to] : null;
              const wardObj = wards.find((w) => w.id === c.ward_id);
              const isSelected = selection.has(c.id);

              return (
                <div
                  key={c.id}
                  style={{
                    padding: '14px 16px', borderRadius: 10,
                    background: isSelected ? 'var(--theme-bg, #F6F1F1)' : 'rgba(255,255,255,0.4)',
                    border: isSelected ? `2px solid ${PRIMARY}` : BORDER,
                    display: 'flex', flexWrap: 'wrap', alignItems: 'center',
                    justifyContent: 'space-between', gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flex: '1 1 340px' }}>
                    <button
                      onClick={() => toggle(c.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: PRIMARY, flexShrink: 0 }}
                    >
                      {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                    </button>
                    <div style={{
                      width: 44, height: 44, borderRadius: 8,
                      background: 'var(--theme-bg, #F6F1F1)', border: BORDER,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.3rem', flexShrink: 0,
                    }}>
                      {c.department?.icon || '🏢'}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 900, color: PRIMARY, fontSize: '0.88rem' }}>#{c.ticket_number}</span>
                        <span style={{
                          fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: 10,
                          background: sSt.bg, color: sSt.fg, textTransform: 'uppercase',
                        }}>{c.status}</span>
                        <span style={{ fontSize: '0.74rem', color: 'var(--gray-600)' }}>{c.department?.name}</span>
                        {wardObj && (
                          <span style={{
                            fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: 10,
                            background: 'rgba(102,0,51,0.08)', color: PRIMARY,
                          }}>🏘️ Ward {wardObj.ward_number}</span>
                        )}
                      </div>
                      <p style={{ margin: '4px 0', fontSize: '0.82rem', color: 'var(--gray-800)', lineHeight: 1.4 }}>
                        {c.description}
                      </p>
                      <div style={{ fontSize: '0.72rem', color: 'var(--gray-600)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        {c.address && <span>📍 {c.address}</span>}
                        {c.citizen_name && <span>👤 {c.citizen_name}</span>}
                        <span>📅 {new Date(c.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: '0.76rem', color: 'var(--gray-700)', minWidth: 140 }}>
                      {assignedStaff ? (
                        <div>
                          <span style={{ fontSize: '0.68rem', color: 'var(--gray-500)', display: 'block' }}>Assigned To:</span>
                          <b style={{ color: PRIMARY }}>{assignedStaff.full_name}</b>
                          <span style={{ fontSize: '0.68rem', display: 'block', color: 'var(--gray-600)' }}>
                            ({TIER_LABEL[getTier(assignedStaff.role, assignedStaff.hierarchy_code, assignedStaff.authority_role)]?.short})
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: '#b45309', fontWeight: 700 }}>⚠️ Unassigned</span>
                      )}
                    </div>

                    <button onClick={() => onShowDetail(c)} style={outlineBtn}>
                      <Eye size={13} /> Details
                    </button>

                    {canAllot && !isDone(c.status) && (
                      <button onClick={() => onAllot(c)} style={primaryBtn}>
                        <Briefcase size={13} /> {c.assigned_to ? 'Reassign' : 'Allot Task'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
