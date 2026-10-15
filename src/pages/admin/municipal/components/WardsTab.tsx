import React, { useMemo, useState } from 'react';
import { MapPin, Layers, Eye, Navigation, Crosshair } from 'lucide-react';
import { card, outlineBtn, primaryBtn } from '../styles';
import { BORDER, PRIMARY } from '../constants';
import type { Ward } from '../../../../lib/wardTypes';
import type { StaffMember } from '../../../../lib/hierarchy';
import type { ComplaintRecord } from '../types';
import { haversineMeters } from '../utils/haversine';

interface WardMetric {
  ward: Ward;
  total: number;
  resolved: number;
  pending: number;
  inProgress: number;
  officers: StaffMember[];
}

interface Props {
  wards: Ward[];
  wardMetrics: WardMetric[];
  unassignedWardComplaints: number;
  scopedComplaints: ComplaintRecord[];
  onManageWards: () => void;
  onViewTasks: (wardId: string) => void;
}

export const WardsTab: React.FC<Props> = ({
  wards, wardMetrics, unassignedWardComplaints, scopedComplaints,
  onManageWards, onViewTasks,
}) => {
  const [expandedWardId, setExpandedWardId] = useState<string | null>(null);

  const wardIdToWard = useMemo(() => {
    const map: Record<string, Ward> = {};
    wards.forEach((w) => (map[w.id] = w));
    return map;
  }, [wards]);

  /* Complaints that fall inside a given ward's radius (GPS-based) */
  const nearbyForWard = (ward: Ward): ComplaintRecord[] => {
    if (ward.center_latitude == null || ward.center_longitude == null) return [];
    const r = ward.radius_meters || 2000;
    return scopedComplaints.filter((c) => {
      if (c.latitude == null || c.longitude == null) return false;
      const d = haversineMeters(ward.center_latitude!, ward.center_longitude!, c.latitude, c.longitude);
      return d <= r;
    });
  };

  return (
    <div style={{ ...card, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: 'var(--gray-900)' }}>
            🗺️ Registered Wards & Radius Coverage
          </h3>
          <p style={{ margin: '3px 0 0', fontSize: '0.76rem', color: 'var(--gray-600)' }}>
            Each ward shows complaints registered inside its GPS radius (from <code>center_latitude/longitude</code>).
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '0.78rem', fontWeight: 800, padding: '6px 12px', borderRadius: 20,
            background: 'var(--theme-bg, #fff4e7)', border: BORDER, color: PRIMARY,
          }}>
            {wards.length} ward{wards.length !== 1 ? 's' : ''} registered
          </span>
          <button onClick={onManageWards} style={primaryBtn}>
            <Layers size={14} /> Manage Wards
          </button>
        </div>
      </div>

      {wards.length === 0 ? (
        <div style={{
          padding: '60px 20px', textAlign: 'center',
          background: 'var(--theme-bg, #fff4e7)',
          borderRadius: 'var(--radius-lg)',
          border: '1.5px dashed var(--theme-component-border, #bfbfbf)',
        }}>
          <MapPin size={40} color="var(--gray-500)" style={{ margin: '0 auto 14px', display: 'block' }} />
          <h3 style={{ margin: '0 0 6px', color: 'var(--gray-800)', fontWeight: 800 }}>No wards registered yet</h3>
          <p style={{ margin: '0 0 14px', fontSize: '0.85rem', color: 'var(--gray-600)' }}>
            Register your first municipal ward to start location-based filtering.
          </p>
          <button onClick={onManageWards} style={{ ...primaryBtn, justifyContent: 'center', margin: '0 auto' }}>
            <Layers size={14} /> Register First Ward
          </button>
        </div>
      ) : (
        <>
          {unassignedWardComplaints > 0 && (
            <div style={{
              padding: '10px 14px', borderRadius: 8,
              background: '#fef3c7', border: '1.5px solid #fde047',
              fontSize: '0.8rem', color: '#854d0e', fontWeight: 700,
            }}>
              ⚠️ {unassignedWardComplaints} complaint{unassignedWardComplaints !== 1 ? 's are' : ' is'} not linked to any registered ward yet.
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {wardMetrics.map((entry) => {
              const w = entry.ward;
              const radiusHits = nearbyForWard(w);
              const isExpanded = expandedWardId === w.id;

              return (
                <div key={w.id} style={{
                  padding: '14px 16px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.4)', border: BORDER,
                  display: 'flex', flexDirection: 'column', gap: 8,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{
                          background: PRIMARY, color: '#fff', fontSize: '0.72rem',
                          fontWeight: 900, padding: '2px 8px', borderRadius: 8,
                        }}>Ward {w.ward_number}</span>
                        <b style={{ fontSize: '0.92rem', color: 'var(--gray-900)' }}>{w.name}</b>
                      </div>
                      {w.name_hindi && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)', marginTop: 2 }}>{w.name_hindi}</div>
                      )}
                    </div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--gray-700)', whiteSpace: 'nowrap' }}>
                      Total: {entry.total}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', fontWeight: 700 }}>
                    <span style={{ color: '#15803d' }}>Resolved: {entry.resolved}</span>
                    <span style={{ color: '#3730a3' }}>In Progress: {entry.inProgress}</span>
                    <span style={{ color: '#b45309' }}>Pending: {entry.pending}</span>
                  </div>

                  <div style={{ fontSize: '0.72rem', color: 'var(--gray-700)', marginTop: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {w.center_latitude != null && w.center_longitude != null && (
                      <span style={{ fontFamily: 'monospace', color: 'var(--gray-600)' }}>
                        📍 {w.center_latitude.toFixed(4)}, {w.center_longitude.toFixed(4)} · 🎯 {w.radius_meters} m
                      </span>
                    )}
                    {w.pincode && <span>📮 {w.pincode}</span>}
                    <span>👤 Officers Assigned: <b>{entry.officers.length}</b></span>
                    <span style={{ color: PRIMARY, fontWeight: 800 }}>
                      <Crosshair size={11} style={{ display: 'inline', verticalAlign: 'middle' }} /> In radius: <b>{radiusHits.length}</b>
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                    <button
                      onClick={() => setExpandedWardId(isExpanded ? null : w.id)}
                      style={{ ...outlineBtn, padding: '5px 10px', fontSize: '0.72rem', flex: 1, justifyContent: 'center' }}
                    >
                      <Crosshair size={12} /> {isExpanded ? 'Hide' : 'Preview'} Radius
                    </button>
                    <button
                      onClick={() => onViewTasks(w.id)}
                      style={{ ...outlineBtn, padding: '5px 10px', fontSize: '0.72rem', flex: 1, justifyContent: 'center' }}
                    >
                      <Eye size={12} /> View Tasks
                    </button>
                    {w.center_latitude != null && w.center_longitude != null && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${w.center_latitude},${w.center_longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          ...outlineBtn, padding: '5px 10px', fontSize: '0.72rem',
                          flex: 1, justifyContent: 'center', textDecoration: 'none',
                        }}
                      >
                        <Navigation size={12} /> Map
                      </a>
                    )}
                  </div>

                  {isExpanded && (
                    <div style={{
                      marginTop: 6, padding: 8, borderRadius: 8,
                      background: 'var(--theme-bg, #fff4e7)', border: BORDER,
                      maxHeight: 180, overflowY: 'auto',
                      display: 'flex', flexDirection: 'column', gap: 6,
                    }}>
                      {radiusHits.length === 0 ? (
                        <span style={{ fontSize: '0.74rem', color: 'var(--gray-500)' }}>
                          No complaints within {w.radius_meters} m.
                        </span>
                      ) : (
                        radiusHits.slice(0, 20).map((c) => (
                          <div key={c.id} style={{ fontSize: '0.72rem', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                            <span style={{ fontWeight: 800, color: PRIMARY }}>#{c.ticket_number}</span>
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--gray-700)' }}>
                              {c.description}
                            </span>
                            <span style={{ color: 'var(--gray-600)' }}>{c.status}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
