import React, { useEffect, useMemo, useState } from 'react';
import { MapPin, Search, Users } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { getTier } from '../../../../lib/hierarchy';
import type { StaffMember } from '../../../../lib/hierarchy';
import type { Area, Ward } from '../../../../lib/wardTypes';
import { card, field, primaryBtn } from '../styles';
import { BORDER, PRIMARY } from '../constants';

type Department = { id: string; name: string };

interface Props {
  staff: StaffMember[];
  wards: Ward[];
  departments: Department[];
  departmentId: string | null;
  onSaved: () => void;
}

export const WardAssignmentPanel: React.FC<Props> = ({ staff, wards, departments, departmentId, onSaved }) => {
  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedWardId, setSelectedWardId] = useState('');
  const [selectedAreaId, setSelectedAreaId] = useState('');
  const [areaSearch, setAreaSearch] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(departmentId || 'all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [searched, setSearched] = useState(false);
  const [selectedStaffIds, setSelectedStaffIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    supabase.from('areas').select('*').eq('is_active', true).order('name')
      .then(({ data, error: areaError }) => {
        if (areaError) setError(areaError.message);
        setAreas((data || []) as Area[]);
      });
  }, []);

  useEffect(() => {
    setSelectedDepartmentId(departmentId || 'all');
  }, [departmentId]);

  const selectedWard = wards.find((ward) => ward.id === selectedWardId) || null;
  const wardAreas = areas.filter((area) => area.ward_id === selectedWardId
    && area.name.toLowerCase().includes(areaSearch.trim().toLowerCase()));

  const assignableStaff = useMemo(() => staff.filter((person) => {
    const tier = getTier(person.role, person.hierarchy_code, person.authority_role);
    const isDepartmentHeadAssigner = !!departmentId;
    const matchesRole = roleFilter === 'all'
      || (!isDepartmentHeadAssigner && roleFilter === 'department_head' && tier === 2)
      || (roleFilter === 'area_officer' && tier === 3)
      || (roleFilter === 'supervisor' && tier === 4)
      || (roleFilter === 'operational_staff' && tier === 5);
    const matchesDepartment = selectedDepartmentId === 'all'
      || person.linked_department_id === selectedDepartmentId;
    const query = appliedSearch.trim().toLowerCase();
    const matchesQuery = !query || [person.full_name, person.phone, person.email, person.staff_code]
      .some((value) => value?.toLowerCase().includes(query));
    return tier >= (isDepartmentHeadAssigner ? 3 : 2) && tier <= 5 && matchesRole && matchesDepartment && matchesQuery;
  }), [staff, roleFilter, selectedDepartmentId, appliedSearch]);

  const runSearch = () => {
    setError('');
    setMessage('');
    setAppliedSearch(searchInput);
    setSearched(true);
    setSelectedStaffIds(new Set());
  };

  const toggleStaff = (id: string) => {
    setSelectedStaffIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const save = async () => {
    if (!selectedWardId) {
      setError('Select a ward before assigning staff.');
      return;
    }
    if (selectedStaffIds.size === 0) {
      setError('Select at least one staff member.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    let savedCount = 0;
    const failures: string[] = [];
    for (const staffId of selectedStaffIds) {
      const { error: updateError } = await supabase.rpc('assign_profile_ward', {
        p_user_id: staffId,
        p_ward_id: selectedWardId,
      });
      if (updateError) failures.push(updateError.message);
      else savedCount++;
    }
    setSaving(false);
    if (failures.length) setError(`${savedCount} saved; ${failures.length} failed. ${failures[0]}`);
    else setMessage(`${savedCount} staff member(s) assigned to Ward ${selectedWard?.ward_number}.`);
    if (savedCount) onSaved();
  };

  const allVisibleSelected = assignableStaff.length > 0 && assignableStaff.every((person) => selectedStaffIds.has(person.id));
  const toggleAllVisible = () => setSelectedStaffIds(allVisibleSelected
    ? new Set()
    : new Set(assignableStaff.map((person) => person.id)));

  return (
    <section style={{ ...card, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 900, color: 'var(--gray-900)' }}>
          <MapPin size={15} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6, color: PRIMARY }} />
          Allocate Department Staff to a Ward
        </h3>
        <p style={{ margin: '4px 0 0', fontSize: '0.76rem', color: 'var(--gray-600)' }}>
          Choose a ward, search an area for reference, filter staff by department and role, then bulk-allocate. Only the ward is stored on the profile.
        </p>
      </div>

      {error && <div role="alert" style={{ color: '#991b1b', fontSize: '0.78rem' }}>{error}</div>}
      {message && <div role="status" style={{ color: '#166534', fontSize: '0.78rem' }}>{message}</div>}
      {wards.length === 0 && <div style={{ fontSize: '0.8rem', color: 'var(--gray-600)' }}>Register a ward before assigning staff.</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 8 }}>
        <label style={{ display: 'grid', gap: 4, fontSize: '0.74rem', fontWeight: 800 }}>1. Ward
          <select value={selectedWardId} onChange={(event) => { setSelectedWardId(event.target.value); setSelectedAreaId(''); setSearched(false); }} style={field}>
            <option value="">Select ward</option>{wards.map((ward) => <option key={ward.id} value={ward.id}>Ward {ward.ward_number} · {ward.name}</option>)}
          </select>
        </label>
        <div style={{ display: 'grid', gap: 4, fontSize: '0.74rem', fontWeight: 800 }}>2. Search area (reference only)
          <input value={areaSearch} onChange={(event) => { setAreaSearch(event.target.value); setSelectedAreaId(''); }} disabled={!selectedWardId} placeholder="Type area name" style={field} />
          <select value={selectedAreaId} onChange={(event) => setSelectedAreaId(event.target.value)} disabled={!selectedWardId} style={field}>
            <option value="">Select matching area</option>{wardAreas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}
          </select>
        </div>
        <label style={{ display: 'grid', gap: 4, fontSize: '0.74rem', fontWeight: 800 }}>3. Department
          <select value={selectedDepartmentId} onChange={(event) => setSelectedDepartmentId(event.target.value)} disabled={!!departmentId} style={field}>
            {!departmentId && <option value="all">All departments</option>}
            {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
          </select>
        </label>
        <label style={{ display: 'grid', gap: 4, fontSize: '0.74rem', fontWeight: 800 }}>4. Role
          <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} style={field}>
            <option value="all">All staff roles</option>{!departmentId && <option value="department_head">Department head</option>}<option value="area_officer">Area officer</option><option value="supervisor">Supervisor</option><option value="operational_staff">Operational staff</option>
          </select>
        </label>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); runSearch(); } }} placeholder="Search staff name, phone, email, or code" style={{ ...field, flex: '1 1 260px' }} />
        <button type="button" onClick={runSearch} disabled={!selectedWardId} style={{ ...primaryBtn, opacity: selectedWardId ? 1 : 0.55 }}><Search size={14} />Search staff</button>
      </div>
      {selectedAreaId && <div style={{ fontSize: '0.72rem', color: 'var(--gray-600)' }}>Area reference: {areas.find((area) => area.id === selectedAreaId)?.name}. Staff assignment remains at ward level.</div>}

      {searched && <>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', borderTop: BORDER, paddingTop: 10 }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--gray-700)' }}>{assignableStaff.length} matching staff · {selectedStaffIds.size} selected</span>
          <button type="button" onClick={toggleAllVisible} style={{ ...primaryBtn, background: 'var(--theme-bg, #fff4e7)', border: `1px solid ${PRIMARY}`, color: PRIMARY }}><Users size={14} />{allVisibleSelected ? 'Clear selection' : 'Select all results'}</button>
        </div>
        {assignableStaff.map((person) => {
          const assignedWard = wards.find((ward) => ward.id === person.assigned_ward_id);
          return <label key={person.id} style={{ display: 'grid', gridTemplateColumns: 'auto minmax(150px, 1fr) minmax(140px, 0.7fr)', gap: 9, alignItems: 'center', borderTop: BORDER, paddingTop: 8, fontSize: '0.78rem' }}>
            <input type="checkbox" checked={selectedStaffIds.has(person.id)} onChange={() => toggleStaff(person.id)} />
            <span><b>{person.full_name || person.email || 'Staff member'}</b><small style={{ display: 'block', color: 'var(--gray-600)' }}>{person.staff_code || person.phone || ''}</small></span>
            <span style={{ color: 'var(--gray-600)', fontSize: '0.72rem' }}>{assignedWard ? `Currently: Ward ${assignedWard.ward_number}` : 'No ward assigned'}</span>
          </label>;
        })}
        {assignableStaff.length === 0 && <div style={{ fontSize: '0.8rem', color: 'var(--gray-600)' }}>No staff matched these filters.</div>}
        <button type="button" disabled={saving || !selectedStaffIds.size} onClick={() => void save()} style={{ ...primaryBtn, alignSelf: 'start', opacity: saving || !selectedStaffIds.size ? 0.55 : 1 }}>
          <MapPin size={14} />{saving ? 'Allocating…' : `Allocate ${selectedStaffIds.size || ''} to Ward ${selectedWard?.ward_number || ''}`}
        </button>
      </>}
    </section>
  );
};