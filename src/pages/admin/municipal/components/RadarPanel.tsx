import React from 'react';
import { Compass, X } from 'lucide-react';
import { card, field, primaryBtn } from '../styles';
import { PRIMARY } from '../constants';
import type { Ward } from '../../../../lib/wardTypes';
import type { NearbyComplaint } from '../types';

interface Props {
  wards: Ward[];
  wardId: string;
  setWardId: (v: string) => void;
  nearby: NearbyComplaint[];
  radarMsg: string | null;
  onScan: () => void;
  onClose: () => void;
  selectedWard: Ward | null;
}

export const RadarPanel: React.FC<Props> = ({
  wards, wardId, setWardId, nearby, radarMsg, onScan, onClose, selectedWard,
}) => (
  <div style={{ ...card, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <b style={{ fontSize: '0.88rem', color: PRIMARY, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Compass size={16} /> Ward Proximity Scanner
      </b>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
        <X size={16} />
      </button>
    </div>

    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
      <label style={{ fontSize: '0.78rem' }}>
        Select Ward:
        <select
          value={wardId}
          onChange={(e) => setWardId(e.target.value)}
          style={{ ...field, minWidth: 220, marginLeft: 6, cursor: 'pointer' }}
        >
          <option value="">— Choose a ward —</option>
          {wards.map((w) => (
            <option key={w.id} value={w.id}>
              Ward {w.ward_number} · {w.name}
            </option>
          ))}
        </select>
      </label>

      <button onClick={onScan} disabled={!wardId} style={{ ...primaryBtn, opacity: wardId ? 1 : 0.5 }}>
        <Compass size={14} /> Scan Area
      </button>
    </div>

    {selectedWard && (
      <div style={{ fontSize: '0.76rem', color: 'var(--gray-700)' }}>
        📍 Center: {selectedWard.center_latitude?.toFixed(4)}, {selectedWard.center_longitude?.toFixed(4)} · 🎯 Radius:{' '}
        {selectedWard.radius_meters} m
      </div>
    )}

    {radarMsg && (
      <div style={{ fontSize: '0.8rem', color: '#b45309', background: '#fef3c7', padding: '8px 12px', borderRadius: 6 }}>
        {radarMsg}
      </div>
    )}

    {nearby.length > 0 && (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
        {nearby.map((n) => (
          <div key={n.id} style={{ ...field, padding: 10, fontSize: '0.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
              <span style={{ color: PRIMARY }}>#{n.ticket_number}</span>
              <span>{n.distance_meters} m</span>
            </div>
            <div style={{ marginTop: 4 }}>{n.description}</div>
          </div>
        ))}
      </div>
    )}
  </div>
);
