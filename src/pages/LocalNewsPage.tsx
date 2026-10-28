import { ArcLoader } from '../components/common/ArcLoader';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Heart,
  Image as ImageIcon,
  MapPin,
  MessageCircle,
  Radio,
  Repeat,
  Send,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserPlus,
  X,
  Eye,
  Camera,
  Share2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useStorage } from '../hooks/useStorage';
import { supabase } from '../lib/supabase';
import type { LocalNews, LocalNewsCategory, LocalNewsComment } from '../lib/supabase';
import { BottomNav } from '../components/BottomNav';

const CATEGORY_LABELS: Record<LocalNewsCategory, { en: string; hi: string }> = {
  thought: { en: 'Civic Thought', hi: 'नागरिक विचार' },
  news: { en: 'Local News', hi: 'स्थानीय समाचार' },
  alert: { en: 'Urgent Alert', hi: 'महत्वपूर्ण सूचना' },
  event: { en: 'City Event', hi: 'शहर कार्यक्रम' },
  general: { en: 'General Update', hi: 'सामान्य अपडेट' },
};

const BETUL_AREAS = [
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

export const LocalNewsPage: React.FC = () => {
  const navigate = useNavigate();
  const { language, profile, user } = useAuth();
  const { uploadPhoto, uploading, progress, statusText } = useStorage();

  // Feed & Tab State
  const [activeTab, setActiveTab] = useState<'for_you' | 'following' | 'alerts'>('for_you');
  const [posts, setPosts] = useState<LocalNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArea, setSelectedArea] = useState('All');

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

  // Social interactions state
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const [resharedPostIds, setResharedPostIds] = useState<Set<string>>(new Set());
  const [followedAuthorIds, setFollowedAuthorIds] = useState<Set<string>>(getStoredFollowedAuthors);
  const [expandedCommentsPostId, setExpandedCommentsPostId] = useState<string | null>(null);
  const [postComments, setPostComments] = useState<Record<string, LocalNewsComment[]>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
  const [newCommentText, setNewCommentText] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<Record<string, boolean>>({});

  // Compose Box State
  const [content, setContent] = useState('');
  const [area, setArea] = useState(profile?.ward_number ? `Ward ${profile.ward_number}` : 'Kothi Bazar');
  const [category, setCategory] = useState<LocalNewsCategory>('thought');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState(profile?.full_name || '');
  const [isPosting, setIsPosting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  // User Profile Modal (when clicking user circle just like X)
  const [viewingProfile, setViewingProfile] = useState<UserProfileModalData | null>(null);
  const [profileFollowerCount, setProfileFollowerCount] = useState<number>(0);
  const [profileViewCount, setProfileViewCount] = useState<number>(0);
  const [expandedTweetIds, setExpandedTweetIds] = useState<Set<string>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const lastScrollTopRef = useRef<number>(0);

  const getVisitorToken = () => {
    let token = localStorage.getItem('betul_visitor_token');
    if (!token) {
      token = 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem('betul_visitor_token', token);
    }
    return token;
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

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

  // Auto-hide composer when scrolling down
  const handleFeedScroll = () => {
    if (!feedRef.current) return;
    const currentScrollTop = feedRef.current.scrollTop;
    if (currentScrollTop > lastScrollTopRef.current && currentScrollTop > 40) {
      if (isComposeOpen && !content.trim()) {
        setIsComposeOpen(false);
      }
    }
    lastScrollTopRef.current = currentScrollTop;
  };

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

      if (fetched.length) {
        const { data: commentRows, error: commentsError } = await supabase
          .from('local_news_comments')
          .select('news_id')
          .in('news_id', fetched.map((post) => post.id));
        if (commentsError) {
          console.error('Could not load comment counts:', commentsError.message);
        } else {
          const commentCounts = (commentRows || []).reduce<Record<string, number>>((counts, row) => {
            counts[row.news_id] = (counts[row.news_id] || 0) + 1;
            return counts;
          }, {});
          fetched = fetched.map((post) => ({ ...post, comments_count: commentCounts[post.id] || 0 }));
        }
      }

      setPosts(fetched);

      // Record views for thoughts seen in this session
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
    void fetchApprovedPosts();
    if (user?.id) void loadUserInteractions(user.id);
  }, [user?.id, fetchApprovedPosts, loadUserInteractions]);

  // Sync profile author name
  useEffect(() => {
    if (profile?.full_name && !authorName) setAuthorName(profile.full_name);
  }, [profile, authorName]);

  // Photo handlers
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

  // Submit Thought
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

      const { data, error } = await supabase.from('local_news').insert(newPostPayload).select().single();

      if (error) {
        const minimalPayload = {
          content: content.trim(),
          area: area.trim() || 'Betul',
          category,
          photo_url: uploadedPhotoUrl,
          author_name: authorName.trim() || profile?.full_name || 'Citizen',
          author_phone: profile?.phone || null,
          status: 'approved',
          likes_count: 0,
        };
        const fallbackRes = await supabase.from('local_news').insert(minimalPayload).select().single();
        if (fallbackRes.error) throw fallbackRes.error;
        if (fallbackRes.data) {
          setPosts((prev) => [fallbackRes.data, ...prev]);
        }
      } else if (data) {
        setPosts((prev) => [data, ...prev]);
      }

      showToast(
        language === 'hi'
          ? 'आपका विचार तुरंत पोस्ट हो गया!'
          : 'Your thought is posted to Betul feed!'
      );

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
        showToast(language === 'hi' ? 'फ़ॉलोअर्स के साथ साझा किया!' : 'Reshared to your feed!');
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

    const countKey = `followers_count_${targetAuthorId || authorSlug || 'anon'}`;
    const curCount = parseInt(localStorage.getItem(countKey) || '0', 10);
    localStorage.setItem(countKey, Math.max(0, curCount + (currentlyFollowing ? -1 : 1)).toString());

    showToast(
      currentlyFollowing
        ? (language === 'hi' ? 'अनफ़ॉलो किया गया' : 'Unfollowed')
        : (language === 'hi' ? 'फ़ॉलो कर रहे हैं!' : 'Following author!')
    );

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

  // Open User Profile Modal when clicking author circle
  const handleOpenUserProfile = async (post: LocalNews) => {
    let resolvedAuthorId = post.author_id;
    let author = post.author;

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

    // Record Profile View
    const authorId = resolvedAuthorId;
    const authorKey = authorId || authorSlug;
    const visitorToken = getVisitorToken();
    const isSelf = user?.id && authorId && user.id === authorId;
    const sessionViewKey = `profile_viewed_${authorKey}`;
    const alreadyViewedInSession = sessionStorage.getItem(sessionViewKey);
    const localViewsKey = `profile_views_${authorKey}`;
    let currentLocalViews = parseInt(localStorage.getItem(localViewsKey) || '0', 10);

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
    setLoadingComments((prev) => ({ ...prev, [postId]: true }));
    try {
      const { data, error } = await supabase
        .from('local_news_comments')
        .select('*')
        .eq('news_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setPostComments((prev) => ({ ...prev, [postId]: data || [] }));
    } catch (error) {
      console.error('Could not load comments:', error);
      const details = error && typeof error === 'object' && 'message' in error
        ? String(error.message)
        : String(error || 'Unknown database error');
      showToast(language === 'hi'
        ? `टिप्पणियां लोड नहीं हुईं: ${details}`
        : `Could not load comments: ${details}`);
    } finally {
      setLoadingComments((prev) => ({ ...prev, [postId]: false }));
    }
  };

  // Submit Comment
  const handleAddComment = async (postId: string) => {
    const text = (newCommentText[postId] || '').trim();
    if (!text) return;

    if (!user?.id) {
      showToast(language === 'hi' ? 'टिप्पणी करने के लिए लॉगिन करें।' : 'Please log in to comment.');
      return;
    }

    setSubmittingComment((prev) => ({ ...prev, [postId]: true }));

    try {
      const payload = {
        news_id: postId,
        user_id: user.id,
        author_name: profile?.full_name || authorName || 'Citizen',
        author_phone: profile?.phone || null,
        content: text,
      };

      const { error } = await supabase
        .from('local_news_comments')
        .insert(payload);

      if (error) throw error;

      const savedComment: LocalNewsComment = {
        id: `saved-${Date.now()}`,
        news_id: postId,
        user_id: user.id,
        author_name: payload.author_name,
        author_phone: payload.author_phone,
        content: text,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setPostComments((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), savedComment],
      }));
      setPosts((prev) => prev.map((post) =>
        post.id === postId ? { ...post, comments_count: (post.comments_count || 0) + 1 } : post
      ));
      setNewCommentText((prev) => ({ ...prev, [postId]: '' }));
    } catch (error) {
      console.error('Could not save comment:', error);
      const details = error && typeof error === 'object' && 'message' in error
        ? String(error.message)
        : String(error || 'Unknown database error');
      showToast(language === 'hi'
        ? `टिप्पणी सेव नहीं हुई: ${details}`
        : `Comment was not saved: ${details}`);
    } finally {
      setSubmittingComment((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const handleShare = async (post: LocalNews) => {
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
      showToast(language === 'hi' ? 'समाचार लिंक कॉपी हो गया!' : 'News link copied!');
    } catch {
      showToast(language === 'hi' ? 'समाचार साझा नहीं हो सका।' : 'Could not share this news.');
    }
  };

  // Toggle text expansion for Read More
  const toggleTweetText = (postId: string) => {
    setExpandedTweetIds((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return language === 'hi' ? 'अभी' : 'just now';
      if (diffMins < 60) return `${diffMins}m`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d`;
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
    <div className="x-page-root">
      <style>{`
        .x-page-root {
          min-height: 100vh;
          background: #f8fafc;
          padding-bottom: calc(72px + env(safe-area-inset-bottom));
          color: #0f1419;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }

        .x-feed-container {
          max-width: 620px;
          margin: 0 auto;
          background: #ffffff;
          min-height: 100vh;
          box-shadow: 0 0 24px rgba(0, 0, 0, 0.05);
          border-left: 1px solid #edf2f7;
          border-right: 1px solid #edf2f7;
        }

        /* Header */
        .x-page-header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(255, 255, 255, 0.94);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border-bottom: 1px solid #eff3f4;
        }

        .x-header-nav {
          padding: 10px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .x-header-title-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .x-back-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: none;
          background: transparent;
          color: #0f1419;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.15s;
        }
        .x-back-btn:hover {
          background: #f1f5f9;
        }

        .x-page-title {
          font-size: 1.15rem;
          font-weight: 800;
          margin: 0;
          color: #0f1419;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .x-header-compose-btn {
          padding: 6px 14px;
          border-radius: 99px;
          border: none;
          background: #146C94;
          color: #fff;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: background 0.15s;
        }
        .x-header-compose-btn:hover {
          background: #0E526F;
        }

        /* Tabs */
        .x-tabs {
          display: flex;
          border-bottom: 1px solid #eff3f4;
        }
        .x-tab-btn {
          flex: 1;
          padding: 12px 0;
          background: none;
          border: none;
          color: #536471;
          font-size: 0.9rem;
          font-weight: 700;
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
          color: #0f1419;
          font-weight: 800;
        }
        .x-tab-btn.is-active::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 48px;
          height: 3.5px;
          background: #146C94;
          border-radius: 99px;
        }

        /* Area Pills */
        .x-area-pills {
          padding: 8px 16px;
          display: flex;
          gap: 6px;
          overflow-x: auto;
          scrollbar-width: none;
          background: #fafafa;
          border-bottom: 1px solid #f1f5f9;
        }
        .x-area-pills::-webkit-scrollbar {
          display: none;
        }
        .x-area-pill {
          padding: 4px 12px;
          border-radius: 99px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          color: #475569;
          font-size: 0.76rem;
          font-weight: 600;
          white-space: nowrap;
          cursor: pointer;
          transition: all 0.15s;
        }
        .x-area-pill.is-active {
          background: #146C94;
          color: #ffffff;
          border-color: #146C94;
        }

        /* Composer */
        .x-compose-box {
          padding: 14px 16px;
          border-bottom: 8px solid #f8fafc;
          background: #ffffff;
        }
        .x-compose-row {
          display: flex;
          gap: 12px;
        }
        .x-avatar {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: linear-gradient(135deg, #146C94, #19A7CE);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 1rem;
          flex-shrink: 0;
        }
        .x-compose-input-area {
          flex: 1;
        }
        .x-compose-textarea {
          width: 100%;
          border: none;
          outline: none;
          resize: none;
          font-size: 0.98rem;
          font-family: inherit;
          color: #0f1419;
          min-height: 64px;
          background: transparent;
        }
        .x-compose-textarea::placeholder {
          color: #94a3b8;
        }
        .x-compose-options {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid #f1f5f9;
        }
        .x-category-chip {
          padding: 3px 10px;
          border-radius: 99px;
          font-size: 0.72rem;
          font-weight: 600;
          border: 1px solid #cbd5e1;
          background: #f8fafc;
          color: #475569;
          cursor: pointer;
        }
        .x-category-chip.is-active {
          background: #e0f2fe;
          border-color: #0284c7;
          color: #0369a1;
          font-weight: 700;
        }
        .x-compose-bottom-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 12px;
        }
        .x-compose-media-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 99px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #146C94;
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
        }
        .x-post-submit-btn {
          padding: 7px 18px;
          border-radius: 99px;
          border: none;
          background: #146C94;
          color: #fff;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .x-post-submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Tweet / Thought Item */
        .x-tweet {
          padding: 14px 16px;
          border-bottom: 1px solid #eff3f4;
          display: flex;
          gap: 12px;
          transition: background 0.15s;
        }
        .x-tweet:hover {
          background: #fafafa;
        }
        .x-tweet-author-circle {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: linear-gradient(135deg, #146C94, #19A7CE);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 1.05rem;
          flex-shrink: 0;
          cursor: pointer;
          transition: transform 0.15s;
        }
        .x-tweet-author-circle:hover {
          transform: scale(1.06);
        }
        .x-tweet-content {
          flex: 1;
          min-width: 0;
        }
        .x-tweet-header {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
          margin-bottom: 4px;
        }
        .x-tweet-name {
          font-weight: 800;
          color: #0f1419;
          font-size: 0.94rem;
          cursor: pointer;
        }
        .x-tweet-name:hover {
          text-decoration: underline;
        }
        .x-tweet-time {
          color: #536471;
          font-size: 0.8rem;
        }
        .x-tweet-area {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          color: #64748b;
          font-size: 0.74rem;
          margin-left: auto;
        }
        .x-tweet-follow-btn {
          margin-left: auto;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 10px;
          border-radius: 99px;
          font-size: 0.72rem;
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
          border-color: #cbd5e1;
          color: #334155;
        }
        .x-tweet-follow-btn.is-following:hover {
          background: #fee2e2;
          border-color: #fca5a5;
          color: #dc2626;
        }

        .x-tweet-text {
          font-size: 0.94rem;
          line-height: 1.5;
          color: #0f1419;
          white-space: pre-wrap;
          word-break: break-word;
          margin: 4px 0 8px;
        }
        .x-read-more-btn {
          background: transparent;
          border: none;
          color: #146C94;
          font-weight: 700;
          font-size: 0.82rem;
          cursor: pointer;
          padding: 0;
          margin-top: 4px;
          display: inline-block;
        }

        /* Citizen Photo Highlight */
        .x-tweet-photo-wrapper {
          position: relative;
          border-radius: 14px;
          overflow: hidden;
          margin: 8px 0 10px;
          border: 1px solid #e2e8f0;
          max-height: 380px;
          background: #000000;
        }
        .x-tweet-photo {
          width: 100%;
          max-height: 380px;
          object-fit: cover;
          display: block;
        }
        .x-tweet-photo-badge {
          position: absolute;
          top: 10px;
          left: 10px;
          background: rgba(15, 23, 42, 0.75);
          backdrop-filter: blur(4px);
          color: #ffffff;
          font-size: 0.7rem;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 99px;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        /* Action Row */
        .x-tweet-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          max-width: 420px;
          margin-top: 6px;
        }
        .x-action-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          border: none;
          color: #536471;
          font-size: 0.8rem;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 99px;
          transition: all 0.15s;
        }
        .x-action-btn:hover {
          background: rgba(20, 108, 148, 0.08);
          color: #146C94;
        }
        .x-action-btn.is-liked {
          color: #f43f5e;
        }
        .x-action-btn.is-reshared {
          color: #10b981;
        }

        /* Comments Box */
        .x-comments-thread {
          margin-top: 12px;
          padding-top: 10px;
          border-top: 1px solid #f1f5f9;
        }
        .x-comment-item {
          padding: 8px 0;
          border-bottom: 1px solid #f8fafc;
          font-size: 0.84rem;
        }
        .x-comment-author {
          font-weight: 700;
          color: #0f1419;
          margin-right: 6px;
        }
        .x-comment-text {
          color: #334155;
        }
        .x-comment-input-row {
          display: flex;
          gap: 8px;
          margin-top: 8px;
        }
        .x-comment-input {
          flex: 1;
          padding: 6px 12px;
          border: 1px solid #cbd5e1;
          border-radius: 99px;
          font-size: 0.82rem;
          outline: none;
        }
        .x-comment-send-btn {
          padding: 6px 12px;
          border-radius: 99px;
          border: none;
          background: #146C94;
          color: #fff;
          font-weight: 700;
          cursor: pointer;
        }

        /* Profile Modal */
        .x-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 2500;
          background: rgba(15, 23, 42, 0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }
        .x-modal-card {
          background: #ffffff;
          border-radius: 20px;
          width: 100%;
          max-width: 400px;
          overflow: hidden;
          box-shadow: 0 20px 48px rgba(0, 0, 0, 0.2);
        }
        .x-modal-banner {
          height: 90px;
          background: linear-gradient(135deg, #146C94, #19A7CE);
          position: relative;
        }
        .x-modal-close-btn {
          position: absolute;
          top: 10px;
          right: 10px;
          background: rgba(0, 0, 0, 0.45);
          color: #ffffff;
          border: none;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .x-modal-body {
          padding: 0 18px 18px;
        }
        .x-modal-avatar-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-top: -36px;
          margin-bottom: 12px;
        }
        .x-modal-big-avatar {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          border: 4px solid #ffffff;
          background: #146C94;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.8rem;
          font-weight: 900;
        }
        .x-profile-follow-btn {
          padding: 7px 18px;
          border-radius: 99px;
          border: 1px solid #0f1419;
          background: #0f1419;
          color: #ffffff;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
        }
        .x-profile-follow-btn.is-following {
          background: #ffffff;
          color: #0f1419;
          border-color: #cfd9de;
        }

        .x-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin: 16px 0;
          padding: 12px;
          background: #f8fafc;
          border-radius: 12px;
          text-align: center;
        }
        .x-stat-num {
          font-size: 1.1rem;
          font-weight: 900;
          color: #0f1419;
        }
        .x-stat-lbl {
          font-size: 0.7rem;
          color: #64748b;
          font-weight: 600;
        }

        .x-toast {
          position: fixed;
          bottom: calc(72px + env(safe-area-inset-bottom));
          left: 50%;
          transform: translateX(-50%);
          background: #0f1419;
          color: #ffffff;
          padding: 9px 18px;
          border-radius: 99px;
          font-size: 0.84rem;
          font-weight: 700;
          z-index: 3000;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.25);
        }
      `}</style>

      {/* Main Feed Column */}
      <div className="x-feed-container" ref={feedRef} onScroll={handleFeedScroll}>
        {/* Sticky Header */}
        <header className="x-page-header">
          <div className="x-header-nav">
            <div className="x-header-title-wrap">
              <button
                type="button"
                className="x-back-btn"
                onClick={() => navigate('/')}
                aria-label="Back to home"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="x-page-title">
                  <Radio size={17} color="#146C94" />
                  {language === 'hi' ? 'बैतूल समाचार' : 'Betul News'}
                </h1>
              </div>
            </div>

            <button
              type="button"
              className="x-header-compose-btn"
              onClick={() => setIsComposeOpen((prev) => !prev)}
            >
              <Sparkles size={14} />
              <span>{language === 'hi' ? 'समाचार पोस्ट करें' : 'Post News'}</span>
            </button>
          </div>

          {/* Twitter (X) Style Feed Tabs */}
          <div className="x-tabs">
            <button
              type="button"
              className={`x-tab-btn ${activeTab === 'for_you' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('for_you')}
            >
              {language === 'hi' ? 'ताज़ा विचार' : 'For You'}
            </button>
            <button
              type="button"
              className={`x-tab-btn ${activeTab === 'following' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('following')}
            >
              {language === 'hi' ? 'फ़ॉलो किए' : 'Following'}
            </button>
            <button
              type="button"
              className={`x-tab-btn ${activeTab === 'alerts' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('alerts')}
            >
              {language === 'hi' ? 'सूचनाएं' : 'Alerts'}
            </button>
          </div>

          {/* Area Selector Pills */}
          <div className="x-area-pills">
            {BETUL_AREAS.map((a) => (
              <button
                key={a}
                type="button"
                className={`x-area-pill ${selectedArea === a ? 'is-active' : ''}`}
                onClick={() => setSelectedArea(a)}
              >
                {a === 'All' ? (language === 'hi' ? 'सभी क्षेत्र' : 'All Betul') : a}
              </button>
            ))}
          </div>
        </header>

        {/* Compose Box (Collapsible or Active) */}
        {isComposeOpen && (
          <form className="x-compose-box" onSubmit={handleCreatePost}>
            <div className="x-compose-row">
              <div className="x-avatar">
                {authorName ? authorName[0].toUpperCase() : 'B'}
              </div>
              <div className="x-compose-input-area">
                <textarea
                  className="x-compose-textarea"
                  placeholder={
                    language === 'hi'
                      ? 'बेतूल में क्या चल रहा है? नागरिक विचार या समस्या साझा करें...'
                      : "What's happening in Betul? Share a civic thought or update..."
                  }
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={3}
                  maxLength={500}
                  autoFocus
                />

                {/* Photo Preview if attached */}
                {photoPreview && (
                  <div style={{ position: 'relative', margin: '8px 0', borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                    <img src={photoPreview} alt="Preview" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block' }} />
                    <button
                      type="button"
                      onClick={removePhoto}
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        background: 'rgba(0,0,0,0.6)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '50%',
                        width: 26,
                        height: 26,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                {/* Category selection chips */}
                <div className="x-compose-options">
                  {(Object.keys(CATEGORY_LABELS) as LocalNewsCategory[]).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      className={`x-category-chip ${category === cat ? 'is-active' : ''}`}
                      onClick={() => setCategory(cat)}
                    >
                      {CATEGORY_LABELS[cat][language === 'hi' ? 'hi' : 'en']}
                    </button>
                  ))}
                </div>

                {/* Bottom row actions */}
                <div className="x-compose-bottom-actions">
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
                      className="x-compose-media-btn"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImageIcon size={15} />
                      <span>{language === 'hi' ? 'फ़ोटो जोड़ें' : 'Add Photo'}</span>
                    </button>

                    <select
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      style={{
                        padding: '5px 10px',
                        borderRadius: 99,
                        border: '1px solid #e2e8f0',
                        fontSize: '0.76rem',
                        background: '#f8fafc',
                        color: '#475569',
                      }}
                    >
                      {BETUL_AREAS.filter((a) => a !== 'All').map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="x-post-submit-btn"
                    disabled={!content.trim() || isPosting || uploading}
                  >
                    <Send size={13} />
                    <span>{isPosting || uploading ? (language === 'hi' ? 'पोस्ट हो रहा...' : 'Posting...') : (language === 'hi' ? 'पोस्ट करें' : 'Post')}</span>
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* Feed List */}
        <div className="x-feed-list">
          {loading ? (
            <div style={{ padding: 20 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#e2e8f0' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ height: 14, width: '40%', background: '#e2e8f0', borderRadius: 4, marginBottom: 8 }} />
                    <div style={{ height: 12, width: '90%', background: '#f1f5f9', borderRadius: 4, marginBottom: 6 }} />
                    <div style={{ height: 12, width: '70%', background: '#f1f5f9', borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredPosts.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center' }}>
              <Radio size={40} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem', fontWeight: 800, color: '#334155' }}>
                {activeTab === 'following'
                  ? (language === 'hi' ? 'कोई फ़ॉलो किए विचार नहीं' : 'No followed thoughts yet')
                  : (language === 'hi' ? 'अभी कोई विचार नहीं हैं' : 'No thoughts found')}
              </h3>
              <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: '0.85rem' }}>
                {activeTab === 'following'
                  ? (language === 'hi' ? 'नागरिकों को फ़ॉलो करें ताकि उनके ताज़ा विचार यहाँ दिखें।' : 'Follow citizens to see their thoughts here.')
                  : (language === 'hi' ? 'पहला विचार साझा करके चर्चा शुरू करें।' : 'Be the first to share an update with Betul.')}
              </p>
              <button
                type="button"
                className="x-header-compose-btn"
                style={{ margin: '0 auto' }}
                onClick={() => setIsComposeOpen(true)}
              >
                <Sparkles size={14} />
                <span>{language === 'hi' ? 'समाचार साझा करें' : 'Post News'}</span>
              </button>
            </div>
          ) : (
            filteredPosts.map((post) => {
              const author = post.author;
              const isOfficial =
                author?.role === 'admin' ||
                author?.role === 'municipal_administrator' ||
                author?.role === 'dept_staff' ||
                author?.authority_role != null;

              const isExpanded = expandedTweetIds.has(post.id);
              const isLong = post.content && post.content.length > 135;
              const displayText = !isLong || isExpanded ? post.content : `${post.content.slice(0, 135).trim()}...`;
              const isFollowing = isAuthorFollowed(post.author_id, post.author_name);
              const isSelf = isSelfAuthor(post.author_id, post.author_name);

              return (
                <article className="x-tweet" key={post.id}>
                  {/* Clickable Author Avatar Circle -> Opens Profile Modal */}
                  <div
                    className="x-tweet-author-circle"
                    onClick={() => void handleOpenUserProfile(post)}
                    title={language === 'hi' ? 'प्रोफ़ाइल देखें' : 'View profile'}
                  >
                    {post.author_name ? post.author_name[0].toUpperCase() : 'B'}
                  </div>

                  <div className="x-tweet-content">
                    {/* Header line */}
                    <div className="x-tweet-header">
                      <span
                        className="x-tweet-name"
                        onClick={() => void handleOpenUserProfile(post)}
                      >
                        {post.author_name}
                      </span>

                      {isOfficial ? (
                        <ShieldCheck size={16} color="#15803d" />
                      ) : (
                        <CheckCircle2 size={15} color="#146C94" />
                      )}

                      <span className="x-tweet-time">· {formatTimeAgo(post.created_at)}</span>

                      <span className="x-tweet-area">
                        <MapPin size={11} />
                        {post.area}
                      </span>

                      {/* Direct Follow Button */}
                      {!isSelf && (
                        <button
                          type="button"
                          className={`x-tweet-follow-btn ${isFollowing ? 'is-following' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleToggleFollow(post.author_id, post.author_name);
                          }}
                          title={isFollowing ? 'Following' : 'Follow author'}
                        >
                          {isFollowing ? (
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

                    {/* Thought Content with Read More */}
                    <p className="x-tweet-text">{displayText}</p>
                    {isLong && (
                      <button
                        type="button"
                        className="x-read-more-btn"
                        onClick={() => toggleTweetText(post.id)}
                      >
                        {isExpanded
                          ? (language === 'hi' ? 'कम पढ़ें ▲' : 'Show less ▲')
                          : (language === 'hi' ? 'और पढ़ें ▼' : 'Read more ▼')}
                      </button>
                    )}

                    {/* Highlighted Citizen Photo */}
                    {post.photo_url && (
                      <div className="x-tweet-photo-wrapper">
                        <img
                          src={post.photo_url}
                          alt={post.content}
                          className="x-tweet-photo"
                          loading="lazy"
                        />
                        <div className="x-tweet-photo-badge">
                          <Camera size={12} />
                          <span>{language === 'hi' ? 'नागरिक फोटो' : 'Citizen Photo'}</span>
                        </div>
                      </div>
                    )}

                    {/* Action Row */}
                    <div className="x-tweet-actions">
                      {/* Like */}
                      <button
                        type="button"
                        className={`x-action-btn ${likedPostIds.has(post.id) ? 'is-liked' : ''}`}
                        onClick={() => void handleToggleLike(post.id)}
                        aria-label="Like"
                      >
                        <Heart
                          size={15}
                          fill={likedPostIds.has(post.id) ? '#f43f5e' : 'none'}
                        />
                        <span>{post.likes_count || 0}</span>
                      </button>

                      {/* Reshare */}
                      <button
                        type="button"
                        className={`x-action-btn ${resharedPostIds.has(post.id) ? 'is-reshared' : ''}`}
                        onClick={() => void handleToggleReshare(post.id)}
                        aria-label="Reshare"
                      >
                        <Repeat size={15} />
                        <span>{post.reshares_count || 0}</span>
                      </button>

                      {/* Comment */}
                      <button
                        type="button"
                        className="x-action-btn"
                        onClick={() => void toggleComments(post.id)}
                        aria-label="Comment"
                      >
                        <MessageCircle size={15} />
                        <span>{post.comments_count ?? 0}</span>
                      </button>

                      {/* Views */}
                      <div className="x-action-btn" style={{ cursor: 'default' }}>
                        <Eye size={15} />
                        <span>{Math.max(post.views_count || 1, 1)}</span>
                      </div>

                      {/* Share */}
                      <button
                        type="button"
                        className="x-action-btn"
                        onClick={() => void handleShare(post)}
                        aria-label={language === 'hi' ? 'समाचार साझा करें' : 'Share news'}
                        title={language === 'hi' ? 'समाचार साझा करें' : 'Share news'}
                      >
                        <Share2 size={15} />
                        <span>{language === 'hi' ? 'साझा करें' : 'Share'}</span>
                      </button>
                    </div>

                    {/* Comments Thread */}
                    {expandedCommentsPostId === post.id && (
                      <div className="x-comments-thread">
                        {loadingComments[post.id] ? (
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            {language === 'hi' ? 'टिप्पणियां लोड हो रही हैं...' : 'Loading comments...'}
                          </div>
                        ) : (
                          <>
                            {(postComments[post.id] || []).map((c) => (
                              <div key={c.id} className="x-comment-item">
                                <span className="x-comment-author">{c.author_name}</span>
                                <span className="x-comment-text">{c.content}</span>
                              </div>
                            ))}

                            <div className="x-comment-input-row">
                              <input
                                type="text"
                                className="x-comment-input"
                                placeholder={language === 'hi' ? 'एक टिप्पणी लिखें...' : 'Post a reply...'}
                                value={newCommentText[post.id] || ''}
                                onChange={(e) =>
                                  setNewCommentText((prev) => ({ ...prev, [post.id]: e.target.value }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') void handleAddComment(post.id);
                                }}
                              />
                              <button
                                type="button"
                                className="x-comment-send-btn"
                                disabled={submittingComment[post.id] || !(newCommentText[post.id] || '').trim()}
                                onClick={() => void handleAddComment(post.id)}
                              >
                                <Send size={13} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>

      {/* Author Profile Modal (Twitter X style) */}
      {viewingProfile && (
        <div
          className="x-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewingProfile(null);
          }}
        >
          <div className="x-modal-card">
            <div className="x-modal-banner">
              <button
                type="button"
                className="x-modal-close-btn"
                onClick={() => setViewingProfile(null)}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="x-modal-body">
              <div className="x-modal-avatar-row">
                <div className="x-modal-big-avatar">
                  {viewingProfile.name ? viewingProfile.name[0].toUpperCase() : 'B'}
                </div>

                {/* Follow Button */}
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
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f1419' }}>
                  {viewingProfile.name}
                </h3>
                {viewingProfile.isOfficial ? (
                  <ShieldCheck size={18} color="#15803d" />
                ) : (
                  <CheckCircle2 size={17} color="#146C94" />
                )}
              </div>

              <div style={{ color: '#536471', fontSize: '0.82rem', marginBottom: 10 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><span className="material-symbols-rounded" style={{ fontSize: 14 }}>location_on</span>{viewingProfile.ward || 'Betul'}</span> ·{' '}
                {viewingProfile.authority_role || (viewingProfile.isOfficial ? 'नगर पालिका अधिकारी' : 'नागरिक')}
              </div>

              {/* Social Stats Grid */}
              <div className="x-stats-grid">
                <div>
                  <div className="x-stat-num">{profileFollowerCount}</div>
                  <div className="x-stat-lbl">{language === 'hi' ? 'फ़ॉलोअर्स' : 'Followers'}</div>
                </div>
                <div>
                  <div className="x-stat-num">
                    {posts.filter((p) => p.author_name === viewingProfile.name).length}
                  </div>
                  <div className="x-stat-lbl">{language === 'hi' ? 'विचार' : 'Thoughts'}</div>
                </div>
                <div>
                  <div className="x-stat-num">{Math.max(profileViewCount, 1)}</div>
                  <div className="x-stat-lbl">{language === 'hi' ? 'व्यूज़' : 'Views'}</div>
                </div>
                <div>
                  <div className="x-stat-num">
                    {posts.filter((p) => p.author_name === viewingProfile.name && (p.likes_count || 0) > 0)
                      .reduce((acc, p) => acc + (p.likes_count || 0), 0)}
                  </div>
                  <div className="x-stat-lbl">{language === 'hi' ? 'लाइक्स' : 'Likes'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && <div className="x-toast">{toastMessage}</div>}

      {/* Persistent Bottom Navigation - always visible on all devices */}
      {(isPosting && photoFile) && (
        <ArcLoader
          mode="floating" position="bottom"
          theme="portal"
          status={language === 'hi' ? 'फोटो व विचार अपलोड हो रहा है' : 'Uploading Photo & Thought'}
          subtitle={statusText || (language === 'hi' ? 'क्लाउड सर्वर पर फोटो सुरक्षित जा रही है...' : 'Syncing community photo to municipal feed...')}
          percent={progress}
          photoCount={{ current: 1, total: 1 }}
        />
      )}

      <BottomNav />
    </div>
  );
};

export default LocalNewsPage;
