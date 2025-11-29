/*
  # Allow Users to Leave Shared Notes

  ## Changes
  Add RLS policy to allow users to delete their own share records from note_shares table.
  This allows users to leave notes that were shared with them.

  ## Security
  - Users can only delete their own share records (where user_id = auth.uid())
  - Note owners retain the ability to delete any share record for their notes
  - This breaks the limitation where only note owners could manage shares
*/

-- Allow users to delete their own share records
CREATE POLICY "Users can delete their own shares"
  ON note_shares FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
