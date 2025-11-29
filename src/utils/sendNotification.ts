import { supabase } from '../lib/supabase';

interface SendNotificationParams {
  userIds: string[];
  title: string;
  body: string;
  noteId?: string;
}

/**
 * Creates notification records in the database via Supabase Edge Function.
 * 
 * IMPORTANT: This function does NOT send FCM push notifications directly.
 * It calls the Supabase Edge Function which inserts notification records into
 * the notifications table. The database trigger (send_fcm_push_notification)
 * will automatically send exactly one FCM push notification per notification
 * record inserted.
 * 
 * @param userIds - Array of user IDs to notify
 * @param title - Notification title
 * @param body - Notification body text
 * @param noteId - Optional note ID to link the notification to
 */
export async function sendNotification({ userIds, title, body, noteId }: SendNotificationParams) {
  try {
    if (!userIds || userIds.length === 0) {
      console.warn('⚠️ No user IDs provided for notification');
      return;
    }

    console.log('📤 Creating notification records for users:', userIds);
    console.log('📧 Title:', title, 'Body:', body);

    // Call the Edge Function to create notification records
    // The database trigger will automatically send FCM push notifications
    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: {
        userIds,
        title,
        body,
        noteId,
      },
    });

    if (error) {
      console.error('❌ Error creating notification records:', error);
      return;
    }

    console.log(`✅ Created ${data?.count || 0} notification record(s)`);
    console.log('📱 FCM push notifications will be sent automatically by database trigger');
  } catch (error) {
    console.error('❌ Error creating notifications:', error);
  }
}
