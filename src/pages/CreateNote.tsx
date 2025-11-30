import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ArrowLeft } from 'lucide-react';
import { NOTE_ICON_LIST } from '../utils/noteIcons';

type CreateNoteProps = {
  onBack: () => void;
  onCreated: (noteId: string) => void;
};

export const CreateNote = ({ onBack, onCreated }: CreateNoteProps) => {
  const { profile } = useAuth();
  const [title, setTitle] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !profile) return;

    setError('');
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          title: title.trim(),
          owner_id: profile.id,
          icon: selectedIcon,
          archived: false,
        })
        .select()
        .single();

      if (error) throw error;

      onCreated(data.id);
    } catch (error: any) {
      console.error('Error creating note:', error);
      setError('Not oluşturulurken bir hata oluştu');
      setLoading(false);
    }
  };

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
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-6 md:mb-8">Yeni Not Oluştur</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Not Başlığı
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Örn: Elektrik İşleri, Alışveriş Listesi..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                İkon Seçin (Opsiyonel)
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 md:gap-3">
                {NOTE_ICON_LIST.map((noteIcon) => {
                  const IconComponent = noteIcon.icon;
                  return (
                    <button
                      key={noteIcon.id}
                      type="button"
                      onClick={() => setSelectedIcon(selectedIcon === noteIcon.id ? null : noteIcon.id)}
                      className={`p-3 md:p-4 rounded-xl border-2 transition-all ${
                        selectedIcon === noteIcon.id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300 bg-white'
                      }`}
                    >
                      <IconComponent
                        size={20}
                        className={`mx-auto mb-1 md:w-6 md:h-6 ${
                          selectedIcon === noteIcon.id ? 'text-purple-600' : 'text-gray-600'
                        }`}
                      />
                      <div
                        className={`text-xs font-medium text-center ${
                          selectedIcon === noteIcon.id ? 'text-purple-600' : 'text-gray-600'
                        }`}
                      >
                        {noteIcon.label}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <div className="text-red-500 text-sm bg-red-50 p-3 rounded-xl">{error}</div>
            )}

            <div className="flex gap-2 md:gap-3">
              <button
                type="button"
                onClick={onBack}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 md:py-3 md:px-6 rounded-xl transition-all text-sm md:text-base"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={loading || !title.trim()}
                className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold py-2 px-4 md:py-3 md:px-6 rounded-xl transition-all duration-200 shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
              >
                {loading ? 'Oluşturuluyor...' : 'Oluştur'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
