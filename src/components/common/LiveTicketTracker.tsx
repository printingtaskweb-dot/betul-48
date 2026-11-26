import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Compass, MapPin, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Complaint, Resolution } from '../../lib/supabase';
import { findWardForPoint, type Ward } from '../../lib/wardTypes';
import { mergeWithOfficialBetulWards } from '../../data/betulWardBoundaries';
import { DepartmentServiceIcon } from './DepartmentServiceIcon';
import { StatusBadge } from './StatusBadge';
import { ComplaintStatusTimeline } from './ComplaintStatusTimeline';

export interface LiveTicketDetails {
  complaint: Complaint;
  resolution: Resolution | null;
  assigneeName: string | null;
}

export async function fetchLiveTicketDetails(
  ticketNumber: string
): Promise<LiveTicketDetails | null> {
  const clean = ticketNumber.replace(/^#/, '').trim().toUpperCase();
  if (!clean) return null;

  const { data: complaintRow, error } = await supabase
    .from('complaints')
    .select('*, department:departments(*)')
    .ilike('ticket_number', clean)
    .maybeSingle();

  if (error || !complaintRow) {
    return null;
  }

  const normalizedComplaint: Complaint = {
    ...(complaintRow as Complaint),
    department: Array.isArray((complaintRow as any).department)
      ? (complaintRow as any).department[0]
      : (complaintRow as any).department,
  };

  let resolution: Resolution | null = null;
  try {
    const { data: resData } = await supabase
      .from('resolutions')
      .select('*')
      .eq('complaint_id', normalizedComplaint.id)
      .order('resolved_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (resData) resolution = resData as Resolution;
  } catch {
    resolution = null;
  }

  let assigneeName: string | null = null;
  if (normalizedComplaint.assigned_to) {
    try {
      const { data: staffData } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', normalizedComplaint.assigned_to)
        .maybeSingle();
      if (staffData?.full_name) {
        assigneeName = staffData.full_name;
      }
    } catch {
      // RLS may hide staff profiles for anonymous/citizen viewers
    }
  }

  return {
    complaint: normalizedComplaint,
    resolution,
    assigneeName,
  };
}

export interface LiveTicketTrackerProps {
  initialTicket?: string | null;
  departmentSlug?: string | null;
  language?: 'en' | 'hi';
  mode?: 'modal' | 'embedded';
  onOpenFullTrack?: (ticketNumber: string) => void;
}

export const LiveTicketTracker: React.FC<LiveTicketTrackerProps> = ({
  initialTicket,
  departmentSlug,
  language = 'en',
  mode = 'modal',
  onOpenFullTrack,
}) => {
  const hi = language === 'hi';
  const [queryInput, setQueryInput] = useState(
    initialTicket ? initialTicket.replace(/^#/, '').trim().toUpperCase() : ''
  );
  const [recentTickets, setRecentTickets] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [result, setResult] = useState<LiveTicketDetails | null>(null);
  const [dbWards, setDbWards] = useState<Ward[]>([]);

  useEffect(() => {
    supabase
      .from('wards')
      .select('*')
      .eq('is_active', true)
      .order('ward_number', { ascending: true })
      .then(({ data }) => {
        if (data) setDbWards(data as Ward[]);
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadRecent = async () => {
      try {
        let query = departmentSlug
          ? supabase
              .from('complaints')
              .select('ticket_number, department:departments!inner(slug)')
              .eq('department.slug', departmentSlug)
          : supabase.from('complaints').select('ticket_number');

        const { data } = await query
          .not('ticket_number', 'is', null)
          .order('created_at', { ascending: false })
          .limit(4);

        if (!cancelled && data) {
          const list = data
            .map((row: { ticket_number?: string | null }) => row.ticket_number)
            .filter((t): t is string => Boolean(t && t.trim()));
          setRecentTickets(list);
        }
      } catch {
        if (!cancelled) setRecentTickets([]);
      }
    };
    void loadRecent();
    return () => {
      cancelled = true;
    };
  }, [departmentSlug]);

  const effectiveWards = useMemo(
    () => mergeWithOfficialBetulWards(dbWards, true),
    [dbWards]
  );

  const lookup = useCallback(async (ticketOverride?: string) => {
    const cleanId = (ticketOverride ?? queryInput)
      .replace(/^#/, '')
      .trim()
      .toUpperCase();
    if (!cleanId) return;

    setQueryInput(cleanId);
    setLoading(true);
    setNotFound(false);

    const liveData = await fetchLiveTicketDetails(cleanId);
    if (liveData) {
      setResult(liveData);
    } else {
      setResult(null);
      setNotFound(true);
    }
    setLoading(false);
  }, [queryInput]);

  useEffect(() => {
    const cleanInit = (initialTicket || '').replace(/^#/, '').trim().toUpperCase();
    if (cleanInit) {
      setQueryInput(cleanInit);
      void lookup(cleanInit);
    } else {
      setQueryInput('');
      setResult(null);
      setNotFound(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTicket]);

  const matchedWard = useMemo(() => {
    if (!result?.complaint) return null;
    const c = result.complaint;
    if (c.ward_id) {
      const byId = effectiveWards.find((w) => w.id === c.ward_id);
      if (byId) return byId;
    }
    if (c.latitude != null && c.longitude != null) {
      return findWardForPoint(c.latitude, c.longitude, effectiveWards);
    }
    return null;
  }, [result, effectiveWards]);

  const outerClass =
    mode === 'embedded'
      ? 'bg-white rounded-3xl border border-sand-200 p-4 sm:p-5 space-y-4 shadow-card'
      : 'space-y-4';

  return (
    <div className={outerClass}>
      {/* Live Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void lookup();
              }
            }}
            placeholder={
              hi
                ? 'टिकट नंबर दर्ज करें (उदा. BTL-2026-...)'
                : 'Enter Ticket ID (e.g. BTL-2026-...)'
            }
            className="w-full rounded-xl border border-sand-200 bg-sand-50 pl-9 pr-3.5 py-2.5 text-sm font-mono font-bold text-civic-950 uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-civic-600"
          />
        </div>
        <button
          type="button"
          onClick={() => void lookup()}
          disabled={loading}
          className="px-4 py-2.5 rounded-xl bg-civic-700 hover:bg-civic-800 disabled:bg-slate-300 text-white text-sm font-bold transition cursor-pointer shrink-0"
        >
          {loading ? '…' : hi ? 'खोजें' : 'Track'}
        </button>
      </div>

      {/* Live Recent Ticket Chips from Database */}
      {recentTickets.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-500 font-semibold">
            {hi ? 'हालिया टिकट:' : 'Recent live tickets:'}
          </span>
          {recentTickets.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => void lookup(id)}
              className="px-2.5 py-1 rounded-lg bg-sand-50 hover:bg-civic-50 text-civic-800 border border-sand-200 font-mono font-semibold transition cursor-pointer"
            >
              #{id}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="rounded-2xl border border-sand-200 bg-sand-50 p-6 text-center text-xs font-semibold text-civic-800">
          {hi ? 'लाइव स्थिति प्राप्त की जा रही है…' : 'Fetching live complaint status…'}
        </div>
      )}

      {!loading && notFound && (
        <div className="rounded-2xl border border-dashed border-sand-200 bg-sand-50 p-6 text-center space-y-1">
          <p className="text-sm font-extrabold text-civic-950">
            {hi ? 'कोई शिकायत नहीं मिली' : 'No live complaint found'}
          </p>
          <p className="text-xs text-slate-500">
            {hi
              ? `टिकट नंबर "${queryInput}" की पुनः जांच करें।`
              : `No complaint matched ticket "${queryInput}". Check the ticket ID and try again.`}
          </p>
        </div>
      )}

      {!loading && result && (
        <div className="rounded-2xl border border-sand-200 bg-white p-4 space-y-4">
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-sand-200">
            <div className="flex items-start gap-3 min-w-0">
              <DepartmentServiceIcon
                slugOrName={
                  result.complaint.department?.slug ||
                  result.complaint.department?.name
                }
                size={40}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm font-extrabold text-civic-800">
                    #{result.complaint.ticket_number}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    • {result.complaint.department?.name || (hi ? 'नगर पालिका सेवा' : 'Municipal Service')}
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-bold text-civic-950 mt-1 break-words">
                  {result.complaint.description}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] text-slate-500">
                  {matchedWard && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-50 border border-sky-200 text-sky-800 font-bold">
                      <Compass className="w-3 h-3" />
                      Ward {matchedWard.ward_number} · {matchedWard.name}
                    </span>
                  )}
                  {result.complaint.address && (
                    <span className="inline-flex items-center gap-1 truncate max-w-xs">
                      <MapPin className="w-3 h-3 shrink-0 text-civic-700" />
                      <span className="truncate">{result.complaint.address}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <StatusBadge status={result.complaint.status} />
          </div>

          <ComplaintStatusTimeline
            status={result.complaint.status}
            createdAt={result.complaint.created_at}
            updatedAt={result.complaint.updated_at}
            assignedAt={result.complaint.assigned_at}
            resolvedAt={result.resolution?.resolved_at}
            assigneeName={result.assigneeName}
            resolutionNote={result.resolution?.admin_note}
            language={language}
            compact
          />

          <div className="flex items-center justify-end pt-1">
            {onOpenFullTrack ? (
              <button
                type="button"
                onClick={() => onOpenFullTrack(result.complaint.ticket_number)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-civic-700 hover:bg-civic-800 text-white text-xs font-extrabold transition cursor-pointer"
              >
                <span>{hi ? 'पूरा विवरण व फोटो प्रमाण देखें' : 'Open Full Tracker & Proof'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <Link
                to={`/track?ticket=${encodeURIComponent(result.complaint.ticket_number)}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-civic-700 hover:bg-civic-800 text-white text-xs font-extrabold transition text-decoration-none"
              >
                <span>{hi ? 'पूरा विवरण व फोटो प्रमाण देखें' : 'Open Full Tracker & Proof'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
