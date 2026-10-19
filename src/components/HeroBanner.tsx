import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { t } from '../lib/i18n';
import { TrendingUp, Clock, CheckCircle2, ShieldCheck } from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface Stats {
  total: number;
  pending: number;
  in_progress: number;
  resolved: number;
  verified: number;
}

const AnimatedNumber: React.FC<{ value: number; delay?: number }> = ({ value, delay = 0 }) => {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (end === 0) return;
    const duration = 900;
    const step = Math.max(1, end / (duration / 16));

    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        setDisplay(end);
        clearInterval(timer);
      } else {
        setDisplay(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value]);

  return <>{display.toLocaleString()}</>;
};

export const StatsSection: React.FC = () => {
  const { language } = useAuth();
  const [stats, setStats] = useState<Stats>({
    total: 0,
    pending: 0,
    in_progress: 0,
    resolved: 0,
    verified: 0,
  });
  const [loaded, setLoaded] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const statRefs = useRef<Array<HTMLDivElement | null>>([]);
  const animatedRef = useRef(false);

  useEffect(() => {
    supabase
      .from('complaints')
      .select('status')
      .then(({ data }) => {
        if (!data) return;
        const s: Stats = { total: data.length, pending: 0, in_progress: 0, resolved: 0, verified: 0 };
        data.forEach((c) => {
          if (c.status === 'pending') s.pending++;
          else if (c.status === 'in_progress') s.in_progress++;
          else if (c.status === 'resolved') s.resolved++;
          else if (c.status === 'verified') s.verified++;
        });
        setStats(s);
        setLoaded(true);
      });
  }, []);

  // ── GSAP reveal + counter animations ─────────────────────────────────────
  useEffect(() => {
    if (!innerRef.current || !sectionRef.current) return;

    // Set initial state
    gsap.set(innerRef.current, { opacity: 0, y: 60, scale: 0.97 });
    statRefs.current.forEach((el) => {
      if (el) gsap.set(el, { opacity: 0, y: 30 });
    });

    const ctx = gsap.context(() => {
      // Reveal container
      gsap.to(innerRef.current, {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 1.2,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 80%',
        },
        onComplete: () => {
          if (animatedRef.current) return;
          animatedRef.current = true;
          // Trigger counters
          document.querySelectorAll('.stat-block .num').forEach((el) => {
            const target = parseFloat((el as HTMLElement).dataset.count || '0');
            const span = el.querySelector('span');
            if (!span) return;
            gsap.to(
              { v: 0 },
              {
                v: target,
                duration: 2,
                ease: 'power2.out',
                onUpdate: function () {
                  span.textContent = Math.floor(this.targets()[0].v).toLocaleString();
                },
              }
            );
          });
        },
      });

      // Stagger stat blocks
      statRefs.current.forEach((el, i) => {
        if (!el) return;
        gsap.to(el, {
          opacity: 1,
          y: 0,
          duration: 0.8,
          delay: 0.15 * i,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
          },
        });
      });
    }, sectionRef);

    return () => {
      ctx.revert();
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

  const cards = [
    {
      key: 'total',
      label: t(language, 'totalComplaints'),
      value: stats.total,
      icon: <TrendingUp size={18} />,
      color: '#146C94',
      count: '15',
    },
    {
      key: 'pending',
      label: t(language, 'pendingComplaints'),
      value: stats.pending,
      icon: <Clock size={18} />,
      color: '#19A7CE',
      count: '8',
    },
    {
      key: 'resolved',
      label: t(language, 'resolvedComplaints'),
      value: stats.resolved,
      icon: <CheckCircle2 size={18} />,
      color: '#146C94',
      count: '1',
    },
    {
      key: 'verified',
      label: t(language, 'verifiedComplaints'),
      value: stats.verified,
      icon: <Shield
