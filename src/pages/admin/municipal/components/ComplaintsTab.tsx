import React, { useMemo, useState } from 'react';
import {
  Eye,
  Briefcase,
  CheckSquare,
  Square,
  Users,
  ChevronRight,
  MapPin,
  User,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { DepartmentServiceIcon } from '../../../../components/common/DepartmentServiceIcon';
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
    <>
      <style>{`
        .complaints-tab-card {
          padding: 18px 22px;
          gap: 14px;
        }
        .complaint-item-card {
          padding: 14px 16px;
          transition: background 0.15s ease, border-color 0.15s ease;
        }
        .complaint-item-card:hover {
          background: #f3f1ec !important;
          border-color: #146C94 !important;
        }
        .complaint-item-icon {
          width: 40px;
          height: 40px;
        }
        @media (max-width: 768px) {
          .complaints-tab-card {
            padding: 10px 12px !important;
            gap: 8px !important;
            border-radius: 12px !important;
          }
          .complaints-tab-card h3 {
            font-size: 0.92rem !important;
          }
          .complaints-tab-card p {
            font-size: 0.68rem !important;
          }
          .complaint-item-card {
            padding: 8px 10px !important;
            gap: 8px !important;
            border-radius: 10px !important;
          }
          .complaint-item-icon {
            width: 32px !important;
            height: 32px !important;
            border-radius: 8px !important;
          }
        }
      `}</style>
      <div className="complaints-tab-card" style={{ ...card, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 11,
              background: 'linear-gradient(135deg, #f0f7f9, #d9ecf1)',
              border: '1px solid #b7dae4',
              color: '#146C94',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Briefcase size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.06rem', fontWeight: 900, color: '#0f2531' }}>
              Task Allocation & Delegation ({filtered.length})
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: '#64748b' }}>
              Select one or many complaints → preview cascade (Dept Head → Supervisor → Field) → allot.
            </p>
          </div>
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
          padding: '12px 14px', borderRadius: 12,
          background: '#f0f7f9', border: '1px dashed #146C94',
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
                  <b style={{ color: '#0f2531', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <DepartmentServiceIcon slugOrName={dept?.slug || dept?.name} size={20} iconSize={11} />
                    {dept?.name || 'Unknown'}
                  </b>
                  <span style={{ color: '#94a3b8' }}>·</span>
                  <span style={{ color: '#475569' }}>{comps.length} complaint(s)</span>
                  <ChevronRight size={12} color="#64748b" />
                  <span style={{ color: head ? '#059669' : '#b45309', fontWeight: 700 }}>
                    {head ? `→ ${head.full_name} (Dept Head)` : '→ No dept head assigned'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: '0.88rem' }}>
          No complaints found matching current filters.
        </div>
      ) : (
        <>
          {/* Select all */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: '#334155', fontWeight: 600 }}>
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
                  className="complaint-item-card"
                  style={{
                    borderRadius: 12,
                    background: isSelected ? '#f0f7f9' : '#faf9f6',
                    border: isSelected ? `1.5px solid ${PRIMARY}` : BORDER,
                    display: 'flex', flexWrap: 'wrap', alignItems: 'center',
                    justifyContent: 'space-between', gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flex: '1 1 300px' }}>
                    <button
                      onClick={() => toggle(c.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', color: PRIMARY, flexShrink: 0 }}
                    >
                      {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                    </button>
                    <DepartmentServiceIcon slugOrName={c.department?.name} size={36} iconSize={18} />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span
                          style={{
                            padding: '2px 7px',
                            borderRadius: 6,
                            background: '#e0f2fe',
                            color: '#0369a1',
                            border: '1px solid #bae6fd',
                            fontFamily: 'monospace',
                            fontWeight: 900,
                            fontSize: '0.72rem',
                          }}
                        >
                          #{c.ticket_number}
                        </span>
                        <span style={{
                          fontSize: '0.65rem', fontWeight: 800, padding: '2px 8px', borderRadius: 999,
                          background: sSt.bg, color: sSt.fg, textTransform: 'uppercase',
                        }}>{c.status}</span>
                        {c.department?.name && (
                          <span style={{ fontSize: '0.68rem', color: '#334155', background: '#e2e8f0', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                            {c.department.name}
                          </span>
                        )}
                        {wardObj && (
                          <span style={{
                            fontSize: '0.65rem', fontWeight: 800, padding: '1px 7px', borderRadius: 999,
                            background: '#f0f7f9', border: '1px solid #b7dae4', color: PRIMARY,
                          }}>Ward {wardObj.ward_number}</span>
                        )}
                      </div>
                      <p style={{ margin: '4px 0', fontSize: '0.8rem', fontWeight: 600, color: '#0f2531', lineHeight: 1.4 }}>
                        {c.description}
                      </p>
                      <div style={{ fontSize: '0.69rem', color: '#64748b', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {c.address && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <MapPin size={11} color="#94a3b8" /> {c.address}
                          </span>
                        )}
                        {c.citizen_name && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <User size={11} color="#94a3b8" /> {c.citizen_name}
                          </span>
                        )}
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <Calendar size={11} color="#94a3b8" /> {new Date(c.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: '0.76rem', color: '#334155', minWidth: 140 }}>
                      {assignedStaff ? (
                        <div>
                          <span style={{ fontSize: '0.66rem', color: '#64748b', display: 'block' }}>Assigned To:</span>
                          <b style={{ color: PRIMARY }}>{assignedStaff.full_name}</b>
                          <span style={{ fontSize: '0.68rem', display: 'block', color: '#64748b' }}>
                            ({TIER_LABEL[getTier(assignedStaff.role, assignedStaff.hierarchy_code, assignedStaff.authority_role)]?.short})
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: '#b45309', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <AlertTriangle size={13} color="#dc2626" /> Unassigned
                        </span>
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
  </>
  );
};
