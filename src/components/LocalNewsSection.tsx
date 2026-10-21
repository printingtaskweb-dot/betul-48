import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Newspaper,
  Radio,
  Sparkles,
  Heart,
  MessageCircle,
  Repeat,
  Eye,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Camera,
  ChevronDown,
  UserPlus,
  UserCheck,
} from 'lucide-react';
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
  const navigate = useNavigate();
  const { language, user, profile } = useAuth();
  const [posts, setPosts] = useState<LocalNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [expandedPostIds, setExpandedPostIds] = useState<Set<string>>(new Set());

  // Stored follow helpers
  const getStoredFollowedAuthors = (): Set<string> => {
    try {
      const raw = localStorage.getItem('betul_followed_authors');
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) return new Set(arr);
      }
    } catch {}
    return new Set();
  };

  const saveStoredFollowedAuthors = (set: Set<string>) => {
    try {
      localStorage.setItem('betul_followed_authors', JSON.stringify(Array.from(set)));
    } catch {}
  };

  const [followedAuthorIds, setFollowedAuthorIds] = useState<Set<string>>(getStoredFollowedAuthors);

  const isAuthorFollowed = (
    authorId?: string | null,
    targetAuthorName?: string | null,
    followsSet: Set<string> = followedAuthorIds
  ): boolean => {
    if (authorId && followsSet.has(authorId)) return true;
    if (targetAuthorName) {
      const trimmed = targetAuthorName.trim();
      if (followsSet.has(trimmed)) return true;
      if (followsSet.has(trimmed.toLowerCase())) return true;
      if (followsSet.has(`author_${trimmed.toLowerCase()}`)) return true;
    }
    return false;
  };

  const isSelfAuthor = (
    authorId?: string | null,
    targetAuthorName?: string | null
  ): boolean => {
    if (user?.id && authorId && user.id === authorId) return true;
    if (profile?.full_name && targetAuthorName) {
      if (profile.full_name.trim().toLowerCase() === targetAuthorName.trim().toLowerCase()) return true;
    }
    return false;
  };

  // Load user follows from Supabase and merge
  useEffect(() => {
    if (!user?.id) return;
    void supabase
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', user.id)
      .then(({ data }) => {
        if (data) {
          setFollowedAuthorIds((prev) => {
            const merged = new Set(prev);
            data.forEach((f: any) => merged.add(f.following_id));
            saveStoredFollowedAuthors(merged);
            return merged;
          });
        }
      });
  }, [user?.id]);

  const handleToggleFollow = async (
    e: React.MouseEvent,
    targetAuthorId?: string | null,
    targetAuthorName?: string | null
  ) => {
    e.stopPropagation();
    const rawName = targetAuthorName?.trim() || '';
    const authorSlug = rawName ? `author_${rawName.toLowerCase()}` : '';

    if (isSelfAuthor(targetAuthorId, targetAuthorName)) return;

    const currentlyFollowing = isAuthorFollowed(targetAuthorId, targetAuthorName, followedAuthorIds);

    setFollowedAuthorIds((prev) => {
      const next = new Set(prev);
      if (currentlyFollowing) {
        if (targetAuthorId) next.delete(targetAuthorId);
        if (rawName) {
          next.delete(rawName);
          next.delete(rawName.toLowerCase());
        }
        if (authorSlug) next.delete(authorSlug);
      } else {
        if (targetAuthorId) next.add(targetAuthorId);
        if (rawName) {
          next.add(rawName);
          next.add(rawName.toLowerCase());
        }
        if (authorSlug) next.add(authorSlug);
      }
      saveStoredFollowedAuthors(next);
      return next;
    });

    const countKey = `followers_count_${targetAuthorId || authorSlug || 'anon'}`;
    const curCount = parseInt(localStorage.getItem(countKey) || '0', 10);
    localStorage.setItem(countKey, Math.max(0, curCount + (currentlyFollowing ? -1 : 1)).toString());

    if (user?.id) {
      let uuidToFollow = targetAuthorId;
      const isUuid = uuidToFollow && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuidToFollow);

      if (!isUuid && rawName) {
        try {
          const { data: matched } = await supabase
            .from('user_profiles')
            .select('id')
            .ilike('full_name', rawName)
            .limit(1)
            .maybeSingle();
          if (matched?.id) {
            uuidToFollow = matched.id;
          }
        } catch {}
      }

      const validUuid = uuidToFollow && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuidToFollow);
      if (validUuid && uuidToFollow !== user.id) {
        try {
          if (currentlyFollowing) {
            await supabase.from('user_follows').delete().eq('follower_id', user.id).eq('following_id', uuidToFollow);
          } else {
            await supabase.from('user_follows').insert({ follower_id: user.id, following_id: uuidToFollow });
          }
        } catch {
          // safe fallback
        }
      }
    }
  };

  useEffect(() => {
    let isCurrent = true;

    const loadPosts = async () => {
      try {
        const { data, error } = await supabase
          .from('local_news')
          .select(`
            *,
            author:user_profiles (
              id,
              full_name,
              ward_number,
              role,
              authority_role
            )
          `)
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(3);

        if (!isCurrent) return;
        if (error) {
          // Fallback without join in case FK is still syncing
          const fallback = await supabase
            .from('local_news')
            .select('*')
            .eq('status', 'approved')
            .order('created_at', { ascending: false })
            .limit(3);

          if (fallback.error) {
            console.error('Could not load local news:', fallback.error.message);
            setHasError(true);
          } else {
            setPosts(fallback.data || []);
          }
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

  // Record views for posts shown to this visitor
  useEffect(() => {
    if (!posts.length) return;
    posts.forEach((post) => {
      const sessionKey = `viewed_thought_${post.id}`;
      if (!sessionStorage.getItem(sessionKey)) {
        sessionStorage.setItem(sessionKey, '1');
        void supabase.rpc('increment_local_news_view', { target_news_id: post.id });
      }
    });
  }, [posts]);

  const openNews = () => {
    navigate('/news');
  };

  const formatDate = (date: string) => {
    const timestamp = Date.parse(date);
    return new Intl.DateTimeFormat(language === 'hi' ? 'hi-IN' : 'en-IN', {
      day: 'numeric',
      month: 'short',
    }).format(timestamp);
  };

  const toggleExpandPost = (e: React.MouseEvent, postId: string) => {
    e.stopPropagation();
    setExpandedPostIds((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  };

  return (
    <section className="local-news-section" aria-labelledby="local-news-title">
      <style>{`
        .local-news-card {
          cursor: pointer;
          display: flex;
          flex-direction: column;
          border-radius: 18px;
          overflow: hidden;
          background: #ffffff;
          border: 1px solid rgba(20, 108, 148, 0.14);
          box-shadow: 0 4px 18px rgba(0, 0, 0, 0.04);
          transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
        }
        .local-news-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 28px rgba(20, 108, 148, 0.12);
          border-color: rgba(20, 108, 148, 0.35);
        }
        /* Highlighted photo container */
        .local-news-photo-wrapper {
          position: relative;
          width: 100%;
          height: 210px;
          overflow: hidden;
          background: linear-gradient(135deg, #e2f0f7, #d0e7f3);
          border-bottom: 1.5px solid rgba(20, 108, 148, 0.12);
        }
        .local-news-photo {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .local-news-card:hover .local-news-photo {
          transform: scale(1.04);
        }
        .local-news-photo-badge {
          position: absolute;
          bottom: 10px;
          right: 10px;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: rgba(15, 23, 42, 0.78);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          color: #ffffff;
          font-size: 11px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 999px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .local-news-card-content {
          padding: 16px;
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        .local-news-author-row {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 8px;
          font-size: 0.82rem;
          color: #334155;
        }
        .local-news-author-avatar {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: linear-gradient(135deg, #146C94, #19A7CE);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.72rem;
          font-weight: 700;
        }
        .local-news-follow-btn {
          margin-left: auto;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 9px;
          border-radius: 99px;
          font-size: 0.72rem;
          font-weight: 700;
          border: 1px solid #146C94;
          background: #146C94;
          color: #ffffff;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .local-news-follow-btn:hover {
          background: #0E526F;
          border-color: #0E526F;
        }
        .local-news-follow-btn.is-following {
          background: #f1f5f9;
          border-color: #cbd5e1;
          color: #334155;
        }
        .local-news-follow-btn.is-following:hover {
          background: #fee2e2;
          border-color: #fca5a5;
          color: #dc2626;
        }
        .local-news-copy-wrap {
          margin: 0 0 10px;
        }
        .local-news-copy {
          margin: 0;
          color: #334155;
          font-size: 13.5px;
          line-height: 1.5;
          word-break: break-word;
          white-space: pre-wrap;
        }
        .local-news-read-more-btn {
          background: transparent;
          border: none;
          padding: 2px 0 0;
          color: #146C94;
          font-size: 12px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          cursor: pointer;
          margin-top: 5px;
          transition: color 0.15s;
        }
        .local-news-read-more-btn:hover {
          color: #0E526F;
          text-decoration: underline;
        }
        .local-news-twitter-stats {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid rgba(0, 0, 0, 0.06);
          font-size: 0.75rem;
          color: #64748b;
        }
        .local-news-stat-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        @media (max-width: 767px) {
          .local-news-photo-wrapper {
            height: 190px;
          }
        }
      `}</style>

      <div className="local-news-heading">
        <div>
          <span className="local-news-eyebrow">
            <Radio size={13} />
            {language === 'hi' ? 'बेतूल से ताज़ा' : 'From around Betul'}
          </span>
          <h2 id="local-news-title">
            {language === 'hi' ? 'स्थानीय समाचार व विचार' : 'Local news & thoughts'}
          </h2>
          <p>{language === 'hi' ? 'नागरिकों व नगर निगम के ताज़ा अपडेट्स' : 'Updates from your community'}</p>
        </div>
        <button type="button" className="local-news-view-all" onClick={openNews}>
          {language === 'hi' ? 'सभी अपडेट' : 'View all'}
          <ArrowRight size={14} aria-hidden="true" />
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
          {posts.map((post) => {
            const author = post.author;
            const isOfficial =
              author?.role === 'admin' ||
              author?.role === 'municipal_administrator' ||
              author?.role === 'dept_staff' ||
              author?.authority_role != null;

            const isExpanded = expandedPostIds.has(post.id);
            const isLong = post.content && post.content.length > 115;
            const displayText = !isLong || isExpanded
              ? post.content
              : `${post.content.slice(0, 115).trim()}...`;

            return (
              <article
                className="local-news-card"
                key={post.id}
                onClick={openNews}
              >
                {/* ── HIGHLIGHTED USER-UPLOADED IMAGE ── */}
                {post.photo_url && (
                  <div className="local-news-photo-wrapper">
                    <img
                      className="local-news-photo"
                      src={post.photo_url}
                      alt={post.title || post.content}
                      loading="lazy"
                    />
                    <div className="local-news-photo-badge">
                      <Camera size={12} />
                      <span>{language === 'hi' ? 'नागरिक फोटो' : 'Citizen Photo'}</span>
                    </div>
                  </div>
                )}

                <div className="local-news-card-content">
                  <div className="local-news-meta">
                    <span className={`local-news-category local-news-category-${post.category}`}>
                      {CATEGORY_LABELS[post.category][language === 'hi' ? 'hi' : 'en']}
                    </span>
                    <span className="local-news-time">{formatDate(post.created_at)}</span>
                  </div>

                  {/* Author Name, Role, & Follow Button */}
                  <div className="local-news-author-row">
                    <div className="local-news-author-avatar">
                      {post.author_name ? post.author_name[0].toUpperCase() : 'B'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontWeight: 600 }}>{post.author_name}</span>
                      {isOfficial ? (
                        <ShieldCheck size={14} color="#15803d" />
                      ) : (
                        <CheckCircle2 size={13} color="#146C94" />
                      )}
                    </div>

                    {/* Follow button right on the news card */}
                    {!isSelfAuthor(post.author_id, post.author_name) && (
                      <button
                        type="button"
                        className={`local-news-follow-btn ${isAuthorFollowed(post.author_id, post.author_name) ? 'is-following' : ''}`}
                        onClick={(e) => handleToggleFollow(e, post.author_id, post.author_name)}
                        title={isAuthorFollowed(post.author_id, post.author_name) ? 'Following' : 'Follow author'}
                      >
                        {isAuthorFollowed(post.author_id, post.author_name) ? (
                          <>
                            <UserCheck size={11} />
                            <span>{language === 'hi' ? 'फ़ॉलो' : 'Following'}</span>
                          </>
                        ) : (
                          <>
                            <UserPlus size={11} />
                            <span>{language === 'hi' ? '+ फ़ॉलो' : '+ Follow'}</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {post.title && <h3>{post.title}</h3>}

                  {/* ── TRUNCATED COPY WITH READ MORE BUTTON ── */}
                  <div className="local-news-copy-wrap">
                    <p className="local-news-copy">{displayText}</p>
                    {isLong && (
                      <button
                        type="button"
                        className="local-news-read-more-btn"
                        onClick={(e) => toggleExpandPost(e, post.id)}
                      >
                        {isExpanded
                          ? (language === 'hi' ? 'कम पढ़ें' : 'Show less')
                          : (language === 'hi' ? 'और पढ़ें' : 'Read more')}
                        <ChevronDown
                          size={13}
                          style={{
                            transform: isExpanded ? 'rotate(180deg)' : 'none',
                            transition: 'transform 0.2s ease',
                          }}
                        />
                      </button>
                    )}
                  </div>

                  <div className="local-news-area">
                    <MapPin size={13} />
                    <span>{post.area}</span>
                  </div>

                  {/* Twitter Engagement Counter Stats (Real views only) */}
                  <div className="local-news-twitter-stats">
                    <div className="local-news-stat-item" title="Replies">
                      <MessageCircle size={13} />
                      <span>{post.comments_count || 0}</span>
                    </div>
                    <div className="local-news-stat-item" title="Reshares">
                      <Repeat size={13} />
                      <span>{post.reshares_count || 0}</span>
                    </div>
                    <div className="local-news-stat-item" title="Likes">
                      <Heart size={13} color="#e11d48" />
                      <span>{post.likes_count || 0}</span>
                    </div>
                    <div className="local-news-stat-item" title="Views">
                      <Eye size={13} />
                      <span>{post.views_count || 0}</span>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
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

export default LocalNewsSection;
