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
}) => (
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
      width: '100%', maxWidth: 560, maxHeight: '88vh', overflowY: 'auto',
    }}>
      <div style={{
        background: 'var(--header-gradient, linear-gradient(135deg, #4d0026, #660033, #800040))',
        padding: '16px 20px', color: '#fff',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
            Ticket #{detail.ticket_number}
          </h3>
          <p style={{ margin: 0, fontSize: '0.74rem', opacity: 0.9 }}>
            {detail.department?.name || 'Municipal'} Department
            {(() => {
              const w = wards.find((x) => x.id === detail.ward_id);
              return w ? ` · Ward ${w.ward_number}` : '';
            })()}
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

        <div style={{ ...field, lineHeight: 1.5, background: 'var(--theme-bg, #fff4e7)' }}>
          <b>Description:</b>
          <div style={{ marginTop: 4 }}>{detail.description}</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.8rem' }}>
          <div><b>Citizen:</b> {detail.citizen_name || 'Anonymous'}</div>
          <div><b>Phone:</b> {detail.citizen_phone || 'N/A'}</div>
          <div>
            <b>Status:</b>{' '}
            <span style={{ textTransform: 'uppercase', fontWeight: 800 }}>{detail.status}</span>
          </div>
          <div><b>Registered:</b> {new Date(detail.created_at).toLocaleString()}</div>
          {detail.address && <div style={{ gridColumn: 'span 2' }}><b>Address:</b> {detail.address}</div>}
          {detail.ward_id && (
            <div>
              <b>Ward:</b>{' '}
              {(() => {
                const w = wards.find((x) => x.id === detail.ward_id);
                return w ? `Ward ${w.ward_number} · ${w.name}` : '—';
              })()}
            </div>
          )}
          <div style={{ gridColumn: 'span 2' }}>
            <b>Assigned Officer:</b>{' '}
            {detail.assigned_to ? staffById[detail.assigned_to]?.full_name || 'Staff' : 'Not assigned'}
          </div>
        </div>

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
