import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { LocalNews, LocalNewsCategory } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useStorage } from '../hooks/useStorage';
import { isValidMobile, lettersAndSpaces, mobileDigits } from '../lib/inputValidation';
import {
  MessageSquarePlus,
  Send,
  Heart,
  MapPin,
  Clock,
  Sparkles,
  AlertTriangle,
  Newspaper,
  Calendar,
  Lightbulb,
  X,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

const CATEGORY_META: Record<LocalNewsCategory, { label: string; labelHi: string; icon: React.ReactNode }> = {
  news: { label: 'News', labelHi: 'समाचार', icon: <Newspaper size={13} /> },
  alert: { label: 'Alert', labelHi: 'सूचना', icon: <AlertTriangle size={13} /> },
  event: { label: 'Event', labelHi: 'कार्यक्रम', icon: <Calendar size={13} /> },
  thought: { label: 'Thought', labelHi: 'विचार', icon: <Lightbulb size={13} /> },
  general: { label: 'Update', labelHi: 'अपडेट', icon: <Sparkles size={13} /> },
};

const POPULAR_AREAS = [
  'All',
  'Kothi Bazar',
  'Ganj',
  'Civil Lines',
  'Sadar Bazar',
  'Badora',
  'Malviya Ward',
];

export const FloatingNewsWidget: React.FC = () => {
  const { language, profile } = useAuth();
  const { uploadPhoto, uploading } = useStorage();
  const location = useLocation();

  // Widget visibility
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

  // Data state (ONLY real approved posts, NO dummy/mock data)
  const [posts, setPosts] = useState<LocalNews[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedArea, setSelectedArea] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});

  // Submission Form State
  const [authorName, setAuthorName] = useState(profile?.full_name || '');
  const [authorPhone, setAuthorPhone] = useState(profile?.phone || '');
  const [area, setArea] = useState('');
  const [category, setCategory] = useState<LocalNewsCategory>('thought');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync profile details
  useEffect(() => {
    if (profile?.full_name && !authorName) setAuthorName(profile.full_name);
    if (profile?.phone && !authorPhone) setAuthorPhone(profile.phone);
  }, [profile]);

  // Fetch approved posts only
  const fetchApprovedPosts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('local_news')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(40);

      if (error) {
        console.warn('Could not fetch approved news:', error.message);
        setPosts([]);
      } else {
        setPosts(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch count on mount and fetch posts when drawer opens
  useEffect(() => {
    fetchApprovedPosts();
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchApprovedPosts();
    }
  }, [isOpen]);

  // Hide floating icon on admin pages to keep admin workspace clean
  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  const handleLike = async (postId: string) => {
    if (likedPosts[postId]) return;

    setLikedPosts((prev) => ({ ...prev, [postId]: true }));
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, likes_count: (p.likes_count || 0) + 1 } : p))
    );

    try {
      const { error: rpcError } = await supabase.rpc('increment_local_news_likes', { news_id: postId });
      if (rpcError) {
        const cur = posts.find((p) => p.id === postId);
        if (cur) {
          await supabase
            .from('local_news')
            .update({ likes_count: (cur.likes_count || 0) + 1 })
            .eq('id', postId);
        }
      }
    } catch (err) {
      console.warn(err);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !area.trim() || !content.trim()) {
      setErrorMsg('Please fill in your Name, Area, and Thought/News.');
      return;
    }
    if (!isValidMobile(authorPhone)) {
      setErrorMsg('Enter a valid 10-digit mobile number.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      let uploadedUrl: string | null = null;
      if (photoFile) {
        uploadedUrl = await uploadPhoto(photoFile);
      }

      // Strictly submitted as pending for admin verification!
      const { error } = await supabase.from('local_news').insert({
        author_name: lettersAndSpaces(authorName).trim(),
        author_phone: mobileDigits(authorPhone) || null,
        area: area.trim(),
        category,
        title: title.trim() || null,
        content: content.trim(),
        photo_url: uploadedUrl,
        status: 'pending',
      });

      if (error) throw error;

      setSubmittedSuccess(true);
      setTitle('');
      setContent('');
      setPhotoFile(null);
      setPhotoPreview(null);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter posts
  const filteredPosts = posts.filter((post) => {
    const matchesArea =
      selectedArea === 'All' || post.area.toLowerCase().includes(selectedArea.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory;
    return matchesArea && matchesCategory;
  });

  const timeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffSec < 60) return language === 'hi' ? 'अभी' : 'just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ${language === 'hi' ? 'पहले' : 'ago'}`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ${language === 'hi' ? 'पहले' : 'ago'}`;
    return `${Math.floor(diffSec / 86400)}d ${language === 'hi' ? 'पहले' : 'ago'}`;
  };

  return (
    <>
      {/* ── FLOATING NEWS BUTTON ── */}
      <button
        onClick={() => setIsOpen(true)}
        className="floating-news-btn"
        aria-label="Open Local Area News & Thoughts"
        style={{
          position: 'fixed',
          zIndex: 990,
          background: 'var(--primary-gradient, linear-gradient(135deg, #660033 0%, #800040 100%))',
          color: '#fff',
          border: '2px solid rgba(255,244,231,0.3)',
          borderRadius: 999,
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(102,0,51,0.38), 0 2px 6px rgba(0,0,0,0.15)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        }}
      >
        <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>📢</span>
        <span className="floating-news-label" style={{ fontWeight: 800, fontSize: '0.85rem', letterSpacing: '-0.01em' }}>
          {language === 'hi' ? 'स्थानीय विचार' : 'Local News'}
        </span>
        {posts.length > 0 && (
          <span
            style={{
              background: '#fff4e7',
              color: '#660033',
              borderRadius: 999,
              padding: '1px 7px',
              fontSize: '0.72rem',
              fontWeight: 900,
            }}
          >
            {posts.length}
          </span>
        )}
      </button>

      {/* ── NEWS & THOUGHTS DRAWER / MODAL ── */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1050,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <div
            className="floating-news-drawer"
            style={{
              background: 'var(--theme-component, #d9d9d9)',
              width: '100%',
              maxWidth: 480,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              borderLeft: '2px solid var(--theme-component-border, #bfbfbf)',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            {/* Drawer Header */}
            <div
              style={{
                background: 'var(--header-gradient, linear-gradient(135deg, #4d0026 0%, #660033 50%, #800040 100%))',
                padding: '16px 20px',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '1.4rem' }}>📢</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
                    {language === 'hi' ? 'आस-पास के समाचार और विचार' : 'Nearby News & Thoughts'}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(255,255,255,0.8)' }}>
                    {language === 'hi' ? 'वार्ड व स्थानीय अपडेट (प्रशासक द्वारा स्वीकृत)' : 'Moderated Betul community thoughts'}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={() => fetchApprovedPosts()}
                  title="Refresh"
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    color: '#fff',
                    padding: 6,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  title="Close"
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    color: '#fff',
                    padding: 6,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Action Bar: "Share Thought" Button */}
            <div
              style={{
                padding: '12px 16px',
                background: 'var(--theme-bg, #fff4e7)',
                borderBottom: '1px solid var(--theme-component-border, #bfbfbf)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--gray-700)', fontWeight: 600 }}>
                <ShieldCheck size={16} color="var(--theme-primary, #660033)" />
                <span>{language === 'hi' ? 'केवल स्वीकृत पोस्ट लाइव दिखती हैं' : 'Only approved posts are shown'}</span>
              </div>

              <button
                onClick={() => {
                  setSubmittedSuccess(false);
                  setErrorMsg(null);
                  setIsSubmitModalOpen(true);
                }}
                style={{
                  background: 'var(--primary-gradient)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-full)',
                  padding: '7px 14px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <MessageSquarePlus size={14} />
                {language === 'hi' ? 'विचार साझा करें' : 'Share Thought'}
              </button>
            </div>

            {/* Filters: Category & Area */}
            <div
              style={{
                padding: '10px 16px',
                background: 'var(--theme-component, #d9d9d9)',
                borderBottom: '1px solid var(--theme-component-border, #bfbfbf)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                flexShrink: 0,
              }}
            >
              {/* Category Pills */}
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
                <button
                  onClick={() => setSelectedCategory('all')}
                  style={{
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-full)',
                    border: '1px solid',
                    borderColor: selectedCategory === 'all' ? 'var(--theme-primary, #660033)' : 'var(--theme-component-border, #bfbfbf)',
                    background: selectedCategory === 'all' ? 'var(--theme-primary, #660033)' : 'var(--theme-bg, #fff4e7)',
                    color: selectedCategory === 'all' ? '#fff' : 'var(--gray-800)',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {language === 'hi' ? 'सभी' : 'All'}
                </button>
                {(Object.keys(CATEGORY_META) as LocalNewsCategory[]).map((cat) => {
                  const meta = CATEGORY_META[cat];
                  const isSel = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '3px 10px',
                        borderRadius: 'var(--radius-full)',
                        border: '1px solid',
                        borderColor: isSel ? 'var(--theme-primary, #660033)' : 'var(--theme-component-border, #bfbfbf)',
                        background: isSel ? 'var(--theme-primary, #660033)' : 'var(--theme-bg, #fff4e7)',
                        color: isSel ? '#fff' : 'var(--gray-800)',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {meta.icon}
                      {language === 'hi' ? meta.labelHi : meta.label}
                    </button>
                  );
                })}
              </div>

              {/* Area Quick Pills */}
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
                {POPULAR_AREAS.map((a) => {
                  const isSel = selectedArea === a;
                  return (
                    <button
                      key={a}
                      onClick={() => setSelectedArea(a)}
                      style={{
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        border: '1px solid',
                        borderColor: isSel ? 'var(--theme-primary, #660033)' : 'var(--theme-component-border, #bfbfbf)',
                        background: isSel ? 'var(--theme-primary, #660033)' : 'transparent',
                        color: isSel ? '#fff' : 'var(--gray-700)',
                        fontSize: '0.72rem',
                        fontWeight: isSel ? 800 : 600,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {a}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Posts Feed Area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {loading ? (
                [1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="shimmer"
                    style={{ height: 110, borderRadius: 'var(--radius-md)', background: 'var(--theme-component, #d9d9d9)' }}
                  />
                ))
              ) : filteredPosts.length === 0 ? (
                /* Empty state with zero dummy data */
                <div
                  style={{
                    background: 'var(--theme-bg, #fff4e7)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '32px 16px',
                    textAlign: 'center',
                    border: '1.5px dashed var(--theme-component-border, #bfbfbf)',
                    margin: 'auto 0',
                  }}
                >
                  <div style={{ fontSize: '2.4rem', marginBottom: 8 }}>✍️</div>
                  <h4 style={{ margin: '0 0 6px', fontWeight: 800, color: 'var(--gray-900)', fontSize: '1rem' }}>
                    {language === 'hi' ? 'अभी कोई विचार या समाचार नहीं है' : 'No Local News or Thoughts Yet'}
                  </h4>
                  <p style={{ margin: '0 0 16px', color: 'var(--gray-600)', fontSize: '0.82rem', lineHeight: 1.5 }}>
                    {language === 'hi'
                      ? 'अपने क्षेत्र का पहला विचार या स्थानीय सूचना साझा करें! व्यवस्थापक अनुमोदन के बाद यह यहाँ प्रकाशित होगा।'
                      : 'Be the first to share a positive thought, civic update, or local news from your area!'}
                  </p>
                  <button
                    onClick={() => {
                      setSubmittedSuccess(false);
                      setErrorMsg(null);
                      setIsSubmitModalOpen(true);
                    }}
                    style={{
                      background: 'var(--primary-gradient)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 'var(--radius-full)',
                      padding: '8px 18px',
                      fontWeight: 800,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <MessageSquarePlus size={14} />
                    {language === 'hi' ? 'पहला विचार पोस्ट करें' : 'Post First Thought'}
                  </button>
                </div>
              ) : (
                filteredPosts.map((post) => {
                  const meta = CATEGORY_META[post.category] || CATEGORY_META.general;
                  const isLiked = likedPosts[post.id];

                  return (
                    <article
                      key={post.id}
                      style={{
                        background: 'var(--theme-bg, #fff4e7)',
                        borderRadius: 'var(--radius-md)',
                        border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                        padding: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                        boxShadow: 'var(--shadow-sm)',
                      }}
                    >
                      {/* Top Header: Area & Category */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            background: 'var(--theme-component, #d9d9d9)',
                            border: '1px solid var(--theme-component-border, #bfbfbf)',
                            color: 'var(--theme-primary, #660033)',
                            borderRadius: 'var(--radius-full)',
                            padding: '2px 8px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                          }}
                        >
                          <MapPin size={11} />
                          {post.area}
                        </span>

                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            background: 'rgba(102,0,51,0.08)',
                            color: 'var(--theme-primary, #660033)',
                            borderRadius: 'var(--radius-full)',
                            padding: '2px 8px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                          }}
                        >
                          {meta.icon}
                          {language === 'hi' ? meta.labelHi : meta.label}
                        </span>
                      </div>

                      {/* Title if present */}
                      {post.title && (
                        <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: 'var(--gray-900)' }}>
                          {post.title}
                        </h4>
                      )}

                      {/* Content */}
                      <p
                        style={{
                          margin: 0,
                          fontSize: '0.84rem',
                          color: 'var(--gray-800)',
                          lineHeight: 1.45,
                          whiteSpace: 'pre-line',
                        }}
                      >
                        {post.content}
                      </p>

                      {/* Attached Photo */}
                      {post.photo_url && (
                        <div
                          style={{
                            borderRadius: 'var(--radius-sm)',
                            overflow: 'hidden',
                            border: '1px solid var(--theme-component-border, #bfbfbf)',
                            maxHeight: 180,
                          }}
                        >
                          <img
                            src={post.photo_url}
                            alt="Local thought"
                            style={{ width: '100%', height: '100%', maxHeight: 180, objectFit: 'cover', display: 'block' }}
                            loading="lazy"
                          />
                        </div>
                      )}

                      {/* Bottom Info: Author & Like */}
                      <div
                        style={{
                          paddingTop: 8,
                          borderTop: '1px solid var(--theme-component-border, #bfbfbf)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '0.74rem',
                          color: 'var(--gray-600)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontWeight: 700, color: 'var(--gray-900)' }}>{post.author_name}</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <Clock size={11} />
                            {timeAgo(post.created_at)}
                          </span>
                        </div>

                        <button
                          onClick={() => handleLike(post.id)}
                          style={{
                            background: isLiked ? 'rgba(102,0,51,0.12)' : 'var(--theme-component, #d9d9d9)',
                            border: '1px solid var(--theme-component-border, #bfbfbf)',
                            borderRadius: 'var(--radius-full)',
                            padding: '3px 8px',
                            cursor: isLiked ? 'default' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            color: isLiked ? 'var(--theme-primary, #660033)' : 'var(--gray-600)',
                            fontWeight: 700,
                            fontSize: '0.74rem',
                          }}
                        >
                          <Heart
                            size={12}
                            fill={isLiked ? 'var(--theme-primary, #660033)' : 'none'}
                            color={isLiked ? 'var(--theme-primary, #660033)' : 'currentColor'}
                          />
                          <span>{post.likes_count || 0}</span>
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── SHARE THOUGHT / NEWS SUBMISSION MODAL ── */}
      {isSubmitModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1100,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) setIsSubmitModalOpen(false);
          }}
        >
          <div
            style={{
              background: 'var(--theme-component, #d9d9d9)',
              borderRadius: 'var(--radius-xl)',
              border: '2px solid var(--theme-component-border, #bfbfbf)',
              width: '100%',
              maxWidth: 500,
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                background: 'var(--header-gradient, linear-gradient(135deg, #4d0026 0%, #660033 50%, #800040 100%))',
                padding: '14px 18px',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1.2rem' }}>✍️</span>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>
                    {language === 'hi' ? 'विचार या स्थानीय समाचार लिखें' : 'Share Thought or Local News'}
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(255,255,255,0.8)' }}>
                    {language === 'hi' ? 'समीक्षा व अनुमोदन उपरांत प्रकाशित होगा' : 'Moderated before public release'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => !submitting && setIsSubmitModalOpen(false)}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  color: '#fff',
                  cursor: 'pointer',
                  padding: 5,
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form */}
            <div style={{ padding: '18px' }}>
              {submittedSuccess ? (
                <div style={{ textAlign: 'center', padding: '20px 8px' }}>
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: '50%',
                      background: 'rgba(102,0,51,0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 12px',
                      color: 'var(--theme-primary, #660033)',
                    }}
                  >
                    <CheckCircle2 size={32} />
                  </div>
                  <h4 style={{ margin: '0 0 6px', fontSize: '1.1rem', fontWeight: 800, color: 'var(--gray-900)' }}>
                    {language === 'hi' ? 'विचार सफलता से भेजा गया!' : 'Submitted for Admin Review!'}
                  </h4>
                  <p style={{ margin: '0 0 16px', color: 'var(--gray-700)', fontSize: '0.84rem', lineHeight: 1.5 }}>
                    {language === 'hi'
                      ? 'आपकी पोस्ट प्रशासनिक समीक्षा के लिए सुरक्षित जमा हो गई है। नगर निगम एडमिन द्वारा स्वीकृति मिलने पर यह सार्वजनिक रूप से दिखाई देगी।'
                      : 'Thank you! Your thought has been received and will appear on the feed once approved by the municipal admin.'}
                  </p>
                  <button
                    onClick={() => setIsSubmitModalOpen(false)}
                    style={{
                      background: 'var(--primary-gradient)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 'var(--radius-md)',
                      padding: '8px 20px',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                    }}
                  >
                    {language === 'hi' ? 'बंद करें' : 'Close'}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div
                    style={{
                      background: 'var(--theme-bg, #fff4e7)',
                      border: '1px solid var(--theme-component-border, #bfbfbf)',
                      borderRadius: 'var(--radius-md)',
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: '0.78rem',
                      color: 'var(--theme-primary, #660033)',
                      fontWeight: 600,
                    }}
                  >
                    <ShieldCheck size={18} style={{ flexShrink: 0 }} />
                    <span>
                      {language === 'hi'
                        ? '🛡️ सूचना: प्रत्येक विचार एडमिन द्वारा समीक्षा उपरांत ही लाइव प्रदर्शित होता है।'
                        : '🛡️ Notice: Submissions are held for admin verification before going live.'}
                    </span>
                  </div>

                  {errorMsg && (
                    <div
                      style={{
                        background: 'rgba(139,0,0,0.1)',
                        border: '1.5px solid #8b0000',
                        color: '#8b0000',
                        borderRadius: 'var(--radius-md)',
                        padding: '8px 12px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                      }}
                    >
                      {errorMsg}
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, marginBottom: 4, color: 'var(--gray-700)' }}>
                        {language === 'hi' ? 'नाम *' : 'Your Name *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={authorName}
                        onChange={(e) => setAuthorName(lettersAndSpaces(e.target.value))}
                        placeholder="e.g. Rahul Sharma"
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                          background: 'var(--theme-bg, #fff4e7)',
                          fontSize: '0.82rem',
                          color: 'var(--gray-900)',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, marginBottom: 4, color: 'var(--gray-700)' }}>
                        {language === 'hi' ? 'मोबाइल (वैकल्पिक)' : 'Mobile (Optional)'}
                      </label>
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        value={authorPhone}
                        onChange={(e) => setAuthorPhone(mobileDigits(e.target.value))}
                        placeholder="10-digit phone"
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                          background: 'var(--theme-bg, #fff4e7)',
                          fontSize: '0.82rem',
                          color: 'var(--gray-900)',
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, marginBottom: 4, color: 'var(--gray-700)' }}>
                      <MapPin size={12} style={{ display: 'inline', marginRight: 3 }} />
                      {language === 'hi' ? 'इलाका / वार्ड / क्षेत्र *' : 'Area / Locality / Ward *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      placeholder="e.g. Kothi Bazar, Ganj, Civil Lines..."
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                        background: 'var(--theme-bg, #fff4e7)',
                        fontSize: '0.82rem',
                        color: 'var(--gray-900)',
                      }}
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, marginBottom: 4, color: 'var(--gray-700)' }}>
                      {language === 'hi' ? 'श्रेणी' : 'Category'}
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 6 }}>
                      {(Object.keys(CATEGORY_META) as LocalNewsCategory[]).map((cat) => {
                        const meta = CATEGORY_META[cat];
                        const isSel = category === cat;
                        return (
                          <button
                            type="button"
                            key={cat}
                            onClick={() => setCategory(cat)}
                            style={{
                              padding: '6px 8px',
                              borderRadius: 'var(--radius-sm)',
                              border: '1.5px solid',
                              borderColor: isSel ? 'var(--theme-primary, #660033)' : 'var(--theme-component-border, #bfbfbf)',
                              background: isSel ? 'var(--theme-primary, #660033)' : 'var(--theme-bg, #fff4e7)',
                              color: isSel ? '#fff' : 'var(--gray-800)',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              justifyContent: 'center',
                            }}
                          >
                            {meta.icon}
                            {language === 'hi' ? meta.labelHi : meta.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Heading */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, marginBottom: 4, color: 'var(--gray-700)' }}>
                      {language === 'hi' ? 'शीर्षक (वैकल्पिक)' : 'Heading (Optional)'}
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Neighborhood cleanliness drive"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                        background: 'var(--theme-bg, #fff4e7)',
                        fontSize: '0.82rem',
                        color: 'var(--gray-900)',
                      }}
                    />
                  </div>

                  {/* Content */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, marginBottom: 4, color: 'var(--gray-700)' }}>
                      {language === 'hi' ? 'आपका विचार / विवरण *' : 'Thought or News Content *'}
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Share your thought or local happening..."
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                        background: 'var(--theme-bg, #fff4e7)',
                        fontSize: '0.82rem',
                        color: 'var(--gray-900)',
                      }}
                    />
                  </div>

                  {/* Photo */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, marginBottom: 4, color: 'var(--gray-700)' }}>
                      <ImageIcon size={12} style={{ display: 'inline', marginRight: 3 }} />
                      {language === 'hi' ? 'फोटो जोड़ें (वैकल्पिक)' : 'Photo (Optional)'}
                    </label>
                    {photoPreview ? (
                      <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', height: 120 }}>
                        <img src={photoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button
                          type="button"
                          onClick={() => {
                            setPhotoFile(null);
                            setPhotoPreview(null);
                          }}
                          style={{
                            position: 'absolute',
                            top: 6,
                            right: 6,
                            background: 'rgba(0,0,0,0.6)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '50%',
                            width: 24,
                            height: 24,
                            cursor: 'pointer',
                          }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <label
                        style={{
                          border: '1.5px dashed var(--theme-component-border, #bfbfbf)',
                          background: 'var(--theme-bg, #fff4e7)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          cursor: 'pointer',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: 'var(--theme-primary, #660033)',
                        }}
                      >
                        <Upload size={14} />
                        <span>{language === 'hi' ? 'फोटो चुनें' : 'Choose Photo'}</span>
                        <input type="file" accept="image/*" onChange={handlePhotoSelect} style={{ display: 'none' }} />
                      </label>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                    <button
                      type="button"
                      onClick={() => setIsSubmitModalOpen(false)}
                      disabled={submitting}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                        background: 'transparent',
                        color: 'var(--gray-800)',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                      }}
                    >
                      {language === 'hi' ? 'रद्द करें' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || uploading}
                      style={{
                        padding: '8px 18px',
                        borderRadius: 'var(--radius-sm)',
                        border: 'none',
                        background: 'var(--primary-gradient)',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: '0.82rem',
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <Send size={13} />
                      {submitting || uploading
                        ? (language === 'hi' ? 'भेज रहे हैं...' : 'Submitting...')
                        : (language === 'hi' ? 'समीक्षा हेतु भेजें' : 'Submit for Review')}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Responsive styles */}
      <style>{`
        .floating-news-btn {
          bottom: 24px;
          right: 20px;
        }
        @media (max-width: 768px) {
          .floating-news-btn {
            bottom: 74px; /* Sits right above mobile bottom nav */
            right: 14px;
            padding: 8px 12px;
          }
          .floating-news-drawer {
            max-width: 100% !important;
          }
        }
        .floating-news-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(102,0,51,0.45);
        }
      `}</style>
    </>
  );
};

export default FloatingNewsWidget;
