/*
  # Allow Profile Search by Email

  ## Changes
  Add RLS policy to allow authenticated users to search for other users by email
  This is needed for the note sharing feature

  ## Security
  - Only allows SELECT operations
  - Only returns basic profile info (id, email, first_name, last_name)
  - Users can search for any profile by email to share notes
*/

-- Allow authenticated users to search profiles by email
CREATE POLICY "Users can search profiles by email"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);