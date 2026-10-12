// src/components/dept/AllotModal.tsx
import React, { useMemo, useState } from 'react';
import {
  Send, Phone, MapPin, UserCheck, ArrowRight,
  ShieldAlert, CheckCircle2, User, Wrench
} from 'lucide-react';
import {
  getTier,
  roleLabel,
  canAllotComplaint,
  getDepartmentSupervisors,
  getDepartmentFieldEmployees,
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
    { tier: 1, label: hi ? 'विभाग प्रमुख' : 'Dept Head', icon: '🏢' },
    { tier: 2, label: hi ? 'क्षेत्र पर्यवेक्षक' : 'Area Supervisor', icon: '👷' },
    { tier: 3, label: hi ? 'फील्ड कर्मचारी' : 'Field Employee', icon: '🛠️' },
  ];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      {steps.map((st, i) => {
        const isCurrentAssigner = st.tier === myTier;
        const isTarget = st.tier === targetTier;
        return (
          <React.Fragment key={st.tier}>
            {i > 0 && <ArrowRight size={13} color="var(--gray-500)" />}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 10px',
                borderRadius: 20,
                fontSize: '0.74rem',
                fontWeight: 800,
                whiteSpace: 'nowrap',
                background: isTarget ? 'var(--theme-primary, #660033)' : isCurrentAssigner ? 'var(--theme-bg, #fff4e7)' : 'rgba(255,255,255,0.4)',
                color: isTarget ? '#fff' : isCurrentAssigner ? 'var(--theme-primary, #660033)' : 'var(--gray-600)',
                border: isCurrentAssigner
                  ? '2px solid var(--theme-primary, #660033)'
                  : isTarget
                  ? '2px solid var(--theme-primary, #660033)'
                  : '1px solid var(--theme-component-border, #bfbfbf)',
              }}
            >
              <span>{st.icon}</span>
              <span>{st.label}</span>
              {isCurrentAssigner && (
                <span style={{ fontSize: '0.68rem', opacity: 0.85 }}>({hi ? 'आप' : 'You'})</span>
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
  const myTier = getTier(viewer.role);

  // Authority check: Lower designation staff (Tier > 2) CANNOT allot or reassign
  const isAllowedToAllot = canAllotComplaint(viewer, complaint.department_id);

  // Filter staff by complaint's department
  const deptId = complaint.department_id ?? viewer.linked_department_id ?? null;
  const supervisors = useMemo(() => getDepartmentSupervisors(deptId, staffList), [deptId, staffList]);
  const allFieldEmployees = useMemo(() => getDepartmentFieldEmployees(deptId, staffList), [deptId, staffList]);

  // Stepped allocation state:
  // Step 1: Selected Supervisor or Ward
  // Step 2: Final Assignee (either the Supervisor themselves or a Field Employee)
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string>('');
  const [selectedWard, setSelectedWard] = useState<string>('all');
  const [allotMode, setAllotMode] = useState<'supervisor' | 'field_employee'>('supervisor');
  const [selectedFinalStaffId, setSelectedFinalStaffId] = useState<string>(complaint.assigned_to || '');
  const [notes, setNotes] = useState(complaint.assignment_notes || '');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Auto-set ward if a supervisor is selected
  const selectedSupervisor = supervisors.find((s) => s.id === selectedSupervisorId);
  const effectiveWard = selectedSupervisor?.ward_number || selectedWard;

  // Field employees filtered by the supervisor's ward
  const filteredFieldEmployees = useMemo(() => {
    if (!effectiveWard || effectiveWard === 'all') return allFieldEmployees;
    return allFieldEmployees.filter((f) => !f.ward_number || f.ward_number === effectiveWard);
  }, [allFieldEmployees, effectiveWard]);

  // If viewer is an Area Supervisor (Tier 2), they can only assign to Field Employees under them
  const isSupervisorViewer = myTier === 2;

  // Compute final selected staff object
  const finalAssignee = useMemo(() => {
    const targetId = isSupervisorViewer ? selectedFinalStaffId : allotMode === 'supervisor' ? selectedSupervisorId : selectedFinalStaffId;
    return staffList.find((s) => s.id === targetId);
  }, [isSupervisorViewer, allotMode, selectedSupervisorId, selectedFinalStaffId, staffList]);

  const currentAssignee = staffList.find((s) => s.id === complaint.assigned_to);

  // Ward options
  const availableWards = useMemo(() => {
    const list = [...supervisors, ...allFieldEmployees];
    return Array.from(new Set(list.map((s) => s.ward_number).filter(Boolean))) as string[];
  }, [supervisors, allFieldEmployees]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAllowedToAllot) {
      setErr(hi ? 'निचले स्तर के कर्मचारियों को कार्य आवंटित या पुनः आवंटित करने का अधिकार नहीं है।' : 'Lower designation staff cannot allot or reassign tasks.');
      return;
    }

    const assigneeId = isSupervisorViewer ? selectedFinalStaffId : allotMode === 'supervisor' ? selectedSupervisorId : selectedFinalStaffId;

    if (!assigneeId) {
      setErr(
        hi
          ? allotMode === 'supervisor' && !isSupervisorViewer
            ? 'कृपया एक क्षेत्र पर्यवेक्षक चुनें।'
            : 'कृपया कार्य पूरा करने के लिए एक फील्ड कर्मचारी चुनें।'
          : allotMode === 'supervisor' && !isSupervisorViewer
          ? 'Please select an Area Supervisor.'
          : 'Please select a Field Employee.'
      );
      return;
    }

    setSubmitting(true);
    setErr(null);

    const ok = await assignComplaint(complaint.id, assigneeId, viewer.id, notes);
    if (ok) {
      onAllotted();
      onClose();
    } else {
      setErr(hi ? 'कार्य आवंटन विफल। कृपया पुनः प्रयास करें।' : 'Failed to assign task. Please try again.');
    }
    setSubmitting(false);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1200,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 620,
          background: 'var(--theme-component, #d9d9d9)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          overflow: 'hidden',
          maxHeight: '92vh',
          overflowY: 'auto',
          border: '1.5px solid var(--theme-component-border, #bfbfbf)',
        }}
      >
        {/* Header */}
        <div style={{ background: 'var(--primary-gradient, linear-gradient(135deg, #660033, #800040))', padding: '18px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0, color: '#fff', fontSize: '1.15rem', fontWeight: 900 }}>
              📌 {hi ? 'शिकायत कार्य आवंटन' : 'Task Allocation Flow'}
            </h2>
            <span
              style={{
                fontSize: '0.74rem',
                fontWeight: 800,
                background: 'rgba(255,255,255,0.2)',
                color: '#fff',
                padding: '3px 9px',
                borderRadius: 20,
              }}
            >
              #{complaint.ticket_number}
            </span>
          </div>
          <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.85)', fontSize: '0.82rem' }}>
            {complaint.dept_name || (hi ? 'संबंधित विभाग' : 'Department')} • {roleLabel(viewer.role, language)}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 22 }}>
          {/* Authority Warning if lower designation */}
          {!isAllowedToAllot && (
            <div
              style={{
                padding: '14px 16px',
                background: '#fee2e2',
                border: '1.5px solid #fecaca',
                borderRadius: 'var(--radius-md)',
                color: '#991b1b',
                fontSize: '0.86rem',
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <ShieldAlert size={20} style={{ flexShrink: 0 }} />
              <div>
                <strong>{hi ? 'कार्य आवंटन अधिकार केवल उच्च अधिकारियों को है' : 'Allocation Authority Restricted'}</strong>
                <p style={{ margin: '3px 0 0', fontSize: '0.8rem' }}>
                  {hi
                    ? 'फील्ड कर्मचारी या निचले स्तर के स्टाफ कार्य आवंटित या पुनः आवंटित नहीं कर सकते। केवल विभाग प्रमुख एवं क्षेत्र पर्यवेक्षक ही कार्य सौंप सकते हैं।'
                    : 'Field staff and lower designation officers cannot assign or reassign tasks. Only Department Heads and Supervisors have allocation permissions.'}
                </p>
              </div>
            </div>
          )}

          {err && (
            <div
              style={{
                padding: '10px 14px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 'var(--radius-md)',
                color: '#dc2626',
                fontSize: '0.83rem',
                marginBottom: 14,
              }}
            >
              {err}
            </div>
          )}

          {/* Stepper Trail: Dept Head -> Area Supervisor -> Field Employee */}
          <div style={{ marginBottom: 16 }}>
            <p style={{ margin: '0 0 6px', fontSize: '0.76rem', fontWeight: 800, color: 'var(--gray-700)', textTransform: 'uppercase' }}>
              {hi ? 'पदानुक्रम प्रवाह (Hierarchy Allocation Flow)' : 'Hierarchy Allocation Flow'}
            </p>
            <HierarchyFlow
              myTier={myTier}
              targetTier={isSupervisorViewer ? 3 : allotMode === 'supervisor' ? 2 : 3}
              language={language}
            />
          </div>

          {/* Complaint Context Summary */}
          <div
            style={{
              background: 'var(--theme-bg, #fff4e7)',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--theme-component-border, #bfbfbf)',
              marginBottom: 16,
              fontSize: '0.84rem',
            }}
          >
            <p style={{ margin: '0 0 4px', fontWeight: 700, color: 'var(--theme-primary, #660033)' }}>
              {complaint.description}
            </p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: '0.76rem', color: 'var(--gray-700)' }}>
              {complaint.citizen_name && <span>👤 Citizen: {complaint.citizen_name}</span>}
              {complaint.citizen_phone && <span>📞 {complaint.citizen_phone}</span>}
              {complaint.address && <span>📍 {complaint.address}</span>}
            </div>
            {currentAssignee && (
              <div
                style={{
                  marginTop: 8,
                  paddingTop: 6,
                  borderTop: '1px solid var(--theme-component-border, #bfbfbf)',
                  fontSize: '0.78rem',
                  color: 'var(--gray-800)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <UserCheck size={13} color="var(--theme-primary, #660033)" />
                <span>
                  {hi ? 'वर्तमान में आवंटित:' : 'Currently Assigned to:'}{' '}
                  <strong>{currentAssignee.full_name || 'Staff'}</strong> ({roleLabel(currentAssignee.role, language)})
                </span>
              </div>
            )}
          </div>

          {/* ────────────────── STEPPED SELECTION FLOW ────────────────── */}
          {isAllowedToAllot && (
            <>
              {/* If viewer is Department Head or Admin: 2-step decision */}
              {!isSupervisorViewer && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontWeight: 800, fontSize: '0.82rem', marginBottom: 8, color: 'var(--gray-800)' }}>
                    {hi ? '१. आवंटन का स्तर चुनें:' : '1. Choose Allocation Level:'}
                  </label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setAllotMode('supervisor');
                        setSelectedFinalStaffId('');
                      }}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        border: allotMode === 'supervisor' ? '2px solid var(--theme-primary, #660033)' : '1px solid var(--theme-component-border, #bfbfbf)',
                        background: allotMode === 'supervisor' ? 'var(--theme-bg, #fff4e7)' : 'rgba(255,255,255,0.4)',
                        color: allotMode === 'supervisor' ? 'var(--theme-primary, #660033)' : 'var(--gray-800)',
                        fontWeight: 800,
                        fontSize: '0.82rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                      }}
                    >
                      <User size={15} />
                      {hi ? 'क्षेत्र पर्यवेक्षक को सौंपें' : 'Allot to Area Supervisor'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setAllotMode('field_employee')}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        border: allotMode === 'field_employee' ? '2px solid var(--theme-primary, #660033)' : '1px solid var(--theme-component-border, #bfbfbf)',
                        background: allotMode === 'field_employee' ? 'var(--theme-bg, #fff4e7)' : 'rgba(255,255,255,0.4)',
                        color: allotMode === 'field_employee' ? 'var(--theme-primary, #660033)' : 'var(--gray-800)',
                        fontWeight: 800,
                        fontSize: '0.82rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                      }}
                    >
                      <Wrench size={15} />
                      {hi ? 'फील्ड कर्मचारी को सीधे सौंपें' : 'Allot to Field Worker'}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP: SELECT AREA SUPERVISOR (For Dept Head / Admin) */}
              {!isSupervisorViewer && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontWeight: 800, fontSize: '0.82rem', marginBottom: 6, color: 'var(--gray-800)' }}>
                    👷 {hi ? 'क्षेत्र / वार्ड पर्यवेक्षक चुनें (Area Supervisor):' : 'Select Area / Ward Supervisor:'}
                  </label>
                  {supervisors.length === 0 ? (
                    <div style={{ padding: '10px 12px', background: '#fef3c7', borderRadius: 8, color: '#92400e', fontSize: '0.8rem' }}>
                      {hi ? 'इस विभाग में कोई क्षेत्र पर्यवेक्षक पंजीकृत नहीं है।' : 'No Area Supervisors found in this department.'}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 150, overflowY: 'auto' }}>
                      {supervisors.map((s) => {
                        const isSelected = selectedSupervisorId === s.id;
                        return (
                          <div
                            key={s.id}
                            onClick={() => {
                              setSelectedSupervisorId(s.id);
                              if (s.ward_number) setSelectedWard(s.ward_number);
                            }}
                            style={{
                              padding: '9px 12px',
                              borderRadius: 'var(--radius-md)',
                              cursor: 'pointer',
                              background: isSelected ? 'var(--theme-bg, #fff4e7)' : 'rgba(255,255,255,0.4)',
                              border: isSelected ? '2px solid var(--theme-primary, #660033)' : '1px solid var(--theme-component-border, #bfbfbf)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--gray-900)' }}>
                                {s.full_name || s.email}
                                {s.staff_code && (
                                  <span style={{ marginLeft: 6, fontSize: '0.72rem', color: 'var(--theme-primary, #660033)', fontFamily: 'monospace' }}>
                                    {s.staff_code}
                                  </span>
                                )}
                              </div>
                              <div style={{ display: 'flex', gap: 10, fontSize: '0.74rem', color: 'var(--gray-600)', marginTop: 2 }}>
                                {s.ward_number && <span><MapPin size={11} style={{ display: 'inline' }} /> Ward {s.ward_number}</span>}
                                {s.phone && <span><Phone size={11} style={{ display: 'inline' }} /> {s.phone}</span>}
                              </div>
                            </div>
                            <input type="radio" checked={isSelected} readOnly />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* STEP: SELECT FIELD EMPLOYEE (If Supervisor viewer or if Dept Head chose Field Worker mode) */}
              {(isSupervisorViewer || allotMode === 'field_employee') && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--gray-800)' }}>
                      🛠️ {hi ? 'फील्ड कर्मचारी चुनें (Field Worker / Operational Staff):' : 'Select Field Worker / Operative:'}
                    </label>
                    {availableWards.length > 1 && (
                      <select
                        value={selectedWard}
                        onChange={(e) => setSelectedWard(e.target.value)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: 6,
                          fontSize: '0.76rem',
                          background: 'var(--theme-bg, #fff4e7)',
                          border: '1px solid var(--theme-component-border, #bfbfbf)',
                        }}
                      >
                        <option value="all">{hi ? 'सभी वार्ड' : 'All Wards'}</option>
                        {availableWards.map((w) => (
                          <option key={w} value={w}>Ward {w}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {filteredFieldEmployees.length === 0 ? (
                    <div style={{ padding: '10px 12px', background: '#fef3c7', borderRadius: 8, color: '#92400e', fontSize: '0.8rem' }}>
                      {hi ? 'इस क्षेत्र/वार्ड में कोई फील्ड कर्मचारी उपलब्ध नहीं है।' : 'No field employees found for this ward/area.'}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
                      {filteredFieldEmployees.map((f) => {
                        const isSelected = selectedFinalStaffId === f.id;
                        return (
                          <div
                            key={f.id}
                            onClick={() => setSelectedFinalStaffId(f.id)}
                            style={{
                              padding: '9px 12px',
                              borderRadius: 'var(--radius-md)',
                              cursor: 'pointer',
                              background: isSelected ? 'var(--theme-bg, #fff4e7)' : 'rgba(255,255,255,0.4)',
                              border: isSelected ? '2px solid var(--theme-primary, #660033)' : '1px solid var(--theme-component-border, #bfbfbf)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--gray-900)' }}>
                                {f.full_name || f.email}
                                {f.staff_code && (
                                  <span style={{ marginLeft: 6, fontSize: '0.72rem', color: 'var(--theme-primary, #660033)', fontFamily: 'monospace' }}>
                                    {f.staff_code}
                                  </span>
                                )}
                              </div>
                              <div style={{ display: 'flex', gap: 10, fontSize: '0.74rem', color: 'var(--gray-600)', marginTop: 2 }}>
                                <span>{roleLabel(f.role, language)}</span>
                                {f.ward_number && <span><MapPin size={11} style={{ display: 'inline' }} /> Ward {f.ward_number}</span>}
                                {f.phone && <span><Phone size={11} style={{ display: 'inline' }} /> {f.phone}</span>}
                              </div>
                            </div>
                            <input type="radio" checked={isSelected} readOnly />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Instructions / Allotment Note */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontWeight: 800, fontSize: '0.82rem', marginBottom: 6, color: 'var(--gray-800)' }}>
                  📋 {hi ? 'कार्य निर्देश / टिप्पणी (Instructions / Notes)' : 'Site Instructions / Notes (Optional)'}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder={hi ? 'उदा. मौके पर जाकर 3 घंटे में निरीक्षण करें और सुधार रिपोर्ट सबमिट करें...' : 'e.g. Inspect site by 2 PM, coordinate with local supervisor...'}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                    fontSize: '0.85rem',
                    background: 'var(--theme-bg, #fff4e7)',
                    fontFamily: 'var(--font-primary)',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Selected Assignee Summary Pill */}
              {finalAssignee && (
                <div
                  style={{
                    background: 'var(--theme-bg, #fff4e7)',
                    border: '1.5px solid var(--theme-primary, #660033)',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px 14px',
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <CheckCircle2 size={18} color="var(--theme-primary, #660033)" style={{ flexShrink: 0 }} />
                  <div style={{ fontSize: '0.82rem' }}>
                    <span style={{ color: 'var(--gray-700)' }}>{hi ? 'कार्य सौंपा जा रहा है:' : 'Allocating Task to:'} </span>
                    <strong style={{ color: 'var(--theme-primary, #660033)' }}>{finalAssignee.full_name}</strong>
                    <span style={{ color: 'var(--gray-600)', marginLeft: 6 }}>
                      ({roleLabel(finalAssignee.role, language)} {finalAssignee.staff_code ? `• ${finalAssignee.staff_code}` : ''})
                    </span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: 12,
                border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--theme-bg, #fff4e7)',
                color: 'var(--gray-800)',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.88rem',
              }}
            >
              {hi ? 'रद्द करें' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={submitting || !isAllowedToAllot || !finalAssignee}
              style={{
                flex: 2,
                padding: 12,
                border: 'none',
                borderRadius: 'var(--radius-md)',
                background:
                  submitting || !isAllowedToAllot || !finalAssignee
                    ? 'var(--gray-300)'
                    : 'var(--primary-gradient, linear-gradient(135deg, #660033, #800040))',
                color: '#fff',
                fontWeight: 800,
                fontSize: '0.9rem',
                cursor: submitting || !isAllowedToAllot || !finalAssignee ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
              }}
            >
              {submitting ? '...' : <><Send size={15} /> {hi ? 'कार्य आवंटित करें' : 'Confirm Allocation'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
