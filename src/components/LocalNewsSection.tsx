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
  Share2,
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
  const [shareMessage, setShareMessage] = useState('');

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
        let fetchedPosts: LocalNews[] = [];
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
            fetchedPosts = fallback.data || [];
          }
        } else {
          fetchedPosts = data || [];
        }

        if (!hasError && fetchedPosts.length) {
          const { data: commentRows, error: commentsError } = await supabase
            .from('local_news_comments')
            .select('news_id')
            .in('news_id', fetchedPosts.map((post) => post.id));
          if (commentsError) {
            console.error('Could not load home news comment counts:', commentsError.message);
          } else {
            const commentCounts = (commentRows || []).reduce<Record<string, number>>((counts, row) => {
              counts[row.news_id] = (counts[row.news_id] || 0) + 1;
              return counts;
            }, {});
            fetchedPosts = fetchedPosts.map((post) => ({ ...post, comments_count: commentCounts[post.id] || 0 }));
          }
        }
        if (isCurrent) setPosts(fetchedPosts);
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

  const handleShare = async (event: React.MouseEvent, post: LocalNews) => {
    event.stopPropagation();
    const text = `${post.title ? `${post.title}: ` : ''}${post.content}`;
    const url = `${window.location.origin}/news`;

    if (navigator.share) {
      try {
        await navigator.share({ title: post.title || 'Betul News', text, url });
        return;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setShareMessage(language === 'hi' ? 'समाचार लिंक कॉपी हो गया' : 'News link copied');
      window.setTimeout(() => setShareMessage(''), 2500);
    } catch {
      setShareMessage(language === 'hi' ? 'समाचार लिंक साझा नहीं हो सका' : 'Could not share news link');
      window.setTimeout(() => setShareMessage(''), 2500);
    }
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
    <section className="local-news-section" aria-labelledby="local-news-title" style={{ maxWidth: 1080, margin: '28px auto 0', padding: '0 20px', boxSizing: 'border-box' }}>
      <style>{`
        .local-news-card {
          cursor: pointer;
          display: flex;
          flex-direction: column;
          border-radius: 14px;
          overflow: hidden;
          background: #ffffff;
          border: 1px solid rgba(20, 108, 148, 0.12);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
          height: 100%;
        }
        .local-news-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(20, 108, 148, 0.1);
          border-color: rgba(20, 108, 148, 0.3);
        }
        .local-news-card h3 {
          margin: 0 0 4px;
          font-size: 13.5px;
          line-height: 1.3;
          font-weight: 600;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        /* Highlighted photo container - compact height */
        .local-news-photo-wrapper {
          position: relative;
          width: 100%;
          height: 115px;
          overflow: hidden;
          background: linear-gradient(135deg, #e2f0f7, #d0e7f3);
          border-bottom: 1px solid rgba(20, 108, 148, 0.1);
        }
        .local-news-photo {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform 0.3s ease;
        }
        .local-news-card:hover .local-news-photo {
          transform: scale(1.03);
        }
        .local-news-photo-badge {
          position: absolute;
          bottom: 6px;
          right: 6px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: rgba(15, 23, 42, 0.75);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          color: #ffffff;
          font-size: 9.5px;
          font-weight: 600;
          padding: 2px 7px;
          border-radius: 999px;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .local-news-card-content {
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
          flex: 1;
          justify-content: space-between;
        }
        .local-news-author-row {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-bottom: 5px;
          font-size: 0.74rem;
          color: #334155;
        }
        .local-news-author-avatar {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #146C94, #19A7CE);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.65rem;
          font-weight: 700;
        }
        .local-news-follow-btn {
          margin-left: auto;
          display: inline-flex;
          align-items: center;
          gap: 3px;
          padding: 2px 7px;
          border-radius: 99px;
          font-size: 0.66rem;
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
          margin: 0 0 6px;
        }
        .local-news-copy {
          margin: 0;
          color: #334155;
          font-size: 11.5px;
          line-height: 1.35;
          word-break: break-word;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-height: 2.7em;
        }
        .local-news-read-more-btn {
          background: transparent;
          border: none;
          padding: 2px 0 0;
          color: #146C94;
          font-size: 11px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 3px;
          cursor: pointer;
          margin-top: 3px;
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
          margin-top: 6px;
          padding-top: 6px;
          border-top: 1px solid rgba(0, 0, 0, 0.05);
          font-size: 0.7rem;
          color: #64748b;
        }
        .local-news-stat-item {
          display: flex;
          align-items: center;
          gap: 3px;
        }
        @media (max-width: 767px) {
          .local-news-photo-wrapper {
            height: 90px;
          }
          .local-news-card-content {
            padding: 8px 10px;
          }
          .local-news-heading h2 {
            font-size: 18px !important;
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
            {language === 'hi' ? 'स्थानीय समाचार' : 'Local News'}
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
        <>
          {/* ── Desktop View: 3-column Grid ── */}
          <div className="local-news-grid desktop-grid">
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
                        <Camera size={11} />
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
                          <ShieldCheck size={13} color="#15803d" />
                        ) : (
                          <CheckCircle2 size={12} color="#146C94" />
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
                            size={12}
                            style={{
                              transform: isExpanded ? 'rotate(180deg)' : 'none',
                              transition: 'transform 0.2s ease',
                            }}
                          />
                        </button>
                      )}
                    </div>

                    <div className="local-news-area">
                      <MapPin size={12} />
                      <span>{post.area}</span>
                    </div>

                    {/* Engagement Stats Bar */}
                    <div className="local-news-twitter-stats">
                      <div className="local-news-stat-item" title="Replies">
                        <MessageCircle size={12} />
                        <span>{post.comments_count ?? 0}</span>
                      </div>
                      <div className="local-news-stat-item" title="Reshares">
                        <Repeat size={12} />
                        <span>{post.reshares_count || 0}</span>
                      </div>
                      <div className="local-news-stat-item" title="Likes">
                        <Heart size={12} color="#e11d48" />
                        <span>{post.likes_count || 0}</span>
                      </div>
                      <div className="local-news-stat-item" title="Views">
                        <Eye size={12} />
                        <span>{post.views_count || 0}</span>
                      </div>
                      <button
                        type="button"
                        className="local-news-stat-item"
                        title={language === 'hi' ? 'समाचार साझा करें' : 'Share news'}
                        aria-label={language === 'hi' ? 'समाचार साझा करें' : 'Share news'}
                        onClick={(event) => void handleShare(event, post)}
                        style={{ border: 0, background: 'transparent', cursor: 'pointer', font: 'inherit' }}
                      >
                        <Share2 size={12} />
                        <span>{language === 'hi' ? 'साझा करें' : 'Share'}</span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* ── Mobile View: Ultra-compact Feed Cards ── */}
          <div className="local-news-mobile-feed mobile-flex" style={{ flexDirection: 'column', gap: 7, padding: '0 14px' }}>
            {posts.map((post) => {
              const author = post.author;
              const isOfficial =
                author?.role === 'admin' ||
                author?.role === 'municipal_administrator' ||
                author?.role === 'dept_staff' ||
                author?.authority_role != null;

              return (
                <article
                  key={`mobile-${post.id}`}
                  onClick={openNews}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    borderRadius: 12,
                    background: '#ffffff',
                    border: '1px solid rgba(20, 108, 148, 0.12)',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                    cursor: 'pointer',
                  }}
                >
                  {post.photo_url ? (
                    <div style={{ width: 68, height: 68, borderRadius: 10, overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
                      <img src={post.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                    </div>
                  ) : (
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: 'linear-gradient(135deg, #e2f0f7, #d0e7f3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--burgundy)' }}>
                      <Newspaper size={18} />
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9.5 }}>
                      <span className={`local-news-category local-news-category-${post.category}`} style={{ padding: '1px 5px', fontSize: 8.5 }}>
                        {CATEGORY_LABELS[post.category][language === 'hi' ? 'hi' : 'en']}
                      </span>
                      <span style={{ color: '#64748b' }}>{formatDate(post.created_at)}</span>
                      {isOfficial && <ShieldCheck size={11} color="#15803d" style={{ marginLeft: 'auto' }} />}
                    </div>

                    <div style={{ fontSize: 11.5, fontWeight: 600, color: '#0f1f26', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {post.title || post.content}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 9.5, color: '#64748b', marginTop: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <MapPin size={9} />
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}>{post.area}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Heart size={9} color="#e11d48" /> {post.likes_count || 0}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <MessageCircle size={9} /> {post.comments_count ?? 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </>
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
      {shareMessage && <div role="status" aria-live="polite" className="local-news-share-status">{shareMessage}</div>}
    </section>
  );
};

export default LocalNewsSection;
