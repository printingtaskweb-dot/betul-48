import React, { useState } from 'react';
import type { Complaint, ComplaintStatus } from '../../lib/supabase';
import { useComplaints } from '../../hooks/useComplaints';
import { ComplaintCard } from '../common/ComplaintCard';
import { ResolutionForm } from './ResolutionForm';
import { Search, X, Navigation } from 'lucide-react';

const STATUS_FILTERS: { label: string; value: ComplaintStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Verified', value: 'verified' },
  { label: 'Rejected', value: 'rejected' },
];

interface ComplaintTableProps {
  departmentSlug?: string;
}

export const ComplaintTable: React.FC<ComplaintTableProps> = ({ departmentSlug }) => {
  const { complaints, loading, refetch } = useComplaints(departmentSlug);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ComplaintStatus | 'all'>('all');
  const [selected, setSelected] = useState<Complaint | null>(null);

  const filtered = complaints.filter((c) => {
    const matchesSearch =
      c.ticket_number?.toLowerCase().includes(search.toLowerCase()) ||
      c.description?.toLowerCase().includes(search.toLowerCase()) ||
      c.citizen_name?.toLowerCase().includes(search.toLowerCase()) ||
      false;
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: complaints.length,
    pending: complaints.filter((c) => c.status === 'pending').length,
    in_progress: complaints.filter((c) => c.status === 'in_progress').length,
    resolved: complaints.filter((c) => c.status === 'resolved').length,
    verified: complaints.filter((c) => c.status === 'verified').length,
  };

  return (
    <div>
      {/* Stats summary row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
          gap: 12,
          marginBottom: 20,
        }}
      >
        {[
          { label: 'Total', value: stats.total, color: 'var(--indigo-600)' },
          { label: 'Pending', value: stats.pending, color: 'var(--amber-500)' },
          { label: 'In Progress', value: stats.in_progress, color: 'var(--blue-600)' },
          { label: 'Resolved', value: stats.resolved, color: '#7c3aed' },
          { label: 'Verified', value: stats.verified, color: 'var(--green-600)' },
        ].map((s) => (
          <div
            key={s.label}
            className="card-hover"
            style={{
              background: 'var(--theme-component, #d9d9d9)',
              border: '1.5px solid var(--theme-component-border, #bfbfbf)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
              textAlign: 'center',
              borderTop: `3px solid ${s.color}`,
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: s.color, lineHeight: 1.1 }}>{s.value}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)', fontWeight: 600, marginTop: 4 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          marginBottom: 16,
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 200 }}>
          <Search
            size={16}
            color="var(--gray-400)"
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            placeholder="Search ticket, name, location…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 38px',
              borderRadius: 'var(--radius-md)',
              border: '1.5px solid var(--theme-component-border, #bfbfbf)',
              fontSize: '0.88rem',
              outline: 'none',
              background: 'var(--theme-bg, #F6F1F1)',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {STATUS_FILTERS.map((f) => {
            const isActive = statusFilter === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  border: '1.5px solid',
                  borderColor: isActive ? 'var(--theme-primary, #146C94)' : 'var(--theme-component-border, #bfbfbf)',
                  background: isActive ? 'var(--theme-primary, #146C94)' : 'var(--theme-component, #d9d9d9)',
                  color: isActive ? '#fff' : 'var(--gray-700)',
                  cursor: 'pointer',
                  transition: 'var(--transition)',
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Complaint List & Responsive Detail Pane */}
      <div className="complaint-table-container" style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loading && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)' }}>
              <p>Loading complaints...</p>
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div
              style={{
                padding: '48px 24px',
                textAlign: 'center',
                background: '#fff',
                borderRadius: 'var(--radius-md)',
                border: '1.5px dashed var(--gray-200)',
              }}
            >
              <p style={{ fontSize: 32, margin: '0 0 8px' }}>📂</p>
              <p style={{ color: 'var(--gray-600)', fontWeight: 600, margin: 0 }}>No matching complaints found</p>
              <p style={{ color: 'var(--gray-400)', fontSize: '0.8rem', marginTop: 4 }}>
                Try adjusting your search query or status filter
              </p>
            </div>
          )}
          {filtered.map((c) => (
            <ComplaintCard key={c.id} complaint={c} compact onClick={() => setSelected(c)} />
          ))}
        </div>

        {/* Side Panel / Mobile Modal for Resolution Form */}
        {selected && (
          <div className="complaint-detail-pane">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <span
                  style={{
                    fontSize: '0.72rem',
                    color: 'var(--gray-400)',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}
                >
                  Resolution Panel
                </span>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>#{selected.ticket_number}</h3>
              </div>
              <button
                onClick={() => setSelected(null)}
                style={{
                  border: 'none',
                  background: 'var(--gray-100)',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={18} color="var(--gray-600)" />
              </button>
            </div>

            {selected.photo_url && (
              <img
                src={selected.photo_url}
                alt="Complaint"
                style={{
                  width: '100%',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: 12,
                  objectFit: 'cover',
                  maxHeight: 220,
                }}
              />
            )}

            <p style={{ fontSize: '0.9rem', color: 'var(--gray-800)', margin: '0 0 8px', lineHeight: 1.5 }}>
              {selected.description}
            </p>
            {selected.address && (
              <p style={{ fontSize: '0.82rem', color: 'var(--gray-500)', margin: '0 0 8px' }}>
                📍 {selected.address}
              </p>
            )}
            {selected.citizen_name && (
              <p style={{ fontSize: '0.82rem', color: 'var(--gray-700)', margin: '0 0 12px' }}>
                👤 {selected.citizen_name} {selected.citizen_phone && `· ${selected.citizen_phone}`}
              </p>
            )}

            {/* Accurate GPS Coordinates & Get Directions Navigation Button */}
            {selected.latitude && selected.longitude && (
              <div
                style={{
                  background: 'var(--green-50)',
                  border: '1.5px solid var(--green-300)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 14px',
                  marginBottom: 16,
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--green-900)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    🎯 Exact Location GPS
                  </span>
                  <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--green-800)' }}>
                    {selected.latitude.toFixed(6)}, {selected.longitude.toFixed(6)}
                  </span>
                </div>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${selected.latitude},${selected.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '10px 16px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'linear-gradient(135deg, #15803d, #16a34a)',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    textDecoration: 'none',
                    boxShadow: '0 2px 8px rgba(22,163,74,0.3)',
                    transition: 'var(--transition)',
                  }}
                >
                  <Navigation size={16} /> Get Directions (Google Maps)
                </a>
              </div>
            )}

            <ResolutionForm
              complaint={selected}
              onUpdate={() => {
                refetch();
                setSelected(null);
              }}
            />
          </div>
        )}
      </div>

      <style>{`
        .complaint-detail-pane {
          width: 380px;
          flex-shrink: 0;
          background: #fff;
          border: 1.5px solid var(--gray-200);
          border-radius: var(--radius-md);
          padding: 18px 20px;
          position: sticky;
          top: 80px;
          max-height: calc(100vh - 120px);
          overflow-y: auto;
          box-shadow: var(--shadow-md);
        }

        @media (max-width: 900px) {
          .complaint-table-container {
            flex-direction: column !important;
          }
          .complaint-detail-pane {
            position: fixed !important;
            top: auto !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            width: 100% !important;
            max-height: 80vh !important;
            z-index: 1000 !important;
            border-radius: 20px 20px 0 0 !important;
            border-bottom: none !important;
            box-shadow: 0 -8px 30px rgba(0,0,0,0.25) !important;
          }
        }
      `}</style>
    </div>
  );
};
