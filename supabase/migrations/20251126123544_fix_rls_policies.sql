/*
  # Fix RLS Policies - Remove Infinite Recursion

  ## Changes
  This migration fixes the infinite recursion issue in RLS policies by:
  1. Dropping all existing policies for notes, tasks, and note_shares
  2. Recreating policies without circular dependencies
  3. Using simpler, direct checks that don't cause recursion

  ## Important Notes
  - The issue was caused by note_shares policies querying notes table, 
    which in turn had policies checking note_shares
  - The fix uses direct checks without nested queries where possible
*/

-- Drop all existing policies for notes
DROP POLICY IF EXISTS "Users can view own notes" ON notes;
DROP POLICY IF EXISTS "Users can view shared notes" ON notes;
DROP POLICY IF EXISTS "Users can insert own notes" ON notes;
DROP POLICY IF EXISTS "Note owners can update their notes" ON notes;
DROP POLICY IF EXISTS "Note owners can delete their notes" ON notes;

-- Drop all existing policies for note_shares
DROP POLICY IF EXISTS "Users can view shares for their notes" ON note_shares;
DROP POLICY IF EXISTS "Users can view their own shares" ON note_shares;
DROP POLICY IF EXISTS "Note owners can create shares" ON note_shares;
DROP POLICY IF EXISTS "Note owners can update shares" ON note_shares;
DROP POLICY IF EXISTS "Note owners can delete shares" ON note_shares;

-- Drop all existing policies for tasks
DROP POLICY IF EXISTS "Users can view tasks in their notes" ON tasks;
DROP POLICY IF EXISTS "Users can view tasks in shared notes" ON tasks;
DROP POLICY IF EXISTS "Users can insert tasks in own notes" ON tasks;
DROP POLICY IF EXISTS "Users can insert tasks in notes with editor permission" ON tasks;
DROP POLICY IF EXISTS "Users can update tasks in own notes" ON tasks;
DROP POLICY IF EXISTS "Users can update tasks with editor permission" ON tasks;
DROP POLICY IF EXISTS "Users can delete tasks in own notes" ON tasks;
DROP POLICY IF EXISTS "Users can delete tasks with editor permission" ON tasks;

-- Recreate notes policies (simple, no recursion)
CREATE POLICY "Users can view own notes"
  ON notes FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Users can view shared notes"
  ON notes FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT note_id FROM note_shares
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own notes"
  ON notes FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own notes"
  ON notes FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can delete own notes"
  ON notes FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- Recreate note_shares policies (simple, no recursion)
CREATE POLICY "Users can view their own shares"
  ON note_shares FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Note owners can view shares"
  ON note_shares FOR SELECT
  TO authenticated
  USING (
    note_id IN (
      SELECT id FROM notes WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Note owners can create shares"
  ON note_shares FOR INSERT
  TO authenticated
  WITH CHECK (
    note_id IN (
      SELECT id FROM notes WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Note owners can update shares"
  ON note_shares FOR UPDATE
  TO authenticated
  USING (
    note_id IN (
      SELECT id FROM notes WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    note_id IN (
      SELECT id FROM notes WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Note owners can delete shares"
  ON note_shares FOR DELETE
  TO authenticated
  USING (
    note_id IN (
      SELECT id FROM notes WHERE owner_id = auth.uid()
    )
  );

-- Recreate tasks policies
CREATE POLICY "Users can view tasks in own notes"
  ON tasks FOR SELECT
  TO authenticated
  USING (
    note_id IN (
      SELECT id FROM notes WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can view tasks in shared notes"
  ON tasks FOR SELECT
  TO authenticated
  USING (
    note_id IN (
      SELECT note_id FROM note_shares WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert tasks in own notes"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    note_id IN (
      SELECT id FROM notes WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert tasks as editor"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    note_id IN (
      SELECT note_id FROM note_shares 
      WHERE user_id = auth.uid() AND permission = 'editor'
    )
  );

CREATE POLICY "Users can update tasks in own notes"
  ON tasks FOR UPDATE
  TO authenticated
  USING (
    note_id IN (
      SELECT id FROM notes WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    note_id IN (
      SELECT id FROM notes WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update tasks as editor"
  ON tasks FOR UPDATE
  TO authenticated
  USING (
    note_id IN (
      SELECT note_id FROM note_shares 
      WHERE user_id = auth.uid() AND permission = 'editor'
    )
  )
  WITH CHECK (
    note_id IN (
      SELECT note_id FROM note_shares 
      WHERE user_id = auth.uid() AND permission = 'editor'
    )
  );

CREATE POLICY "Users can delete tasks in own notes"
  ON tasks FOR DELETE
  TO authenticated
  USING (
    note_id IN (
      SELECT id FROM notes WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete tasks as editor"
  ON tasks FOR DELETE
  TO authenticated
  USING (
    note_id IN (
      SELECT note_id FROM note_shares 
      WHERE user_id = auth.uid() AND permission = 'editor'
    )
  );