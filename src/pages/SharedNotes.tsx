import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, NoteWithStats } from '../lib/supabase';
import { NoteCard } from '../components/NoteCard';
import { ArrowLeft, Users } from 'lucide-react';

type SharedNotesProps = {
  onBack: () => void;
  onSelectNote: (noteId: string) => void;
};

export const SharedNotes = ({ onBack, onSelectNote }: SharedNotesProps) => {
  const { profile } = useAuth();
  const [notes, setNotes] = useState<NoteWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      loadSharedNotes();

      const sharedNotesChannel = supabase
        .channel('shared-notes-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notes'
          },
          () => {
            loadSharedNotes();
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
            loadSharedNotes();
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
            loadSharedNotes();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(sharedNotesChannel);
      };
    }
  }, [profile?.id]);

  const loadSharedNotes = async () => {
    if (!profile?.id) return;

    try {
      const { data: myShares, error: sharesError } = await supabase
        .from('note_shares')
        .select('note_id')
        .eq('user_id', profile.id);

      if (sharesError) throw sharesError;

      if (!myShares || myShares.length === 0) {
        setNotes([]);
        setLoading(false);
        return;
      }

      const noteIds = myShares.map(s => s.note_id);

      const { data: sharedNotes, error: notesError } = await supabase
        .from('notes')
        .select(`
          *,
          owner:profiles!notes_owner_id_fkey(id, first_name, last_name, avatar_url)
        `)
        .in('id', noteIds)
        .eq('archived', false);

      if (notesError) throw notesError;

      const notesWithStats = await Promise.all(
        (sharedNotes || []).map(async (note: any) => {
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

      setNotes(notesWithStats);
    } catch (error) {
      console.error('Error loading shared notes:', error);
    } finally {
      setLoading(false);
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
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="font-medium">Geri</span>
        </button>

        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-purple-500/30">
              <Users size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Ortak Notlar</h1>
              <p className="text-gray-500">Sizinle paylaşılan notlar</p>
            </div>
          </div>
        </div>

        {notes.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users size={32} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Henüz paylaşılan not yok</h3>
            <p className="text-gray-500">
              Başka kullanıcılar sizinle not paylaştığında burada görünecek
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {notes.map((note) => (
              <NoteCard key={note.id} note={note} onClick={() => onSelectNote(note.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
