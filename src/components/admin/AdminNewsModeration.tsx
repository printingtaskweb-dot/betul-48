import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { LocalNews } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  Check,
  X,
  Trash2,
  AlertCircle,
  Eye,
  MapPin,
  Clock,
  Phone,
  RefreshCw,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock3,
} from 'lucide-react';

type FilterTab = 'pending' | 'approved' | 'rejected' | 'all';

export const AdminNewsModeration: React.FC = () => {
  const { user, profile, isAdmin } = useAuth();

  // Super Admin can approve; Municipal Head can view but CANNOT approve live website news
  const isSuperAdmin = Boolean(
    isAdmin ||
    profile?.is_admin === true ||
    profile?.role === 'admin' ||
    (user?.email && user.email.toLowerCase() === 'ouikey41@gmail.com') ||
    sessionStorage.getItem('imc_admin') === '1'
  );
  const isMunicipalHead = Boolean(
    profile?.role === 'municipal_administrator' ||
    profile?.role === 'deputy_commissioner' ||
    profile?.authority_role === 'municipal_commissioner' ||
    profile?.authority_role === 'deputy_commissioner'
  );
  const canApproveNews = isSuperAdmin && !isMunicipalHead;

  const [posts, setPosts] = useState<LocalNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [rejectionModalPostId, setRejectionModalPostId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch all posts for admin review
  const fetchAllPosts = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase
        .from('local_news')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Error fetching all news posts:', error.message);
        if (error.message.includes('relation "public.local_news" does not exist')) {
          setErrorMsg('Table "local_news" does not exist yet. Please run the SQL script in Supabase SQL Editor.');
        } else {
          setErrorMsg(error.message);
        }
        setPosts([]);
      } else {
        setPosts(data || []);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to fetch local news');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllPosts();
  }, []);

  const handleApprove = async (postId: string) => {
    setActionLoading(postId);
    try {
      const { error } = await supabase
        .from('local_news')
        .update({
          status: 'approved',
          approved_by: user?.id || null,
          approved_at: new Date().toISOString(),
          rejection_reason: null,
        })
        .eq('id', postId);

      if (error) throw error;

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, status: 'approved', approved_at: new Date().toISOString(), rejection_reason: null }
            : p
        )
      );
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectionModalPostId) return;
    const postId = rejectionModalPostId;
    setActionLoading(postId);

    try {
      const { error } = await supabase
        .from('local_news')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason.trim() || 'Did not meet civic community guidelines.',
        })
        .eq('id', postId);

      if (error) throw error;

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                status: 'rejected',
                rejection_reason: rejectionReason.trim() || 'Did not meet civic community guidelines.',
              }
            : p
        )
      );

      setRejectionModalPostId(null);
      setRejectionReason('');
    } catch (err: any) {
      alert(`Rejection error: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this news/thought?')) {
      return;
    }

    setActionLoading(postId);
    try {
      const { error } = await supabase.from('local_news').delete().eq('id', postId);
      if (error) throw error;

      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Counts
  const pendingCount = posts.filter((p) => p.status === 'pending').length;
  const approvedCount = posts.filter((p) => p.status === 'approved').length;
  const rejectedCount = posts.filter((p) => p.status === 'rejected').length;

  // Filter & Search
  const filteredPosts = posts.filter((post) => {
    const matchesTab = activeTab === 'all' || post.status === activeTab;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      post.author_name.toLowerCase().includes(q) ||
      post.area.toLowerCase().includes(q) ||
      post.content.toLowerCase().includes(q) ||
      (post.title && post.title.toLowerCase().includes(q));
    return matchesTab && matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ── Top Bar with Counts & Refresh ── */}
      <div
        style={{
          background: 'var(--theme-component, #d9d9d9)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 20px',
          border: '1.5px solid var(--theme-component-border, #bfbfbf)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 14,
        }}
      >
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: '1.25rem', fontWeight: 800, color: 'var(--gray-900)' }}>
            Nearby News & Community Thoughts Moderation
          </h2>
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--gray-600)' }}>
            Review citizen updates before they appear publicly. Only approved posts go live.
          </p>
        </div>

        <button
          onClick={() => fetchAllPosts()}
          style={{
            background: 'var(--theme-bg, #F6F1F1)',
            border: '1.5px solid var(--theme-component-border, #bfbfbf)',
            borderRadius: 'var(--radius-md)',
            padding: '8px 14px',
            color: 'var(--gray-800)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: '0.82rem',
            fontWeight: 700,
          }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh Submissions
        </button>
      </div>

      {errorMsg && (
        <div
          style={{
            background: '#F6F1F1',
            border: '1.5px solid #146C94',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            color: '#146C94',
            fontSize: '0.86rem',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ── Tabs & Search Bar ── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
          <button
            onClick={() => setActiveTab('pending')}
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1.5px solid',
              borderColor: activeTab === 'pending' ? 'var(--status-pending)' : 'var(--theme-component-border, #bfbfbf)',
              background: activeTab === 'pending' ? 'var(--status-pending)' : 'var(--theme-component, #d9d9d9)',
              color: activeTab === 'pending' ? '#fff' : 'var(--gray-800)',
              fontWeight: 800,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Clock3 size={15} />
            <span>Pending Review</span>
            <span
              style={{
                background: activeTab === 'pending' ? '#fff' : 'var(--status-pending)',
                color: activeTab === 'pending' ? 'var(--status-pending)' : '#fff',
                borderRadius: 'var(--radius-full)',
                padding: '1px 7px',
                fontSize: '0.72rem',
                fontWeight: 900,
              }}
            >
              {pendingCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('approved')}
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1.5px solid',
              borderColor: activeTab === 'approved' ? 'var(--theme-primary, #146C94)' : 'var(--theme-component-border, #bfbfbf)',
              background: activeTab === 'approved' ? 'var(--theme-primary, #146C94)' : 'var(--theme-component, #d9d9d9)',
              color: activeTab === 'approved' ? '#fff' : 'var(--gray-800)',
              fontWeight: 800,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <CheckCircle size={15} />
            <span>Approved (Live)</span>
            <span
              style={{
                background: activeTab === 'approved' ? '#fff' : 'rgba(0,0,0,0.15)',
                color: activeTab === 'approved' ? 'var(--theme-primary, #146C94)' : 'var(--gray-800)',
                borderRadius: 'var(--radius-full)',
                padding: '1px 7px',
                fontSize: '0.72rem',
                fontWeight: 900,
              }}
            >
              {approvedCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('rejected')}
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1.5px solid',
              borderColor: activeTab === 'rejected' ? 'var(--theme-primary, #146C94)' : 'var(--theme-component-border, #bfbfbf)',
              background: activeTab === 'rejected' ? 'var(--theme-primary, #146C94)' : 'var(--theme-component, #d9d9d9)',
              color: activeTab === 'rejected' ? '#fff' : 'var(--gray-800)',
              fontWeight: 800,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <XCircle size={15} />
            <span>Rejected</span>
            <span
              style={{
                background: activeTab === 'rejected' ? '#fff' : 'rgba(0,0,0,0.15)',
                color: activeTab === 'rejected' ? 'var(--theme-primary, #146C94)' : 'var(--gray-800)',
                borderRadius: 'var(--radius-full)',
                padding: '1px 7px',
                fontSize: '0.72rem',
                fontWeight: 900,
              }}
            >
              {rejectedCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1.5px solid',
              borderColor: activeTab === 'all' ? 'var(--theme-primary, #146C94)' : 'var(--theme-component-border, #bfbfbf)',
              background: activeTab === 'all' ? 'var(--theme-primary, #146C94)' : 'var(--theme-component, #d9d9d9)',
              color: activeTab === 'all' ? '#fff' : 'var(--gray-800)',
              fontWeight: 800,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Filter size={15} />
            <span>All ({posts.length})</span>
          </button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', minWidth: 260 }}>
          <Search
            size={16}
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-500)' }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search author, area, thought..."
            style={{
              width: '100%',
              padding: '8px 12px 8px 34px',
              borderRadius: 'var(--radius-md)',
              border: '1.5px solid var(--theme-component-border, #bfbfbf)',
              background: 'var(--theme-bg, #F6F1F1)',
              fontSize: '0.84rem',
              color: 'var(--gray-900)',
            }}
          />
        </div>
      </div>

      {/* ── Submissions Table / Cards ── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="shimmer"
              style={{ height: 100, borderRadius: 'var(--radius-md)', background: 'var(--theme-component, #d9d9d9)' }}
            />
          ))}
        </div>
      ) : filteredPosts.length === 0 ? (
        <div
          style={{
            background: 'var(--theme-component, #d9d9d9)',
            borderRadius: 'var(--radius-lg)',
            padding: '40px 20px',
            textAlign: 'center',
            border: '1.5px dashed var(--theme-component-border, #bfbfbf)',
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: 8 }}></div>
          <h4 style={{ margin: '0 0 4px', fontWeight: 800, color: 'var(--gray-900)' }}>
            No submissions in this view
          </h4>
          <p style={{ margin: 0, color: 'var(--gray-600)', fontSize: '0.84rem' }}>
            {activeTab === 'pending'
              ? 'Great! All pending community thoughts and news have been reviewed.'
              : 'No items match your active filters or search criteria.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredPosts.map((post) => {
            const isPending = post.status === 'pending';
            const isApproved = post.status === 'approved';
            const isRejected = post.status === 'rejected';

            return (
              <div
                key={post.id}
                style={{
                  background: 'var(--theme-component, #d9d9d9)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                  padding: '16px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                {/* Header row: Status, Locality, Category, Time */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {/* Status Pill */}
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '3px 10px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.74rem',
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        background: isPending
                          ? 'var(--status-pending-bg)'
                          : isApproved
                          ? 'var(--theme-primary, #146C94)'
                          : 'rgba(0,0,0,0.1)',
                        color: isPending
                          ? 'var(--status-pending)'
                          : isApproved
                          ? '#fff'
                          : 'var(--gray-700)',
                        border: isPending ? '1px solid var(--status-pending)' : 'none',
                      }}
                    >
                      {isPending && <Clock3 size={12} />}
                      {isApproved && <CheckCircle size={12} />}
                      {isRejected && <XCircle size={12} />}
                      {post.status.toUpperCase()}
                    </span>

                    {/* Area Badge */}
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '3px 10px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        background: 'var(--theme-bg, #F6F1F1)',
                        border: '1px solid var(--theme-component-border, #bfbfbf)',
                        color: 'var(--theme-primary, #146C94)',
                      }}
                    >
                      <MapPin size={12} />
                      {post.area}
                    </span>

                    {/* Category */}
                    <span
                      style={{
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        color: 'var(--gray-700)',
                        background: 'rgba(255,255,255,0.4)',
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-sm)',
                        textTransform: 'capitalize',
                      }}
                    >
                      Category: {post.category}
                    </span>
                  </div>

                  {/* Submission Timestamp */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.76rem', color: 'var(--gray-600)' }}>
                    <Clock size={12} />
                    <span>Submitted: {new Date(post.created_at).toLocaleString()}</span>
                  </div>
                </div>

                {/* Body Row: Author, Content, Photo */}
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  {/* Photo thumbnail if present */}
                  {post.photo_url && (
                    <div
                      onClick={() => setPreviewPhoto(post.photo_url || null)}
                      style={{
                        width: 100,
                        height: 90,
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        flexShrink: 0,
                        border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                        position: 'relative',
                      }}
                      title="Click to zoom image"
                    >
                      <img
                        src={post.photo_url}
                        alt="Submitted local photo"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'rgba(0,0,0,0.25)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                        }}
                      >
                        <Eye size={16} />
                      </div>
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 260 }}>
                    {/* Author line */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                      <span style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--gray-900)' }}>
                        Citizen: {post.author_name}
                      </span>
                      {post.author_phone && (
                        <a
                          href={`tel:${post.author_phone}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: '0.78rem',
                            color: 'var(--theme-primary, #146C94)',
                            textDecoration: 'none',
                            fontWeight: 700,
                          }}
                        >
                          <Phone size={12} />
                          {post.author_phone}
                        </a>
                      )}
                    </div>

                    {/* Headline */}
                    {post.title && (
                      <h4 style={{ margin: '0 0 4px', fontSize: '0.96rem', fontWeight: 800, color: 'var(--gray-900)' }}>
                        {post.title}
                      </h4>
                    )}

                    {/* Message content */}
                    <p
                      style={{
                        margin: 0,
                        fontSize: '0.86rem',
                        color: 'var(--gray-800)',
                        lineHeight: 1.5,
                        whiteSpace: 'pre-line',
                      }}
                    >
                      {post.content}
                    </p>

                    {/* Rejection note if present */}
                    {post.rejection_reason && (
                      <div
                        style={{
                          marginTop: 6,
                          fontSize: '0.76rem',
                          color: '#8b0000',
                          fontWeight: 700,
                        }}
                      >
                        Rejection reason: {post.rejection_reason}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: 10,
                    paddingTop: 8,
                    borderTop: '1px solid var(--theme-component-border, #bfbfbf)',
                  }}
                >
                  {/* Approve / Reject Actions: Only Platform Admin can approve live news */}
                  {canApproveNews ? (
                    <>
                      {!isApproved && (
                        <button
                          onClick={() => handleApprove(post.id)}
                          disabled={actionLoading === post.id}
                          style={{
                            background: 'var(--primary-gradient, linear-gradient(135deg, #146C94, #0E526F))',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
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
                          <Check size={14} />
                          {isPending ? 'Approve & Publish Live' : 'Re-Approve'}
                        </button>
                      )}

                      {!isRejected && (
                        <button
                          onClick={() => {
                            setRejectionModalPostId(post.id);
                            setRejectionReason('');
                          }}
                          disabled={actionLoading === post.id}
                          style={{
                            background: 'transparent',
                            color: 'var(--gray-800)',
                            border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '6px 14px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <X size={14} />
                          {isApproved ? 'Revoke / Reject' : 'Reject'}
                        </button>
                      )}
                    </>
                  ) : (
                    <div
                      style={{
                        fontSize: '0.76rem',
                        color: 'var(--theme-primary, #146C94)',
                        fontWeight: 800,
                        background: 'var(--theme-bg, #F6F1F1)',
                        border: '1px solid var(--theme-component-border, #bfbfbf)',
                        padding: '6px 12px',
                        borderRadius: 6,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <span></span>
                      <span>View Only: Municipal Head can monitor news, but approval is reserved for Platform Admin</span>
                    </div>
                  )}

                  {/* Delete Button */}
                  <button
                    onClick={() => handleDelete(post.id)}
                    disabled={actionLoading === post.id}
                    style={{
                      background: 'transparent',
                      color: 'var(--gray-600)',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      padding: '6px 10px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                    title="Permanently Delete"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Photo Preview Lightbox ── */}
      {previewPhoto && (
        <div
          onClick={() => setPreviewPhoto(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1100,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <img
              src={previewPhoto}
              alt="Enlarged community photo"
              style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: 8, display: 'block' }}
            />
            <button
              onClick={() => setPreviewPhoto(null)}
              style={{
                position: 'absolute',
                top: -36,
                right: 0,
                background: 'transparent',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              <X size={24} />
            </button>
          </div>
        </div>
      )}

      {/* ── Rejection Reason Modal ── */}
      {rejectionModalPostId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1100,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              background: 'var(--theme-component, #d9d9d9)',
              borderRadius: 'var(--radius-lg)',
              border: '2px solid var(--theme-component-border, #bfbfbf)',
              width: '100%',
              maxWidth: 440,
              padding: 20,
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 800, color: 'var(--gray-900)' }}>
              Reject Post
            </h3>
            <p style={{ margin: '0 0 14px', fontSize: '0.82rem', color: 'var(--gray-600)' }}>
              Specify the reason for rejecting this post (e.g. inappropriate content, fake news, or commercial ad).
            </p>

            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Unverified claim or promotional advertisement"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                background: 'var(--theme-bg, #F6F1F1)',
                fontSize: '0.85rem',
                color: 'var(--gray-900)',
                marginBottom: 16,
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setRejectionModalPostId(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1.5px solid var(--theme-component-border, #bfbfbf)',
                  background: 'transparent',
                  color: 'var(--gray-800)',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                style={{
                  padding: '8px 18px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: 'var(--primary-gradient)',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminNewsModeration;
