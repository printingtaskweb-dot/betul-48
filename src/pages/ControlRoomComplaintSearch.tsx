import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { supabase } from '../lib/supabase';

type ComplaintOption = {
  id: string;
  ticket_number: string;
  citizen_name: string | null;
  citizen_phone: string | null;
  description: string;
};

interface Props {
  complaints: ComplaintOption[];
  value: string;
  onChange: (complaintId: string) => void;
  placeholder?: string;
  includeNone?: boolean;
}

const input: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '9px 10px',
  borderRadius: 6, border: '1px solid var(--theme-component-border, #bfbfbf)',
  background: 'var(--theme-bg, #fff4e7)', color: 'var(--gray-900)', font: 'inherit',
};
const button: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
  padding: '9px 12px', border: 0, borderRadius: 6, cursor: 'pointer',
  color: '#fff', background: 'var(--theme-primary, #7DB668)', fontWeight: 800,
};

export const ControlRoomComplaintSearch: React.FC<Props> = ({
  complaints,
  value,
  onChange,
  placeholder = 'Search by ticket, complaint ID, citizen, phone, or details',
  includeNone = false,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ComplaintOption[]>([]);
  const [selectedResult, setSelectedResult] = useState<ComplaintOption | null>(null);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  const runSearch = async () => {
    const needle = query.trim();
    if (!needle) {
      setResults([]);
      setSearched(false);
      return;
    }
    setSearching(true);
    setError('');
    setSearched(true);

    let request = supabase.from('complaints')
      .select('id, ticket_number, citizen_name, citizen_phone, description')
      .order('created_at', { ascending: false })
      .limit(30);
    if (/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(needle)) {
      request = request.eq('id', needle);
    } else {
      const safeNeedle = needle.replace(/[(),]/g, ' ').replace(/[%_]/g, '\\$&');
      request = request.or([
        `ticket_number.ilike.%${safeNeedle}%`,
        `citizen_name.ilike.%${safeNeedle}%`,
        `citizen_phone.ilike.%${safeNeedle}%`,
        `description.ilike.%${safeNeedle}%`,
      ].join(','));
    }
    const { data, error: searchError } = await request;
    setSearching(false);
    if (searchError) {
      setError(searchError.message);
      setResults([]);
      return;
    }
    setResults((data || []) as ComplaintOption[]);
  };

  const selected = complaints.find((complaint) => complaint.id === value)
    || (selectedResult?.id === value ? selectedResult : null);

  return (
    <div style={{ display: 'grid', gap: 7 }}>
      <div style={{ display: 'flex', gap: 7 }}>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              runSearch();
            }
          }}
          placeholder={placeholder}
          style={input}
        />
        <button type="button" onClick={() => void runSearch()} disabled={searching} style={{ ...button, opacity: searching ? 0.65 : 1 }}><Search size={14} />{searching ? 'Searching…' : 'Search'}</button>
      </div>

      {error && <span role="alert" style={{ fontSize: '0.74rem', color: '#991b1b' }}>{error}</span>}

      {selected && (
        <div style={{ fontSize: '0.76rem', color: 'var(--gray-700)' }}>
          Selected: <b>#{selected.ticket_number}</b> · {selected.citizen_name || 'Anonymous'} · {selected.description.slice(0, 90)}
          <button type="button" onClick={() => { setSelectedResult(null); onChange(''); }} style={{ marginLeft: 8, border: 0, background: 'none', color: 'var(--theme-primary, #660033)', cursor: 'pointer', fontWeight: 800 }}>Clear</button>
        </div>
      )}

      {includeNone && !selected && <div style={{ fontSize: '0.72rem', color: 'var(--gray-600)' }}>No complaint linked yet.</div>}

      {searched && query.trim() && (
        <div style={{ display: 'grid', gap: 4, maxHeight: 200, overflowY: 'auto' }}>
          {results.map((complaint) => (
            <button
              key={complaint.id}
              type="button"
              onClick={() => { setSelectedResult(complaint); onChange(complaint.id); }}
              style={{ padding: '8px 10px', textAlign: 'left', borderRadius: 5, border: '1px solid var(--theme-component-border, #bfbfbf)', background: 'var(--theme-bg, #fff4e7)', color: 'var(--gray-900)', cursor: 'pointer' }}
            >
              <b>#{complaint.ticket_number}</b> · {complaint.citizen_name || 'Anonymous'}{complaint.citizen_phone ? ` · ${complaint.citizen_phone}` : ''}
              <small style={{ display: 'block', marginTop: 3, color: 'var(--gray-600)' }}>{complaint.description.slice(0, 160)}</small>
            </button>
          ))}
          {results.length === 0 && <span style={{ fontSize: '0.76rem', color: 'var(--gray-600)' }}>No matching complaints found.</span>}
        </div>
      )}
    </div>
  );
};
