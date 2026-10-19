import React, { useCallback, useEffect, useState } from 'react';
import { Briefcase, Building2, ClipboardList, PhoneCall, RefreshCw, Save, Search, Send, ShieldCheck, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { StaffMember } from '../lib/hierarchy';
import type { Ward } from '../lib/wardTypes';
import { findWardForPoint } from '../lib/wardTypes';
import { decimalNumber, isValidMobile, lettersAndSpaces, mobileDigits } from '../lib/inputValidation';
import { WardAssignmentPanel } from './admin/municipal/components/WardAssignmentPanel';
import { ControlRoomComplaintSearch } from './ControlRoomComplaintSearch';

type Tab = 'intake' | 'routing' | 'callbacks' | 'followups' | 'ward-staff';
type Department = { id: string; name: string; icon: string };
type Complaint = {
  id: string;
  ticket_number: string;
  department_id: string | null;
  ward_id: string | null;
  citizen_name: string | null;
  citizen_phone: string | null;
  description: string;
  address: string | null;
  status: string;
  created_at: string;
  department?: { name: string } | null;
  ward?: { ward_number: number; name: string } | null;
};
type Callback = {
  id: string;
  citizen_name: string;
  citizen_phone: string;
  message: string;
  status: string;
  created_at: string;
  complaint?: { ticket_number: string; description: string } | null;
};
type Referral = {
  id: string;
  complaint_id: string;
  external_agency: string | null;
  external_reference: string | null;
  notes: string;
  status: string;
  next_follow_up_at: string | null;
  outcome: string | null;
  created_at: string;
  complaint?: { ticket_number: string; description: string } | null;
};
type LocationResult = { display_name: string; lat: string; lon: string };

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'intake', label: 'H01 Intake', icon: <PhoneCall size={16} /> },
  { id: 'routing', label: 'H02 Routing', icon: <ClipboardList size={16} /> },
  { id: 'callbacks', label: 'H03 Callbacks', icon: <PhoneCall size={16} /> },
  { id: 'followups', label: 'H04 External follow-up', icon: <Briefcase size={16} /> },
  { id: 'ward-staff', label: 'H05 Ward staff', icon: <Users size={16} /> },
];

const panel: React.CSSProperties = {
  background: 'var(--theme-component, #d9d9d9)',
  border: '1px solid var(--theme-component-border, #bfbfbf)',
  borderRadius: 8,
  padding: 18,
};
const input: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '9px 10px',
  borderRadius: 6, border: '1px solid var(--theme-component-border, #bfbfbf)',
  background: 'var(--theme-bg, #F6F1F1)', color: 'var(--gray-900)', font: 'inherit',
};
const button: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
  padding: '9px 12px', border: 0, borderRadius: 6, cursor: 'pointer',
  color: '#fff', background: 'var(--theme-primary, #146C94)', fontWeight: 800,
};

export default function ControlRoomDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('intake');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [callbacks, setCallbacks] = useState<Callback[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [locationResults, setLocationResults] = useState<LocationResult[]>([]);
  const [searchingLocation, setSearchingLocation] = useState(false);
  const [routingSearch, setRoutingSearch] = useState('');
  const [routingSearchDraft, setRoutingSearchDraft] = useState('');
  const [routingSearchResults, setRoutingSearchResults] = useState<Complaint[] | null>(null);
  const [searchingRouting, setSearchingRouting] = useState(false);
  const [routingEdits, setRoutingEdits] = useState<Record<string, { departmentId: string; wardId: string; reason: string }>>({});
  const [referralUpdates, setReferralUpdates] = useState<Record<string, { outcome: string; followUpAt: string }>>({});

  const [intake, setIntake] = useState({ channel: 'phone', departmentId: '', wardId: '', name: '', phone: '', description: '', address: '', latitude: '', longitude: '' });
  const [callback, setCallback] = useState({ name: '', phone: '', complaintId: '', message: '', preferredAt: '' });
  const [referral, setReferral] = useState({ complaintId: '', agency: '', reference: '', notes: '', followUpAt: '' });
  const [verificationRequest, setVerificationRequest] = useState({ complaintId: '', reason: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const [deptResult, wardResult, staffResult, complaintResult, callbackResult, referralResult] = await Promise.all([
      supabase.from('departments').select('id, name, icon').eq('is_active', true).order('name'),
      supabase.from('wards').select('*').eq('is_active', true).order('ward_number'),
      supabase.from('user_profiles').select('*').neq('role', 'citizen').order('full_name'),
      supabase.from('complaints').select('id, ticket_number, department_id, ward_id, citizen_name, citizen_phone, description, address, status, created_at, department:departments!complaints_department_id_fkey(name), ward:wards!complaints_ward_id_fkey(ward_number, name)').order('created_at', { ascending: false }).limit(1000),
      supabase.from('citizen_callback_requests').select('*, complaint:complaints!citizen_callback_requests_complaint_id_fkey(ticket_number, description)').order('created_at', { ascending: false }).limit(500),
      supabase.from('complaint_referrals').select('*, complaint:complaints!complaint_referrals_complaint_id_fkey(ticket_number, description)').eq('referral_type', 'external').order('next_follow_up_at', { ascending: true }).limit(500),
    ]);

    const failure = [deptResult, wardResult, staffResult, complaintResult, callbackResult, referralResult].find((result) => result.error);
    if (failure?.error) setError(failure.error.message);
    setDepartments((deptResult.data || []) as Department[]);
    setWards((wardResult.data || []) as Ward[]);
    setStaff((staffResult.data || []) as StaffMember[]);
    setComplaints((complaintResult.data || []).map((row: any) => ({
      ...row,
      department: Array.isArray(row.department) ? row.department[0] || null : row.department,
      ward: Array.isArray(row.ward) ? row.ward[0] || null : row.ward,
    })) as Complaint[]);
    setCallbacks((callbackResult.data || []) as Callback[]);
    setReferrals((referralResult.data || []) as Referral[]);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const complete = (text: string) => {
    setMessage(text);
    setError('');
  };

  const searchLocations = async () => {
    if (!locationQuery.trim()) return;
    setSearchingLocation(true);
    setError('');
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(locationQuery.trim())}`;
      const response = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      if (!response.ok) throw new Error('Location search is unavailable. Enter the address or coordinates manually.');
      setLocationResults(await response.json() as LocationResult[]);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : 'Location search failed.');
      setLocationResults([]);
    } finally {
      setSearchingLocation(false);
    }
  };

  const searchRoutingQueue = async () => {
    const needle = routingSearchDraft.trim();
    if (!needle) {
      setRoutingSearch('');
      setRoutingSearchResults(null);
      return;
    }
    setSearchingRouting(true);
    setError('');
    const fields = 'id, ticket_number, department_id, ward_id, citizen_name, citizen_phone, description, address, status, created_at, department:departments!complaints_department_id_fkey(name), ward:wards!complaints_ward_id_fkey(ward_number, name)';
    let request = supabase.from('complaints').select(fields)
      .or('department_id.is.null,ward_id.is.null');
    if (/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(needle)) {
      request = request.eq('id', needle);
    } else {
      const safeNeedle = needle.replace(/[(),]/g, ' ').replace(/[%_]/g, '\\$&');
      request = request.or([
        `ticket_number.ilike.%${safeNeedle}%`,
        `citizen_name.ilike.%${safeNeedle}%`,
        `citizen_phone.ilike.%${safeNeedle}%`,
        `description.ilike.%${safeNeedle}%`,
        `address.ilike.%${safeNeedle}%`,
      ].join(','));
    }
    const { data, error: searchError } = await request.order('created_at', { ascending: false }).limit(100);
    setSearchingRouting(false);
    if (searchError) {
      setError(searchError.message);
      return;
    }
    setRoutingSearch(needle);
    setRoutingSearchResults((data || []).map((row: any) => ({
      ...row,
      department: Array.isArray(row.department) ? row.department[0] || null : row.department,
      ward: Array.isArray(row.ward) ? row.ward[0] || null : row.ward,
    })) as Complaint[]);
  };

  const selectLocation = (result: LocationResult) => {
    const latitude = Number(result.lat);
    const longitude = Number(result.lon);
    const matchingWard = findWardForPoint(latitude, longitude, wards);
    setIntake({
      ...intake,
      address: result.display_name,
      latitude: result.lat,
      longitude: result.lon,
      wardId: matchingWard?.id || intake.wardId,
    });
    setLocationQuery(result.display_name);
    setLocationResults([]);
  };

  const submitIntake = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return setError('You must be signed in to record an intake.');
    if (!isValidMobile(intake.phone)) return setError('Enter a valid 10-digit citizen mobile number.');
    setSaving(true);
    setError('');
    const { error: insertError } = await supabase.from('complaints').insert({
      department_id: intake.departmentId || null,
      ward_id: intake.wardId || null,
      citizen_name: lettersAndSpaces(intake.name).trim() || null,
      citizen_phone: mobileDigits(intake.phone) || null,
      description: intake.description.trim(),
      address: intake.address.trim() || null,
      latitude: intake.latitude ? Number(intake.latitude) : null,
      longitude: intake.longitude ? Number(intake.longitude) : null,
      intake_channel: intake.channel,
      created_by: user.id,
    });
    setSaving(false);
    if (insertError) return setError(insertError.message);
    setIntake({ channel: 'phone', departmentId: '', wardId: '', name: '', phone: '', description: '', address: '', latitude: '', longitude: '' });
    complete('Complaint intake recorded.');
    await load();
  };

  const saveRouting = async (complaint: Complaint) => {
    if (!user) return setError('You must be signed in to correct routing.');
    const edit = routingEdits[complaint.id] || { departmentId: complaint.department_id || '', wardId: complaint.ward_id || '', reason: '' };
    if (!edit.departmentId || !edit.wardId || !edit.reason.trim()) {
      return setError('Select a department and ward, and enter a correction reason.');
    }
    setSaving(true);
    setError('');
    const { error: updateError } = await supabase.from('complaints').update({
      department_id: edit.departmentId,
      ward_id: edit.wardId,
      updated_at: new Date().toISOString(),
    }).eq('id', complaint.id);
    if (updateError) {
      setSaving(false);
      return setError(updateError.message);
    }
    const { error: auditError } = await supabase.from('complaint_routing_events').insert({
      complaint_id: complaint.id,
      changed_by: user.id,
      previous_department_id: complaint.department_id,
      new_department_id: edit.departmentId,
      previous_ward_id: complaint.ward_id,
      new_ward_id: edit.wardId,
      reason: edit.reason.trim(),
    });
    setSaving(false);
    if (auditError) return setError(`Routing updated, but audit entry failed: ${auditError.message}`);
    complete(`Routing corrected for ${complaint.ticket_number}.`);
    await load();
  };

  const submitCallback = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!callback.name.trim() || !callback.phone.trim() || !callback.message.trim()) {
      return setError('Citizen name, phone, and callback request are required.');
    }
    if (!isValidMobile(callback.phone)) return setError('Enter a valid 10-digit citizen mobile number.');
    setSaving(true);
    setError('');
    const { error: insertError } = await supabase.from('citizen_callback_requests').insert({
      citizen_name: lettersAndSpaces(callback.name).trim(),
      citizen_phone: mobileDigits(callback.phone),
      complaint_id: callback.complaintId || null,
      message: callback.message.trim(),
      preferred_callback_at: callback.preferredAt ? new Date(callback.preferredAt).toISOString() : null,
      created_by: user?.id || null,
    });
    setSaving(false);
    if (insertError) return setError(insertError.message);
    setCallback({ name: '', phone: '', complaintId: '', message: '', preferredAt: '' });
    complete('Callback request added to the queue.');
    await load();
  };

  const updateCallback = async (id: string, status: string) => {
    const { error: updateError } = await supabase.from('citizen_callback_requests').update({
      status,
      completed_at: status === 'completed' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }).eq('id', id);
    if (updateError) setError(updateError.message);
    else await load();
  };

  const submitReferral = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return setError('You must be signed in to create a referral.');
    setSaving(true);
    setError('');
    const { error: insertError } = await supabase.from('complaint_referrals').insert({
      complaint_id: referral.complaintId,
      referral_type: 'external',
      external_agency: referral.agency.trim(),
      external_reference: referral.reference.trim() || null,
      notes: referral.notes.trim(),
      referred_by: user.id,
      next_follow_up_at: referral.followUpAt ? new Date(referral.followUpAt).toISOString() : null,
    });
    setSaving(false);
    if (insertError) return setError(insertError.message);
    setReferral({ complaintId: '', agency: '', reference: '', notes: '', followUpAt: '' });
    complete('External referral created.');
    await load();
  };

  const submitVerificationRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return setError('You must be signed in to request verification.');
    if (!verificationRequest.complaintId || !verificationRequest.reason.trim()) return setError('Select a complaint and explain why independent review is needed.');
    setSaving(true);
    setError('');
    const { error: requestError } = await supabase.from('verification_requests').insert({
      complaint_id: verificationRequest.complaintId,
      request_type: 'officer_requested',
      requested_by: user.id,
      reason: verificationRequest.reason.trim(),
      deadline_at: new Date().toISOString(),
    });
    setSaving(false);
    if (requestError) return setError(requestError.message);
    setVerificationRequest({ complaintId: '', reason: '' });
    complete('Independent verification request sent to the verifier queue.');
    await load();
  };

  const updateReferral = async (id: string, status: string) => {
    const { error: updateError } = await supabase.from('complaint_referrals').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    if (updateError) setError(updateError.message);
    else await load();
  };

  const saveReferralFollowup = async (item: Referral) => {
    const edit = referralUpdates[item.id] || { outcome: item.outcome || '', followUpAt: '' };
    const { error: updateError } = await supabase.from('complaint_referrals').update({
      outcome: edit.outcome.trim() || null,
      next_follow_up_at: edit.followUpAt ? new Date(edit.followUpAt).toISOString() : null,
      updated_at: new Date().toISOString(),
    }).eq('id', item.id);
    if (updateError) setError(updateError.message);
    else {
      complete('External follow-up updated.');
      await load();
    }
  };

  const routingQueue = complaints.filter((complaint) => !complaint.department_id || !complaint.ward_id);
  const localFilteredRoutingQueue = routingQueue.filter((complaint) => {
    const query = routingSearch.trim().toLowerCase();
    return !query || [complaint.id, complaint.ticket_number, complaint.citizen_name, complaint.citizen_phone, complaint.description, complaint.address]
      .some((value) => value?.toLowerCase().includes(query));
  });
  const filteredRoutingQueue = routingSearchResults ?? localFilteredRoutingQueue;
  const fieldStyle: React.CSSProperties = { display: 'grid', gap: 5, fontSize: '0.78rem', fontWeight: 700 };

  return (
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px', display: 'grid', gap: 16 }}>
      <header style={{ ...panel, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Building2 size={24} color="var(--theme-primary, #146C94)" />
          <div>
            <h1 style={{ margin: 0, fontSize: '1.25rem' }}>Municipal Control Room</h1>
            <p style={{ margin: '4px 0 0', color: 'var(--gray-600)', fontSize: '0.82rem' }}>Citizen intake, routing support, callbacks, and external coordination</p>
          </div>
        </div>
        <button type="button" onClick={() => void load()} style={{ ...button, background: 'var(--theme-bg, #F6F1F1)', color: 'var(--theme-primary, #146C94)', border: '1px solid var(--theme-primary, #146C94)' }}><RefreshCw size={14} /> Refresh</button>
      </header>

      {error && <div role="alert" style={{ ...panel, color: '#991b1b', borderColor: '#fca5a5' }}>{error}</div>}
      {message && <div role="status" style={{ ...panel, color: '#166534', borderColor: '#86efac' }}>{message}</div>}

      <nav style={{ display: 'flex', gap: 6, overflowX: 'auto', borderBottom: '1px solid var(--theme-component-border, #bfbfbf)' }}>
        {tabs.map((tab) => (
          <button key={tab.id} type="button" onClick={() => { setActiveTab(tab.id); setMessage(''); setError(''); }} style={{ ...button, flex: '0 0 auto', borderRadius: '6px 6px 0 0', background: activeTab === tab.id ? 'var(--theme-primary, #146C94)' : 'transparent', color: activeTab === tab.id ? '#fff' : 'var(--gray-700)' }}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </nav>

      {activeTab === 'intake' && (
        <section style={panel}>
          <h2 style={{ margin: '0 0 14px', fontSize: '1rem' }}>H01 · Telephone and counter complaint</h2>
          <form onSubmit={submitIntake} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <label style={fieldStyle}>Received via<select required value={intake.channel} onChange={(e) => setIntake({ ...intake, channel: e.target.value })} style={input}><option value="phone">Telephone</option><option value="counter">Walk-in counter</option></select></label>
            <label style={fieldStyle}>Category / department<select value={intake.departmentId} onChange={(e) => setIntake({ ...intake, departmentId: e.target.value })} style={input}><option value="">Category identification pending</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
            <label style={fieldStyle}>Ward<select value={intake.wardId} onChange={(e) => setIntake({ ...intake, wardId: e.target.value })} style={input}><option value="">Ward identification pending</option>{wards.map((w) => <option key={w.id} value={w.id}>Ward {w.ward_number} · {w.name}</option>)}</select></label>
            <label style={fieldStyle}>Citizen name<input value={intake.name} onChange={(e) => setIntake({ ...intake, name: lettersAndSpaces(e.target.value) })} style={input} /></label>
            <label style={fieldStyle}>Citizen phone<input type="tel" inputMode="numeric" maxLength={10} value={intake.phone} onChange={(e) => setIntake({ ...intake, phone: mobileDigits(e.target.value) })} style={input} /></label>
            <div style={{ ...fieldStyle, gridColumn: '1 / -1' }}>
              <label htmlFor="control-room-location-search">Search complaint location</label>
              <div style={{ display: 'flex', gap: 7 }}>
                <input id="control-room-location-search" value={locationQuery} onChange={(e) => setLocationQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void searchLocations(); } }} placeholder="Search address, landmark, or locality" style={input} />
                <button type="button" onClick={() => void searchLocations()} disabled={searchingLocation} style={{ ...button, opacity: searchingLocation ? 0.65 : 1 }}><Search size={14} />{searchingLocation ? 'Searching…' : 'Search location'}</button>
              </div>
              {locationResults.map((result) => <button key={`${result.lat},${result.lon}`} type="button" onClick={() => selectLocation(result)} style={{ ...input, textAlign: 'left', cursor: 'pointer' }}>{result.display_name}</button>)}
            </div>
            <label style={fieldStyle}>Address<input value={intake.address} onChange={(e) => setIntake({ ...intake, address: e.target.value })} style={input} /></label>
            <label style={fieldStyle}>Latitude<input type="number" step="any" value={intake.latitude} onChange={(e) => setIntake({ ...intake, latitude: decimalNumber(e.target.value) })} style={input} /></label>
            <label style={fieldStyle}>Longitude<input type="number" step="any" value={intake.longitude} onChange={(e) => setIntake({ ...intake, longitude: decimalNumber(e.target.value) })} style={input} /></label>
            <label style={{ ...fieldStyle, gridColumn: '1 / -1' }}>Complaint details<textarea required rows={4} value={intake.description} onChange={(e) => setIntake({ ...intake, description: e.target.value })} style={input} /></label>
            <button type="submit" disabled={saving} style={{ ...button, justifySelf: 'start' }}><Send size={15} />{saving ? 'Saving…' : 'Record complaint'}</button>
          </form>
        </section>
      )}

      {activeTab === 'routing' && (
        <section style={{ display: 'grid', gap: 10 }}>
          <div style={panel}><h2 style={{ margin: 0, fontSize: '1rem' }}>H02 · Routing corrections</h2><p style={{ margin: '5px 0 0', color: 'var(--gray-600)', fontSize: '0.82rem' }}>Tickets with missing category or ward mapping: {routingQueue.length}</p></div>
          <form onSubmit={submitVerificationRequest} style={{ ...panel, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
            <div style={fieldStyle}>Request independent review<ControlRoomComplaintSearch complaints={complaints.filter((c) => c.status === 'resolved')} value={verificationRequest.complaintId} onChange={(complaintId) => setVerificationRequest({ ...verificationRequest, complaintId })} placeholder="Find resolved ticket, citizen, or complaint" /></div>
            <label style={fieldStyle}>Reason for review<input required value={verificationRequest.reason} onChange={(e) => setVerificationRequest({ ...verificationRequest, reason: e.target.value })} style={input} /></label>
            <button type="submit" disabled={saving} style={{ ...button, alignSelf: 'end' }}><ShieldCheck size={14} />Request verifier review</button>
          </form>
          <div style={{ ...panel, display: 'flex', gap: 8, alignItems: 'center' }}>
            <input value={routingSearchDraft} onChange={(event) => setRoutingSearchDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void searchRoutingQueue(); } }} placeholder="Find routing ticket by ID, ticket, citizen, phone, or details" style={input} />
            <button type="button" disabled={searchingRouting} onClick={() => void searchRoutingQueue()} style={{ ...button, opacity: searchingRouting ? 0.65 : 1 }}><Search size={14} />{searchingRouting ? 'Searching…' : 'Search'}</button>
          </div>
          {filteredRoutingQueue.map((complaint) => {
            const edit = routingEdits[complaint.id] || { departmentId: complaint.department_id || '', wardId: complaint.ward_id || '', reason: '' };
            return <article key={complaint.id} style={{ ...panel, display: 'grid', gap: 10 }}>
              <div><b>#{complaint.ticket_number}</b> · {complaint.description}<div style={{ color: 'var(--gray-600)', fontSize: '0.78rem' }}>{complaint.address || 'No address'} · {new Date(complaint.created_at).toLocaleString()}</div></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                <label style={fieldStyle}>Category<select value={edit.departmentId} onChange={(e) => setRoutingEdits({ ...routingEdits, [complaint.id]: { ...edit, departmentId: e.target.value } })} style={input}><option value="">Select category</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
                <label style={fieldStyle}>Ward<select value={edit.wardId} onChange={(e) => setRoutingEdits({ ...routingEdits, [complaint.id]: { ...edit, wardId: e.target.value } })} style={input}><option value="">Select ward</option>{wards.map((w) => <option key={w.id} value={w.id}>Ward {w.ward_number} · {w.name}</option>)}</select></label>
                <label style={fieldStyle}>Correction reason<input value={edit.reason} onChange={(e) => setRoutingEdits({ ...routingEdits, [complaint.id]: { ...edit, reason: e.target.value } })} style={input} /></label>
              </div>
              <button type="button" disabled={saving} onClick={() => void saveRouting(complaint)} style={{ ...button, justifySelf: 'start' }}><Save size={14} />Save routing</button>
            </article>;
          })}
          {!loading && filteredRoutingQueue.length === 0 && <div style={panel}>{routingSearch ? 'No routing complaints match this search.' : 'No complaints currently need routing correction.'}</div>}
        </section>
      )}

      {activeTab === 'callbacks' && (
        <section style={{ display: 'grid', gap: 12 }}>
          <div style={panel}><h2 style={{ margin: 0, fontSize: '1rem' }}>H03 · Citizen callbacks</h2><p style={{ margin: '5px 0 0', color: 'var(--gray-600)', fontSize: '0.82rem' }}>Log incoming assistance requests and track callbacks.</p></div>
          <form onSubmit={submitCallback} style={{ ...panel, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            <label style={fieldStyle}>Citizen name<input required value={callback.name} onChange={(e) => setCallback({ ...callback, name: lettersAndSpaces(e.target.value) })} style={input} /></label>
            <label style={fieldStyle}>Phone<input required type="tel" inputMode="numeric" maxLength={10} value={callback.phone} onChange={(e) => setCallback({ ...callback, phone: mobileDigits(e.target.value) })} style={input} /></label>
            <div style={fieldStyle}>Related complaint<ControlRoomComplaintSearch complaints={complaints} value={callback.complaintId} onChange={(complaintId) => setCallback({ ...callback, complaintId })} includeNone placeholder="Find ticket or citizen (optional)" /></div>
            <label style={fieldStyle}>Preferred callback<input type="datetime-local" value={callback.preferredAt} onChange={(e) => setCallback({ ...callback, preferredAt: e.target.value })} style={input} /></label>
            <label style={{ ...fieldStyle, gridColumn: '1 / -1' }}>Request details<textarea required rows={3} value={callback.message} onChange={(e) => setCallback({ ...callback, message: e.target.value })} style={input} /></label>
            <button type="submit" disabled={saving} style={{ ...button, justifySelf: 'start' }}><PhoneCall size={14} />Add callback request</button>
          </form>
          {callbacks.map((item) => <article key={item.id} style={{ ...panel, display: 'flex', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}><div><b>{item.citizen_name} · {item.citizen_phone}</b><p style={{ margin: '5px 0' }}>{item.message}</p><small>{item.complaint ? `#${item.complaint.ticket_number} · ` : ''}{new Date(item.created_at).toLocaleString()}</small></div><select aria-label="Callback status" value={item.status} onChange={(e) => void updateCallback(item.id, e.target.value)} style={{ ...input, width: 'auto', alignSelf: 'center' }}><option value="pending">Pending</option><option value="assigned">Assigned</option><option value="completed">Completed</option><option value="no_answer">No answer</option></select></article>)}
          {!loading && callbacks.length === 0 && <div style={panel}>No callback requests yet.</div>}
        </section>
      )}

      {activeTab === 'followups' && (
        <section style={{ display: 'grid', gap: 12 }}>
          <div style={panel}><h2 style={{ margin: 0, fontSize: '1rem' }}>H04 · External department follow-up</h2><p style={{ margin: '5px 0 0', color: 'var(--gray-600)', fontSize: '0.82rem' }}>Track referrals to agencies outside the municipal organization.</p></div>
          <form onSubmit={submitReferral} style={{ ...panel, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            <div style={fieldStyle}>Complaint<ControlRoomComplaintSearch complaints={complaints} value={referral.complaintId} onChange={(complaintId) => setReferral({ ...referral, complaintId })} placeholder="Find ticket, citizen, or complaint details" /></div>
            <label style={fieldStyle}>External agency<input required value={referral.agency} onChange={(e) => setReferral({ ...referral, agency: e.target.value })} style={input} /></label>
            <label style={fieldStyle}>Agency reference<input value={referral.reference} onChange={(e) => setReferral({ ...referral, reference: e.target.value })} style={input} /></label>
            <label style={fieldStyle}>Next follow-up<input type="datetime-local" value={referral.followUpAt} onChange={(e) => setReferral({ ...referral, followUpAt: e.target.value })} style={input} /></label>
            <label style={{ ...fieldStyle, gridColumn: '1 / -1' }}>Referral notes<textarea required rows={3} value={referral.notes} onChange={(e) => setReferral({ ...referral, notes: e.target.value })} style={input} /></label>
            <button type="submit" disabled={saving} style={{ ...button, justifySelf: 'start' }}><Send size={14} />Create referral</button>
          </form>
          {referrals.map((item) => {
            const edit = referralUpdates[item.id] || { outcome: item.outcome || '', followUpAt: '' };
            return <article key={item.id} style={{ ...panel, display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) minmax(210px, 0.8fr)', gap: 14 }}>
              <div><b>{item.external_agency} · #{item.complaint?.ticket_number || 'Complaint'}</b><p style={{ margin: '5px 0' }}>{item.notes}</p><small>{item.external_reference ? `Ref ${item.external_reference} · ` : ''}{item.next_follow_up_at ? `Follow-up ${new Date(item.next_follow_up_at).toLocaleString()}` : 'No follow-up date'}</small></div>
              <div style={{ display: 'grid', gap: 8 }}>
                <select aria-label="Referral status" value={item.status} onChange={(e) => void updateReferral(item.id, e.target.value)} style={input}><option value="open">Open</option><option value="follow_up">Follow-up</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select>
                <input aria-label="Next follow-up date" type="datetime-local" value={edit.followUpAt || (item.next_follow_up_at ? new Date(item.next_follow_up_at).toISOString().slice(0, 16) : '')} onChange={(e) => setReferralUpdates({ ...referralUpdates, [item.id]: { ...edit, followUpAt: e.target.value } })} style={input} />
                <input aria-label="External agency outcome" placeholder="Outcome / latest update" value={edit.outcome} onChange={(e) => setReferralUpdates({ ...referralUpdates, [item.id]: { ...edit, outcome: e.target.value } })} style={input} />
                <button type="button" onClick={() => void saveReferralFollowup(item)} style={{ ...button, justifySelf: 'start' }}><Save size={13} />Save follow-up</button>
              </div>
            </article>;
          })}
          {!loading && referrals.length === 0 && <div style={panel}>No external referrals yet.</div>}
        </section>
      )}

      {activeTab === 'ward-staff' && (
        <WardAssignmentPanel
          staff={staff}
          wards={wards}
          departments={departments}
          departmentId={null}
          onSaved={load}
        />
      )}
    </main>
  );
}