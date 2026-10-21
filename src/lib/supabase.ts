import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || 'https://ywwkivrdjyaoovfsxnzp.supabase.co';
export const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 'sb_publishable_sqCEWLArxZ9DCngFQtuXLw_iZJh2Kmw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      departments: {
        Row: Department;
        Insert: Omit<Department, 'id' | 'created_at'>;
        Update: Partial<Omit<Department, 'id'>>;
      };
      complaints: {
        Row: Complaint;
        Insert: Omit<Complaint, 'id' | 'created_at' | 'updated_at' | 'ticket_number'>;
        Update: Partial<Omit<Complaint, 'id' | 'created_at'>>;
      };
      resolutions: {
        Row: Resolution;
        Insert: Omit<Resolution, 'id' | 'resolved_at'>;
        Update: Partial<Omit<Resolution, 'id'>>;
      };
      verifications: {
        Row: Verification;
        Insert: Omit<Verification, 'id' | 'verified_at'>;
        Update: Partial<Omit<Verification, 'id'>>;
      };
      local_news: {
        Row: LocalNews;
        Insert: Omit<LocalNews, 'id' | 'created_at' | 'updated_at' | 'likes_count'> & { likes_count?: number };
        Update: Partial<Omit<LocalNews, 'id' | 'created_at'>>;
      };
    };
  };
};

export interface Department {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  is_active: boolean;
  created_at: string;
}

export type ComplaintStatus = 'pending' | 'in_progress' | 'resolved' | 'verified' | 'rejected';

export interface Complaint {
  id: string;
  ticket_number: string;
  department_id: string;
  citizen_name: string | null;
  citizen_phone: string | null;
  description: string;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  photo_url: string | null;
  status: ComplaintStatus;
  created_at: string;
  updated_at: string;
  // joined
  department?: Department;
}

export interface Resolution {
  id: string;
  complaint_id: string;
  admin_note: string;
  resolution_photo_url: string | null;
  resolved_by: string;
  resolved_at: string;
}

export interface Verification {
  id: string;
  complaint_id: string;
  verified_by: 'citizen' | 'admin';
  is_satisfied: boolean;
  note: string | null;
  verified_at: string;
}

export type LocalNewsStatus = 'pending' | 'approved' | 'rejected';
export type LocalNewsCategory = 'news' | 'alert' | 'event' | 'thought' | 'general';

export interface LocalNewsAuthor {
  id: string;
  full_name?: string | null;
  phone?: string | null;
  ward_number?: string | null;
  role?: string | null;
  email?: string | null;
  authority_role?: string | null;
}

export interface LocalNews {
  id: string;
  author_id?: string | null;
  author_name: string;
  author_phone?: string | null;
  area: string;
  category: LocalNewsCategory;
  title?: string | null;
  content: string;
  photo_url?: string | null;
  status: LocalNewsStatus;
  approved_by?: string | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  likes_count: number;
  views_count?: number;
  reshares_count?: number;
  comments_count?: number;
  created_at: string;
  updated_at: string;
  author?: LocalNewsAuthor;
}

export interface LocalNewsComment {
  id: string;
  news_id: string;
  user_id: string;
  author_name: string;
  author_phone?: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  author?: LocalNewsAuthor;
}

export interface LocalNewsLike {
  id: string;
  news_id: string;
  user_id: string;
  created_at: string;
}

export interface LocalNewsReshare {
  id: string;
  news_id: string;
  user_id: string;
  quote_comment?: string | null;
  created_at: string;
  author?: LocalNewsAuthor;
  news?: LocalNews;
}

export interface UserFollow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}
