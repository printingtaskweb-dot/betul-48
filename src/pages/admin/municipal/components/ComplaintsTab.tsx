import React, { useMemo, useState } from 'react';
import { Eye, Briefcase, CheckSquare, Square, Users, ChevronRight } from 'lucide-react';
import { card, outlineBtn, primaryBtn, field } from '../styles';
import { BORDER, PRIMARY } from '../constants';
import { isDone, statusStyle } from '../utils/statusStyle';
import { getTier, canAllotComplaint, TIER_LABEL } from '../../../../lib/hierarchy';
import type { StaffMember, Viewer } from '../../../../lib/hierarchy';
import type { Ward } from '../../../../lib/wardTypes';
import type { ComplaintRecord, DepartmentRow } from '../types';

interface Props {
  filtered: ComplaintRecord[];
  wards: Ward[];
  departments: DepartmentRow[];
  staffById: Record<string, StaffMember>;
  staff: StaffMember[];
  viewer: Viewer;
  onShowDetail: (c: ComplaintRecord) => void;
  onAllot: (c: ComplaintRecord) => void;
  onBulkAllot: (ids: string[]) => void;
}

export const ComplaintsTab: React.FC<Props> = ({
  filtered, wards, departments, staffById, staff, viewer, onShowDetail, onAllot, onBulkAllot,
}) => {
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [expandedDept, setExpandedDept] = useState<string | null>(null);

  const toggle = (id: string) => {
    const next = new Set(selection);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelection(next);
  };

  const clearSelection = () => setSelection(new Set());

  const toggleAll = () => {
    if (selection.size === filtered.length) clearSelection();
    else setSelection(new Set(filtered.map((c) => c.id)));
  };

  const selectedList = filtered.filter((c) => selection.has(c.id));

  /** Group selected by department for cascade preview */
  const selectionBy
