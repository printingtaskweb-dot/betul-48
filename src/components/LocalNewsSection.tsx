import React, { useEffect, useState } from 'react';
import { MapPin, Newspaper, Radio, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { LocalNews, LocalNewsCategory } from '../lib/supabase';

const CATEGORY_LABELS: Record<LocalNewsCategory, { en: string; hi: string }> = {
  news: { en: 'News', hi: 'समाचार' },
  alert: { en: 'Alert', hi: 'सूचना' },
  event: { en: 'Event', hi: 'कार्यक्रम' },
  thought: { en: 'Community', hi: 'समुदाय' },
  general: { en: 'Update', hi: 'अपडेट' },
};

export const LocalNewsSection: React.FC = () => {
  const { language } = useAuth();
  const [posts, setPosts] = useState<LocalNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    const loadPosts = async () => {
      try {
        const { data, error } = await supabase
          .from('local_news')
          .select('*')
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(3);

        if (!isCurrent) return;
        if (error) {
          console.error('Could not load local news:', error.message);
          setHasError(true);
        } else {
          setPosts(data || []);
        }
      } catch (error) {
        console.error('Could not load local news:', error);
        if (isCurrent) setHasError(true);
      } finally {
        if (isCurrent) setLoading(false);
      }
    };

    void loadPosts();
    return () => {
      isCurrent = false;
    };
  }, []);

  const openNews = () => window.dispatchEvent(new Event('open-local-news'));
  const formatDate = (date: string) => {
    const timestamp = Date.parse(date);
    return new Intl.DateTimeFormat(language === 'hi' ? 'hi-IN' : 'en-IN', {
      day: 'numeric',
      month: 'short',
    }).format(timestamp);
  };

  return (
    <section className="local-news-section" aria-labelledby="local-news-title">
      <div className="local-news-heading">
        <div>
          <span className="local-news-eyebrow">
            <Radio size={13} />
            {language === 'hi' ? 'बेतूल से ताज़ा' : 'From around Betul'}
          </span>
          <h2 id="local-news-title">{language === 'hi' ? 'स्थानीय समाचार' : 'Local news'}</h2>
          <p>{language === 'hi' ? 'आपके समुदाय के अपडेट' : 'Updates from your community'}</p>
        </div>
        <button type="button" className="local-news-view-all" onClick={openNews}>
          {language === 'hi' ? 'सभी अपडेट' : 'View all'}
          <span aria-hidden="true">→</span>
        </button>
      </div>

      {loading ? (
        <div className="local-news-grid" aria-label={language === 'hi' ? 'समाचार लोड हो रहे हैं' : 'Loading local news'}>
          {[0, 1, 2].map((item) => (
            <div className="local-news-skeleton shimmer" key={item} />
          ))}
        </div>
      ) : hasError ? (
        <div className="local-news-empty">
          <Newspaper size={20} />
          <p>{language === 'hi' ? 'स्थानीय अपडेट अभी लोड नहीं हो सके।' : 'Local updates are unavailable right now.'}</p>
        </div>
      ) : posts.length ? (
        <div className="local-news-grid">
          {posts.map((post) => (
            <article className="local-news-card" key={post.id}>
              {post.photo_url && (
                <img className="local-news-photo" src={post.photo_url} alt={post.title || post.content} loading="lazy" />
              )}
              <div className="local-news-card-content">
                <div className="local-news-meta">
                  <span className={`local-news-category local-news-category-${post.category}`}>
                    {CATEGORY_LABELS[post.category][language === 'hi' ? 'hi' : 'en']}
                  </span>
                  <span className="local-news-time">{formatDate(post.created_at)}</span>
                </div>
                <h3>{post.title || CATEGORY_LABELS[post.category][language === 'hi' ? 'hi' : 'en']}</h3>
                <p className="local-news-copy">{post.content}</p>
                <div className="local-news-area">
                  <MapPin size={13} />
                  <span>{post.area}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="local-news-empty">
          <Sparkles size={20} />
          <p>
            {language === 'hi'
              ? 'अभी कोई स्थानीय अपडेट नहीं है। अपना अपडेट साझा करें।'
              : 'No community updates yet. Share the first one.'}
          </p>
          <button type="button" className="local-news-empty-action" onClick={openNews}>
            {language === 'hi' ? 'अपडेट साझा करें' : 'Share an update'}
          </button>
        </div>
      )}
    </section>
  );
};
