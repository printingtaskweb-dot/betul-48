import React from 'react';
import { Eye, Briefcase } from 'lucide-react';
import { card, outlineBtn, primaryBtn } from '../styles';
import { BORDER, PRIMARY } from '../constants';
import { isDone, statusStyle } from '../utils/statusStyle';
import { getTier, canAllotComplaint, TIER_LABEL } from '../../../../lib/hierarchy';
import type { StaffMember, Viewer } from '../../../../lib/hierarchy';
import type { Ward } from '../../../../lib/wardTypes';
import type { ComplaintRecord } from '../types';

interface Props {
  filtered: ComplaintRecord[];
  wards: Ward[];
  staffById: Record<string, StaffMember>;
  viewer: Viewer;
  onShowDetail: (c: ComplaintRecord) => void;
  onAllot: (c: ComplaintRecord) => void;
}

export const ComplaintsTab: React.FC<Props> = ({
  filtered, wards, staffById, viewer, onShowDetail, onAllot,
}) => (
  <div style={{ ...card, padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
    <div>
      <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900 }}>
        Municipal Complaints & Hierarchical Allotment ({filtered.length})
      </h3>
      <p style={{ margin: '3px 0 0', fontSize: '0.76rem', color: 'var(--gray-600)' }}>
        Click 'Allot Task' to dispatch via the delegation chain.
      </p>
    </div>

    {filtered.length === 0 ? (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-600)', fontSize: '0.88rem' }}>
        No complaints found matching current filters.
      </div>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map((c) => {
          const sSt = statusStyle(c.status);
          const canAllot = canAllotComplaint(viewer, c.department_id);
          const assignedStaff = c.assigned_to ? staffById[c.assigned_to] : null;
          const wardObj = wards.find((w) => w.id === c.ward_id);

          return (
            <div
              key={c.id}
              style={{
                padding: '14px 16px', borderRadius: 10,
                background: 'rgba(255,255,255,0.4)', border: BORDER,
                display: 'flex', flexWrap: 'wrap', alignItems: 'center',
                justifyContent: 'space-between', gap: 12,
              }}
            >
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flex: '1 1 340px' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 8,
                  background: 'var(--theme-bg, #fff4e7)', border: BORDER,
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
    )}
  </div>
);
