import React from 'react';
import { card } from '../styles';
import { PRIMARY } from '../constants';

interface Props {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
  resolutionRate: number;
  slaOverdue: number;
  slaCompliant: number;
  deptCount: number;
  wardCount: number;
}

export const KpiGrid: React.FC<Props> = ({
  total, pending, inProgress, resolved, resolutionRate,
  slaOverdue, slaCompliant, deptCount, wardCount,
}) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
    <KpiCard label="Total Complaints" value={total} color={PRIMARY}
      sub={`Across ${deptCount} departments · ${wardCount} wards`} />
    <KpiCard label="Pending Allotment" value={pending} color="var(--status-pending)"
      sub="Requires officer allocation" labelColor="var(--status-pending)" />
    <KpiCard label="In Progress / Dispatched" value={inProgress} color="var(--burgundy)"
      sub="Under field supervisor / worker action" labelColor="var(--burgundy)" />
    <KpiCard label="Resolved & Verified" value={resolved} color="#15803d"
      sub={<>Resolution efficiency: <b>{resolutionRate}%</b></>} labelColor="#15803d" />
    <KpiCard label="SLA Compliance" value={`${slaCompliant} / ${total || 1}`} color={PRIMARY}
      sub={<>Overdue (&gt;72h): <b>{slaOverdue}</b></>}
      subColor={slaOverdue > 0 ? '#991b1b' : '#15803d'} />
  </div>
);

const KpiCard: React.FC<{
  label: string; value: React.ReactNode; color: string;
  sub: React.ReactNode; labelColor?: string; subColor?: string;
}> = ({ label, value, color, sub, labelColor = 'var(--gray-600)', subColor = 'var(--gray-600)' }) => (
  <div style={{ ...card, padding: '16px 18px' }}>
    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: labelColor, textTransform: 'uppercase' }}>
      {label}
    </div>
    <div style={{ fontSize: '1.7rem', fontWeight: 900, color, marginTop: 4 }}>{value}</div>
    <div style={{ fontSize: '0.74rem', color: subColor, marginTop: 4 }}>{sub}</div>
  </div>
);
