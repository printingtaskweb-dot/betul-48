import { GoogleIcon } from '../common/GoogleIcon';
// src/components/dept/AllotModal.tsx
import React, { useMemo, useState } from 'react';
import { Send, ArrowRight, ShieldAlert, Search } from 'lucide-react';
import {
  getTier,
  canAllotComplaint,
  getDepartmentHeads,
  getAreaOfficers,
  getDepartmentSupervisors,
  getDepartmentFieldEmployees,
  TIER_LABEL,
} from '../../lib/hierarchy';
import type { StaffMember, Viewer } from '../../lib/hierarchy';

// ─── Visual Hierarchy Trail ────────────────────────────────────────────────
export function HierarchyFlow({
  myTier,
  targetTier,
  language,
}: {
  myTier: number;
  targetTier?: number | null;
  language: 'en' | 'hi';
}) {
  const hi = language === 'hi';
  const steps = [
    { tier: 0, label: hi ? 'नगर प्रमुख' : 'Municipal Head', icon: 'admin_panel_settings' },
    { tier: 1, label: hi ? 'उपायुक्त' : 'Deputy Comm.', icon: 'account_balance' },
    { tier: 2, label: hi ? 'विभाग प्रमुख' : 'Dept Head', icon: 'apartment' },
    { tier: 3, label: hi ? 'क्षेत्र अधिकारी' : 'Area Officer', icon: 'pin_drop' },
    { tier: 4, label: hi ? 'पर्यवेक्षक' : 'Supervisor', icon: 'engineering' },
    { tier: 5, label: hi ? 'मैदानी कर्मचारी' : 'Operational Staff', icon: 'construction' },
  ];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
      {steps.map((st, i) => {
        const isCurrentAssigner = st.tier === myTier;
        const isTarget = st.tier === targetTier;
        return (
          <React.Fragment key={st.tier}>
            {i > 0 && <ArrowRight size={11} color="var(--gray-500)" />}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 8px',
                borderRadius: 16,
                fontSize: '0.7rem',
                fontWeight: 800,
                whiteSpace: 'nowrap',
                background: isTarget
                  ? 'var(--theme-primary, #146C94)'
                  : isCurrentAssigner
                  ? 'var(--theme-bg, #F6F1F1)'
                  : 'rgba(255,255,255,0.4)',
                color: isTarget
                  ? '#fff'
                  : isCurrentAssigner
                  ? 'var(--theme-primary, #146C94)'
                  : 'var(--gray-600)',
                border: isCurrentAssigner
                  ? '2px solid var(--theme-primary, #146C94)'
                  : isTarget
                  ? '2px solid var(--theme-primary, #146C94)'
                  : '1px solid var(--theme-component-border, #bfbfbf)',
              }}
            >
              <GoogleIcon name={st.icon} size={14} />
              <span>{st.label}</span>
              {isCurrentAssigner && (
                <span style={{ fontSize: '0.64rem', opacity: 0.9 }}>({hi ? 'आप' : 'You'})</span>
              )}
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
}

export interface AllotTarget {
  id: string;
  ticket_number: string;
  description: string;
  department_id?: string | null;
  dept_name?: string | null;
  assigned_to?: string | null;
  assignment_notes?: string | null;
  citizen_name?: string | null;
  citizen_phone?: string | null;
  address?: string | null;
}

interface AllotModalProps {
  complaint: AllotTarget;
  viewer: Viewer;
  staffList: StaffMember[];
  language: 'en' | 'hi';
  onClose: () => void;
  onAllotted: () => void;
  assignComplaint: (id: string, staffId: string, assignedById?: string, notes?: string) => Promise<boolean>;
}

export function AllotModal({
  complaint,
  viewer,
  staffList,
  language,
  onClose,
  onAllotted,
  assignComplaint,
}: AllotModalProps) {
  const hi = language === 'hi';
  const myTier = getTier(viewer.role, viewer.hierarchy_code, viewer.authority_role);

  // Authority check: Operational staff (Tier 5+) CANNOT allot or reassign
  const isAllowedToAllot = canAllotComplaint(viewer, complaint.department_id);

  // Department ID
  const deptId = complaint.department_id ?? viewer.linked_department_id ?? null;

  // Filter staff by department and hierarchy roles
  const deptHeads = useMemo(() => getDepartmentHeads(deptId, staffList), [deptId, staffList]);
  const areaOfficers = useMemo(() => getAreaOfficers(deptId, staffList), [deptId, staffList]);
  const supervisors = useMemo(() => getDepartmentSupervisors(deptId, staffList), [deptId, staffList]);
  const operationalStaff = useMemo(() => getDepartmentFieldEmployees(deptId, staffList), [deptId, staffList]);

  // Stepped allocation states
  // Active Tab/Step: 2 = Dept Head, 3 = Area Officer, 4 = Supervisor, 5 = Operational Staff
  const initialStep = myTier <= 1 ? 2 : myTier === 2 ? 3 : myTier === 3 ? 4 : 5;
  const [activeStep, setActiveStep] = useState<number>(initialStep);

  const [selectedDeptHeadId, setSelectedDeptHeadId] = useState<string>('');
  const [selectedAreaOfficerId, setSelectedAreaOfficerId] = useState<string>('');
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string>('');
  const [selectedOperationalStaffId, setSelectedOperationalStaffId] = useState<string>('');

  const [selectedWard, setSelectedWard] = useState<string>('all');
  const [staffSearch, setStaffSearch] = useState<string>('');
  const [notes, setNotes] = useState<string>(complaint.assignment_notes || '');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Determine final assignee
  const finalAssigneeId = useMemo(() => {
    if (activeStep === 5) return selectedOperationalStaffId;
    if (activeStep === 4) return selectedSupervisorId;
    if (activeStep === 3) return selectedAreaOfficerId;
    if (activeStep === 2) return selectedDeptHeadId;
    return '';
  }, [activeStep, selectedOperationalStaffId, selectedSupervisorId, selectedAreaOfficerId, selectedDeptHeadId]);

  const finalAssignee = useMemo(
    () => staffList.find((s) => s.id === finalAssigneeId) || null,
    [staffList, finalAssigneeId]
  );

  // Distinct wards for quick filtering
  const availableWards = useMemo(() => {
    const set = new Set<string>();
    staffList.forEach((s) => {
      if (s.ward_number) set.add(s.ward_number);
    });
    return Array.from(set).sort();
  }, [staffList]);

  // Filter lists based on ward & search
  const filterStaff = (list: StaffMember[]) => {
    return list.filter((s) => {
      const okWard = selectedWard === 'all' || s.ward_number === selectedWard;
      const q = staffSearch.toLowerCase().trim();
      const okQuery =
        !q ||
        (s.full_name && s.full_name.toLowerCase().includes(q)) ||
        (s.staff_code && s.staff_code.toLowerCase().includes(q)) ||
        (s.phone && s.phone.includes(q));
      return okWard && okQuery;
    });
  };

  const handleAllotSubmit = async () => {
    if (!finalAssigneeId) {
      setSubmitError(hi ? 'कृपया कार्य सौंपने के लिए एक अधिकारी/कर्मचारी का चयन करें।' : 'Please select an officer or worker to allocate this task.');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const ok = await assignComplaint(complaint.id, finalAssigneeId, viewer.id, notes.trim());
      if (ok) {
        onAllotted();
        onClose();
      } else {
        setSubmitError(hi ? 'कार्य आवंटन विफल रहा।' : 'Failed to allocate task. Please check permissions.');
      }
    } catch (e: any) {
      setSubmitError(e.message || 'Task allocation encountered an error.');
    } finally {
      setSubmitting(false);
    }
  };

  const border = '1.5px solid var(--theme-component-border, #bfbfbf)';
  const primaryColor = 'var(--theme-primary, #146C94)';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 16,
      }}
    >
      <div
        style={{
          background: 'var(--theme-component, #d9d9d9)',
          border: '2px solid var(--theme-component-border, #bfbfbf)',
          borderRadius: 'var(--radius-xl, 16px)',
          width: '100%',
          maxWidth: 720,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: border,
            background: 'var(--theme-component, #d9d9d9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="material-symbols-rounded" style={{ fontSize: 20 }}>assignment</span>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: 'var(--gray-900)' }}>
                {hi ? 'कार्य आवंटन व पदानुक्रम प्रवाह' : 'Hierarchical Task Allocation'}
              </h3>
              <span
                style={{
                  background: 'var(--theme-bg, #F6F1F1)',
                  border: '1px solid var(--theme-component-border, #bfbfbf)',
                  padding: '2px 8px',
                  borderRadius: 12,
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  color: primaryColor,
                }}
              >
                #{complaint.ticket_number}
              </span>
            </div>
            <p style={{ margin: '3px 0 0', fontSize: '0.76rem', color: 'var(--gray-600)' }}>
              {complaint.dept_name || 'Municipal Service'} • {complaint.address || 'Location specified on ticket'}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--theme-bg, #F6F1F1)',
              border: border,
              borderRadius: 8,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontWeight: 800,
              color: 'var(--gray-700)',
            }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: 18 }}>close</span>
          </button>
        </div>

        {/* Hierarchy Trail Banner */}
        <div
          style={{
            padding: '10px 20px',
            background: 'var(--theme-bg, #F6F1F1)',
            borderBottom: border,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--gray-600)', textTransform: 'uppercase' }}>
            {hi ? 'प्रशासनिक प्रवाह (Cascade Delegation Flow):' : 'Cascade Delegation Flow:'}
          </div>
          <HierarchyFlow myTier={myTier} targetTier={activeStep} language={language} />
        </div>

        {/* Operational Staff Alert (Lower designation cannot allot) */}
        {!isAllowedToAllot ? (
          <div style={{ padding: 24, textAlign: 'center' }}>
            <div
              style={{
                background: '#fee2e2',
                border: '1.5px solid #f87171',
                borderRadius: 12,
                padding: '20px 24px',
                maxWidth: 480,
                margin: '0 auto',
              }}
            >
              <ShieldAlert size={36} color="#991b1b" style={{ margin: '0 auto 10px' }} />
              <h4 style={{ margin: '0 0 6px', fontSize: '0.96rem', fontWeight: 800, color: '#991b1b' }}>
                {hi ? 'कार्य पुनरावंटन की अनुमति नहीं है' : 'Allocation Authority Restricted'}
              </h4>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#7f1d1d', lineHeight: 1.5 }}>
                {hi
                  ? 'निचले स्तर के परिचालन कर्मचारी (Tier 5) कार्य आवंटन या पुनरावंटन नहीं कर सकते। केवल विभाग प्रमुख, क्षेत्र अधिकारी, और पर्यवेक्षक ही कार्य आवंटित कर सकते हैं।'
                  : 'Operational staff (Tier 5) cannot allot or reassign tasks. Only Department Heads, Area Officers, Supervisors, and Municipal Administrators hold allocation authority.'}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                marginTop: 20,
                padding: '10px 24px',
                borderRadius: 8,
                background: primaryColor,
                color: '#fff',
                border: 'none',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              {hi ? 'बंद करें' : 'Close'}
            </button>
          </div>
        ) : (
          /* Main Stepper Body */
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto', padding: '16px 20px', gap: 14 }}>
            {/* Step Selection Tabs */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: myTier <= 1 ? 'repeat(4, 1fr)' : myTier === 2 ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
                gap: 8,
              }}
            >
              {myTier <= 1 && (
                <button
                  type="button"
                  onClick={() => setActiveStep(2)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 8,
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    background: activeStep === 2 ? primaryColor : 'var(--theme-bg, #F6F1F1)',
                    color: activeStep === 2 ? '#fff' : 'var(--gray-800)',
                    border: activeStep === 2 ? `2px solid ${primaryColor}` : border,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <span className="material-symbols-rounded" style={{ fontSize: 16 }}>apartment</span>
                  <span>{hi ? '1. विभाग प्रमुख' : '1. Dept Head'}</span>
                </button>
              )}

              {myTier <= 2 && (
                <button
                  type="button"
                  onClick={() => setActiveStep(3)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 8,
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    background: activeStep === 3 ? primaryColor : 'var(--theme-bg, #F6F1F1)',
                    color: activeStep === 3 ? '#fff' : 'var(--gray-800)',
                    border: activeStep === 3 ? `2px solid ${primaryColor}` : border,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <span className="material-symbols-rounded" style={{ fontSize: 16 }}>pin_drop</span>
                  <span>{hi ? '2. क्षेत्र अधिकारी' : '2. Area Officer'}</span>
                </button>
              )}

              {myTier <= 3 && (
                <button
                  type="button"
                  onClick={() => setActiveStep(4)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 8,
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    background: activeStep === 4 ? primaryColor : 'var(--theme-bg, #F6F1F1)',
                    color: activeStep === 4 ? '#fff' : 'var(--gray-800)',
                    border: activeStep === 4 ? `2px solid ${primaryColor}` : border,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <span className="material-symbols-rounded" style={{ fontSize: 16 }}>engineering</span>
                  <span>{hi ? '3. पर्यवेक्षक' : '3. Supervisor'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setActiveStep(5)}
                style={{
                  padding: '8px 10px',
                  borderRadius: 8,
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  background: activeStep === 5 ? primaryColor : 'var(--theme-bg, #F6F1F1)',
                  color: activeStep === 5 ? '#fff' : 'var(--gray-800)',
                  border: activeStep === 5 ? `2px solid ${primaryColor}` : border,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: 16 }}>construction</span>
                <span>{hi ? '4. मैदानी कर्मचारी' : '4. Field Worker'}</span>
              </button>
            </div>

            {/* Ward & Search Filters */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 200px', position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-500)' }} />
                <input
                  type="text"
                  placeholder={hi ? 'नाम, स्टाफ कोड या फोन से खोजें...' : 'Search staff by name, code or phone...'}
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 32px',
                    borderRadius: 8,
                    border,
                    background: 'var(--theme-bg, #F6F1F1)',
                    fontSize: '0.82rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {availableWards.length > 0 && (
                <div style={{ minWidth: 140 }}>
                  <select
                    value={selectedWard}
                    onChange={(e) => setSelectedWard(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border,
                      background: 'var(--theme-bg, #F6F1F1)',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="all">{hi ? 'सभी वार्ड (All Wards)' : 'All Wards'}</option>
                    {availableWards.map((w) => (
                      <option key={w} value={w}>
                        {hi ? `वार्ड ${w}` : `Ward ${w}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* List for the selected Tier */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 180, maxHeight: 260, overflowY: 'auto' }}>
              {activeStep === 2 && (
                <>
                  <div style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--gray-700)' }}>
                    {hi ? 'विभाग प्रमुख का चयन करें:' : 'Select Department Head:'}
                  </div>
                  {filterStaff(deptHeads).length === 0 ? (
                    <div style={{ padding: 20, textAlign: 'center', fontSize: '0.82rem', color: 'var(--gray-600)' }}>
                      {hi ? 'इस विभाग के लिए कोई विभाग प्रमुख नहीं मिला।' : 'No Department Head registered for this department.'}
                    </div>
                  ) : (
                    filterStaff(deptHeads).map((dh) => {
                      const isSelected = selectedDeptHeadId === dh.id;
                      return (
                        <div
                          key={dh.id}
                          onClick={() => setSelectedDeptHeadId(dh.id)}
                          style={{
                            padding: '10px 14px',
                            borderRadius: 10,
                            background: isSelected ? 'var(--theme-bg, #F6F1F1)' : 'rgba(255,255,255,0.4)',
                            border: isSelected ? `2px solid ${primaryColor}` : border,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--theme-component, #d9d9d9)', border, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="material-symbols-rounded" style={{ fontSize: 14 }}>apartment</span></div>
                            <div>
                              <b style={{ fontSize: '0.88rem', color: 'var(--gray-900)' }}>{dh.full_name || 'Department Head'}</b>
                              <div style={{ fontSize: '0.74rem', color: 'var(--gray-600)' }}>
                                {dh.staff_code ? `${dh.staff_code} • ` : ''}{dh.phone ? `${dh.phone}` : ''}
                              </div>
                            </div>
                          </div>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '3px 8px', borderRadius: 12, background: isSelected ? primaryColor : 'var(--theme-component, #d9d9d9)', color: isSelected ? '#fff' : 'var(--gray-700)' }}>
                            {isSelected ? '' + (hi ? 'चयनित' : 'Selected') : (hi ? 'चुनें' : 'Select')}
                          </span>
                        </div>
                      );
                    })
                  )}
                </>
              )}

              {activeStep === 3 && (
                <>
                  <div style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--gray-700)' }}>
                    {hi ? 'क्षेत्र अधिकारी का चयन करें (Area Officer):' : 'Select Area Officer:'}
                  </div>
                  {filterStaff(areaOfficers).length === 0 ? (
                    <div style={{ padding: 20, textAlign: 'center', fontSize: '0.82rem', color: 'var(--gray-600)' }}>
                      {hi ? 'इस क्षेत्र/वार्ड के लिए कोई क्षेत्र अधिकारी पंजीकृत नहीं है।' : 'No Area Officer registered for this ward/area.'}
                    </div>
                  ) : (
                    filterStaff(areaOfficers).map((ao) => {
                      const isSelected = selectedAreaOfficerId === ao.id;
                      return (
                        <div
                          key={ao.id}
                          onClick={() => setSelectedAreaOfficerId(ao.id)}
                          style={{
                            padding: '10px 14px',
                            borderRadius: 10,
                            background: isSelected ? 'var(--theme-bg, #F6F1F1)' : 'rgba(255,255,255,0.4)',
                            border: isSelected ? `2px solid ${primaryColor}` : border,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--theme-component, #d9d9d9)', border, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="material-symbols-rounded" style={{ fontSize: 14 }}>pin_drop</span></div>
                            <div>
                              <b style={{ fontSize: '0.88rem', color: 'var(--gray-900)' }}>{ao.full_name || 'Area Officer'}</b>
                              <div style={{ fontSize: '0.74rem', color: 'var(--gray-600)' }}>
                                {ao.ward_number ? `Ward ${ao.ward_number} • ` : ''}{ao.staff_code ? `${ao.staff_code} • ` : ''}{ao.phone ? `${ao.phone}` : ''}
                              </div>
                            </div>
                          </div>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '3px 8px', borderRadius: 12, background: isSelected ? primaryColor : 'var(--theme-component, #d9d9d9)', color: isSelected ? '#fff' : 'var(--gray-700)' }}>
                            {isSelected ? '' + (hi ? 'चयनित' : 'Selected') : (hi ? 'चुनें' : 'Select')}
                          </span>
                        </div>
                      );
                    })
                  )}
                </>
              )}

              {activeStep === 4 && (
                <>
                  <div style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--gray-700)' }}>
                    {hi ? 'पर्यवेक्षक का चयन करें (Supervisor):' : 'Select Supervisor:'}
                  </div>
                  {filterStaff(supervisors).length === 0 ? (
                    <div style={{ padding: 20, textAlign: 'center', fontSize: '0.82rem', color: 'var(--gray-600)' }}>
                      {hi ? 'इस वार्ड/विभाग के लिए कोई पर्यवेक्षक नहीं मिला।' : 'No Supervisor registered for this ward/department.'}
                    </div>
                  ) : (
                    filterStaff(supervisors).map((sup) => {
                      const isSelected = selectedSupervisorId === sup.id;
                      return (
                        <div
                          key={sup.id}
                          onClick={() => setSelectedSupervisorId(sup.id)}
                          style={{
                            padding: '10px 14px',
                            borderRadius: 10,
                            background: isSelected ? 'var(--theme-bg, #F6F1F1)' : 'rgba(255,255,255,0.4)',
                            border: isSelected ? `2px solid ${primaryColor}` : border,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--theme-component, #d9d9d9)', border, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="material-symbols-rounded" style={{ fontSize: 14 }}>engineering</span></div>
                            <div>
                              <b style={{ fontSize: '0.88rem', color: 'var(--gray-900)' }}>{sup.full_name || 'Supervisor'}</b>
                              <div style={{ fontSize: '0.74rem', color: 'var(--gray-600)' }}>
                                {sup.ward_number ? `Ward ${sup.ward_number} • ` : ''}{sup.staff_code ? `${sup.staff_code} • ` : ''}{sup.phone ? `${sup.phone}` : ''}
                              </div>
                            </div>
                          </div>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '3px 8px', borderRadius: 12, background: isSelected ? primaryColor : 'var(--theme-component, #d9d9d9)', color: isSelected ? '#fff' : 'var(--gray-700)' }}>
                            {isSelected ? '' + (hi ? 'चयनित' : 'Selected') : (hi ? 'चुनें' : 'Select')}
                          </span>
                        </div>
                      );
                    })
                  )}
                </>
              )}

              {activeStep === 5 && (
                <>
                  <div style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--gray-700)' }}>
                    {hi ? 'मैदानी / परिचालन कर्मचारी का चयन करें (Operational Staff):' : 'Select Operational / Field Staff:'}
                  </div>
                  {filterStaff(operationalStaff).length === 0 ? (
                    <div style={{ padding: 20, textAlign: 'center', fontSize: '0.82rem', color: 'var(--gray-600)' }}>
                      {hi ? 'इस वार्ड में कोई परिचालन कर्मचारी उपलब्ध नहीं है।' : 'No operational staff found in this ward/department.'}
                    </div>
                  ) : (
                    filterStaff(operationalStaff).map((op) => {
                      const isSelected = selectedOperationalStaffId === op.id;
                      return (
                        <div
                          key={op.id}
                          onClick={() => setSelectedOperationalStaffId(op.id)}
                          style={{
                            padding: '10px 14px',
                            borderRadius: 10,
                            background: isSelected ? 'var(--theme-bg, #F6F1F1)' : 'rgba(255,255,255,0.4)',
                            border: isSelected ? `2px solid ${primaryColor}` : border,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--theme-component, #d9d9d9)', border, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="material-symbols-rounded" style={{ fontSize: 14 }}>construction</span></div>
                            <div>
                              <b style={{ fontSize: '0.88rem', color: 'var(--gray-900)' }}>{op.full_name || 'Field Worker'}</b>
                              <div style={{ fontSize: '0.74rem', color: 'var(--gray-600)' }}>
                                {op.ward_number ? `Ward ${op.ward_number} • ` : ''}{op.staff_code ? `${op.staff_code} • ` : ''}{op.phone ? `${op.phone}` : ''}
                              </div>
                            </div>
                          </div>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '3px 8px', borderRadius: 12, background: isSelected ? primaryColor : 'var(--theme-component, #d9d9d9)', color: isSelected ? '#fff' : 'var(--gray-700)' }}>
                            {isSelected ? '' + (hi ? 'चयनित' : 'Selected') : (hi ? 'चुनें' : 'Select')}
                          </span>
                        </div>
                      );
                    })
                  )}
                </>
              )}
            </div>

            {/* Assignment Notes */}
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: 'var(--gray-700)', marginBottom: 4 }}>
                {hi ? 'कार्य निर्देश / टिप्पणी (Assignment Notes):' : 'Assignment Instructions / Notes:'}
              </label>
              <textarea
                rows={2}
                placeholder={hi ? 'उदा. मुख्य चौराहे पर तत्काल पाइपलाइन मरम्मत करें, कार्य 4 बजे से पहले पूर्ण करें...' : 'e.g. Urgent pipeline repair at main square, complete inspection before 4 PM...'}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  border,
                  background: 'var(--theme-bg, #F6F1F1)',
                  fontSize: '0.82rem',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                }}
              />
            </div>

            {submitError && (
              <div style={{ background: '#fee2e2', border: '1px solid #f87171', borderRadius: 8, padding: '8px 12px', fontSize: '0.78rem', color: '#991b1b' }}>
                {submitError}
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        {isAllowedToAllot && (
          <div
            style={{
              padding: '14px 20px',
              borderTop: border,
              background: 'var(--theme-component, #d9d9d9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <div style={{ fontSize: '0.8rem', color: 'var(--gray-700)' }}>
              {finalAssignee ? (
                <span>
                  {hi ? 'चयनित अधिकारी/कर्मचारी: ' : 'Selected Assignee: '}
                  <strong style={{ color: primaryColor }}>{finalAssignee.full_name}</strong>
                  <span style={{ fontSize: '0.72rem', opacity: 0.85, marginLeft: 6 }}>
                    ({TIER_LABEL[getTier(finalAssignee.role, finalAssignee.hierarchy_code, finalAssignee.authority_role)]?.[hi ? 'hi' : 'en']})
                  </span>
                </span>
              ) : (
                <span style={{ color: 'var(--gray-500)' }}>
                  {hi ? 'कृपया ऊपर दिए गए स्तर से एक अधिकारी चुनें' : 'Please select an officer from the list above'}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border,
                  background: 'var(--theme-bg, #F6F1F1)',
                  color: 'var(--gray-800)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {hi ? 'रद्द करें' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleAllotSubmit}
                disabled={submitting || !finalAssigneeId}
                style={{
                  padding: '8px 18px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'var(--primary-gradient, linear-gradient(135deg, #146C94, #0E526F))',
                  color: '#fff',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: submitting || !finalAssigneeId ? 'not-allowed' : 'pointer',
                  opacity: submitting || !finalAssigneeId ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 4px 12px rgba(102,0,51,0.25)',
                }}
              >
                <Send size={13} />
                {submitting ? (hi ? 'आवंटित कर रहे हैं...' : 'Allocating...') : (hi ? 'कार्य सौंपें' : 'Confirm Allocation')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
