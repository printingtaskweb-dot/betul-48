import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { DepartmentServiceIcon } from './common/DepartmentServiceIcon';
import { MapPin, ChevronRight, Inbox } from 'lucide-react';

interface FeedComplaint {
  id: string;
  ticketNumber: string | null;
  department: string;
  departmentSlug: string;
  title: string;
  locationLabel: string;
  status: string;
  timeAgo: string;
  photo: string | null;
}

function formatRelativeTime(isoString?: string | null, language: 'en' | 'hi' = 'en'): string {
  if (!isoString) return language === 'hi' ? 'हाल ही में' : 'Recently';
  const date = new Date(isoString);
  const diffMs = Date.now() - date.getTime();
  if (Number.isNaN(diffMs)) return language === 'hi' ? 'हाल ही में' : 'Recently';
  const mins = Math.max(0, Math.floor(diffMs / 60000));
  if (mins < 1) return language === 'hi' ? 'अभी' : 'Just now';
  if (mins < 60) return language === 'hi' ? `${mins} मिनट पहले` : `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return language === 'hi' ? `${hours} घंटे पहले` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return language === 'hi' ? 'कल' : 'Yesterday';
  if (days < 7) return language === 'hi' ? `${days} दिन पहले` : `${days}d ago`;
  return date.toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-IN', {
    day: '2-digit',
    month: 'short',
  });
}

function getStatusBadgeClass(status: string) {
  const norm = status.toLowerCase();
  if (norm === 'resolved') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (norm === 'in progress' || norm === 'in_progress') return 'bg-sky-50 text-sky-700 border-sky-200';
  if (norm === 'verified') return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  if (norm === 'rejected') return 'bg-rose-50 text-rose-700 border-rose-200';
  return 'bg-amber-50 text-amber-700 border-amber-200';
}

interface RecentComplaintsProps {
  onTrackTicket?: (ticketId: string) => void;
}

export const RecentComplaints: React.FC<RecentComplaintsProps> = ({ onTrackTicket }) => {
  const { language } = useAuth();
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState<FeedComplaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    const fetchComplaints = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('complaints')
          .select('*, department:departments(*)')
          .order('created_at', { ascending: false })
          .limit(6);

        if (data && data.length > 0) {
          const mapped: FeedComplaint[] = data.map((c: any) => {
            const deptObj = Array.isArray(c.department) ? c.department[0] : c.department;
            const rawStatus = (c.status || 'pending').toLowerCase();
            const statusLabel =
              rawStatus === 'in_progress'
                ? 'In Progress'
                : rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1);
            return {
              id: c.id,
              ticketNumber: c.ticket_number || null,
              department: deptObj?.name || c.category || (language === 'hi' ? 'नगर सेवा' : 'Municipal'),
              departmentSlug: deptObj?.slug || deptObj?.name || '',
              title: c.description || c.title || (language === 'hi' ? 'नागरिक समस्या दर्ज' : 'Civic issue reported'),
              locationLabel: c.address || (language === 'hi' ? 'बैतूल नगर पालिका' : 'Betul Municipality'),
              status: statusLabel,
              timeAgo: formatRelativeTime(c.created_at, language),
              photo: c.photo_url || null,
            };
          });
          setComplaints(mapped);
        } else {
          setComplaints([]);
        }
      } catch {
        setComplaints([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchComplaints();
  }, [language]);

  const handleTrackClick = (ticketNumber: string | null) => {
    if (!ticketNumber) return;
    if (onTrackTicket) {
      onTrackTicket(ticketNumber);
    } else {
      navigate(`/track?ticket=${encodeURIComponent(ticketNumber)}`);
    }
  };

  const filteredList =
    statusFilter === 'ALL'
      ? complaints
      : complaints.filter(
          (c) => c.status.toLowerCase().replace('_', ' ') === statusFilter.toLowerCase().replace('_', ' ')
        );

  return (
    <div id="feed-section" className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-civic-600">
            {language === 'hi' ? 'लाइव नागरिक फीड' : 'Live Citizen Feed'}
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-civic-950 tracking-tight">
            {language === 'hi' ? 'हालिया शिकायतें' : 'Recent Complaints'}
          </h2>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs sm:text-sm font-semibold bg-white border border-sand-200 rounded-xl px-3 py-2 text-civic-900 focus:outline-none focus:ring-2 focus:ring-civic-500 shadow-2xs cursor-pointer"
        >
          <option value="ALL">{language === 'hi' ? 'सभी स्थितियाँ' : 'All Status'}</option>
          <option value="Pending">{language === 'hi' ? 'लंबित (Pending)' : 'Pending'}</option>
          <option value="In Progress">{language === 'hi' ? 'प्रगति पर (In Progress)' : 'In Progress'}</option>
          <option value="Verified">{language === 'hi' ? 'सत्यापित (Verified)' : 'Verified'}</option>
          <option value="Resolved">{language === 'hi' ? 'निराकृत (Resolved)' : 'Resolved'}</option>
          <option value="Rejected">{language === 'hi' ? 'अस्वीकृत (Rejected)' : 'Rejected'}</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((skeleton) => (
            <div
              key={skeleton}
              className="bg-white rounded-2xl p-4 border border-sand-200 shadow-card animate-pulse flex items-start gap-3.5"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-sand-100 shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-3.5 bg-sand-100 rounded w-1/3" />
                <div className="h-4 bg-sand-100 rounded w-5/6" />
                <div className="h-3 bg-sand-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredList.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border border-dashed border-sand-200 text-center space-y-2 shadow-card">
          <Inbox className="w-9 h-9 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-civic-950">
            {language === 'hi' ? 'कोई लाइव शिकायत उपलब्ध नहीं है' : 'No live complaints found'}
          </p>
          <p className="text-xs text-slate-500">
            {statusFilter === 'ALL'
              ? language === 'hi'
                ? 'नागरिकों द्वारा दर्ज की गई शिकायतें यहाँ दिखाई देंगी।'
                : 'Newly reported civic grievances will appear here in real time.'
              : language === 'hi'
              ? 'इस स्थिति के लिए कोई शिकायत नहीं मिली।'
              : 'No recent complaints match the selected status filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredList.map((item) => (
            <article
              key={item.id}
              className="bg-white rounded-2xl p-4 border border-sand-200 shadow-card hover:border-civic-300 transition flex items-start gap-3.5"
            >
              {/* Evidence Photo Thumbnail or Department Icon Fallback */}
              {item.photo ? (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-gradient-to-br from-civic-700 to-civic-900 shrink-0">
                  <img
                    src={item.photo}
                    alt={`Civic Evidence ${item.ticketNumber || item.id}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              ) : (
                <DepartmentServiceIcon
                  slugOrName={item.departmentSlug || item.department}
                  size={64}
                  iconSize={28}
                  style={{ borderRadius: 12 }}
                />
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleTrackClick(item.ticketNumber)}
                      disabled={!item.ticketNumber}
                      className="font-mono text-xs sm:text-sm font-extrabold text-civic-700 hover:underline cursor-pointer disabled:opacity-60 disabled:cursor-default"
                    >
                      #{item.ticketNumber || item.id.slice(0, 8)}
                    </button>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs font-semibold text-slate-600">{item.department}</span>
                  </div>
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${getStatusBadgeClass(
                      item.status
                    )}`}
                  >
                    {item.status}
                  </span>
                </div>

                <h3 className="font-bold text-xs sm:text-sm text-civic-950 mt-1 leading-snug line-clamp-2">
                  {item.title}
                </h3>

                <div className="mt-2.5 pt-2 border-t border-sand-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                  <span className="inline-flex items-center gap-1 font-medium text-slate-600 truncate max-w-[220px]">
                    <MapPin className="w-3.5 h-3.5 text-civic-600 shrink-0" />
                    <span className="truncate">{item.locationLabel}</span>
                    <span className="text-slate-300">•</span>
                    <span className="shrink-0">{item.timeAgo}</span>
                  </span>

                  {item.ticketNumber && (
                    <button
                      type="button"
                      onClick={() => handleTrackClick(item.ticketNumber)}
                      className="inline-flex items-center gap-1 text-civic-700 hover:text-civic-900 font-bold transition cursor-pointer"
                    >
                      <span>{language === 'hi' ? 'SLA ट्रैक करें' : 'Track SLA'}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
