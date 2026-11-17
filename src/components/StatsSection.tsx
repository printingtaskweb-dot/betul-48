import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { TrendingUp, Clock, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface RealStats {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
  verified: number;
  todayCount: number;
}

const AnimatedNumber: React.FC<{ value: number }> = ({ value }) => {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (end === 0) {
      setDisplay(0);
      return;
    }
    const duration = 700;
    const step = Math.max(1, Math.ceil(end / (duration / 16)));

    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        setDisplay(end);
        clearInterval(timer);
      } else {
        setDisplay(start);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value]);

  return <>{display.toLocaleString()}</>;
};

export const StatsSection: React.FC = () => {
  const { language } = useAuth();
  const hi = language === 'hi';

  const [stats, setStats] = useState<RealStats>({
    total: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0,
    verified: 0,
    todayCount: 0,
  });

  useEffect(() => {
    let isMounted = true;

    const fetchLiveStats = async () => {
      try {
        const { data: complaints, error } = await supabase
          .from('complaints')
          .select('id, status, created_at');

        if (error) throw error;
        if (!complaints || !isMounted) return;

        let pending = 0;
        let inProgress = 0;
        let resolved = 0;
        let verified = 0;
        let todayCount = 0;

        const now = Date.now();
        const oneDayMs = 24 * 60 * 60 * 1000;

        complaints.forEach((c) => {
          const st = (c.status || '').toLowerCase().trim();
          if (st === 'resolved') resolved++;
          else if (st === 'verified') verified++;
          else if (st === 'in_progress') inProgress++;
          else pending++;

          if (c.created_at) {
            const diff = now - new Date(c.created_at).getTime();
            if (diff >= 0 && diff <= oneDayMs) {
              todayCount++;
            }
          }
        });

        if (isMounted) {
          setStats({
            total: complaints.length,
            pending,
            inProgress,
            resolved,
            verified,
            todayCount,
          });
        }
      } catch (err) {
        console.error('Failed to fetch real live stats:', err);
      }
    };

    void fetchLiveStats();

    return () => {
      isMounted = false;
    };
  }, []);

  const totalComplaints = stats.total;
  const resolvedCount = stats.resolved + stats.verified;
  const resolvedPercentage = totalComplaints > 0
    ? ((resolvedCount / totalComplaints) * 100).toFixed(1)
    : '0.0';

  return (
    <section aria-label="Live Municipal Metrics" className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* 1. Total */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-sand-200 shadow-card flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-2xl bg-civic-50 text-civic-700 flex items-center justify-center shrink-0">
          <TrendingUp className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-civic-950 leading-none">
              <AnimatedNumber value={stats.total} />
            </span>
            {stats.todayCount > 0 && (
              <span className="text-[10px] font-bold text-civic-600">
                +{stats.todayCount}
              </span>
            )}
          </div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-1 truncate">
            {hi ? 'कुल शिकायतें' : 'Total'}
          </div>
        </div>
      </div>

      {/* 2. Pending */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-sand-200 shadow-card flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
          <Clock className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-2xl sm:text-3xl font-extrabold text-civic-950 leading-none">
            <AnimatedNumber value={stats.pending + stats.inProgress} />
          </div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-1 truncate">
            {hi ? 'लंबित' : 'Pending'}
          </div>
        </div>
      </div>

      {/* 3. Verified */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-sand-200 shadow-card flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-2xl sm:text-3xl font-extrabold text-civic-950 leading-none">
            <AnimatedNumber value={stats.verified} />
          </div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-1 truncate">
            {hi ? 'सत्यापित' : 'Verified'}
          </div>
        </div>
      </div>

      {/* 4. Resolved */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-sand-200 shadow-card flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-700 leading-none">
              <AnimatedNumber value={stats.resolved} />
            </span>
            {stats.total > 0 && (
              <span className="text-[10px] font-bold text-emerald-600">
                {resolvedPercentage}%
              </span>
            )}
          </div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-1 truncate">
            {hi ? 'निराकृत' : 'Resolved'}
          </div>
        </div>
      </div>
    </section>
  );
};
