-- ==============================================================================
-- SUPABASE MIGRATION: CONNECT USER_PROFILES TO LOCAL_NEWS & TWITTER-STYLE SOCIAL FEATURES
-- ==============================================================================
-- Tables created/modified:
-- 1. public.local_news -> adds author_id (FK to user_profiles), views_count, reshares_count, comments_count
-- 2. public.local_news_likes -> track user likes per post (prevents duplicate likes)
-- 3. public.local_news_comments -> threaded comments / replies per post
-- 4. public.local_news_reshares -> retweets / reshares to followers
-- 5. public.local_news_views -> track unique or total views
-- 6. public.user_follows -> follow / unfollow network for Betul citizens & officials
-- ==============================================================================

-- 1. ALTER local_news TABLE TO LINK TO user_profiles
DO $$ 
BEGIN
  -- Add author_id FK to user_profiles
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'local_news' AND column_name = 'author_id'
  ) THEN
    ALTER TABLE public.local_news 
      ADD COLUMN author_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL;
  END IF;

  -- Add views_count
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'local_news' AND column_name = 'views_count'
  ) THEN
    ALTER TABLE public.local_news 
      ADD COLUMN views_count INTEGER NOT NULL DEFAULT 0;
  END IF;

  -- Add reshares_count
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'local_news' AND column_name = 'reshares_count'
  ) THEN
    ALTER TABLE public.local_news 
      ADD COLUMN reshares_count INTEGER NOT NULL DEFAULT 0;
  END IF;

  -- Add comments_count
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'local_news' AND column_name = 'comments_count'
  ) THEN
    ALTER TABLE public.local_news 
      ADD COLUMN comments_count INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_local_news_author_id ON public.local_news(author_id);
CREATE INDEX IF NOT EXISTS idx_local_news_category ON public.local_news(category);

-- 2. LIKES TABLE (Per-user tracking like Twitter Heart)
CREATE TABLE IF NOT EXISTS public.local_news_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  news_id UUID NOT NULL REFERENCES public.local_news(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT local_news_likes_unique UNIQUE (news_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_local_news_likes_news_id ON public.local_news_likes(news_id);
CREATE INDEX IF NOT EXISTS idx_local_news_likes_user_id ON public.local_news_likes(user_id);

ALTER TABLE public.local_news_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view likes" ON public.local_news_likes;
CREATE POLICY "Anyone can view likes" ON public.local_news_likes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can like" ON public.local_news_likes;
CREATE POLICY "Authenticated users can like" ON public.local_news_likes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove their like" ON public.local_news_likes;
CREATE POLICY "Users can remove their like" ON public.local_news_likes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 3. COMMENTS TABLE (Replies / Thoughts thread)
CREATE TABLE IF NOT EXISTS public.local_news_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  news_id UUID NOT NULL REFERENCES public.local_news(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_phone TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_local_news_comments_news_id ON public.local_news_comments(news_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_local_news_comments_user_id ON public.local_news_comments(user_id);

ALTER TABLE public.local_news_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view approved news comments" ON public.local_news_comments;
CREATE POLICY "Anyone can view approved news comments" ON public.local_news_comments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can comment" ON public.local_news_comments;
CREATE POLICY "Authenticated users can comment" ON public.local_news_comments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own comment" ON public.local_news_comments;
CREATE POLICY "Users can delete their own comment" ON public.local_news_comments
  FOR DELETE TO authenticated USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 4. RESHARES TABLE (Retweets / Reshare to your feed & followers)
CREATE TABLE IF NOT EXISTS public.local_news_reshares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  news_id UUID NOT NULL REFERENCES public.local_news(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  quote_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT local_news_reshares_unique UNIQUE (news_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_local_news_reshares_news_id ON public.local_news_reshares(news_id);
CREATE INDEX IF NOT EXISTS idx_local_news_reshares_user_id ON public.local_news_reshares(user_id);

ALTER TABLE public.local_news_reshares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view reshares" ON public.local_news_reshares;
CREATE POLICY "Anyone can view reshares" ON public.local_news_reshares
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can reshare" ON public.local_news_reshares;
CREATE POLICY "Authenticated users can reshare" ON public.local_news_reshares
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can undo reshare" ON public.local_news_reshares;
CREATE POLICY "Users can undo reshare" ON public.local_news_reshares
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 5. VIEWS TABLE (Impressions / View count tracking)
CREATE TABLE IF NOT EXISTS public.local_news_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  news_id UUID NOT NULL REFERENCES public.local_news(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  viewer_ip_hash TEXT,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_local_news_views_news_id ON public.local_news_views(news_id);

ALTER TABLE public.local_news_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can record views" ON public.local_news_views;
CREATE POLICY "Anyone can record views" ON public.local_news_views
  FOR INSERT WITH CHECK (true);

-- 6. FOLLOWS TABLE (Twitter-like follower / following social graph)
CREATE TABLE IF NOT EXISTS public.user_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_follows_unique UNIQUE (follower_id, following_id),
  CONSTRAINT user_follows_no_self CHECK (follower_id <> following_id)
);

CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON public.user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON public.user_follows(following_id);

ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view follows" ON public.user_follows;
CREATE POLICY "Anyone can view follows" ON public.user_follows
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can follow" ON public.user_follows;
CREATE POLICY "Users can follow" ON public.user_follows
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Users can unfollow" ON public.user_follows;
CREATE POLICY "Users can unfollow" ON public.user_follows
  FOR DELETE TO authenticated USING (auth.uid() = follower_id);

-- 7. TRIGGERS TO MAINTAIN AGGREGATE COUNTS ON local_news
-- Comments count trigger
CREATE OR REPLACE FUNCTION public.handle_local_news_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.local_news 
    SET comments_count = COALESCE(comments_count, 0) + 1 
    WHERE id = NEW.news_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.local_news 
    SET comments_count = GREATEST(0, COALESCE(comments_count, 0) - 1) 
    WHERE id = OLD.news_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_local_news_comment_count ON public.local_news_comments;
CREATE TRIGGER trigger_local_news_comment_count
AFTER INSERT OR DELETE ON public.local_news_comments
FOR EACH ROW EXECUTE FUNCTION public.handle_local_news_comment_count();

-- Reshares count trigger
CREATE OR REPLACE FUNCTION public.handle_local_news_reshare_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.local_news 
    SET reshares_count = COALESCE(reshares_count, 0) + 1 
    WHERE id = NEW.news_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.local_news 
    SET reshares_count = GREATEST(0, COALESCE(reshares_count, 0) - 1) 
    WHERE id = OLD.news_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_local_news_reshare_count ON public.local_news_reshares;
CREATE TRIGGER trigger_local_news_reshare_count
AFTER INSERT OR DELETE ON public.local_news_reshares
FOR EACH ROW EXECUTE FUNCTION public.handle_local_news_reshare_count();

-- Likes count trigger (updates likes_count from local_news_likes table)
CREATE OR REPLACE FUNCTION public.handle_local_news_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.local_news 
    SET likes_count = COALESCE(likes_count, 0) + 1 
    WHERE id = NEW.news_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.local_news 
    SET likes_count = GREATEST(0, COALESCE(likes_count, 0) - 1) 
    WHERE id = OLD.news_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_local_news_like_count ON public.local_news_likes;
CREATE TRIGGER trigger_local_news_like_count
AFTER INSERT OR DELETE ON public.local_news_likes
FOR EACH ROW EXECUTE FUNCTION public.handle_local_news_like_count();

-- 8. HELPER RPC FUNCTIONS
CREATE OR REPLACE FUNCTION public.increment_local_news_view(target_news_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.local_news
  SET views_count = COALESCE(views_count, 0) + 1
  WHERE id = target_news_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_local_news_view(UUID) TO anon, authenticated;

-- 9. USER PROFILE VIEWS TRACKING
CREATE TABLE IF NOT EXISTS public.user_profile_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  viewer_token TEXT,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_profile_views_profile_id ON public.user_profile_views(profile_id);

ALTER TABLE public.user_profile_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view profile views" ON public.user_profile_views;
CREATE POLICY "Anyone can view profile views" ON public.user_profile_views
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can record profile view" ON public.user_profile_views;
CREATE POLICY "Anyone can record profile view" ON public.user_profile_views
  FOR INSERT WITH CHECK (true);

-- RPC to record profile view from different visitors
CREATE OR REPLACE FUNCTION public.record_user_profile_view(target_profile_id UUID, viewer_user_id UUID DEFAULT NULL, visitor_token TEXT DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Prevent recording self-view if logged in
  IF viewer_user_id IS NOT NULL AND target_profile_id = viewer_user_id THEN
    RETURN;
  END IF;

  INSERT INTO public.user_profile_views (profile_id, viewer_id, viewer_token)
  VALUES (target_profile_id, viewer_user_id, visitor_token);
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_user_profile_view(UUID, UUID, TEXT) TO anon, authenticated;
GRANT ALL ON public.user_profile_views TO anon, authenticated;

-- Grant access on all new tables to public / authenticated
GRANT ALL ON public.local_news_likes TO anon, authenticated;
GRANT ALL ON public.local_news_comments TO anon, authenticated;
GRANT ALL ON public.local_news_reshares TO anon, authenticated;
GRANT ALL ON public.local_news_views TO anon, authenticated;
GRANT ALL ON public.user_follows TO anon, authenticated;
