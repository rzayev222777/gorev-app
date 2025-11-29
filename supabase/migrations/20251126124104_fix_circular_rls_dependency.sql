/*
  # Fix Circular RLS Dependency

  ## Problem
  There's a circular dependency between notes and note_shares RLS policies:
  - notes SELECT policy checks note_shares table
  - note_shares policies check notes table
  This causes infinite recursion errors

  ## Solution
  Break the circular dependency by using a security definer function
  that bypasses RLS to check ownership

  ## Changes
  1. Create a security definer function to check note ownership
  2. Update note_shares policies to use this function
  3. Keep notes policies simple (no subqueries to note_shares)
*/

-- Create a security definer function to check if user owns a note
CREATE OR REPLACE FUNCTION public.user_owns_note(note_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.notes
    WHERE id = note_id AND owner_id = auth.uid()
  );
$$;

-- Drop and recreate note_shares policies using the function
DROP POLICY IF EXISTS "Note owners can view shares" ON note_shares;
DROP POLICY IF EXISTS "Note owners can create shares" ON note_shares;
DROP POLICY IF EXISTS "Note owners can update shares" ON note_shares;
DROP POLICY IF EXISTS "Note owners can delete shares" ON note_shares;

CREATE POLICY "Note owners can view shares"
  ON note_shares FOR SELECT
  TO authenticated
  USING (public.user_owns_note(note_id));

CREATE POLICY "Note owners can create shares"
  ON note_shares FOR INSERT
  TO authenticated
  WITH CHECK (public.user_owns_note(note_id));

CREATE POLICY "Note owners can update shares"
  ON note_shares FOR UPDATE
  TO authenticated
  USING (public.user_owns_note(note_id))
  WITH CHECK (public.user_owns_note(note_id));

CREATE POLICY "Note owners can delete shares"
  ON note_shares FOR DELETE
  TO authenticated
  USING (public.user_owns_note(note_id));