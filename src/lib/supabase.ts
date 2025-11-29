import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Note = {
  id: string;
  title: string;
  owner_id: string;
  archived: boolean;
  icon: string | null;
  created_at: string;
  updated_at: string;
};

export type Task = {
  id: string;
  note_id: string;
  title: string;
  completed: boolean;
  order: number;
  created_by: string;
  completed_by?: string | null;
  created_at: string;
  updated_at: string;
};

export type NoteShare = {
  id: string;
  note_id: string;
  user_id: string;
  permission: 'viewer' | 'editor';
  created_at: string;
};

export type NoteWithStats = Note & {
  total_tasks: number;
  completed_tasks: number;
  owner: Profile;
  shared_users?: Profile[];
  is_shared?: boolean;
};
