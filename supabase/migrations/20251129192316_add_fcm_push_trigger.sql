/*
  # Add FCM Push Notification Trigger

  1. Changes
    - Create a trigger function that automatically sends FCM push notifications
    - Trigger fires on INSERT to notifications table
    - Fetches FCM tokens for the user
    - Calls the send-notification edge function
    
  2. Purpose
    - Ensure push notifications are sent even when notifications are created directly in DB
    - Automatic FCM push for all new notifications
*/

-- Create function to send FCM push notification via edge function
CREATE OR REPLACE FUNCTION send_fcm_push_notification()
RETURNS TRIGGER AS $$
DECLARE
  fcm_tokens text[];
  supabase_url text;
  supabase_anon_key text;
BEGIN
  -- Get FCM tokens for the user
  SELECT array_agg(token) INTO fcm_tokens
  FROM notification_tokens
  WHERE user_id = NEW.user_id;

  -- Only proceed if we have tokens
  IF fcm_tokens IS NOT NULL AND array_length(fcm_tokens, 1) > 0 THEN
    -- Get Supabase URL and key from environment
    supabase_url := current_setting('app.settings.supabase_url', true);
    supabase_anon_key := current_setting('app.settings.supabase_anon_key', true);
    
    -- Call edge function (async, fire and forget)
    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/send-notification-fcm',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || supabase_anon_key,
        'apikey', supabase_anon_key
      ),
      body := jsonb_build_object(
        'tokens', fcm_tokens,
        'title', NEW.title,
        'body', NEW.body,
        'noteId', NEW.note_id
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_notification_created ON notifications;
CREATE TRIGGER on_notification_created
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION send_fcm_push_notification();
