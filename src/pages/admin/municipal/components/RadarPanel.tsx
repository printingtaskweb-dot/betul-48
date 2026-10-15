import React from 'react';
import { Compass, X } from 'lucide-react';
import { card, field, primaryBtn } from '../styles';
import { PRIMARY } from '../constants';
import type { NearbyComplaint } from '../types';

interface Props {
  lat: number; setLat: (v: number) => void;
  lon: number; setLon: (v: number) => void;
  radius: number; setRadius: (v: number) => void;
  radarLoading: boolean;
  nearby: NearbyComplaint[];
  radarMsg: string | null;
  onScan: () => void;
  onClose: () => void;
}

export const RadarPanel: React.FC<Props> = ({
  lat, setLat, lon, setLon, radius, setRadius,
  radarLoading, nearby, radarMsg, onScan, onClose,
}) => (
  <div style={{ ...card, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <b style={{ fontSize: '0.88rem', color: PRIMARY, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Compass size={16} /> PostGIS Spatial Nearby Scanner
      </b>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
        <X size={16} />
      </button>
    </div>

    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
      <label style={{ fontSize: '0.78rem' }}>
        Latitude:
        <input
          type="number"
          step="0.0001"
          value={lat}
          onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
          style={{ ...field, width: 110, marginLeft: 6 }}
        />
      </label>
      <label style={{ fontSize: '0.78rem' }}>
        Longitude:
        <input
          type="number"
          step="0.0001"
          value={lon}
          onChange={(e) => setLon(parseFloat(e.target.value) || 0)}
          style={{ ...field, width: 110, marginLeft: 6 }}
        />
      </label>
      <label style={{ fontSize: '0.78rem' }}>
        Radius (m):
        <input
          type="number"
          step="500"
          value={radius}
          onChange={(e) => setRadius(parseInt(e.target.value, 10) || 1000)}
          style={{ ...field, width: 100, marginLeft: 6 }}
        />
      </label>
      <button onClick={onScan} disabled={radarLoading} style={primaryBtn}>
        <Compass size={14} /> {radarLoading ? 'Scanning...' : 'Scan Area'}
      </button>
    </div>

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
