import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardCheck, Clock3, RefreshCw, Send, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

type DecisionAction = 'rework' | 'verified_resolved' | 'request_information' | 'refer_department';
type Department = { id: string; name: string };
type Resolution = { id: string; admin_note: string | null; resolution_photo_url: string | null; resolved_by: string; resolved_at: string | null };
type CitizenVerification = { id: string; verified_by: string; is_satisfied: boolean; note: string | null; verified_at: string | null };
type Complaint = {
  id: string;
  ticket_number: string;
  created_by: string | null;
  department_id: string | null;
  assigned_to: string | null;
  assigned_by: string | null;
  description: string;
  address: string | null;
  photo_url: string | null;
  status: string;
  updated_at: string | null;
  department?: { name: string } | null;
  resolutions?: Resolution[];
  verifications?: CitizenVerification[];
  assignee?: { id: string; full_name: string | null; supervisor_id: string | null } | null;
};
type Request = {
  id: string;
  complaint_id: string;
  request_type: 'citizen_dissatisfied' | 'no_response' | 'officer_requested' | 'appeal';
  reason: string | null;
  deadline_at: string;
  status: 'pending' | 'in_review' | 'awaiting_information' | 'completed' | 'cancelled';
  assigned_verifier_id: string | null;
  created_at: string;
  complaint: Complaint;
};
type Decision = { id: string; action: DecisionAction; finding: string; created_at: string; verifier_id: string };

const card: React.CSSProperties = {
  background: 'var(--theme-component, #d9d9d9)',
  border: '1px solid var(--theme-component-border, #bfbfbf)',
  borderRadius: 8,
  padding: 18,
};
const input: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '9px 10px',
  borderRadius: 6, border: '1px solid var(--theme-component-border, #bfbfbf)',
  background: 'var(--theme-bg, #fff4e7)', color: 'var(--gray-900)', font: 'inherit',
};
const button: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
  padding: '9px 12px', border: 0, borderRadius: 6, cursor: 'pointer',
  color: '#fff', background: 'var(--theme-primary, #660033)', fontWeight: 800,
};
const typeLabel: Record<Request['request_type'], string> = {
  citizen_dissatisfied: 'Citizen dissatisfied',
  no_response: 'No citizen response',
  officer_requested: 'Officer requested',
  appeal: 'Citizen appeal',
};

export default function VerifierDashboard() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [pastDecisions, setPastDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [action, setAction] = useState<DecisionAction>('rework');
  const [finding, setFinding] = useState('');
  const [requestedParty, setRequestedParty] = useState('citizen');
  const [referralType, setReferralType] = useState<'internal' | 'external'>('internal');
  const [targetDepartmentId, setTargetDepartmentId] = useState('');
  const [externalAgency, setExternalAgency] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const [requestResult, departmentResult] = await Promise.all([
      supabase.from('verification_requests').select(
        `*, complaint:complaints!verification_requests_complaint_id_fkey(
          *, department:departments!complaints_department_id_fkey(name),
          resolutions(*), verifications(*),
          assignee:user_profiles!complaints_assigned_to_fkey(id, full_name, supervisor_id)
        )`
      ).in('status', ['pending', 'in_review', 'awaiting_information']).order('deadline_at'),
      supabase.from('departments').select('id, name').eq('is_active', true).order('name'),
    ]);
    if (requestResult.error) setError(requestResult.error.message);
    if (departmentResult.error && !requestResult.error) setError(departmentResult.error.message);
    const normalized = (requestResult.data || []).map((row: any) => ({
      ...row,
      complaint: row.complaint ? {
        ...row.complaint,
        department: Array.isArray(row.complaint.department) ? row.complaint.department[0] || null : row.complaint.department,
        assignee: Array.isArray(row.complaint.assignee) ? row.complaint.assignee[0] || null : row.complaint.assignee,
      } : null,
    })).filter((row: any) => row.complaint) as Request[];
    setRequests(normalized);
    setDepartments((departmentResult.data || []) as Department[]);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const eligibleRequests = requests.filter((request) =>
    request.request_type !== 'no_response' || new Date(request.deadline_at).getTime() <= Date.now()
  );
  const selectedRequest = eligibleRequests.find((request) => request.id === selectedId) || null;
  const complaint = selectedRequest?.complaint || null;
  const isOwnCase = !!complaint && (
    complaint.assigned_to === user?.id ||
    complaint.assignee?.supervisor_id === user?.id ||
    complaint.assigned_by === user?.id
  );
  const isClaimedByOther = !!selectedRequest?.assigned_verifier_id && selectedRequest.assigned_verifier_id !== user?.id;

  const sendPushToUsers = async (recipientIds: string[], title: string, body: string) => {
    const recipients = Array.from(new Set(recipientIds.filter((id) => id && id !== user?.id)));
    if (!recipients.length) return false;
    const { data, error: pushError } = await supabase.functions.invoke('send-push', {
      body: { title, body, url: '/dept/dashboard', user_ids: recipients, sent_by: user?.id },
    });
    return !pushError && (data?.sent || 0) > 0;
  };

  const openRequest = async (request: Request) => {
    setError('');
    setMessage('');
    setSelectedId(request.id);
    setFinding('');
    const { data, error: decisionError } = await supabase.from('verification_decisions')
      .select('id, action, finding, created_at, verifier_id')
      .eq('request_id', request.id)
      .order('created_at', { ascending: false });
    if (decisionError) setError(decisionError.message);
    setPastDecisions((data || []) as Decision[]);

    if (!user || request.assigned_verifier_id === user.id) return;
    if (request.assigned_verifier_id) return;
    if (request.complaint.assigned_to === user.id || request.complaint.assignee?.supervisor_id === user.id || request.complaint.assigned_by === user.id) {
      setError('You cannot review a case you worked on, supervised, or assigned.');
      return;
    }
    const { error: claimError } = await supabase.from('verification_requests').update({
      assigned_verifier_id: user.id,
      status: 'in_review',
      updated_at: new Date().toISOString(),
    }).eq('id', request.id).is('assigned_verifier_id', null);
    if (claimError) return setError(claimError.message);
    await load();
    setSelectedId(request.id);
    setMessage('Case assigned to you for independent review.');
  };

  const notifyRework = async (caseComplaint: Complaint): Promise<boolean> => {
    if (!caseComplaint.department_id) return false;
    const { data: assigned } = caseComplaint.assigned_to
      ? await supabase.from('user_profiles').select('supervisor_id').eq('id', caseComplaint.assigned_to).maybeSingle()
      : { data: null };
    const { data: heads } = await supabase.from('user_profiles').select('id')
      .eq('linked_department_id', caseComplaint.department_id)
      .or('role.eq.department_head,hierarchy_code.eq.department_head');
    const recipients = Array.from(new Set([
      assigned?.supervisor_id,
      caseComplaint.assigned_by,
      ...(heads || []).map((row: { id: string }) => row.id),
    ].filter((id): id is string => !!id && id !== user?.id)));
    return sendPushToUsers(recipients, 'Verification requests rework', `Complaint #${caseComplaint.ticket_number} needs additional work.`);
  };

  const notifyInformationRequest = async (caseComplaint: Complaint, party: string) => {
    let recipientIds: string[] = [];
    if (party === 'citizen' && caseComplaint.created_by) recipientIds = [caseComplaint.created_by];
    if (party === 'assigned_officer' && caseComplaint.assigned_to) recipientIds = [caseComplaint.assigned_to];
    if (party === 'department_head' && caseComplaint.department_id) {
      const { data } = await supabase.from('user_profiles').select('id')
        .eq('linked_department_id', caseComplaint.department_id)
        .or('role.eq.department_head,hierarchy_code.eq.department_head');
      recipientIds = (data || []).map((row: { id: string }) => row.id);
    }
    if (party === 'control_room') {
      const { data } = await supabase.from('user_profiles').select('id').eq('role', 'control_room');
      recipientIds = (data || []).map((row: { id: string }) => row.id);
    }
    return sendPushToUsers(recipientIds, 'More information requested', `More information is needed for complaint #${caseComplaint.ticket_number}.`);
  };

  const submitDecision = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !selectedRequest || !complaint) return;
    if (isOwnCase) return setError('You cannot review a case you worked on, supervised, or assigned.');
    if (isClaimedByOther) return setError('This case is assigned to another verifier.');
    if (!finding.trim()) return setError('Enter the independent verification finding.');
    if (action === 'refer_department' && referralType === 'internal' && !targetDepartmentId) return setError('Select the destination department.');
    if (action === 'refer_department' && referralType === 'external' && !externalAgency.trim()) return setError('Enter the external agency.');

    setSaving(true);
    setError('');
    const { error: decisionError } = await supabase.rpc('submit_verification_decision', {
      p_request_id: selectedRequest.id,
      p_action: action,
      p_finding: finding.trim(),
      p_requested_party: action === 'request_information' ? requestedParty : null,
      p_target_department_id: action === 'refer_department' && referralType === 'internal' ? targetDepartmentId : null,
      p_external_agency: action === 'refer_department' && referralType === 'external' ? externalAgency.trim() : null,
    });
    if (decisionError) {
      setSaving(false);
      return setError(decisionError.message);
    }
    setSaving(false);
    const reworkAlertSent = action !== 'rework' || await notifyRework(complaint);
    const informationAlertSent = action !== 'request_information' || await notifyInformationRequest(complaint, requestedParty);
    setSelectedId('');
    const actionMessage = action === 'verified_resolved'
      ? `Complaint #${complaint.ticket_number} independently verified. No citizen satisfaction record was created.`
      : action === 'rework'
        ? `Rework requested for complaint #${complaint.ticket_number}.`
        : action === 'request_information'
          ? `More information requested for complaint #${complaint.ticket_number}.`
        : `Complaint #${complaint.ticket_number} referred.`;
    const alertWarning = action === 'rework' && !reworkAlertSent
      ? ' Supervisor/department-head push notification was not delivered.'
      : action === 'request_information' && !informationAlertSent
        ? ' The requested party did not have a registered device for notification.'
        : '';
    setMessage(actionMessage + alertWarning);
    setFinding('');
    await load();
  };

  const labelStyle: React.CSSProperties = { display: 'grid', gap: 5, fontSize: '0.78rem', fontWeight: 700 };
  const latestResolution = complaint?.resolutions?.slice().sort((a, b) => (b.resolved_at || '').localeCompare(a.resolved_at || ''))[0];

  return (
    <main style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 16px', display: 'grid', gap: 16 }}>
      <header style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ShieldCheck size={25} color="var(--theme-primary, #660033)" />
          <div><h1 style={{ margin: 0, fontSize: '1.25rem' }}>Independent Verification & Appeals</h1><p style={{ margin: '4px 0 0', color: 'var(--gray-600)', fontSize: '0.82rem' }}>Review dissatisfaction, missed responses, and requested inspections</p></div>
        </div>
        <button type="button" onClick={() => void load()} style={{ ...button, background: 'var(--theme-bg, #fff4e7)', color: 'var(--theme-primary, #660033)', border: '1px solid var(--theme-primary, #660033)' }}><RefreshCw size={14} /> Refresh</button>
      </header>

      {error && <div role="alert" style={{ ...card, color: '#991b1b', borderColor: '#fca5a5' }}>{error}</div>}
      {message && <div role="status" style={{ ...card, color: '#166534', borderColor: '#86efac' }}>{message}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: 14, alignItems: 'start' }}>
        <section style={{ display: 'grid', gap: 8 }}>
          <div style={card}><h2 style={{ margin: 0, fontSize: '1rem' }}>V01 · Verification and appeals queue</h2><p style={{ margin: '5px 0 0', color: 'var(--gray-600)', fontSize: '0.78rem' }}>{eligibleRequests.length} case(s) waiting for independent review</p></div>
          {eligibleRequests.map((request) => {
            const overdue = new Date(request.deadline_at).getTime() < Date.now();
            const assignedElsewhere = !!request.assigned_verifier_id && request.assigned_verifier_id !== user?.id;
            return <button key={request.id} type="button" onClick={() => void openRequest(request)} style={{ ...card, textAlign: 'left', cursor: 'pointer', borderColor: request.id === selectedId ? 'var(--theme-primary, #660033)' : overdue ? '#fca5a5' : undefined, display: 'grid', gap: 6 }}>
              <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}><b>#{request.complaint.ticket_number}</b><span style={{ fontSize: '0.72rem', fontWeight: 800, color: overdue ? '#991b1b' : '#854d0e' }}>{overdue && <AlertTriangle size={12} />} {typeLabel[request.request_type]}</span></span>
              <span style={{ fontSize: '0.78rem', color: 'var(--gray-700)' }}>{request.complaint.description}</span>
              <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: '0.7rem', color: 'var(--gray-600)' }}><span><Clock3 size={12} style={{ verticalAlign: 'middle' }} /> Due {new Date(request.deadline_at).toLocaleString()}</span><span>{assignedElsewhere ? 'Assigned to another verifier' : request.status.replace('_', ' ')}</span></span>
            </button>;
          })}
          {!loading && eligibleRequests.length === 0 && <div style={card}>No cases are due for independent review.</div>}
        </section>

        {complaint && selectedRequest ? (
          <section style={{ display: 'grid', gap: 12 }}>
            <article style={{ ...card, display: 'grid', gap: 10 }}>
              <div><h2 style={{ margin: 0, fontSize: '1rem' }}>V02 · #{complaint.ticket_number}</h2><p style={{ margin: '5px 0', color: 'var(--gray-700)' }}>{complaint.description}</p><small>{complaint.department?.name || 'Uncategorized'} · {complaint.address || 'No address'} · {complaint.status}</small></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10 }}>
                {complaint.photo_url && <div><b style={{ fontSize: '0.78rem' }}>Original evidence</b><a href={complaint.photo_url} target="_blank" rel="noreferrer"><img src={complaint.photo_url} alt="Original complaint evidence" style={{ display: 'block', width: '100%', maxHeight: 230, objectFit: 'contain', marginTop: 6, borderRadius: 6 }} /></a></div>}
                {latestResolution?.resolution_photo_url && <div><b style={{ fontSize: '0.78rem' }}>Work completion evidence</b><a href={latestResolution.resolution_photo_url} target="_blank" rel="noreferrer"><img src={latestResolution.resolution_photo_url} alt="Work completion evidence" style={{ display: 'block', width: '100%', maxHeight: 230, objectFit: 'contain', marginTop: 6, borderRadius: 6 }} /></a></div>}
              </div>
              <div><b style={{ fontSize: '0.8rem' }}>Citizen responses</b>{complaint.verifications?.length ? complaint.verifications.map((verification) => <p key={verification.id} style={{ margin: '5px 0', fontSize: '0.78rem' }}>{verification.is_satisfied ? 'Satisfied' : 'Not satisfied'} · {verification.note || 'No note'} · {verification.verified_at ? new Date(verification.verified_at).toLocaleString() : ''}</p>) : <p style={{ margin: '5px 0', fontSize: '0.78rem', color: 'var(--gray-600)' }}>No citizen response received. This is not treated as citizen confirmation.</p>}</div>
              <div><b style={{ fontSize: '0.8rem' }}>Past work</b>{complaint.resolutions?.length ? complaint.resolutions.map((resolution) => <p key={resolution.id} style={{ margin: '5px 0', fontSize: '0.78rem' }}>{resolution.admin_note || 'No work note'} · {resolution.resolved_by} · {resolution.resolved_at ? new Date(resolution.resolved_at).toLocaleString() : ''}</p>) : <p style={{ margin: '5px 0', fontSize: '0.78rem', color: 'var(--gray-600)' }}>No resolution record.</p>}</div>
              {!!pastDecisions.length && <div><b style={{ fontSize: '0.8rem' }}>Past verification actions</b>{pastDecisions.map((decision) => <p key={decision.id} style={{ margin: '5px 0', fontSize: '0.78rem' }}>{decision.action.replaceAll('_', ' ')} · {decision.finding} · {new Date(decision.created_at).toLocaleString()}</p>)}</div>}
            </article>

            <form onSubmit={submitDecision} style={{ ...card, display: 'grid', gap: 10 }}>
              <h2 style={{ margin: 0, fontSize: '1rem' }}>V03 · Record independent decision</h2>
              {isOwnCase && <div role="alert" style={{ color: '#991b1b', fontSize: '0.8rem' }}>You worked on, supervised, or assigned this case. Independent review is blocked.</div>}
              {isClaimedByOther && <div style={{ color: '#854d0e', fontSize: '0.8rem' }}>This case is assigned to another verifier.</div>}
              <label style={labelStyle}>Decision<select value={action} onChange={(e) => setAction(e.target.value as DecisionAction)} style={input}><option value="rework">Request rework</option><option value="verified_resolved">Verified as resolved</option><option value="request_information">Request more information</option><option value="refer_department">Refer to another department or agency</option></select></label>
              {action === 'request_information' && <label style={labelStyle}>Information requested from<select value={requestedParty} onChange={(e) => setRequestedParty(e.target.value)} style={input}><option value="citizen">Citizen</option><option value="assigned_officer">Assigned officer</option><option value="department_head">Department head</option><option value="control_room">Control room</option></select></label>}
              {action === 'refer_department' && <>
                <label style={labelStyle}>Referral type<select value={referralType} onChange={(e) => setReferralType(e.target.value as 'internal' | 'external')} style={input}><option value="internal">Internal department</option><option value="external">External agency</option></select></label>
                {referralType === 'internal' ? <label style={labelStyle}>Destination department<select value={targetDepartmentId} onChange={(e) => setTargetDepartmentId(e.target.value)} style={input}><option value="">Select department</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label> : <label style={labelStyle}>External agency<input value={externalAgency} onChange={(e) => setExternalAgency(e.target.value)} style={input} /></label>}
              </>}
              <label style={labelStyle}>Finding / instructions<textarea required rows={4} value={finding} onChange={(e) => setFinding(e.target.value)} style={input} /></label>
              <button type="submit" disabled={saving || isOwnCase || isClaimedByOther} style={{ ...button, justifySelf: 'start', opacity: saving || isOwnCase || isClaimedByOther ? 0.6 : 1 }}><ClipboardCheck size={15} />{saving ? 'Saving…' : <><Send size={14} /> Submit decision</>}</button>
            </form>
          </section>
        ) : <section style={card}><CheckCircle2 size={22} color="var(--gray-500)" /><p style={{ marginBottom: 0, color: 'var(--gray-600)' }}>Select a case from the queue to review details and record a decision.</p></section>}
      </div>
    </main>
  );
}