import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type {
  LocalNews,
  LocalNewsCategory,
  LocalNewsComment,
} from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useStorage } from '../hooks/useStorage';
import {
  MessageCircle,
  Repeat,
  Heart,
  Eye,
  Share2,
  MapPin,
  Sparkles,
  AlertTriangle,
  Newspaper,
  Calendar,
  Lightbulb,
  X,
  Image as ImageIcon,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  Send,
  UserPlus,
  UserCheck,
  Radio,
  Camera,
  Plus,
  PenLine,
} from 'lucide-react';

const CATEGORY_META: Record<
  LocalNewsCategory,
  { label: string; labelHi: string; icon: React.ReactNode; color: string; bg: string }
> = {
  thought: { label: 'Thought', labelHi: 'विचार', icon: <Lightbulb size={12} />, color: '#0284c7', bg: '#e0f2fe' },
  news: { label: 'News', labelHi: 'समाचार', icon: <Newspaper size={12} />, color: '#16a34a', bg: '#dcfce7' },
  alert: { label: 'Alert', labelHi: 'सूचना', icon: <AlertTriangle size={12} />, color: '#ea580c', bg: '#ffedd5' },
  event: { label: 'Event', labelHi: 'कार्यक्रम', icon: <Calendar size={12} />, color: '#9333ea', bg: '#f3e8ff' },
  general: { label: 'Update', labelHi: 'अपडेट', icon: <Sparkles size={12} />, color: '#146C94', bg: '#e2f0f7' },
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

interface UserProfileModalData {
  id?: string | null;
  name: string;
  phone?: string | null;
  ward?: string | null;
  role?: string | null;
  authority_role?: string | null;
  isOfficial?: boolean;
}

export const FloatingNewsWidget: React.FC = () => {
  const { language, profile, user } = useAuth();
  const { uploadPhoto, uploading } = useStorage();

  // Widget visibility
  const [isOpen, setIsOpen] = useState(false);

  // Feed & Tab State
  const [activeTab, setActiveTab] = useState<'for_you' | 'following' | 'alerts'>('for_you');
  const [posts, setPosts] = useState<LocalNews[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedArea, setSelectedArea] = useState('All');

  // Helpers for local follow persistence
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

  // Social interactions state
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const [resharedPostIds, setResharedPostIds] = useState<Set<string>>(new Set());
  const [followedAuthorIds, setFollowedAuthorIds] = useState<Set<string>>(getStoredFollowedAuthors);
  const [expandedCommentsPostId, setExpandedCommentsPostId] = useState<string | null>(null);
  const [postComments, setPostComments] = useState<Record<string, LocalNewsComment[]>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
  const [newCommentText, setNewCommentText] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<Record<string, boolean>>({});

  // Follow check helpers
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

  // Compose Box State
  const [content, setContent] = useState('');
  const [area, setArea] = useState(profile?.ward_number ? `Ward ${profile.ward_number}` : 'Kothi Bazar');
  const [category, setCategory] = useState<LocalNewsCategory>('thought');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState(profile?.full_name || '');
  const [isPosting, setIsPosting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // User Profile Modal (when clicking user circle just like X)
  const [viewingProfile, setViewingProfile] = useState<UserProfileModalData | null>(null);
  const [profileFollowerCount, setProfileFollowerCount] = useState<number>(0);
  const [profileViewCount, setProfileViewCount] = useState<number>(0);
  const [expandedTweetIds, setExpandedTweetIds] = useState<Set<string>>(new Set());
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  const getVisitorToken = () => {
    let token = localStorage.getItem('betul_visitor_token');
    if (!token) {
      token = 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem('betul_visitor_token', token);
    }
    return token;
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const lastScrollTopRef = useRef<number>(0);

  const handleFeedScroll = () => {
    if (!feedRef.current) return;
    const currentScrollTop = feedRef.current.scrollTop;
    if (currentScrollTop > lastScrollTopRef.current && currentScrollTop > 40) {
      // User is scrolling down reading thoughts -> auto-hide composer if empty
      if (isComposeOpen && !content.trim()) {
        setIsComposeOpen(false);
      }
    }
    lastScrollTopRef.current = currentScrollTop;
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const openDrawer = () => {
    setIsOpen(true);
    window.dispatchEvent(new Event('open-local-news'));
  };

  const closeDrawer = () => {
    setIsOpen(false);
    setViewingProfile(null);
    window.dispatchEvent(new Event('close-local-news'));
  };

  const location = useLocation();

  // Automatically close thought drawer and profile modal on navigation to any other page/tab
  useEffect(() => {
    setIsOpen(false);
    setViewingProfile(null);
  }, [location.pathname, location.search, location.key]);

  // Listen for global open/close events & auto-open on /news
  useEffect(() => {
    if (window.location.pathname === '/news') {
      setIsOpen(true);
    }
    const handleOpen = () => setIsOpen(true);
    const handleClose = () => {
      setIsOpen(false);
      setViewingProfile(null);
    };
    window.addEventListener('open-local-news', handleOpen);
    window.addEventListener('close-local-news', handleClose);
    window.addEventListener('popstate', handleClose);
    return () => {
      window.removeEventListener('open-local-news', handleOpen);
      window.removeEventListener('close-local-news', handleClose);
      window.removeEventListener('popstate', handleClose);
    };
  }, []);

  // Fetch user interactions (likes, reshares, follows)
  const loadUserInteractions = useCallback(async (currentUserId: string) => {
    try {
      const [likesRes, resharesRes, followsRes] = await Promise.all([
        supabase.from('local_news_likes').select('news_id').eq('user_id', currentUserId),
        supabase.from('local_news_reshares').select('news_id').eq('user_id', currentUserId),
        supabase.from('user_follows').select('following_id').eq('follower_id', currentUserId),
      ]);

      if (likesRes.data) setLikedPostIds(new Set(likesRes.data.map((l: any) => l.news_id)));
      if (resharesRes.data) setResharedPostIds(new Set(resharesRes.data.map((r: any) => r.news_id)));
      if (followsRes.data) {
        setFollowedAuthorIds((prev) => {
          const merged = new Set(prev);
          followsRes.data.forEach((f: any) => merged.add(f.following_id));
          saveStoredFollowedAuthors(merged);
          return merged;
        });
      }
    } catch {
      // safe fallback
    }
  }, []);

  // Fetch approved posts
  const fetchApprovedPosts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('local_news')
        .select(`
          *,
          author:user_profiles (
            id,
            full_name,
            phone,
            ward_number,
            role,
            authority_role
          )
        `)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(50);

      let fetched: LocalNews[] = [];
      if (error) {
        // Fallback without join if column/table is still syncing
        const fallback = await supabase
          .from('local_news')
          .select('*')
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(50);

        fetched = fallback.data || [];
      } else {
        fetched = data || [];
      }

      setPosts(fetched);

      // Record views for thoughts seen by this visitor
      fetched.forEach((p: LocalNews) => {
        const sessionKey = `viewed_thought_${p.id}`;
        if (!sessionStorage.getItem(sessionKey)) {
          sessionStorage.setItem(sessionKey, '1');
          void supabase.rpc('increment_local_news_view', { target_news_id: p.id }).then(({ error: rpcErr }) => {
            if (rpcErr) {
              void supabase.from('local_news_views').insert({ news_id: p.id, viewer_ip_hash: getVisitorToken() });
            }
          });
        }
      });
    } catch (err) {
      console.error(err);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      void fetchApprovedPosts();
      if (user?.id) void loadUserInteractions(user.id);
    }
  }, [isOpen, user?.id, fetchApprovedPosts, loadUserInteractions]);

  // Sync profile author name
  useEffect(() => {
    if (profile?.full_name && !authorName) setAuthorName(profile.full_name);
  }, [profile, authorName]);

  // Photo handler
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert(language === 'hi' ? 'फ़ोटो 5MB से छोटी होनी चाहिए।' : 'Photo must be under 5MB.');
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const removePhoto = () => {
    setPhotoFile(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Submit Thought (Tweet)
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsPosting(true);
    try {
      let uploadedPhotoUrl: string | null = null;
      if (photoFile) {
        uploadedPhotoUrl = await uploadPhoto(photoFile);
      }

      const newPostPayload: any = {
        content: content.trim(),
        area: area.trim() || 'Betul',
        category,
        photo_url: uploadedPhotoUrl,
        author_name: authorName.trim() || profile?.full_name || 'Citizen',
        author_phone: profile?.phone || null,
        author_id: user?.id || null,
        status: 'approved',
        likes_count: 0,
        views_count: 1,
        reshares_count: 0,
        comments_count: 0,
      };

      const { data, error } = await supabase
        .from('local_news')
        .insert(newPostPayload)
        .select()
        .single();

      if (error) {
        // If status constraint forces 'pending', submit as pending smoothly
        const pendingPayload = { ...newPostPayload, status: 'pending' };
        await supabase.from('local_news').insert(pendingPayload);
        showToast(language === 'hi' ? 'आपका विचार साझा हो गया!' : 'Thought posted successfully!');
      } else if (data) {
        setPosts((prev) => [data, ...prev]);
        showToast(language === 'hi' ? 'विचार प्रकाशित हो गया! 🎉' : 'Thought posted! 🎉');
      }

      setContent('');
      removePhoto();
      setIsComposeOpen(false);
    } catch (err: any) {
      console.error('Error posting thought:', err);
      showToast(err.message || 'Could not post. Please try again.');
    } finally {
      setIsPosting(false);
    }
  };

  // Like Toggle
  const handleToggleLike = async (postId: string) => {
    const isLiked = likedPostIds.has(postId);
    const delta = isLiked ? -1 : 1;

    setLikedPostIds((prev) => {
      const next = new Set(prev);
      if (isLiked) next.delete(postId);
      else next.add(postId);
      return next;
    });

    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, likes_count: Math.max(0, (p.likes_count || 0) + delta) } : p
      )
    );

    try {
      if (user?.id) {
        if (isLiked) {
          await supabase.from('local_news_likes').delete().eq('news_id', postId).eq('user_id', user.id);
        } else {
          await supabase.from('local_news_likes').insert({ news_id: postId, user_id: user.id });
        }
      } else {
        await supabase.rpc('increment_local_news_likes', { news_id: postId });
      }
    } catch {
      // safe fallback
    }
  };

  // Reshare Toggle
  const handleToggleReshare = async (postId: string) => {
    if (!user) {
      showToast(language === 'hi' ? 'री-शेयर के लिए कृपया लॉगिन करें।' : 'Please login to reshare.');
      return;
    }

    const isReshared = resharedPostIds.has(postId);
    const delta = isReshared ? -1 : 1;

    setResharedPostIds((prev) => {
      const next = new Set(prev);
      if (isReshared) next.delete(postId);
      else next.add(postId);
      return next;
    });

    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, reshares_count: Math.max(0, (p.reshares_count || 0) + delta) } : p
      )
    );

    try {
      if (isReshared) {
        await supabase.from('local_news_reshares').delete().eq('news_id', postId).eq('user_id', user.id);
        showToast(language === 'hi' ? 'री-शेयर हटाया गया' : 'Reshare removed');
      } else {
        await supabase.from('local_news_reshares').insert({ news_id: postId, user_id: user.id });
        showToast(language === 'hi' ? 'फ़ॉलोअर्स के साथ साझा किया! 🔄' : 'Reshared to your feed! 🔄');
      }
    } catch {
      // safe fallback
    }
  };

  // Follow Toggle (Supports both authenticated citizens and guest visitors)
  const handleToggleFollow = async (
    targetAuthorId?: string | null,
    targetAuthorName?: string | null
  ) => {
    const rawName = targetAuthorName?.trim() || '';
    const authorSlug = rawName ? `author_${rawName.toLowerCase()}` : '';

    if (isSelfAuthor(targetAuthorId, targetAuthorName)) return;

    const currentlyFollowing = isAuthorFollowed(targetAuthorId, targetAuthorName, followedAuthorIds);

    // Optimistically update set & persist to localStorage immediately
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

    setProfileFollowerCount((prev) => Math.max(0, prev + (currentlyFollowing ? -1 : 1)));

    // Track local follower counts for non-db or anonymous users
    const countKey = `followers_count_${targetAuthorId || authorSlug || 'anon'}`;
    const curCount = parseInt(localStorage.getItem(countKey) || '0', 10);
    localStorage.setItem(countKey, Math.max(0, curCount + (currentlyFollowing ? -1 : 1)).toString());

    showToast(
      currentlyFollowing
        ? (language === 'hi' ? 'अनफ़ॉलो किया गया' : 'Unfollowed')
        : (language === 'hi' ? 'फ़ॉलो कर रहे हैं! 👤' : 'Following author! 👤')
    );

    // If citizen is logged in, sync to Supabase user_follows
    if (user?.id) {
      let uuidToFollow = targetAuthorId;
      const isUuid = uuidToFollow && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuidToFollow);

      // If no valid UUID yet, try resolving from user_profiles by name
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

  // Open User Profile Modal when clicking author circle
  const handleOpenUserProfile = async (post: LocalNews) => {
    let resolvedAuthorId = post.author_id;
    let author = post.author;

    // If author_id is missing, look up from user_profiles by author_name
    if (!resolvedAuthorId && post.author_name) {
      try {
        const { data: matched } = await supabase
          .from('user_profiles')
          .select('id, full_name, phone, ward_number, role, authority_role')
          .ilike('full_name', post.author_name.trim())
          .limit(1)
          .maybeSingle();
        if (matched) {
          resolvedAuthorId = matched.id;
          author = matched as any;
        }
      } catch {}
    }

    const isOfficial =
      author?.role === 'admin' ||
      author?.role === 'municipal_administrator' ||
      author?.role === 'dept_staff' ||
      author?.authority_role != null;

    setViewingProfile({
      id: resolvedAuthorId || null,
      name: post.author_name,
      phone: post.author_phone || author?.phone || null,
      ward: author?.ward_number || post.area,
      role: author?.role || 'citizen',
      authority_role: author?.authority_role || undefined,
      isOfficial,
    });

    // Follower count (DB + local tracking)
    const authorSlug = `author_${post.author_name.trim().toLowerCase()}`;
    const countKey = `followers_count_${resolvedAuthorId || authorSlug}`;
    const localFollowers = parseInt(localStorage.getItem(countKey) || '0', 10);

    if (resolvedAuthorId) {
      try {
        const { count } = await supabase
          .from('user_follows')
          .select('id', { count: 'exact', head: true })
          .eq('following_id', resolvedAuthorId);

        setProfileFollowerCount(Math.max(count || 0, localFollowers));
      } catch {
        setProfileFollowerCount(localFollowers);
      }
    } else {
      setProfileFollowerCount(localFollowers);
    }

    // ── Track & Count Profile Views from different visitors ──
    const authorId = resolvedAuthorId;
    const authorKey = authorId || authorSlug;
    const visitorToken = getVisitorToken();
    const isSelf = user?.id && authorId && user.id === authorId;
    const sessionViewKey = `profile_viewed_${authorKey}`;
    const alreadyViewedInSession = sessionStorage.getItem(sessionViewKey);
    const localViewsKey = `profile_views_${authorKey}`;
    let currentLocalViews = parseInt(localStorage.getItem(localViewsKey) || '0', 10);

    // If new visitor in this session and not viewing own profile:
    if (!isSelf && !alreadyViewedInSession) {
      sessionStorage.setItem(sessionViewKey, '1');
      currentLocalViews += 1;
      localStorage.setItem(localViewsKey, currentLocalViews.toString());

      if (authorId) {
        void supabase
          .rpc('record_user_profile_view', {
            target_profile_id: authorId,
            viewer_user_id: user?.id || null,
            visitor_token: visitorToken,
          })
          .then(({ error: rpcErr }) => {
            if (rpcErr) {
              void supabase.from('user_profile_views').insert({
                profile_id: authorId,
                viewer_id: user?.id || null,
                viewer_token: visitorToken,
              });
            }
          });
      }
    }

    // Fetch total profile views
    if (authorId) {
      try {
        const { count } = await supabase
          .from('user_profile_views')
          .select('id', { count: 'exact', head: true })
          .eq('profile_id', authorId);

        if (count != null && count > 0) {
          setProfileViewCount(Math.max(count, currentLocalViews));
        } else {
          setProfileViewCount(Math.max(1, currentLocalViews));
        }
      } catch {
        setProfileViewCount(Math.max(1, currentLocalViews));
      }
    } else {
      setProfileViewCount(Math.max(1, currentLocalViews));
    }
  };

  // Toggle Comments thread
  const toggleComments = async (postId: string) => {
    if (expandedCommentsPostId === postId) {
      setExpandedCommentsPostId(null);
      return;
    }

    setExpandedCommentsPostId(postId);
    if (!postComments[postId]) {
      setLoadingComments((prev) => ({ ...prev, [postId]: true }));
      try {
        const { data } = await supabase
          .from('local_news_comments')
          .select('*')
          .eq('news_id', postId)
          .order('created_at', { ascending: true });

        setPostComments((prev) => ({ ...prev, [postId]: data || [] }));
      } catch {
        setPostComments((prev) => ({ ...prev, [postId]: [] }));
      } finally {
        setLoadingComments((prev) => ({ ...prev, [postId]: false }));
      }
    }
  };

  // Add Comment (Reply)
  const handleAddComment = async (postId: string) => {
    const text = (newCommentText[postId] || '').trim();
    if (!text) return;

    setSubmittingComment((prev) => ({ ...prev, [postId]: true }));
    const tempId = `temp-${Date.now()}`;
    const optimisticComment: LocalNewsComment = {
      id: tempId,
      news_id: postId,
      user_id: user?.id || 'anon',
      author_name: profile?.full_name || authorName || 'Citizen',
      author_phone: profile?.phone || null,
      content: text,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setPostComments((prev) => ({
      ...prev,
      [postId]: [...(prev[postId] || []), optimisticComment],
    }));
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p
      )
    );
    setNewCommentText((prev) => ({ ...prev, [postId]: '' }));

    try {
      const payload: any = {
        news_id: postId,
        user_id: user?.id || null,
        author_name: profile?.full_name || authorName || 'Citizen',
        author_phone: profile?.phone || null,
        content: text,
      };

      const { data, error } = await supabase
        .from('local_news_comments')
        .insert(payload)
        .select()
        .single();

      if (!error && data) {
        setPostComments((prev) => ({
          ...prev,
          [postId]: (prev[postId] || []).map((c) => (c.id === tempId ? data : c)),
        }));
      }
    } catch {
      // safe fallback
    } finally {
      setSubmittingComment((prev) => ({ ...prev, [postId]: false }));
    }
  };

  // Share
  const handleShare = async (post: LocalNews) => {
    const text = `${post.author_name}: "${post.content}" - Betul Civic Portal`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Betul Thoughts', text, url: window.location.href });
        return;
      } catch {
        // fallback
      }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${window.location.href}`);
      showToast(language === 'hi' ? 'लिंक कॉपी हो गया!' : 'Link copied to clipboard!');
    } catch {
      showToast(text);
    }
  };

  const timeAgo = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
      if (diffSec < 60) return language === 'hi' ? 'अभी' : 'just now';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h`;
      return `${Math.floor(diffSec / 86400)}d`;
    } catch {
      return '';
    }
  };

  // Filtering
  const filteredPosts = posts.filter((post) => {
    const matchesArea =
      selectedArea === 'All' || post.area.toLowerCase().includes(selectedArea.toLowerCase());

    if (activeTab === 'following') {
      const isFollowed = isAuthorFollowed(post.author_id, post.author_name);
      return matchesArea && isFollowed;
    }
    if (activeTab === 'alerts') {
      return matchesArea && (post.category === 'alert' || post.category === 'news');
    }
    return matchesArea;
  });

  return (
    <>
      <style>{`
        /* Twitter X Drawer Styles */
        .x-drawer-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: calc(56px + env(safe-area-inset-bottom));
          z-index: 1050;
          background: rgba(15, 23, 42, 0.45);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          display: flex;
          justify-content: flex-end;
          animation: xFadeIn 0.2s ease-out;
        }

        @media (min-width: 768px) {
          .x-drawer-overlay {
            bottom: 0;
          }
        }

        .x-drawer {
          background: #ffffff;
          width: 100%;
          max-width: 520px;
          height: 100%;
          display: flex;
          flex-direction: column;
          box-shadow: -8px 0 32px rgba(0, 0, 0, 0.12);
          animation: xSlideLeft 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          color: #0f1419;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }

        @keyframes xFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes xSlideLeft {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }

        /* Header */
        .x-header {
          padding: 12px 16px 0;
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid #eff3f4;
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex-shrink: 0;
          position: sticky;
          top: 0;
          z-index: 20;
        }

        .x-header-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .x-header-title {
          font-size: 1.1rem;
          font-weight: 800;
          margin: 0;
          color: #0f1419;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .x-header-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .x-icon-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: none;
          background: transparent;
          color: #536471;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.15s;
        }
        .x-icon-btn:hover {
          background: #f7f9f9;
          color: #0f1419;
        }

        /* Twitter Tabs */
        .x-tabs {
          display: flex;
        }

        .x-tab-btn {
          flex: 1;
          background: transparent;
          border: none;
          padding: 12px 0;
          font-size: 0.88rem;
          font-weight: 600;
          color: #536471;
          cursor: pointer;
          position: relative;
          text-align: center;
          transition: color 0.15s, background 0.15s;
        }
        .x-tab-btn:hover {
          background: rgba(15, 20, 25, 0.03);
          color: #0f1419;
        }
        .x-tab-btn.is-active {
          color: #146C94;
          font-weight: 700;
        }
        .x-tab-btn.is-active::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 25%;
          right: 25%;
          height: 3px;
          background: #146C94;
          border-radius: 99px;
        }

        /* Collapsible Compose Trigger bar (Compact when reading) */
        .x-compose-trigger {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px;
          background: #ffffff;
          border-bottom: 1px solid #eff3f4;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .x-compose-trigger:hover {
          background: #f8fafc;
        }
        .x-avatar-mini {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: linear-gradient(135deg, #146C94, #19A7CE);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.8rem;
          flex-shrink: 0;
        }
        .x-compose-trigger-placeholder {
          flex: 1;
          color: #64748b;
          font-size: 0.88rem;
          user-select: none;
        }
        .x-compose-trigger-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: #146C94;
          color: #ffffff;
          border: none;
          border-radius: 99px;
          padding: 5px 12px;
          font-size: 0.76rem;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.15s;
        }
        .x-compose-trigger-btn:hover {
          background: #0E526F;
        }

        .x-compose-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
          padding-bottom: 6px;
          border-bottom: 1px dashed #eff3f4;
        }

        /* Header Compose Toggle Button */
        .x-header-compose-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: #146C94;
          color: #ffffff;
          border: none;
          border-radius: 99px;
          padding: 4px 10px;
          font-size: 0.74rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
        }
        .x-header-compose-btn:hover {
          background: #0E526F;
        }
        .x-header-compose-btn.is-active {
          background: #f1f5f9;
          color: #334155;
          border: 1px solid #cbd5e1;
        }

        /* Inside Drawer Floating Action Button (FAB) to compose when scrolling */
        .x-feed-fab {
          position: absolute;
          bottom: 24px;
          right: 20px;
          height: 42px;
          padding: 0 16px;
          border-radius: 99px;
          background: linear-gradient(135deg, #146C94, #0E526F);
          color: #ffffff;
          border: 2px solid #ffffff;
          box-shadow: 0 8px 24px rgba(20, 108, 148, 0.4);
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          z-index: 30;
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s;
        }
        .x-feed-fab:hover {
          transform: scale(1.05) translateY(-2px);
          box-shadow: 0 12px 28px rgba(20, 108, 148, 0.5);
        }

        /* X Compose Box inside Widget */
        .x-compose-box {
          padding: 14px 16px;
          border-bottom: 1px solid #eff3f4;
          background: #ffffff;
          animation: xSlideDown 0.2s ease-out;
        }

        @keyframes xSlideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .x-compose-row {
          display: flex;
          gap: 12px;
        }

        .x-avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: linear-gradient(135deg, #146C94, #19A7CE);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.95rem;
          flex-shrink: 0;
          cursor: pointer;
          transition: transform 0.15s;
        }
        .x-avatar:hover {
          transform: scale(1.05);
        }

        .x-compose-body {
          flex: 1;
        }

        .x-compose-textarea {
          width: 100%;
          border: none;
          outline: none;
          resize: none;
          font-size: 0.95rem;
          font-family: inherit;
          color: #0f1419;
          min-height: 52px;
          background: transparent;
        }
        .x-compose-textarea::placeholder {
          color: #8b98a5;
        }

        .x-category-row {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          margin: 6px 0 10px;
        }

        .x-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          border-radius: 99px;
          border: 1px solid #eff3f4;
          background: #f7f9f9;
          font-size: 0.72rem;
          color: #536471;
          font-weight: 600;
          cursor: pointer;
        }
        .x-chip.is-active {
          border-color: #146C94;
          background: #e2f0f7;
          color: #146C94;
        }

        .x-compose-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-top: 1px solid #f7f9f9;
          padding-top: 10px;
        }

        .x-post-btn {
          background: #146C94;
          color: #fff;
          border: none;
          border-radius: 99px;
          padding: 6px 16px;
          font-weight: 700;
          font-size: 0.82rem;
          cursor: pointer;
          transition: background 0.15s;
        }
        .x-post-btn:hover:not(:disabled) {
          background: #0E526F;
        }
        .x-post-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Filter Chips bar */
        .x-filters-bar {
          padding: 8px 16px;
          background: #f7f9f9;
          border-bottom: 1px solid #eff3f4;
          display: flex;
          gap: 6px;
          overflow-x: auto;
          scrollbar-width: none;
        }

        /* Tweet Item */
        .x-tweet-item {
          padding: 14px 16px;
          border-bottom: 1px solid #eff3f4;
          display: flex;
          gap: 12px;
          transition: background 0.15s;
        }
        .x-tweet-item:hover {
          background: #f8fafc;
        }

        .x-tweet-content {
          flex: 1;
          min-width: 0;
        }

        .x-tweet-author-line {
          display: flex;
          align-items: center;
          gap: 5px;
          flex-wrap: wrap;
          margin-bottom: 2px;
        }

        .x-tweet-follow-btn {
          margin-left: auto;
          display: inline-flex;
          align-items: center;
          gap: 3px;
          padding: 2px 8px;
          border-radius: 99px;
          font-size: 0.68rem;
          font-weight: 700;
          border: 1px solid #146C94;
          background: #146C94;
          color: #ffffff;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .x-tweet-follow-btn:hover {
          background: #0E526F;
          border-color: #0E526F;
        }
        .x-tweet-follow-btn.is-following {
          background: #f1f5f9;
          border-color: #cfd9de;
          color: #0f1419;
        }
        .x-tweet-follow-btn.is-following:hover {
          background: #fee2e2;
          border-color: #fca5a5;
          color: #dc2626;
        }

        .x-tweet-name {
          font-weight: 700;
          color: #0f1419;
          font-size: 0.9rem;
          cursor: pointer;
        }
        .x-tweet-name:hover {
          text-decoration: underline;
        }

        .x-tweet-meta {
          font-size: 0.78rem;
          color: #536471;
        }

        .x-tweet-role {
          font-size: 0.68rem;
          padding: 1px 6px;
          border-radius: 99px;
          background: #eff3f4;
          color: #536471;
          font-weight: 600;
        }
        .x-tweet-role.is-official {
          background: #e0f2fe;
          color: #0284c7;
        }

        .x-tweet-text {
          font-size: 0.9rem;
          line-height: 1.45;
          color: #0f1419;
          word-break: break-word;
          white-space: pre-wrap;
        }

        .x-read-more-btn {
          background: transparent;
          border: none;
          padding: 0;
          margin-left: 6px;
          color: #146C94;
          font-weight: 700;
          font-size: 0.84rem;
          cursor: pointer;
          display: inline;
        }
        .x-read-more-btn:hover {
          text-decoration: underline;
          color: #0E526F;
        }

        .x-tweet-photo {
          border-radius: 16px;
          overflow: hidden;
          margin: 10px 0 12px;
          max-height: 380px;
          border: 1.5px solid rgba(20, 108, 148, 0.18);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
          background: #f1f5f9;
          position: relative;
        }
        .x-tweet-photo img {
          width: 100%;
          max-height: 380px;
          object-fit: cover;
          display: block;
          transition: transform 0.3s ease;
        }
        .x-tweet-photo:hover img {
          transform: scale(1.02);
        }
        .x-tweet-photo-badge {
          position: absolute;
          bottom: 8px;
          right: 8px;
          background: rgba(15, 23, 42, 0.78);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          color: #ffffff;
          font-size: 0.68rem;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 99px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .x-tweet-area {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: 0.72rem;
          color: #536471;
          margin-bottom: 6px;
        }

        /* Twitter Action Row */
        .x-actions-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          max-width: 380px;
          color: #536471;
          margin-top: 4px;
        }

        .x-action-btn {
          background: transparent;
          border: none;
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 0.76rem;
          color: #536471;
          cursor: pointer;
          padding: 5px 8px;
          border-radius: 99px;
          transition: all 0.15s;
        }
        .x-action-btn:hover {
          background: #e2f0f7;
          color: #146C94;
        }
        .x-action-btn.is-liked {
          color: #f91880;
        }
        .x-action-btn.is-liked:hover {
          background: rgba(249, 24, 128, 0.1);
        }
        .x-action-btn.is-reshared {
          color: #00ba7c;
        }
        .x-action-btn.is-reshared:hover {
          background: rgba(0, 186, 124, 0.1);
        }

        /* User Profile Modal just like X */
        .x-profile-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 2150;
          background: rgba(0, 0, 0, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          animation: xFadeIn 0.2s ease-out;
        }

        .x-profile-card {
          background: #ffffff;
          border-radius: 20px;
          width: 100%;
          max-width: 360px;
          overflow: hidden;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.2);
          animation: xSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes xSlideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .x-profile-banner {
          height: 80px;
          background: linear-gradient(135deg, #146C94, #19A7CE);
          position: relative;
        }

        .x-profile-close-btn {
          position: absolute;
          top: 10px;
          right: 10px;
          background: rgba(0, 0, 0, 0.4);
          color: #fff;
          border: none;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .x-profile-body {
          padding: 0 16px 16px;
          position: relative;
        }

        .x-profile-avatar-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-top: -32px;
          margin-bottom: 10px;
        }

        .x-profile-big-avatar {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          border: 3px solid #ffffff;
          background: #146C94;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          font-weight: 800;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .x-profile-follow-btn {
          border: 1px solid #0f1419;
          background: #0f1419;
          color: #fff;
          border-radius: 99px;
          padding: 6px 18px;
          font-weight: 700;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.15s;
        }
        .x-profile-follow-btn:hover {
          background: #272c30;
        }
        .x-profile-follow-btn.is-following {
          background: transparent;
          color: #0f1419;
          border-color: #cfd9de;
        }
        .x-profile-follow-btn.is-following:hover {
          background: #fee2e2;
          border-color: #fca5a5;
          color: #dc2626;
        }

        .x-toast {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          background: #0f1419;
          color: #fff;
          padding: 10px 18px;
          border-radius: 99px;
          font-size: 0.85rem;
          font-weight: 600;
          z-index: 1200;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
        }
      `}</style>

      {/* Floating Launcher Button */}
      <button
        onClick={openDrawer}
        className="floating-news-btn"
        aria-label="Open Local Area News & Thoughts"
        style={{
          position: 'fixed',
          bottom: 'calc(76px + env(safe-area-inset-bottom))',
          right: 18,
          zIndex: 990,
          background: 'linear-gradient(135deg, #146C94 0%, #0E526F 100%)',
          color: '#fff',
          border: '2px solid rgba(255, 255, 255, 0.3)',
          borderRadius: 999,
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(20, 108, 148, 0.35)',
        }}
      >
        <Radio size={16} />
        <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>
          {language === 'hi' ? 'स्थानीय विचार' : 'Local News'}
        </span>
        {posts.length > 0 && (
          <span
            style={{
              background: '#F6F1F1',
              color: '#146C94',
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

      {/* Toast Notification */}
      {toastMessage && <div className="x-toast">{toastMessage}</div>}

      {/* Twitter (X) Style Drawer */}
      {isOpen && (
        <div
          className="x-drawer-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeDrawer();
          }}
        >
          <div className="x-drawer">
            {/* Header with Tabs */}
            <div className="x-header">
              <div className="x-header-top">
                <h3 className="x-header-title">
                  <Radio size={16} color="#146C94" />
                  {language === 'hi' ? 'नागरिक चौपाल (बेतूल)' : 'Betul Thoughts'}
                </h3>
                <div className="x-header-actions">
                  <button
                    className={`x-header-compose-btn ${isComposeOpen ? 'is-active' : ''}`}
                    onClick={() => setIsComposeOpen((prev) => !prev)}
                    title={isComposeOpen ? 'Close Composer' : 'Write Thought'}
                  >
                    {isComposeOpen ? <X size={13} /> : <Plus size={13} />}
                    <span>{isComposeOpen ? (language === 'hi' ? 'रद्द करें' : 'Cancel') : (language === 'hi' ? 'विचार लिखें' : 'Post')}</span>
                  </button>
                  <button
                    className="x-icon-btn"
                    onClick={() => fetchApprovedPosts()}
                    title="Refresh"
                  >
                    <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                  </button>
                  <button
                    className="x-icon-btn"
                    onClick={closeDrawer}
                    title="Close"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* X Tabs: For You, Following, Alerts */}
              <div className="x-tabs">
                <button
                  className={`x-tab-btn ${activeTab === 'for_you' ? 'is-active' : ''}`}
                  onClick={() => setActiveTab('for_you')}
                >
                  {language === 'hi' ? 'आपके लिए' : 'For You'}
                </button>
                <button
                  className={`x-tab-btn ${activeTab === 'following' ? 'is-active' : ''}`}
                  onClick={() => setActiveTab('following')}
                >
                  {language === 'hi' ? 'फ़ॉलो किए' : 'Following'}
                </button>
                <button
                  className={`x-tab-btn ${activeTab === 'alerts' ? 'is-active' : ''}`}
                  onClick={() => setActiveTab('alerts')}
                >
                  {language === 'hi' ? 'अलर्ट्स' : 'Alerts'}
                </button>
              </div>
            </div>

            {/* Collapsible Compose Section: Hidden while reading/scrolling down */}
            {!isComposeOpen ? (
              <div
                className="x-compose-trigger"
                onClick={() => setIsComposeOpen(true)}
              >
                <div className="x-avatar-mini">
                  {profile?.full_name ? profile.full_name[0].toUpperCase() : 'B'}
                </div>
                <span className="x-compose-trigger-placeholder">
                  {language === 'hi'
                    ? 'बेतूल में क्या हो रहा है? नया विचार साझा करें...'
                    : "What's happening in Betul? Share a thought..."}
                </span>
                <button type="button" className="x-compose-trigger-btn">
                  <PenLine size={13} />
                  <span>{language === 'hi' ? 'विचार लिखें' : 'Post'}</span>
                </button>
              </div>
            ) : (
              <div className="x-compose-box">
                <div className="x-compose-header">
                  <span style={{ fontWeight: 700, fontSize: '0.84rem', color: '#146C94', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <PenLine size={14} />
                    {language === 'hi' ? 'नया विचार साझा करें' : 'Post your thought'}
                  </span>
                  <button
                    type="button"
                    className="x-icon-btn"
                    onClick={() => setIsComposeOpen(false)}
                    title={language === 'hi' ? 'बंद करें' : 'Close'}
                  >
                    <X size={15} />
                  </button>
                </div>
                <form onSubmit={handleCreatePost}>
                  <div className="x-compose-row">
                    <div className="x-avatar">
                      {profile?.full_name ? profile.full_name[0].toUpperCase() : 'B'}
                    </div>
                    <div className="x-compose-body">
                      <textarea
                        className="x-compose-textarea"
                        placeholder={
                          language === 'hi'
                            ? 'वार्ड या शहर में क्या हो रहा है? लिखें...'
                            : "What's happening in your ward? Share a thought..."
                        }
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        maxLength={1000}
                      />

                      {/* Category Selection Chips */}
                      <div className="x-category-row">
                        {(Object.keys(CATEGORY_META) as LocalNewsCategory[]).map((catKey) => {
                          const meta = CATEGORY_META[catKey];
                          return (
                            <button
                              key={catKey}
                              type="button"
                              className={`x-chip ${category === catKey ? 'is-active' : ''}`}
                              onClick={() => setCategory(catKey)}
                            >
                              {meta.icon}
                              {language === 'hi' ? meta.labelHi : meta.label}
                            </button>
                          );
                        })}
                      </div>

                      {/* Photo preview if chosen */}
                      {photoPreview && (
                        <div style={{ position: 'relative', display: 'inline-block', marginBottom: 8 }}>
                          <img
                            src={photoPreview}
                            alt="preview"
                            style={{ maxHeight: 120, borderRadius: 8, border: '1px solid #eff3f4' }}
                          />
                          <button
                            type="button"
                            onClick={removePhoto}
                            style={{
                              position: 'absolute',
                              top: 4,
                              right: 4,
                              width: 20,
                              height: 20,
                              borderRadius: '50%',
                              background: 'rgba(0,0,0,0.6)',
                              color: '#fff',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      )}

                      {/* Compose Footer: Media Attach & Post Button */}
                      <div className="x-compose-footer">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input
                            type="file"
                            ref={fileInputRef}
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={handlePhotoSelect}
                          />
                          <button
                            type="button"
                            className="x-icon-btn"
                            onClick={() => fileInputRef.current?.click()}
                            title="Attach photo"
                          >
                            <ImageIcon size={17} color="#146C94" />
                          </button>

                          <input
                            type="text"
                            value={area}
                            onChange={(e) => setArea(e.target.value)}
                            placeholder="Area / Ward"
                            style={{
                              border: '1px solid #eff3f4',
                              borderRadius: 6,
                              padding: '3px 8px',
                              fontSize: '0.74rem',
                              outline: 'none',
                              color: '#536471',
                              width: 100,
                            }}
                          />
                        </div>

                        <button
                          type="submit"
                          className="x-post-btn"
                          disabled={!content.trim() || isPosting || uploading}
                        >
                          {isPosting || uploading
                            ? language === 'hi'
                              ? 'पोस्ट हो रहा...'
                              : 'Posting...'
                            : language === 'hi'
                            ? 'साझा करें'
                            : 'Post'}
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* Quick Area Filters */}
            <div className="x-filters-bar">
              {POPULAR_AREAS.map((a) => {
                const isSel = selectedArea === a;
                return (
                  <button
                    key={a}
                    onClick={() => setSelectedArea(a)}
                    style={{
                      padding: '2px 8px',
                      borderRadius: 99,
                      border: '1px solid',
                      borderColor: isSel ? '#146C94' : '#eff3f4',
                      background: isSel ? '#146C94' : '#ffffff',
                      color: isSel ? '#fff' : '#536471',
                      fontSize: '0.72rem',
                      fontWeight: isSel ? 700 : 500,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {a}
                  </button>
                );
              })}
            </div>

            {/* Tweet List Feed with onScroll auto-hide of composer */}
            <div
              ref={feedRef}
              onScroll={handleFeedScroll}
              style={{ flex: 1, overflowY: 'auto', position: 'relative' }}
            >
              {loading ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#536471' }}>
                  <p>{language === 'hi' ? 'विचार लोड हो रहे हैं...' : 'Loading thoughts...'}</p>
                </div>
              ) : filteredPosts.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: '#536471' }}>
                  <Sparkles size={28} color="#146C94" style={{ margin: '0 auto 8px' }} />
                  <p style={{ margin: 0, fontWeight: 600 }}>
                    {language === 'hi' ? 'इस श्रेणी में अभी कोई विचार नहीं है।' : 'No thoughts here yet.'}
                  </p>
                </div>
              ) : (
                filteredPosts.map((post) => {
                  const author = post.author;
                  const isOfficial =
                    author?.role === 'admin' ||
                    author?.role === 'municipal_administrator' ||
                    author?.role === 'dept_staff' ||
                    author?.authority_role != null;

                  const isLiked = likedPostIds.has(post.id);
                  const isReshared = resharedPostIds.has(post.id);

                  return (
                    <article className="x-tweet-item" key={post.id}>
                      {/* User Circle Avatar (Click opens Profile Modal just like X) */}
                      <div
                        className="x-avatar"
                        onClick={() => handleOpenUserProfile(post)}
                        title={language === 'hi' ? 'प्रोफ़ाइल देखें' : 'View profile'}
                      >
                        {post.author_name ? post.author_name[0].toUpperCase() : 'B'}
                      </div>

                      {/* Content */}
                      <div className="x-tweet-content">
                        {/* Author Header Line */}
                        <div className="x-tweet-author-line">
                          <span
                            className="x-tweet-name"
                            onClick={() => handleOpenUserProfile(post)}
                          >
                            {post.author_name}
                          </span>

                          {isOfficial ? (
                            <ShieldCheck size={14} color="#15803d" />
                          ) : (
                            <CheckCircle2 size={13} color="#146C94" />
                          )}

                          <span className="x-tweet-meta">· {timeAgo(post.created_at)}</span>

                          <span className={`x-tweet-role ${isOfficial ? 'is-official' : ''}`}>
                            {isOfficial
                              ? language === 'hi'
                                ? 'नगर पालिका'
                                : 'Official'
                              : author?.ward_number
                              ? `Ward ${author.ward_number}`
                              : 'Citizen'}
                          </span>

                          {/* Direct Follow Button on card */}
                          {!isSelfAuthor(post.author_id, post.author_name) && (
                            <button
                              type="button"
                              className={`x-tweet-follow-btn ${isAuthorFollowed(post.author_id, post.author_name) ? 'is-following' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleToggleFollow(post.author_id, post.author_name);
                              }}
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

                        {/* Text with Read More */}
                        {(() => {
                          const isExpanded = expandedTweetIds.has(post.id);
                          const isLong = post.content && post.content.length > 135;
                          const displayText = !isLong || isExpanded
                            ? post.content
                            : `${post.content.slice(0, 135).trim()}...`;

                          return (
                            <div style={{ margin: '4px 0 8px' }}>
                              <p className="x-tweet-text" style={{ margin: 0, display: 'inline' }}>
                                {displayText}
                              </p>
                              {isLong && (
                                <button
                                  type="button"
                                  className="x-read-more-btn"
                                  onClick={() => {
                                    setExpandedTweetIds((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(post.id)) next.delete(post.id);
                                      else next.add(post.id);
                                      return next;
                                    });
                                  }}
                                >
                                  {isExpanded
                                    ? (language === 'hi' ? 'कम पढ़ें' : 'Show less')
                                    : (language === 'hi' ? 'और पढ़ें' : 'Read more')}
                                </button>
                              )}
                            </div>
                          );
                        })()}

                        {/* Highlighted User-Uploaded Photo */}
                        {post.photo_url && (
                          <div className="x-tweet-photo">
                            <img src={post.photo_url} alt="" loading="lazy" />
                            <div className="x-tweet-photo-badge">
                              <Camera size={11} />
                              <span>{language === 'hi' ? 'नागरिक फोटो' : 'Citizen Photo'}</span>
                            </div>
                          </div>
                        )}

                        {/* Locality */}
                        <div className="x-tweet-area">
                          <MapPin size={11} />
                          <span>{post.area}</span>
                        </div>

                        {/* Twitter Action Bar: Reply, Reshare, Like, Views, Share */}
                        <div className="x-actions-row">
                          {/* Reply / Comment */}
                          <button
                            type="button"
                            className="x-action-btn"
                            onClick={() => toggleComments(post.id)}
                            title="Reply"
                          >
                            <MessageCircle size={15} />
                            <span>{post.comments_count || (postComments[post.id]?.length ?? 0)}</span>
                          </button>

                          {/* Reshare */}
                          <button
                            type="button"
                            className={`x-action-btn ${isReshared ? 'is-reshared' : ''}`}
                            onClick={() => handleToggleReshare(post.id)}
                            title="Reshare"
                          >
                            <Repeat size={15} />
                            <span>{post.reshares_count || 0}</span>
                          </button>

                          {/* Like */}
                          <button
                            type="button"
                            className={`x-action-btn ${isLiked ? 'is-liked' : ''}`}
                            onClick={() => handleToggleLike(post.id)}
                            title="Like"
                          >
                            <Heart size={15} fill={isLiked ? '#f91880' : 'none'} />
                            <span>{post.likes_count || 0}</span>
                          </button>

                          {/* Real Views (No Demo view) */}
                          <div
                            className="x-action-btn"
                            style={{ cursor: 'default' }}
                            title="Views"
                          >
                            <Eye size={15} />
                            <span>{post.views_count || 0}</span>
                          </div>

                          {/* Share */}
                          <button
                            type="button"
                            className="x-action-btn"
                            onClick={() => handleShare(post)}
                            title="Share"
                          >
                            <Share2 size={15} />
                          </button>
                        </div>

                        {/* Expandable Reply Thread */}
                        {expandedCommentsPostId === post.id && (
                          <div
                            style={{
                              marginTop: 10,
                              paddingTop: 8,
                              borderTop: '1px solid #eff3f4',
                            }}
                          >
                            {loadingComments[post.id] ? (
                              <p style={{ fontSize: '0.75rem', color: '#536471' }}>
                                {language === 'hi' ? 'उत्तर लोड हो रहे हैं...' : 'Loading replies...'}
                              </p>
                            ) : (
                              (postComments[post.id] || []).map((c) => (
                                <div
                                  key={c.id}
                                  style={{
                                    display: 'flex',
                                    gap: 8,
                                    marginBottom: 8,
                                    fontSize: '0.8rem',
                                  }}
                                >
                                  <div
                                    style={{
                                      width: 22,
                                      height: 22,
                                      borderRadius: '50%',
                                      background: '#cbd5e1',
                                      color: '#0f1419',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontWeight: 700,
                                      fontSize: '0.65rem',
                                      flexShrink: 0,
                                    }}
                                  >
                                    {c.author_name ? c.author_name[0].toUpperCase() : 'U'}
                                  </div>
                                  <div style={{ flex: 1, background: '#f7f9f9', padding: '6px 10px', borderRadius: 8 }}>
                                    <div style={{ fontWeight: 700, fontSize: '0.75rem' }}>{c.author_name}</div>
                                    <div>{c.content}</div>
                                  </div>
                                </div>
                              ))
                            )}

                            {/* Reply Input */}
                            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                              <input
                                type="text"
                                placeholder={language === 'hi' ? 'उत्तर लिखें...' : 'Post your reply...'}
                                value={newCommentText[post.id] || ''}
                                onChange={(e) =>
                                  setNewCommentText((prev) => ({ ...prev, [post.id]: e.target.value }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') void handleAddComment(post.id);
                                }}
                                style={{
                                  flex: 1,
                                  border: '1px solid #eff3f4',
                                  borderRadius: 99,
                                  padding: '5px 12px',
                                  fontSize: '0.78rem',
                                  outline: 'none',
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleAddComment(post.id)}
                                disabled={submittingComment[post.id]}
                                style={{
                                  background: '#146C94',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '50%',
                                  width: 28,
                                  height: 28,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                }}
                              >
                                <Send size={12} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })
              )}

              {/* Floating Action Button (FAB) inside drawer to compose anytime while reading */}
              {!isComposeOpen && (
                <button
                  type="button"
                  className="x-feed-fab"
                  onClick={() => {
                    setIsComposeOpen(true);
                    feedRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  title={language === 'hi' ? 'नया विचार लिखें' : 'Post a thought'}
                >
                  <Plus size={16} strokeWidth={2.6} />
                  <span>{language === 'hi' ? 'विचार लिखें' : 'Post'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── USER PROFILE MODAL (JUST LIKE X WHEN CLICKING USER CIRCLE) ── */}
      {viewingProfile && (
        <div
          className="x-profile-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewingProfile(null);
          }}
        >
          <div className="x-profile-card">
            {/* Banner */}
            <div className="x-profile-banner">
              <button
                className="x-profile-close-btn"
                onClick={() => setViewingProfile(null)}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Profile Body */}
            <div className="x-profile-body">
              <div className="x-profile-avatar-row">
                <div className="x-profile-big-avatar">
                  {viewingProfile.name ? viewingProfile.name[0].toUpperCase() : 'B'}
                </div>

                {/* Follow Button just like X - always visible unless viewing own profile */}
                {(() => {
                  if (isSelfAuthor(viewingProfile.id, viewingProfile.name)) {
                    return (
                      <div
                        style={{
                          fontSize: '0.78rem',
                          color: '#536471',
                          fontWeight: 700,
                          padding: '6px 12px',
                          background: '#f1f5f9',
                          borderRadius: 99,
                        }}
                      >
                        {language === 'hi' ? 'आपकी प्रोफ़ाइल' : 'Your Profile'}
                      </div>
                    );
                  }

                  const isFollowing = isAuthorFollowed(viewingProfile.id, viewingProfile.name);

                  return (
                    <button
                      type="button"
                      className={`x-profile-follow-btn ${isFollowing ? 'is-following' : ''}`}
                      onClick={() => void handleToggleFollow(viewingProfile.id, viewingProfile.name)}
                      title={isFollowing ? 'Unfollow' : 'Follow author'}
                    >
                      {isFollowing ? (
                        <>
                          <UserCheck size={14} style={{ display: 'inline', marginRight: 4 }} />
                          <span>{language === 'hi' ? 'फ़ॉलो कर रहे हैं' : 'Following'}</span>
                        </>
                      ) : (
                        <>
                          <UserPlus size={14} style={{ display: 'inline', marginRight: 4 }} />
                          <span>{language === 'hi' ? 'फ़ॉलो करें' : 'Follow'}</span>
                        </>
                      )}
                    </button>
                  );
                })()}
              </div>

              {/* Name & Badges */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f1419' }}>
                  {viewingProfile.name}
                </h4>
                {viewingProfile.isOfficial ? (
                  <ShieldCheck size={18} color="#15803d" />
                ) : (
                  <CheckCircle2 size={16} color="#146C94" />
                )}
              </div>

              <div style={{ fontSize: '0.82rem', color: '#536471', marginBottom: 8 }}>
                @{viewingProfile.name.toLowerCase().replace(/\s+/g, '_')}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                <span
                  style={{
                    fontSize: '0.74rem',
                    padding: '2px 8px',
                    borderRadius: 99,
                    background: viewingProfile.isOfficial ? '#e0f2fe' : '#f1f5f9',
                    color: viewingProfile.isOfficial ? '#0284c7' : '#475569',
                    fontWeight: 700,
                  }}
                >
                  {viewingProfile.isOfficial
                    ? language === 'hi'
                      ? 'नगर पालिका प्रतिनिधि'
                      : 'Municipal Official'
                    : viewingProfile.ward
                    ? `${viewingProfile.ward} Citizen`
                    : 'Betul Citizen'}
                </span>

                {viewingProfile.ward && (
                  <span style={{ fontSize: '0.78rem', color: '#536471', display: 'flex', alignItems: 'center', gap: 2 }}>
                    <MapPin size={12} /> {viewingProfile.ward}
                  </span>
                )}
              </div>

              {/* Follower Stats */}
              <div style={{ display: 'flex', gap: 16, fontSize: '0.85rem', color: '#536471', borderTop: '1px solid #eff3f4', paddingTop: 12 }}>
                <div>
                  <strong style={{ color: '#0f1419' }}>{profileFollowerCount}</strong>{' '}
                  {language === 'hi' ? 'फ़ॉलोअर्स' : 'Followers'}
                </div>
                <div>
                  <strong style={{ color: '#0f1419' }}>
                    {posts.filter((p) => p.author_name === viewingProfile.name).length}
                  </strong>{' '}
                  {language === 'hi' ? 'विचार' : 'Thoughts'}
                </div>
                <div title={language === 'hi' ? 'विज़िटर्स द्वारा प्रोफ़ाइल दृश्य' : 'Profile views from different visitors'}>
                  <strong style={{ color: '#0f1419' }}>{profileViewCount}</strong>{' '}
                  {language === 'hi' ? 'व्यूज़' : 'Views'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingNewsWidget;
