import React from 'react';
import { X, Briefcase } from 'lucide-react';
import { card, field, primaryBtn } from '../styles';
import { BORDER } from '../constants';
import { isDone } from '../utils/statusStyle';
import { canAllotComplaint } from '../../../../lib/hierarchy';
import type { StaffMember, Viewer } from '../../../../lib/hierarchy';
import type { Ward } from '../../../../lib/wardTypes';
import type { ComplaintRecord } from '../types';

interface Props {
  detail: ComplaintRecord;
  wards: Ward[];
  staffById: Record<string, StaffMember>;
  viewer: Viewer;
  onClose: () => void;
  onAllot: () => void;
}

export const ComplaintDetailModal: React.FC<Props> = ({
  detail, wards, staffById, viewer, onClose, onAllot,
}) => {
  const ward = detail.ward || wards.find((item) => item.id === detail.ward_id);
  const assignedStaff = detail.assignee || (detail.assigned_to ? staffById[detail.assigned_to] : null);

  return (
  <div
    style={{
      position: 'fixed', inset: 0, zIndex: 1100,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}
    onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
  >
    <div style={{
      ...card, borderRadius: 'var(--radius-xl, 16px)',
      width: '100%', maxWidth: 720, maxHeight: '88vh', overflowY: 'auto',
    }}>
      <div style={{
        background: 'var(--header-gradient, linear-gradient(135deg, #0E526F, #146C94, #0E526F))',
        padding: '16px 20px', color: '#fff',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
            Ticket #{detail.ticket_number}
          </h3>
          <p style={{ margin: 0, fontSize: '0.74rem', opacity: 0.9 }}>
            {detail.department?.name || 'Municipal'} Department
            {ward ? ` · Ward ${ward.ward_number} · ${ward.name}` : ''}
          </p>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', padding: 5 }}
        >
          <X size={18} />
        </button>
      </div>

      <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {detail.photo_url && (
          <img
            src={detail.photo_url}
            alt="Complaint Evidence"
            style={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 8, border: BORDER }}
          />
        )}

        <div style={{ ...field, lineHeight: 1.5, background: 'var(--theme-bg, #F6F1F1)' }}>
          <b>Description:</b>
          <div style={{ marginTop: 4 }}>{detail.description}</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 8, fontSize: '0.8rem' }}>
          <div><b>Citizen:</b> {detail.citizen_name || 'Anonymous'}</div>
          <div><b>Phone:</b> {detail.citizen_phone || 'N/A'}</div>
          <div><b>Department:</b> {detail.department?.name || 'N/A'}</div>
          <div>
            <b>Status:</b>{' '}
            <span style={{ textTransform: 'uppercase', fontWeight: 800 }}>{detail.status}</span>
          </div>
          <div><b>Registered:</b> {new Date(detail.created_at).toLocaleString()}</div>
          <div><b>Last updated:</b> {detail.updated_at ? new Date(detail.updated_at).toLocaleString() : 'N/A'}</div>
          {detail.address && <div style={{ gridColumn: 'span 2' }}><b>Address:</b> {detail.address}</div>}
          {ward && (
            <div>
              <b>Ward:</b> {ward.ward_number} · {ward.name}
            </div>
          )}
          {detail.area && <div><b>Area:</b> {detail.area.name}</div>}
          {(detail.latitude != null || detail.longitude != null) && (
            <div><b>Coordinates:</b> {detail.latitude ?? 'N/A'}, {detail.longitude ?? 'N/A'}</div>
          )}
          <div>
            <b>Assigned officer:</b> {assignedStaff?.full_name || (detail.assigned_to ? 'Staff' : 'Not assigned')}
            {assignedStaff?.role && <span> · {assignedStaff.role}</span>}
            {assignedStaff?.phone && <span> · {assignedStaff.phone}</span>}
          </div>
          <div>
            <b>Assigned by:</b> {detail.assigner?.full_name || detail.assigned_by || 'N/A'}
          </div>
          <div>
            <b>Assigned at:</b> {detail.assigned_at ? new Date(detail.assigned_at).toLocaleString() : 'N/A'}
          </div>
        </div>

        {detail.assignment_notes && (
          <div style={{ ...field, lineHeight: 1.5 }}>
            <b>Assignment notes:</b>
            <div style={{ marginTop: 4 }}>{detail.assignment_notes}</div>
          </div>
        )}

        {(detail.resolutions?.length || 0) > 0 && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <b>Resolution history</b>
            {detail.resolutions?.map((resolution) => (
              <div key={resolution.id} style={{ ...field, lineHeight: 1.5 }}>
                <div><b>Resolved:</b> {resolution.resolved_at ? new Date(resolution.resolved_at).toLocaleString() : 'N/A'}</div>
                <div><b>Resolved by:</b> {resolution.resolved_by}</div>
                {resolution.admin_note && <div><b>Note:</b> {resolution.admin_note}</div>}
                {resolution.resolution_photo_url && (
                  <a href={resolution.resolution_photo_url} target="_blank" rel="noreferrer">View resolution photo</a>
                )}
              </div>
            ))}
          </section>
        )}

        {(detail.verifications?.length || 0) > 0 && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <b>Citizen verifications</b>
            {detail.verifications?.map((verification) => (
              <div key={verification.id} style={{ ...field, lineHeight: 1.5 }}>
                <div><b>Result:</b> {verification.is_satisfied ? 'Satisfied' : 'Not satisfied'}</div>
                <div><b>Verified by:</b> {verification.verified_by}</div>
                <div><b>Verified at:</b> {verification.verified_at ? new Date(verification.verified_at).toLocaleString() : 'N/A'}</div>
                {verification.note && <div><b>Note:</b> {verification.note}</div>}
              </div>
            ))}
          </section>
        )}

        <details style={{ fontSize: '0.78rem' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 800 }}>Full complaint record</summary>
          <pre style={{ maxHeight: 260, overflow: 'auto', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', padding: 10, background: 'var(--theme-bg, #F6F1F1)', borderRadius: 6 }}>
            {JSON.stringify(detail, null, 2)}
          </pre>
        </details>

        {canAllotComplaint(viewer, detail.department_id) && !isDone(detail.status) && (
          <button
            onClick={onAllot}
            style={{
              ...primaryBtn, justifyContent: 'center',
              padding: '10px 14px', fontSize: '0.86rem', marginTop: 8,
            }}
          >
            <Briefcase size={14} /> Allot / Reassign via Stepper
          </button>
        )}
      </div>
    </div>
  </div>
  );
};
