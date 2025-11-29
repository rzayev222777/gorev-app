import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Task, Note, NoteShare, Profile } from '../lib/supabase';
import { TaskItem } from '../components/TaskItem';
import { ArrowLeft, Plus, Share2, Users, Archive, Edit3, Trash2, MoreVertical, X } from 'lucide-react';
import { getNoteIcon, NOTE_ICON_LIST } from '../utils/noteIcons';

type NoteDetailProps = {
  noteId: string;
  onBack: () => void;
};

export const NoteDetail = ({ noteId, onBack }: NoteDetailProps) => {
  const { profile } = useAuth();
  const [note, setNote] = useState<Note | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState('');
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [permission, setPermission] = useState<'viewer' | 'editor' | 'owner'>('viewer');
  const [sharedUsers, setSharedUsers] = useState<(NoteShare & { user: Profile })[]>([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showShareManagement, setShowShareManagement] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editIcon, setEditIcon] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});

  useEffect(() => {
    loadNote();
    loadTasks();
    checkPermission();
    loadSharedUsers();

    const noteChannel = supabase
      .channel(`note-${noteId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notes',
          filter: `id=eq.${noteId}`
        },
        () => {
          loadNote();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `note_id=eq.${noteId}`
        },
        () => {
          loadTasks();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'note_shares',
          filter: `note_id=eq.${noteId}`
        },
        () => {
          loadSharedUsers();
          checkPermission();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(noteChannel);
    };
  }, [noteId]);

  const loadNote = async () => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('id', noteId)
        .single();

      if (error) throw error;
      setNote(data);
      setIsOwner(data.owner_id === profile?.id);
    } catch (error) {
      console.error('Error loading note:', error);
    }
  };

  const loadTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('note_id', noteId)
        .order('order', { ascending: true });

      if (error) throw error;
      setTasks(data || []);

      const uniqueUserIds = [...new Set(data?.filter(t => t.completed_by).map(t => t.completed_by) || [])];
      if (uniqueUserIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('*')
          .in('id', uniqueUserIds);

        if (profilesData) {
          const profileMap: Record<string, Profile> = {};
          profilesData.forEach(p => {
            profileMap[p.id] = p;
          });
          setProfiles(profileMap);
        }
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkPermission = async () => {
    if (!profile) return;

    try {
      const { data: noteData } = await supabase
        .from('notes')
        .select('owner_id')
        .eq('id', noteId)
        .single();

      if (noteData?.owner_id === profile.id) {
        setPermission('owner');
        return;
      }

      const { data: shareData } = await supabase
        .from('note_shares')
        .select('permission')
        .eq('note_id', noteId)
        .eq('user_id', profile.id)
        .maybeSingle();

      if (shareData) {
        setPermission(shareData.permission);
      }
    } catch (error) {
      console.error('Error checking permission:', error);
    }
  };

  const loadSharedUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('note_shares')
        .select(`
          *,
          user:profiles!note_shares_user_id_fkey(*)
        `)
        .eq('note_id', noteId);

      if (error) throw error;
      setSharedUsers(data || []);
    } catch (error) {
      console.error('Error loading shared users:', error);
    }
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim() || !profile) return;

    try {
      const maxOrder = tasks.length > 0 ? Math.max(...tasks.map((t) => t.order)) : -1;

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          note_id: noteId,
          title: newTask.trim(),
          order: maxOrder + 1,
          created_by: profile.id,
        })
        .select()
        .single();

      if (error) throw error;

      setTasks([...tasks, data]);
      setNewTask('');

      await supabase
        .from('notes')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', noteId);

      // Notifications are now handled by Supabase trigger automatically
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  const toggleTask = async (taskId: string, completed: boolean) => {
    try {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      const { error } = await supabase
        .from('tasks')
        .update({
          completed,
          completed_by: completed ? profile?.id : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (error) throw error;

      setTasks(tasks.map((t) => (t.id === taskId ? { ...t, completed, completed_by: completed ? profile?.id : null } : t)));

      await supabase
        .from('notes')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', noteId);

      // Notifications are now handled by Supabase trigger automatically
    } catch (error) {
      console.error('Error toggling task:', error);
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);

      if (error) throw error;

      setTasks(tasks.filter((t) => t.id !== taskId));

      await supabase
        .from('notes')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', noteId);
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const archiveNote = async () => {
    if (!isOwner) return;

    try {
      const { error } = await supabase
        .from('notes')
        .update({ archived: true })
        .eq('id', noteId);

      if (error) throw error;
      onBack();
    } catch (error) {
      console.error('Error archiving note:', error);
    }
  };

  const updateNote = async () => {
    if (!isOwner) return;

    try {
      const { error } = await supabase
        .from('notes')
        .update({
          title: editTitle.trim(),
          icon: editIcon,
          updated_at: new Date().toISOString(),
        })
        .eq('id', noteId);

      if (error) throw error;

      setNote({ ...note!, title: editTitle.trim(), icon: editIcon });
      setShowEditModal(false);
    } catch (error) {
      console.error('Error updating note:', error);
    }
  };

  const deleteNote = async () => {
    if (!isOwner) return;
    if (!confirm('Bu notu silmek istediğinizden emin misiniz?')) return;

    try {
      const { error } = await supabase.from('notes').delete().eq('id', noteId);
      if (error) throw error;
      onBack();
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const updateSharePermission = async (shareId: string, newPermission: 'viewer' | 'editor') => {
    try {
      const { error } = await supabase
        .from('note_shares')
        .update({ permission: newPermission })
        .eq('id', shareId);

      if (error) throw error;
      loadSharedUsers();
    } catch (error) {
      console.error('Error updating permission:', error);
    }
  };

  const removeShare = async (shareId: string) => {
    try {
      const { error } = await supabase.from('note_shares').delete().eq('id', shareId);
      if (error) throw error;
      loadSharedUsers();
    } catch (error) {
      console.error('Error removing share:', error);
    }
  };

  const leaveNote = async () => {
    if (!profile || isOwner) return;
    if (!confirm('Bu nottan ayrılmak istediğinizden emin misiniz?')) return;

    try {
      const { data, error } = await supabase
        .from('note_shares')
        .delete()
        .eq('note_id', noteId)
        .eq('user_id', profile.id)
        .select();

      if (error) {
        console.error('Delete error:', error);
        throw error;
      }

      console.log('Successfully deleted share:', data);
      onBack();
    } catch (error) {
      console.error('Error leaving note:', error);
      alert('Nottan ayrılırken bir hata oluştu');
    }
  };

  const canEdit = permission === 'owner' || permission === 'editor';
  const completedCount = tasks.filter((t) => t.completed).length;
  const completionPercentage = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;
  const NoteIcon = getNoteIcon(note?.icon || null);

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
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="font-medium">Geri</span>
          </button>

          <div className="flex items-center gap-2">
            {isOwner ? (
              <>
                <button
                  onClick={() => setShowShareModal(true)}
                  className="flex items-center gap-2 bg-white border border-gray-200 hover:border-purple-300 text-gray-700 font-medium py-2 px-4 rounded-xl transition-all"
                >
                  <Share2 size={18} />
                  <span className="hidden sm:inline">Paylaş</span>
                </button>
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-2 bg-white border border-gray-200 hover:border-purple-300 rounded-xl transition-all"
                  >
                    <MoreVertical size={20} className="text-gray-700" />
                  </button>
                  {showMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-10">
                      <button
                        onClick={() => {
                          setEditTitle(note?.title || '');
                          setEditIcon(note?.icon || null);
                          setShowEditModal(true);
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                      >
                        <Edit3 size={16} />
                        Düzenle
                      </button>
                      {completionPercentage === 100 && tasks.length > 0 && (
                        <button
                          onClick={() => {
                            archiveNote();
                            setShowMenu(false);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-green-600"
                        >
                          <Archive size={16} />
                          Arşivle
                        </button>
                      )}
                      <button
                        onClick={() => {
                          deleteNote();
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-red-50 flex items-center gap-2 text-red-600"
                      >
                        <Trash2 size={16} />
                        Sil
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <button
                onClick={leaveNote}
                className="flex items-center gap-2 bg-white border border-red-200 hover:border-red-300 text-red-600 font-medium py-2 px-4 rounded-xl transition-all"
              >
                <X size={18} />
                <span className="hidden sm:inline">Nottan Ayrıl</span>
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-4 md:p-8 shadow-lg border border-gray-100">
          <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                {note?.icon && <NoteIcon size={24} className="flex-shrink-0 text-gray-700" />}
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 break-words">{note?.title}</h1>
              </div>
              {!canEdit && (
                <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs md:text-sm">
                  {permission === 'viewer' ? 'Sadece Görüntüleme' : 'Düzenleyebilirsiniz'}
                </div>
              )}
            </div>
            {sharedUsers.length > 0 && isOwner && (
              <button
                onClick={() => setShowShareManagement(true)}
                className="flex items-center gap-2 bg-purple-50 hover:bg-purple-100 text-purple-600 px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-sm transition-all"
              >
                <Users size={16} />
                <span className="font-medium">{sharedUsers.length}</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 md:gap-4 mb-6 md:mb-8">
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl md:rounded-2xl p-2 md:p-4">
              <div className="text-purple-600 text-xs md:text-sm font-medium mb-1">Toplam</div>
              <div className="text-xl md:text-3xl font-bold text-purple-700">{tasks.length}</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl md:rounded-2xl p-2 md:p-4">
              <div className="text-green-600 text-xs md:text-sm font-medium mb-1">Tamamlandı</div>
              <div className="text-xl md:text-3xl font-bold text-green-700">{completedCount}</div>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl md:rounded-2xl p-2 md:p-4">
              <div className="text-orange-600 text-xs md:text-sm font-medium mb-1">Bekliyor</div>
              <div className="text-xl md:text-3xl font-bold text-orange-700">{tasks.length - completedCount}</div>
            </div>
          </div>

          {canEdit && (
            <form onSubmit={addTask} className="mb-6">
              <div className="flex gap-2 md:gap-3">
                <input
                  type="text"
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  placeholder="Yeni görev ekle..."
                  className="flex-1 px-3 py-2 md:px-4 md:py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all text-sm md:text-base"
                />
                <button
                  type="submit"
                  className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold py-2 px-4 md:py-3 md:px-6 rounded-xl transition-all duration-200 shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 flex items-center gap-1 md:gap-2 text-sm md:text-base whitespace-nowrap"
                >
                  <Plus size={18} />
                  <span className="hidden sm:inline">Ekle</span>
                </button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {tasks.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                Henüz görev eklenmemiş
              </div>
            ) : (
              tasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggle={toggleTask}
                  onDelete={deleteTask}
                  canEdit={canEdit}
                  completedByProfile={task.completed_by ? profiles[task.completed_by] : null}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {showShareModal && (
        <ShareModal
          noteId={noteId}
          noteTitle={note?.title || ''}
          sharedUsers={sharedUsers}
          onClose={() => setShowShareModal(false)}
          onUpdate={loadSharedUsers}
        />
      )}

      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Notu Düzenle</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Başlık</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">İkon</label>
                <div className="grid grid-cols-5 gap-2">
                  {NOTE_ICON_LIST.map((iconItem) => {
                    const IconComponent = iconItem.icon;
                    return (
                      <button
                        key={iconItem.id}
                        type="button"
                        onClick={() => setEditIcon(editIcon === iconItem.id ? null : iconItem.id)}
                        className={`p-2 rounded-lg border-2 transition-all ${
                          editIcon === iconItem.id
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        <IconComponent
                          size={20}
                          className={editIcon === iconItem.id ? 'text-purple-600' : 'text-gray-600'}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-xl transition-all"
                >
                  İptal
                </button>
                <button
                  onClick={updateNote}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-xl transition-all"
                >
                  Kaydet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showShareManagement && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowShareManagement(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Paylaşım Yönetimi</h3>
              <button onClick={() => setShowShareManagement(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-3">
              {sharedUsers.map((share) => (
                <div key={share.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-medium text-gray-900">
                      {share.user.first_name} {share.user.last_name}
                    </p>
                    <p className="text-sm text-gray-500">{share.user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={share.permission}
                      onChange={(e) => updateSharePermission(share.id, e.target.value as 'viewer' | 'editor')}
                      className="text-sm border border-gray-200 rounded-lg px-2 py-1"
                    >
                      <option value="viewer">Görüntüleyici</option>
                      <option value="editor">Editör</option>
                    </select>
                    <button
                      onClick={() => removeShare(share.id)}
                      className="text-red-500 hover:text-red-600 p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowShareManagement(false)}
              className="w-full mt-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-xl transition-all"
            >
              Kapat
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

type ShareModalProps = {
  noteId: string;
  noteTitle: string;
  sharedUsers: (NoteShare & { user: Profile })[];
  onClose: () => void;
  onUpdate: () => void;
};

const ShareModal = ({ noteId, noteTitle, sharedUsers, onClose, onUpdate }: ShareModalProps) => {
  const { profile } = useAuth();
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<'viewer' | 'editor'>('editor');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recentShares, setRecentShares] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('recentShares');
    if (saved) {
      setRecentShares(JSON.parse(saved));
    }
  }, []);

  const saveToRecent = (email: string) => {
    const updated = [email, ...recentShares.filter(e => e !== email)].slice(0, 5);
    setRecentShares(updated);
    localStorage.setItem('recentShares', JSON.stringify(updated));
  };

  const shareNote = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: targetUser, error: targetError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

      if (targetError) throw targetError;
      if (!targetUser) {
        setError('Kullanıcı bulunamadı');
        setLoading(false);
        return;
      }

      const { error: shareError } = await supabase.from('note_shares').insert({
        note_id: noteId,
        user_id: targetUser.id,
        permission,
      });

      if (shareError) {
        console.error('Share error:', shareError);
        if (shareError.code === '23505') {
          setError('Bu kullanıcı zaten erişime sahip');
        } else {
          setError('Paylaşım hatası: ' + (shareError.message || 'Bilinmeyen hata'));
        }
        setLoading(false);
        return;
      }

      saveToRecent(email.toLowerCase().trim());
      setEmail('');

      // Notifications are now handled by Supabase trigger automatically

      onUpdate();
    } catch (error: any) {
      console.error('Error sharing note:', error);
      setError('Bir hata oluştu: ' + (error.message || 'Bilinmeyen hata'));
    } finally {
      setLoading(false);
    }
  };

  const removeShare = async (shareId: string) => {
    try {
      const { error } = await supabase.from('note_shares').delete().eq('id', shareId);

      if (error) throw error;
      onUpdate();
    } catch (error) {
      console.error('Error removing share:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Notu Paylaş</h2>

        <form onSubmit={shareNote} className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kullanıcı Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="kullanici@email.com"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all"
              required
            />
            {recentShares.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-gray-500 mb-2">Son paylaşılanlar:</p>
                <div className="flex flex-wrap gap-2">
                  {recentShares.map((recentEmail) => (
                    <button
                      key={recentEmail}
                      type="button"
                      onClick={() => setEmail(recentEmail)}
                      className="text-xs bg-purple-50 hover:bg-purple-100 text-purple-600 px-3 py-1 rounded-lg transition-colors"
                    >
                      {recentEmail}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">İzin Tipi</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPermission('viewer')}
                className={`py-3 px-4 rounded-xl font-medium transition-all ${
                  permission === 'viewer'
                    ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/30'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Okuyucu
              </button>
              <button
                type="button"
                onClick={() => setPermission('editor')}
                className={`py-3 px-4 rounded-xl font-medium transition-all ${
                  permission === 'editor'
                    ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/30'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Editör
              </button>
            </div>
          </div>

          {error && <div className="text-red-500 text-sm bg-red-50 p-3 rounded-xl">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 disabled:opacity-50"
          >
            {loading ? 'Paylaşılıyor...' : 'Paylaş'}
          </button>
        </form>

        {sharedUsers.length > 0 && (
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Erişimi Olanlar</h3>
            <div className="space-y-2">
              {sharedUsers.map((share) => (
                <div
                  key={share.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                >
                  <div>
                    <div className="font-medium text-gray-900">
                      {share.user.first_name} {share.user.last_name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {share.permission === 'viewer' ? 'Okuyucu' : 'Editör'}
                    </div>
                  </div>
                  <button
                    onClick={() => removeShare(share.id)}
                    className="text-red-500 hover:text-red-600 text-sm font-medium"
                  >
                    Kaldır
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full mt-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-6 rounded-xl transition-all"
        >
          Kapat
        </button>
      </div>
    </div>
  );
};
