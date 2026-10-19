export const isDone = (s: string) => s === 'resolved' || s === 'verified';

export const statusStyle = (s: string) =>
  isDone(s)
    ? { bg: '#dcfce7', fg: '#15803d' }
    : s === 'pending'
    ? { bg: 'var(--status-pending-bg)', fg: 'var(--status-pending)' }
    : { bg: 'var(--primary-100)', fg: 'var(--burgundy)' };
