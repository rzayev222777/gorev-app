import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  ArrowLeft, Save, Cat, Dog, Bird, Fish, Rabbit, Squirrel,
  PawPrint, Bug, Crown, Snail, Shell, BookOpen, Bell, BellOff
} from 'lucide-react';
import { requestNotificationPermission, checkNotificationPermission, unregisterNotifications } from '../utils/notifications';

type SettingsProps = {
  onBack: () => void;
};

const AVATAR_ICONS = [
  { id: 'cat', icon: Cat, label: 'Kedi' },
  { id: 'dog', icon: Dog, label: 'Köpek' },
  { id: 'bird', icon: Bird, label: 'Kuş' },
  { id: 'fish', icon: Fish, label: 'Balık' },
  { id: 'rabbit', icon: Rabbit, label: 'Tavşan' },
  { id: 'squirrel', icon: Squirrel, label: 'Sincap' },
  { id: 'paw', icon: PawPrint, label: 'Pati' },
  { id: 'bug', icon: Bug, label: 'Böcek' },
  { id: 'lion', icon: Crown, label: 'Aslan' },
  { id: 'snail', icon: Snail, label: 'Salyangoz' },
  { id: 'shell', icon: Shell, label: 'Kabuk' },
  { id: 'book', icon: BookOpen, label: 'Kitap' },
];

export const Settings = ({ onBack }: SettingsProps) => {
  const { profile } = useAuth();
  const [firstName, setFirstName] = useState(profile?.first_name || '');
  const [lastName, setLastName] = useState(profile?.last_name || '');
  const [selectedAvatar, setSelectedAvatar] = useState(profile?.avatar_url || 'cat');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false);

  useEffect(() => {
    checkNotificationStatus();
  }, []);

  const checkNotificationStatus = async () => {
    const enabled = await checkNotificationPermission();
    setNotificationsEnabled(enabled);
  };

  const toggleNotifications = async () => {
    if (!profile) return;

    setNotificationLoading(true);
    try {
      if (notificationsEnabled) {
        await unregisterNotifications(profile.id);
        setNotificationsEnabled(false);
        setSuccess('Bildirimler kapatıldı');
      } else {
        const success = await requestNotificationPermission(profile.id);
        if (success) {
          setNotificationsEnabled(true);
          setSuccess('Bildirimler açıldı! Artık paylaşım ve görev güncellemelerini alacaksınız.');
        } else {
          setError('Bildirim izni verilemedi. Lütfen tarayıcı ayarlarınızı kontrol edin.');
        }
      }
      setTimeout(() => {
        setSuccess('');
        setError('');
      }, 3000);
    } catch (error) {
      console.error('Notification toggle error:', error);
      setError('Bir hata oluştu');
    } finally {
      setNotificationLoading(false);
    }
  };

  const testNotification = async () => {
    if (!profile || !notificationsEnabled) {
      alert('Önce bildirimleri etkinleştirin!');
      return;
    }

    console.log('🧪 Testing notification...');

    // Test via service worker
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && registration.active) {
        console.log('Sending test notification via service worker');
        registration.active.postMessage({
          type: 'SHOW_NOTIFICATION',
          title: 'Test Bildirimi',
          body: 'Bildirimler çalışıyor! 🎉',
          noteId: null,
        });
        alert('Test bildirimi gönderildi! Service Worker üzerinden gösterilecek.');
        return;
      }
    }

    // Fallback to direct notification
    console.log('Sending test notification directly');
    new Notification('Test Bildirimi', {
      body: 'Bildirimler çalışıyor! 🎉',
      icon: '/logogorev.png',
      badge: '/logogorev.png',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          avatar_url: selectedAvatar,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      if (error) throw error;

      setSuccess('Profiliniz başarıyla güncellendi!');

      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setError('Profil güncellenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const currentIcon = AVATAR_ICONS.find(a => a.id === selectedAvatar) || AVATAR_ICONS[0];
  const CurrentIconComponent = currentIcon.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="font-medium">Geri</span>
        </button>

        <div className="bg-white rounded-3xl p-4 md:p-8 shadow-lg border border-gray-100">
          <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-purple-500/30">
              <CurrentIconComponent size={24} className="md:w-8 md:h-8" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">Ayarlar</h1>
              <p className="text-sm md:text-base text-gray-500">Profil bilgilerinizi düzenleyin</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                  Ad
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all"
                  placeholder="Adınız"
                />
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                  Soyad
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all"
                  placeholder="Soyadınız"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Avatar Seçin
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 md:gap-3">
                {AVATAR_ICONS.map((avatar) => {
                  const IconComponent = avatar.icon;
                  return (
                    <button
                      key={avatar.id}
                      type="button"
                      onClick={() => setSelectedAvatar(avatar.id)}
                      className={`p-2 md:p-3 rounded-xl border-2 transition-all ${
                        selectedAvatar === avatar.id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300 bg-white'
                      }`}
                    >
                      <IconComponent
                        size={28}
                        className={`mx-auto mb-1 ${
                          selectedAvatar === avatar.id ? 'text-purple-600' : 'text-gray-600'
                        }`}
                      />
                      <div
                        className={`text-xs font-medium text-center ${
                          selectedAvatar === avatar.id ? 'text-purple-600' : 'text-gray-600'
                        }`}
                      >
                        {avatar.label}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Bildirimler
              </label>
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {notificationsEnabled ? (
                      <Bell size={24} className="text-purple-600" />
                    ) : (
                      <BellOff size={24} className="text-gray-400" />
                    )}
                    <div>
                      <div className="font-medium text-gray-900">
                        Push Bildirimleri
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {notificationsEnabled
                          ? 'Görev ve paylaşım bildirimleri aktif'
                          : 'Bildirimleri aktif etmek için açın'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={toggleNotifications}
                    disabled={notificationLoading}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 ${
                      notificationsEnabled ? 'bg-purple-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                {notificationsEnabled && (
                  <button
                    type="button"
                    onClick={testNotification}
                    className="w-full py-2 px-4 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    Test Bildirimi Gönder
                  </button>
                )}
              </div>
            </div>

            {error && (
              <div className="text-red-500 text-sm bg-red-50 p-3 rounded-xl">{error}</div>
            )}

            {success && (
              <div className="text-green-600 text-sm bg-green-50 p-3 rounded-xl">{success}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Save size={20} />
              {loading ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
