import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { MapPin, ChevronRight } from 'lucide-react';

interface FeedComplaint {
  id: string;
  department: string;
  title: string;
  ward: string;
  status: string;
  timeAgo: string;
  photo: string;
}

const FALLBACK_COMPLAINTS: FeedComplaint[] = [
  {
    id: 'BTL-2026-00020',
    department: 'Water',
    title: 'Main water supply valve leakage near Kothi Bazar Chowk',
    ward: 'Kothi Bazar • Ward 1',
    status: 'Pending',
    timeAgo: '18 mins ago',
    photo: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'BTL-2026-00019',
    department: 'Streetlight',
    title: 'Three LED streetlamps out on Tikari Main Road stretch',
    ward: 'Tikari • Ward 12',
    status: 'In Progress',
    timeAgo: '1 hour ago',
    photo: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'BTL-2026-00018',
    department: 'C&D Waste',
    title: 'Construction debris clearance required near Ganj Sabzi Mandi',
    ward: 'Ganj • Ward 5',
    status: 'Verified',
    timeAgo: '3 hours ago',
    photo: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'BTL-2026-00017',
    department: 'Solid Waste',
    title: 'Morning garbage collection point cleared at Badora Square',
    ward: 'Badora • Ward 18',
    status: 'Resolved',
    timeAgo: 'Yesterday',
    photo: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=300&q=80',
  },
];

function getStatusBadgeClass(status: string) {
  const norm = status.toLowerCase();
  if (norm === 'resolved') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (norm === 'in progress' || norm === 'in_progress') return 'bg-sky-50 text-sky-700 border-sky-200';
  if (norm === 'verified') return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  return 'bg-rose-50 text-rose-700 border-rose-200';
}

interface RecentComplaintsProps {
  onTrackTicket?: (ticketId: string) => void;
}

export const RecentComplaints: React.FC<RecentComplaintsProps> = ({ onTrackTicket }) => {
  const { language } = useAuth();
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState<FeedComplaint[]>(FALLBACK_COMPLAINTS);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    const fetchComplaints = async () => {
      try {
        const { data } = await supabase
          .from('complaints')
          .select('*, department:departments(*)')
          .order('created_at', { ascending: false })
          .limit(6);

        if (data && data.length > 0) {
          const mapped: FeedComplaint[] = data.map((c: any) => ({
            id: c.ticket_number || c.id?.slice(0, 8) || 'BTL-2026',
            department: c.department?.name || c.category || 'General',
            title: c.description || c.title || 'Civic issue reported',
            ward: c.location_address || c.ward || 'Betul Ward',
            status:
              c.status === 'in_progress'
                ? 'In Progress'
                : c.status
                ? c.status.charAt(0).toUpperCase() + c.status.slice(1)
                : 'Pending',
            timeAgo: 'Recently',
            photo: c.photo_url || FALLBACK_COMPLAINTS[0].photo,
          }));
          setComplaints(mapped);
        }
      } catch {
        // keep fallback
      }
    };

    void fetchComplaints();
  }, []);

  const handleTrackClick = (id: string) => {
    if (onTrackTicket) {
      onTrackTicket(id);
    } else {
      navigate(`/track?ticket=${encodeURIComponent(id)}`);
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
        </select>
      </div>

      <div className="space-y-3">
        {filteredList.map((item) => (
          <article
            key={item.id}
            className="bg-white rounded-2xl p-4 border border-sand-200 shadow-card hover:border-civic-300 transition flex items-start gap-3.5"
          >
            {/* Evidence Photo Thumbnail */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-gradient-to-br from-civic-700 to-civic-900 shrink-0">
              <img
                src={item.photo}
                alt={`Civic Evidence ${item.id}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleTrackClick(item.id)}
                    className="font-mono text-xs sm:text-sm font-extrabold text-civic-700 hover:underline cursor-pointer"
                  >
                    #{item.id}
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
                  <span className="truncate">{item.ward}</span>
                  <span className="text-slate-300">•</span>
                  <span className="shrink-0">{item.timeAgo}</span>
                </span>

                <button
                  type="button"
                  onClick={() => handleTrackClick(item.id)}
                  className="inline-flex items-center gap-1 text-civic-700 hover:text-civic-900 font-bold transition cursor-pointer"
                >
                  <span>{language === 'hi' ? 'SLA ट्रैक करें' : 'Track SLA'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};
