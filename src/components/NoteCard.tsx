import { NoteWithStats } from '../lib/supabase';
import { Users, CheckCircle2, Circle, Archive, ArchiveX } from 'lucide-react';
import { getNoteIcon } from '../utils/noteIcons';
import { AvatarIcon } from './AvatarIcon';

type NoteCardProps = {
  note: NoteWithStats;
  onClick: () => void;
  onArchive?: (noteId: string) => void;
  onUnarchive?: (noteId: string) => void;
  showArchiveButton?: boolean;
  showUnarchiveButton?: boolean;
  currentUserId?: string;
};

export const NoteCard = ({
  note,
  onClick,
  onArchive,
  onUnarchive,
  showArchiveButton = false,
  showUnarchiveButton = false,
  currentUserId
}: NoteCardProps) => {
  const completionPercentage = note.total_tasks > 0
    ? Math.round((note.completed_tasks / note.total_tasks) * 100)
    : 0;

  const isCompleted = completionPercentage === 100 && note.total_tasks > 0;

  let bgClass = "bg-gradient-to-br from-purple-500 to-purple-600";

  if (note.is_shared) {
    bgClass = "bg-gradient-to-br from-orange-500 to-orange-600";
  } else if (isCompleted) {
    bgClass = "bg-gradient-to-br from-green-500 to-green-600";
  }

  const NoteIcon = getNoteIcon(note.icon);

  const handleArchive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onArchive) {
      onArchive(note.id);
    }
  };

  const handleUnarchive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUnarchive) {
      onUnarchive(note.id);
    }
  };

  return (
    <div className="space-y-2 relative">
      {showUnarchiveButton && currentUserId === note.owner_id && (
        <button
          onClick={handleUnarchive}
          className="absolute -top-3 -right-3 z-10 p-2.5 bg-white hover:bg-purple-50 border-2 border-purple-200 rounded-xl transition-all shadow-lg hover:shadow-xl hover:scale-105"
          title="Arşivden Çıkar"
        >
          <ArchiveX size={20} className="text-purple-600" />
        </button>
      )}

      <div
        onClick={onClick}
        className={`${bgClass} rounded-2xl p-5 cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all duration-200 text-white`}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {note.is_shared && note.owner && note.owner.id !== currentUserId && (
                <div className="inline-flex items-center gap-1.5 bg-white/30 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1.5 rounded-full">
                  <AvatarIcon avatarId={note.owner.avatar_url} size={14} />
                  <span>{note.owner.first_name}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {note.icon && <NoteIcon size={20} className="flex-shrink-0" />}
              <h3 className="text-lg font-semibold">{note.title}</h3>
            </div>
          </div>
          {note.shared_users && note.shared_users.length > 0 && (
            <div className="flex items-center gap-1 bg-white/20 rounded-full px-3 py-1 ml-2">
              <Users size={14} />
              <span className="text-xs font-medium">{note.shared_users.length}</span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} />
              <span className="text-sm font-medium">{note.completed_tasks} Yapıldı</span>
            </div>
            <div className="flex items-center gap-2">
              <Circle size={18} />
              <span className="text-sm font-medium">{note.total_tasks - note.completed_tasks} Bekliyor</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">İlerleme</span>
              <span className="font-semibold">{completionPercentage}%</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>

          <div className="text-xs text-white/80 pt-2 border-t border-white/20">
            Toplam: {note.total_tasks} görev
          </div>
        </div>
      </div>

      {showArchiveButton && isCompleted && !note.archived && currentUserId === note.owner_id && (
        <button
          onClick={handleArchive}
          className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 text-green-600 font-medium py-2 px-4 rounded-xl transition-all shadow-sm hover:shadow-md"
          title="Arşive Gönder"
        >
          <Archive size={16} />
          <span className="text-sm">Arşive Gönder</span>
        </button>
      )}
    </div>
  );
};
