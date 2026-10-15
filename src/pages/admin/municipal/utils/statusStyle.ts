export const isDone = (s: string) => s === 'resolved' || s === 'verified';

export const statusStyle = (s: string) =>
  isDone(s)
    ? { bg: '#dcfce7', fg: '#15803d' }
    : s === 'pending'
    ? { bg: '#fef3c7', fg: '#b45309' }
    : { bg: '#e0e7ff', fg: '#3730a3' };
