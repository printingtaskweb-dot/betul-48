import React, { useMemo } from 'react';
import { X, Briefcase, MapPin, Navigation } from 'lucide-react';
import { card, field, primaryBtn } from '../styles';
import { BORDER } from '../constants';
import { isDone } from '../utils/statusStyle';
import { canAllotComplaint } from '../../../../lib/hierarchy';
import { maskPhoneNumber } from '../../../../lib/roleDefinitions';
import type { StaffMember, Viewer } from '../../../../lib/hierarchy';
import { findWardForPoint, type Ward } from '../../../../lib/wardTypes';
import type { ComplaintRecord } from '../types';
import { mergeWithOfficialBetulWards } from '../../../../data/betulWardBoundaries';
import { InteractiveWardComplaintMap } from '../../../../components/maps/InteractiveWardComplaintMap';
import { ComplaintStatusTimeline } from '../../../../components/common/ComplaintStatusTimeline';

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
  const effectiveWards = useMemo(
    () => mergeWithOfficialBetulWards(wards, true),
    [wards],
  );
  const geoWard =
    detail.latitude != null && detail.longitude != null
      ? findWardForPoint(detail.latitude, detail.longitude, effectiveWards)
      : null;
  const ward = detail.ward || effectiveWards.find((item) => item.id === detail.ward_id) || geoWard;
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

        <div style={{ ...field, lineHeight: 1.5, background: '#faf9f6' }}>
          <b>Description:</b>
          <div style={{ marginTop: 4 }}>{detail.description}</div>
        </div>

        <ComplaintStatusTimeline
          status={detail.status}
          createdAt={detail.created_at}
          updatedAt={detail.updated_at}
          assignedAt={detail.assigned_at}
          resolvedAt={detail.resolutions?.[0]?.resolved_at}
          assigneeName={assignedStaff?.full_name}
          resolutionNote={detail.resolutions?.[0]?.admin_note}
          compact
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 8, fontSize: '0.8rem' }}>
          <div><b>Citizen:</b> {detail.citizen_name || 'Anonymous'}</div>
          <div><b>Phone:</b> {viewer.role === 'management_viewer' ? maskPhoneNumber(detail.citizen_phone) : (detail.citizen_phone || 'N/A')}</div>
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

        {detail.latitude != null && detail.longitude != null && (
          <div style={{ ...field, background: '#faf9f6', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <MapPin size={14} color="#146C94" />
                OpenStreetMap Location Preview{ward ? ` · Ward ${ward.ward_number} (${ward.name})` : ''}
              </span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <a
                  href={`https://www.openstreetmap.org/?mlat=${detail.latitude}&mlon=${detail.longitude}#map=17/${detail.latitude}/${detail.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: '0.72rem', fontWeight: 700, color: '#146C94', textDecoration: 'none', padding: '4px 9px', borderRadius: 6, background: '#eff6ff', border: '1px solid #bfdbfe' }}
                >
                  View on OpenStreetMap ↗
                </a>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${detail.latitude},${detail.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: '0.72rem', fontWeight: 700, color: '#15803d', textDecoration: 'none', padding: '4px 9px', borderRadius: 6, background: '#f0fdf4', border: '1px solid #bbf7d0', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  <Navigation size={11} /> Directions (Google Maps)
                </a>
              </div>
            </div>
            <InteractiveWardComplaintMap
              wards={effectiveWards}
              complaints={[]}
              selectedWardId={ward?.id || null}
              focusPoint={{
                lat: detail.latitude,
                lng: detail.longitude,
                label: `#${detail.ticket_number}`,
              }}
              height={220}
              showLegend={false}
              showComplaintPins={false}
            />
          </div>
        )}

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
          <pre style={{ maxHeight: 260, overflow: 'auto', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', padding: 10, background: '#faf9f6', border: '1px solid #e6e2d8', borderRadius: 10 }}>
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
