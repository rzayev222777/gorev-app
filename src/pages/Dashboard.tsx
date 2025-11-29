import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Note, NoteWithStats } from '../lib/supabase';
import { NoteCard } from '../components/NoteCard';
import { AvatarIcon } from '../components/AvatarIcon';
import { Plus, LogOut, Users, Settings, FileText, Share2, Archive } from 'lucide-react';

type DashboardProps = {
  onSelectNote: (noteId: string) => void;
  onCreateNote: () => void;
  onViewShared: () => void;
  onSettings: () => void;
};

type FilterType = 'own' | 'shared' | 'archived';

export const Dashboard = ({ onSelectNote, onCreateNote, onViewShared, onSettings }: DashboardProps) => {
  const { profile, signOut } = useAuth();
  const [notes, setNotes] = useState<NoteWithStats[]>([]);
  const [allNotes, setAllNotes] = useState<NoteWithStats[]>([]);
  const [archivedNotes, setArchivedNotes] = useState<NoteWithStats[]>([]);
  const [sharedNotesCount, setSharedNotesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('own');

  useEffect(() => {
    if (profile?.id) {
      loadNotes();
      loadArchivedNotes();
      loadSharedNotesCount();

      const notesChannel = supabase
        .channel('notes-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notes'
          },
          () => {
            loadNotes();
            loadArchivedNotes();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'note_shares'
          },
          () => {
            loadNotes();
            loadSharedNotesCount();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tasks'
          },
          () => {
            loadNotes();
            loadArchivedNotes();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(notesChannel);
      };
    }
  }, [profile?.id]);

  useEffect(() => {
    filterNotes();
  }, [activeFilter, allNotes, archivedNotes]);

  const loadNotes = async () => {
    if (!profile?.id) return;

    try {
      const { data: ownNotesData, error: ownError } = await supabase
        .from('notes')
        .select(`
          *,
          owner:profiles!notes_owner_id_fkey(id, first_name, last_name, avatar_url)
        `)
        .eq('owner_id', profile.id)
        .eq('archived', false)
        .order('updated_at', { ascending: false });

      if (ownError) throw ownError;

      const { data: sharedNotesData, error: sharedError } = await supabase
        .from('note_shares')
        .select(`
          note:notes!note_shares_note_id_fkey(
            *,
            owner:profiles!notes_owner_id_fkey(id, first_name, last_name, avatar_url)
          )
        `)
        .eq('user_id', profile.id);

      if (sharedError) throw sharedError;

      const ownNotesWithShareInfo = await Promise.all(
        (ownNotesData || []).map(async (note) => {
          const { data: shares } = await supabase
            .from('note_shares')
            .select('id')
            .eq('note_id', note.id);

          return {
            ...note,
            is_shared: shares && shares.length > 0,
          };
        })
      );

      const sharedByOthers = (sharedNotesData || [])
        .filter((share: any) => share.note && share.note.owner_id !== profile.id)
        .map((share: any) => ({ ...share.note, is_shared: true }));

      const allNotes = [...ownNotesWithShareInfo, ...sharedByOthers];

      const notesWithStats = await Promise.all(
        allNotes.map(async (note) => {
          const { data: tasks } = await supabase
            .from('tasks')
            .select('id, completed')
            .eq('note_id', note.id);

          const { data: shares } = await supabase
            .from('note_shares')
            .select(`
              id,
              user:profiles!note_shares_user_id_fkey(id, first_name, last_name, avatar_url)
            `)
            .eq('note_id', note.id);

          return {
            ...note,
            total_tasks: tasks?.length || 0,
            completed_tasks: tasks?.filter((t) => t.completed).length || 0,
            shared_users: shares?.map((s: any) => s.user) || [],
          };
        })
      );

      notesWithStats.sort((a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );

      setAllNotes(notesWithStats);
    } catch (error) {
      console.error('Error loading notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadArchivedNotes = async () => {
    if (!profile?.id) return;

    try {
      const { data: archivedData, error } = await supabase
        .from('notes')
        .select(`
          *,
          owner:profiles!notes_owner_id_fkey(id, first_name, last_name, avatar_url)
        `)
        .eq('owner_id', profile.id)
        .eq('archived', true)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const notesWithStats = await Promise.all(
        (archivedData || []).map(async (note) => {
          const { data: tasks } = await supabase
            .from('tasks')
            .select('id, completed')
            .eq('note_id', note.id);

          const { data: shares } = await supabase
            .from('note_shares')
            .select(`
              id,
              user:profiles!note_shares_user_id_fkey(id, first_name, last_name, avatar_url)
            `)
            .eq('note_id', note.id);

          return {
            ...note,
            is_shared: false,
            total_tasks: tasks?.length || 0,
            completed_tasks: tasks?.filter((t) => t.completed).length || 0,
            shared_users: shares?.map((s: any) => s.user) || [],
          };
        })
      );

      setArchivedNotes(notesWithStats);
    } catch (error) {
      console.error('Error loading archived notes:', error);
    }
  };

  const filterNotes = () => {
    if (activeFilter === 'own') {
      setNotes(allNotes.filter(note => !note.is_shared));
    } else if (activeFilter === 'shared') {
      setNotes(allNotes.filter(note => note.is_shared));
    } else if (activeFilter === 'archived') {
      setNotes(archivedNotes);
    }
  };

  const handleArchive = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from('notes')
        .update({ archived: true })
        .eq('id', noteId);

      if (error) throw error;

      setAllNotes(allNotes.filter(note => note.id !== noteId));
      loadArchivedNotes();
    } catch (error) {
      console.error('Error archiving note:', error);
    }
  };

  const handleUnarchive = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from('notes')
        .update({ archived: false })
        .eq('id', noteId);

      if (error) throw error;

      setArchivedNotes(archivedNotes.filter(note => note.id !== noteId));
      loadNotes();
    } catch (error) {
      console.error('Error unarchiving note:', error);
    }
  };

  const loadSharedNotesCount = async () => {
    if (!profile?.id) return;

    try {
      const { count } = await supabase
        .from('note_shares')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id);

      setSharedNotesCount(count || 0);
    } catch (error) {
      console.error('Error loading shared notes count:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-purple-200 rounded-full"></div>
            <div className="w-16 h-16 border-4 border-purple-600 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
          </div>
          <p className="text-gray-600 font-medium">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-purple-500/30">
                <AvatarIcon avatarId={profile?.avatar_url || null} size={32} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Merhaba,</p>
                <h1 className="text-xl font-bold text-gray-900">
                  {profile?.first_name}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onSettings}
                className="p-3 hover:bg-gray-100 rounded-xl transition-colors"
                title="Ayarlar"
              >
                <Settings size={20} className="text-gray-600" />
              </button>
              <button
                onClick={signOut}
                className="p-3 hover:bg-gray-100 rounded-xl transition-colors"
                title="Çıkış Yap"
              >
                <LogOut size={20} className="text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center flex-wrap gap-4">
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl shadow-md border border-gray-100 flex-wrap justify-center">
            <button
              onClick={() => setActiveFilter('own')}
              className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-medium transition-all min-w-[90px] sm:min-w-[100px] ${
                activeFilter === 'own'
                  ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <FileText size={18} />
              <span className="text-sm sm:text-base">Benim</span>
            </button>
            <button
              onClick={() => setActiveFilter('shared')}
              className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-medium transition-all min-w-[90px] sm:min-w-[100px] ${
                activeFilter === 'shared'
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Share2 size={18} />
              <span className="text-sm sm:text-base">Paylaşılan</span>
            </button>
            <button
              onClick={() => setActiveFilter('archived')}
              className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-medium transition-all min-w-[90px] sm:min-w-[100px] ${
                activeFilter === 'archived'
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Archive size={18} />
              <span>Arşiv</span>
            </button>
          </div>
          <button
            onClick={onCreateNote}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold py-2 px-4 md:py-3 md:px-6 rounded-xl transition-all duration-200 shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 text-sm md:text-base"
          >
            <Plus size={18} />
            <span className="whitespace-nowrap">Yeni Not</span>
          </button>
        </div>

        {notes.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus size={32} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Henüz not yok</h3>
            <p className="text-gray-500 mb-6">Hemen ilk notunuzu oluşturun</p>
            <button
              onClick={onCreateNote}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40"
            >
              <Plus size={20} />
              Not Oluştur
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {notes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onClick={() => onSelectNote(note.id)}
                onArchive={handleArchive}
                onUnarchive={handleUnarchive}
                showArchiveButton={activeFilter !== 'archived'}
                showUnarchiveButton={activeFilter === 'archived'}
                currentUserId={profile?.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
