import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { TrendingUp, Clock, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface Stats {
  total: number;
  pending: number;
  verified: number;
  resolved: number;
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
    const duration = 800;
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
  const [stats, setStats] = useState<Stats>({
    total: 20,
    pending: 12,
    verified: 3,
    resolved: 5,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await supabase.from('complaints').select('status');
        if (data && data.length > 0) {
          const s: Stats = {
            total: data.length,
            pending: 0,
            verified: 0,
            resolved: 0,
          };
          data.forEach((c) => {
            const st = (c.status || '').toLowerCase();
            if (st === 'resolved') s.resolved++;
            else if (st === 'verified') s.verified++;
            else s.pending++;
          });
          setStats(s);
        }
      } catch {
        // keep defaults
      }
    };

    void fetchStats();
  }, []);

  return (
    <section aria-label="Live Municipal Metrics" className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* 1. Total */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-sand-200 shadow-card flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-2xl bg-civic-50 text-civic-700 flex items-center justify-center shrink-0">
          <TrendingUp className="w-5 h-5" />
        </div>
        <div>
          <div className="text-2xl sm:text-3xl font-extrabold text-civic-950 leading-none">
            <AnimatedNumber value={stats.total} />
          </div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-1">
            {language === 'hi' ? 'कुल' : 'Total'}
          </div>
        </div>
      </div>

      {/* 2. Pending */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-sand-200 shadow-card flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
          <Clock className="w-5 h-5" />
        </div>
        <div>
          <div className="text-2xl sm:text-3xl font-extrabold text-civic-950 leading-none">
            <AnimatedNumber value={stats.pending} />
          </div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-1">
            {language === 'hi' ? 'लंबित' : 'Pending'}
          </div>
        </div>
      </div>

      {/* 3. Verified */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-sand-200 shadow-card flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <div className="text-2xl sm:text-3xl font-extrabold text-civic-950 leading-none">
            <AnimatedNumber value={stats.verified} />
          </div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-1">
            {language === 'hi' ? 'सत्यापित' : 'Verified'}
          </div>
        </div>
      </div>

      {/* 4. Resolved */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-sand-200 shadow-card flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700 leading-none">
            <AnimatedNumber value={stats.resolved} />
          </div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-1">
            {language === 'hi' ? 'निराकृत' : 'Resolved'}
          </div>
        </div>
      </div>
    </section>
  );
};
