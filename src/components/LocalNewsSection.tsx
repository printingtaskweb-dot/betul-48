import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { MapPin, Heart, MessageCircle, ArrowRight, BadgeCheck } from 'lucide-react';

interface NewsItem {
  id: string;
  tag: string;
  tagClass: string;
  date: string;
  title: string;
  location: string;
  likes: number;
  comments: number;
  verified: boolean;
  image: string;
}

const FALLBACK_NEWS: NewsItem[] = [
  {
    id: 'news-1',
    tag: 'Community',
    tagClass: 'bg-sky-50 text-sky-700',
    date: '12 Nov',
    title: 'Cleanliness & Door-to-Door Waste Segregation Drive Across Kothi Bazar',
    location: 'Kothi Bazar, Betul',
    likes: 24,
    comments: 6,
    verified: true,
    image: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'news-2',
    tag: 'Update',
    tagClass: 'bg-emerald-50 text-emerald-700',
    date: '10 Nov',
    title: 'New LED Smart Streetlights Installed Along Badora to Kosmi Main Road',
    location: 'Badora, Betul',
    likes: 41,
    comments: 9,
    verified: true,
    image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'news-3',
    tag: 'Community',
    tagClass: 'bg-amber-50 text-amber-700',
    date: '08 Nov',
    title: 'Monsoon Rainwater Harvesting & Drain Desilting Completed in Sadar',
    location: 'Sadar, Betul',
    likes: 18,
    comments: 3,
    verified: true,
    image: 'https://images.unsplash.com/photo-1468421870903-4df1684ac290?auto=format&fit=crop&w=300&q=80',
  },
];

export const LocalNewsSection: React.FC = () => {
  const { language } = useAuth();
  const navigate = useNavigate();
  const [newsList, setNewsList] = useState<NewsItem[]>(FALLBACK_NEWS);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const { data } = await supabase
          .from('local_news')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(4);

        if (data && data.length > 0) {
          const mapped: NewsItem[] = data.map((n: any, index: number) => {
            const isAlert = n.category === 'alert';
            const isEvent = n.category === 'event';
            const tagClass = isAlert
              ? 'bg-rose-50 text-rose-700'
              : isEvent
              ? 'bg-amber-50 text-amber-700'
              : 'bg-sky-50 text-sky-700';

            return {
              id: n.id,
              tag: n.category ? n.category.charAt(0).toUpperCase() + n.category.slice(1) : 'Community',
              tagClass,
              date: n.created_at
                ? new Date(n.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                : 'Recent',
              title: n.title || n.content || 'Local municipal update',
              location: n.area || 'Betul, M.P.',
              likes: n.likes_count || 12 + index * 5,
              comments: n.comments_count || 3,
              verified: true,
              image: n.photo_url || FALLBACK_NEWS[index % FALLBACK_NEWS.length].image,
            };
          });
          setNewsList(mapped);
        }
      } catch {
        // fallback active
      }
    };

    void fetchNews();
  }, []);

  return (
    <div id="news-section" className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-civic-600">
            {language === 'hi' ? 'बैतूल के आसपास से' : 'From Around Betul'}
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-civic-950 tracking-tight">
            {language === 'hi' ? 'स्थानीय समाचार' : 'Local News'}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => navigate('/news')}
          className="inline-flex items-center gap-1 text-xs font-bold text-civic-700 hover:text-civic-900 bg-white px-3 py-2 rounded-full border border-sand-200 shadow-2xs transition cursor-pointer"
        >
          <span>{language === 'hi' ? 'सभी देखें' : 'View all'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-3">
        {newsList.map((news) => (
          <article
            key={news.id}
            onClick={() => navigate('/news')}
            className="bg-white rounded-2xl p-3.5 border border-sand-200 shadow-card hover:border-civic-300 transition flex items-center gap-3.5 cursor-pointer"
          >
            <div className="w-20 h-20 rounded-xl overflow-hidden bg-gradient-to-br from-civic-700 to-civic-900 shrink-0">
              <img
                src={news.image}
                alt={news.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${news.tagClass}`}>
                    {news.tag}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">{news.date}</span>
                </div>
                <BadgeCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              </div>
              <h3 className="font-bold text-xs sm:text-sm text-civic-950 mt-1 line-clamp-2 leading-snug">
                {news.title}
              </h3>
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5">
                <span className="inline-flex items-center gap-1 truncate">
                  <MapPin className="w-3 h-3 text-civic-600 shrink-0" />
                  <span className="truncate">{news.location}</span>
                </span>
                <span className="inline-flex items-center gap-2 shrink-0 text-slate-400">
                  <span className="inline-flex items-center gap-0.5">
                    <Heart className="w-3 h-3" /> {news.likes}
                  </span>
                  <span className="inline-flex items-center gap-0.5">
                    <MessageCircle className="w-3 h-3" /> {news.comments}
                  </span>
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};
