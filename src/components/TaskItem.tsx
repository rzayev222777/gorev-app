import { Task, Profile } from '../lib/supabase';
import { Circle, CheckCircle2, Trash2 } from 'lucide-react';

type TaskItemProps = {
  task: Task;
  onToggle: (taskId: string, completed: boolean) => void;
  onDelete: (taskId: string) => void;
  canEdit: boolean;
  completedByProfile?: Profile | null;
};

export const TaskItem = ({ task, onToggle, onDelete, canEdit, completedByProfile }: TaskItemProps) => {
  return (
    <div
      className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
        task.completed
          ? 'bg-gray-50 border-gray-200'
          : 'bg-white border-gray-200 hover:border-purple-300'
      }`}
    >
      {canEdit ? (
        <button
          onClick={() => onToggle(task.id, !task.completed)}
          className="flex-shrink-0 text-gray-400 hover:text-purple-600 transition-colors"
        >
          {task.completed ? (
            <CheckCircle2 size={24} className="text-purple-600" />
          ) : (
            <Circle size={24} />
          )}
        </button>
      ) : (
        <div className="flex-shrink-0 text-gray-400">
          {task.completed ? (
            <CheckCircle2 size={24} className="text-purple-600" />
          ) : (
            <Circle size={24} />
          )}
        </div>
      )}

      <div className="flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-gray-900 ${
              task.completed ? 'line-through text-gray-500' : ''
            }`}
          >
            {task.title}
          </span>
          {task.completed && completedByProfile && (
            <span className="text-xs text-purple-600 font-medium bg-purple-50 px-2 py-0.5 rounded-full">
              {completedByProfile.first_name}
            </span>
          )}
        </div>
      </div>

      {canEdit && (
        <button
          onClick={() => onDelete(task.id)}
          className="flex-shrink-0 text-gray-400 hover:text-red-600 transition-colors"
        >
          <Trash2 size={18} />
        </button>
      )}
    </div>
  );
};
