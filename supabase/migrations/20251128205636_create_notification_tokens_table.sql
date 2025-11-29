/*
  # Add Push Notification Tokens Table

  1. New Tables
    - `notification_tokens`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `token` (text, push notification token)
      - `device_type` (text, ios/android/web)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `notification_tokens` table
    - Add policy for users to manage their own notification tokens
    - Only authenticated users can insert/update/delete their own tokens
*/

CREATE TABLE IF NOT EXISTS notification_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  token text NOT NULL,
  device_type text NOT NULL DEFAULT 'web',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, token)
);

ALTER TABLE notification_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification tokens"
  ON notification_tokens FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification tokens"
  ON notification_tokens FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification tokens"
  ON notification_tokens FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notification tokens"
  ON notification_tokens FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
