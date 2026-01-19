// ==========================================
// ИСТОРИЯ ИЗМЕНЕНИЙ СОБЫТИЯ
// ==========================================

import { formatDateTime } from '../../lib/dateUtils';
import { Avatar } from '../ui';
import { ACTION_LABELS } from '../../lib/constants';
import type { EventHistory as EventHistoryType } from '../../types';

interface EventHistoryProps {
  history: EventHistoryType[];
}

export function EventHistory({ history }: EventHistoryProps) {
  return (
    <div className="mt-4 space-y-3">
      {history.map((item) => (
        <div
          key={item.id}
          className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50"
        >
          <Avatar
            src={item.user?.avatar_url}
            name={item.user?.full_name}
            email={item.user?.email}
            size="sm"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900 dark:text-white">
              <span className="font-medium">
                {item.user?.full_name || item.user?.email || 'Пользователь'}
              </span>{' '}
              <span className="text-gray-500 dark:text-gray-400">
                {ACTION_LABELS[item.action as keyof typeof ACTION_LABELS] || item.action}
              </span>{' '}
              событие
            </p>
            
            {/* Показываем изменения */}
            {item.action === 'updated' && Object.keys(item.changes).length > 0 && (
              <div className="mt-2 space-y-1">
                {Object.entries(item.changes).map(([key, value]) => {
                  const typedValue = value as { old: unknown; new: unknown };
                  return (
                    <p key={key} className="text-xs text-gray-500 dark:text-gray-400">
                      <span className="font-medium">{getFieldLabel(key)}:</span>{' '}
                      <span className="line-through opacity-50">
                        {formatValue(typedValue.old)}
                      </span>{' '}
                      →{' '}
                      <span>{formatValue(typedValue.new)}</span>
                    </p>
                  );
                })}
              </div>
            )}
            
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {formatDateTime(item.created_at)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// Получить человекочитаемое название поля
function getFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    title: 'Название',
    description: 'Описание',
    notes: 'Заметки',
    start_date: 'Дата начала',
    end_date: 'Дата окончания',
    all_day: 'Весь день',
    color: 'Цвет',
    reminder_minutes: 'Напоминание',
  };
  return labels[field] || field;
}

// Форматировать значение для отображения
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Да' : 'Нет';
  if (typeof value === 'string' && value.includes('T')) {
    return formatDateTime(value);
  }
  return String(value);
}
