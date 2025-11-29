/*
  # Shared To-Do List Application Schema

  ## Overview
  This migration creates the complete database schema for a collaborative to-do list application.
  Users can create notes containing multiple tasks and share them with other users.

  ## New Tables

  ### 1. profiles
  Extends auth.users with additional user information
  - `id` (uuid, primary key) - References auth.users
  - `first_name` (text) - User's first name
  - `last_name` (text) - User's last name
  - `avatar_url` (text) - URL to user's avatar image
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last profile update timestamp

  ### 2. notes
  Main notes/projects that contain tasks
  - `id` (uuid, primary key) - Unique note identifier
  - `title` (text) - Note title
  - `owner_id` (uuid) - References profiles(id)
  - `created_at` (timestamptz) - Note creation timestamp
  - `updated_at` (timestamptz) - Last note update timestamp

  ### 3. tasks
  Individual tasks within a note
  - `id` (uuid, primary key) - Unique task identifier
  - `note_id` (uuid) - References notes(id)
  - `title` (text) - Task description
  - `completed` (boolean) - Task completion status
  - `order` (integer) - Display order within note
  - `created_by` (uuid) - References profiles(id)
  - `created_at` (timestamptz) - Task creation timestamp
  - `updated_at` (timestamptz) - Last task update timestamp

  ### 4. note_shares
  Manages shared access to notes
  - `id` (uuid, primary key) - Unique share identifier
  - `note_id` (uuid) - References notes(id)
  - `user_id` (uuid) - References profiles(id)
  - `permission` (text) - 'viewer' or 'editor'
  - `created_at` (timestamptz) - Share creation timestamp

  ## Security
  - All tables have Row Level Security (RLS) enabled
  - Users can only access their own profiles
  - Users can manage notes they own
  - Users can view/edit notes shared with them based on permissions
  - Tasks inherit permissions from their parent note
  - Share records can only be managed by note owners

  ## Indexes
  - Foreign key indexes for optimal query performance
  - Composite index on note_shares for efficient permission lookups
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create notes table
CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  title text NOT NULL,
  completed boolean DEFAULT false,
  "order" integer DEFAULT 0,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create note_shares table
CREATE TABLE IF NOT EXISTS note_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  permission text NOT NULL CHECK (permission IN ('viewer', 'editor')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(note_id, user_id)
);

ALTER TABLE note_shares ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notes_owner ON notes(owner_id);
CREATE INDEX IF NOT EXISTS idx_tasks_note ON tasks(note_id);
CREATE INDEX IF NOT EXISTS idx_note_shares_note ON note_shares(note_id);
CREATE INDEX IF NOT EXISTS idx_note_shares_user ON note_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_note_shares_lookup ON note_shares(note_id, user_id);

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS Policies for notes
CREATE POLICY "Users can view own notes"
  ON notes FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Users can view shared notes"
  ON notes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM note_shares
      WHERE note_shares.note_id = notes.id
      AND note_shares.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own notes"
  ON notes FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Note owners can update their notes"
  ON notes FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Note owners can delete their notes"
  ON notes FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- RLS Policies for tasks
CREATE POLICY "Users can view tasks in their notes"
  ON tasks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM notes
      WHERE notes.id = tasks.note_id
      AND notes.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can view tasks in shared notes"
  ON tasks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM note_shares
      JOIN notes ON notes.id = note_shares.note_id
      WHERE notes.id = tasks.note_id
      AND note_shares.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert tasks in own notes"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM notes
      WHERE notes.id = tasks.note_id
      AND notes.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert tasks in notes with editor permission"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM note_shares
      WHERE note_shares.note_id = tasks.note_id
      AND note_shares.user_id = auth.uid()
      AND note_shares.permission = 'editor'
    )
  );

CREATE POLICY "Users can update tasks in own notes"
  ON tasks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM notes
      WHERE notes.id = tasks.note_id
      AND notes.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM notes
      WHERE notes.id = tasks.note_id
      AND notes.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update tasks with editor permission"
  ON tasks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM note_shares
      WHERE note_shares.note_id = tasks.note_id
      AND note_shares.user_id = auth.uid()
      AND note_shares.permission = 'editor'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM note_shares
      WHERE note_shares.note_id = tasks.note_id
      AND note_shares.user_id = auth.uid()
      AND note_shares.permission = 'editor'
    )
  );

CREATE POLICY "Users can delete tasks in own notes"
  ON tasks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM notes
      WHERE notes.id = tasks.note_id
      AND notes.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete tasks with editor permission"
  ON tasks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM note_shares
      WHERE note_shares.note_id = tasks.note_id
      AND note_shares.user_id = auth.uid()
      AND note_shares.permission = 'editor'
    )
  );

-- RLS Policies for note_shares
CREATE POLICY "Users can view shares for their notes"
  ON note_shares FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM notes
      WHERE notes.id = note_shares.note_id
      AND notes.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own shares"
  ON note_shares FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Note owners can create shares"
  ON note_shares FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM notes
      WHERE notes.id = note_shares.note_id
      AND notes.owner_id = auth.uid()
    )
  );

CREATE POLICY "Note owners can update shares"
  ON note_shares FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM notes
      WHERE notes.id = note_shares.note_id
      AND notes.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM notes
      WHERE notes.id = note_shares.note_id
      AND notes.owner_id = auth.uid()
    )
  );

CREATE POLICY "Note owners can delete shares"
  ON note_shares FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM notes
      WHERE notes.id = note_shares.note_id
      AND notes.owner_id = auth.uid()
    )
  );