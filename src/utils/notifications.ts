import { supabase } from '../lib/supabase';
import { messaging, getToken } from '../lib/firebase';

export async function requestNotificationPermission(userId: string): Promise<boolean> {
  console.log('📱 Starting notification permission request...');
  console.log('User Agent:', navigator.userAgent);

  if (!('Notification' in window)) {
    console.error('❌ Notification API not supported');
    alert('Bu tarayıcı bildirimleri desteklemiyor');
    return false;
  }

  if (!('serviceWorker' in navigator)) {
    console.error('❌ Service Worker not supported');
    alert('Bu tarayıcı service worker desteklemiyor');
    return false;
  }

  try {
    // Check if messaging is initialized
    if (!messaging) {
      console.error('❌ Firebase Messaging not initialized');
      alert('Firebase Messaging başlatılamadı. Lütfen sayfayı yenileyin.');
      return false;
    }

    console.log('Requesting notification permission...');
    const permission = await Notification.requestPermission();
    console.log('Permission result:', permission);

    if (permission !== 'granted') {
      console.warn('⚠️ Notification permission denied');
      alert('Bildirim izni reddedildi. Lütfen tarayıcı ayarlarından izin verin.');
      return false;
    }

    console.log('Registering Firebase Messaging Service Worker...');
    let registration = await navigator.serviceWorker.getRegistration('/firebase-cloud-messaging-push-scope');

    if (!registration) {
      console.log('Firebase SW not found, registering...');
      registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/firebase-cloud-messaging-push-scope'
      });
      console.log('✅ Firebase SW registered:', registration);
    } else {
      console.log('✅ Firebase SW already registered:', registration);
    }

    await registration.update();
    console.log('Waiting for SW to be ready...');
    await navigator.serviceWorker.ready;

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    console.log('VAPID Key:', vapidKey ? `${vapidKey.substring(0, 20)}...` : '❌ MISSING');

    if (!vapidKey) {
      console.error('❌ VAPID key is missing');
      alert('VAPID key bulunamadı. Lütfen .env dosyasını kontrol edin.');
      return false;
    }

    console.log('Getting FCM token with Firebase SW...');
    const fcmToken = await getToken(messaging, {
      vapidKey: vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (!fcmToken) {
      console.error('❌ Failed to get FCM token');
      alert('FCM token alınamadı');
      return false;
    }

    console.log('FCM Token received:', fcmToken.substring(0, 20) + '...');
    console.log('Saving token to database...');

    // First, delete all old tokens for this user
    console.log('Deleting old tokens for user:', userId);
    const { error: deleteError, count } = await supabase
      .from('notification_tokens')
      .delete({ count: 'exact' })
      .eq('user_id', userId);

    if (deleteError) {
      console.error('❌ Delete error:', deleteError);
    } else {
      console.log(`✅ Deleted ${count || 0} old tokens`);
    }

    // Then insert the new token
    console.log('Inserting new token...');
    const { error: insertError } = await supabase
      .from('notification_tokens')
      .insert({
        user_id: userId,
        token: fcmToken,
        device_type: 'web',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('❌ Token insert error:', insertError);
      alert('Token kaydedilemedi: ' + insertError.message);
      return false;
    }

    console.log('✅ Notification setup complete!');
    alert('Bildirimler başarıyla etkinleştirildi!');
    return true;
  } catch (error) {
    console.error('❌ Notification setup error:', error);
    alert('Bildirim hatası: ' + (error as Error).message);
    return false;
  }
}

export async function checkNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    return false;
  }
  return Notification.permission === 'granted';
}

export async function unregisterNotifications(userId: string): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const token = JSON.stringify(subscription);
        await supabase
          .from('notification_tokens')
          .delete()
          .eq('user_id', userId)
          .eq('token', token);

        await subscription.unsubscribe();
      }
    }
  } catch (error) {
    console.error('Bildirim kaydı silinemedi:', error);
  }
}
