// ==========================================
// КОНСТАНТЫ ПРИЛОЖЕНИЯ
// ==========================================

import type { EventColor, AppSettings } from '../types';

// Доступные цвета для событий
export const EVENT_COLORS: { value: EventColor; label: string; class: string }[] = [
  { value: 'red', label: 'Красный', class: 'bg-red-500' },
  { value: 'orange', label: 'Оранжевый', class: 'bg-orange-500' },
  { value: 'amber', label: 'Янтарный', class: 'bg-amber-500' },
  { value: 'yellow', label: 'Жёлтый', class: 'bg-yellow-500' },
  { value: 'lime', label: 'Лаймовый', class: 'bg-lime-500' },
  { value: 'green', label: 'Зелёный', class: 'bg-green-500' },
  { value: 'emerald', label: 'Изумрудный', class: 'bg-emerald-500' },
  { value: 'teal', label: 'Бирюзовый', class: 'bg-teal-500' },
  { value: 'cyan', label: 'Голубой', class: 'bg-cyan-500' },
  { value: 'sky', label: 'Небесный', class: 'bg-sky-500' },
  { value: 'blue', label: 'Синий', class: 'bg-blue-500' },
  { value: 'indigo', label: 'Индиго', class: 'bg-indigo-500' },
  { value: 'violet', label: 'Фиолетовый', class: 'bg-violet-500' },
  { value: 'purple', label: 'Пурпурный', class: 'bg-purple-500' },
  { value: 'fuchsia', label: 'Фуксия', class: 'bg-fuchsia-500' },
  { value: 'pink', label: 'Розовый', class: 'bg-pink-500' },
  { value: 'rose', label: 'Алый', class: 'bg-rose-500' },
];

// Получить класс цвета по значению
export const getColorClass = (color: EventColor): string => {
  return EVENT_COLORS.find(c => c.value === color)?.class || 'bg-blue-500';
};

// Получить светлый класс цвета для фона
export const getLightColorClass = (color: EventColor): string => {
  const colorMap: Record<EventColor, string> = {
    red: 'bg-red-100 dark:bg-red-900/30',
    orange: 'bg-orange-100 dark:bg-orange-900/30',
    amber: 'bg-amber-100 dark:bg-amber-900/30',
    yellow: 'bg-yellow-100 dark:bg-yellow-900/30',
    lime: 'bg-lime-100 dark:bg-lime-900/30',
    green: 'bg-green-100 dark:bg-green-900/30',
    emerald: 'bg-emerald-100 dark:bg-emerald-900/30',
    teal: 'bg-teal-100 dark:bg-teal-900/30',
    cyan: 'bg-cyan-100 dark:bg-cyan-900/30',
    sky: 'bg-sky-100 dark:bg-sky-900/30',
    blue: 'bg-blue-100 dark:bg-blue-900/30',
    indigo: 'bg-indigo-100 dark:bg-indigo-900/30',
    violet: 'bg-violet-100 dark:bg-violet-900/30',
    purple: 'bg-purple-100 dark:bg-purple-900/30',
    fuchsia: 'bg-fuchsia-100 dark:bg-fuchsia-900/30',
    pink: 'bg-pink-100 dark:bg-pink-900/30',
    rose: 'bg-rose-100 dark:bg-rose-900/30',
  };
  return colorMap[color] || 'bg-blue-100 dark:bg-blue-900/30';
};

// Получить класс цвета текста
export const getTextColorClass = (color: EventColor): string => {
  const colorMap: Record<EventColor, string> = {
    red: 'text-red-700 dark:text-red-300',
    orange: 'text-orange-700 dark:text-orange-300',
    amber: 'text-amber-700 dark:text-amber-300',
    yellow: 'text-yellow-700 dark:text-yellow-300',
    lime: 'text-lime-700 dark:text-lime-300',
    green: 'text-green-700 dark:text-green-300',
    emerald: 'text-emerald-700 dark:text-emerald-300',
    teal: 'text-teal-700 dark:text-teal-300',
    cyan: 'text-cyan-700 dark:text-cyan-300',
    sky: 'text-sky-700 dark:text-sky-300',
    blue: 'text-blue-700 dark:text-blue-300',
    indigo: 'text-indigo-700 dark:text-indigo-300',
    violet: 'text-violet-700 dark:text-violet-300',
    purple: 'text-purple-700 dark:text-purple-300',
    fuchsia: 'text-fuchsia-700 dark:text-fuchsia-300',
    pink: 'text-pink-700 dark:text-pink-300',
    rose: 'text-rose-700 dark:text-rose-300',
  };
  return colorMap[color] || 'text-blue-700 dark:text-blue-300';
};

// Опции напоминаний
export const REMINDER_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: 'Без напоминания' },
  { value: 0, label: 'В момент события' },
  { value: 5, label: 'За 5 минут' },
  { value: 10, label: 'За 10 минут' },
  { value: 15, label: 'За 15 минут' },
  { value: 30, label: 'За 30 минут' },
  { value: 60, label: 'За 1 час' },
  { value: 120, label: 'За 2 часа' },
  { value: 1440, label: 'За 1 день' },
  { value: 2880, label: 'За 2 дня' },
  { value: 10080, label: 'За 1 неделю' },
];

// Настройки по умолчанию
export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  notifications_enabled: true,
  default_reminder_minutes: 30,
  week_starts_on: 1, // Понедельник
};

// Ключ для localStorage
export const STORAGE_KEYS = {
  settings: 'calendar_settings',
  theme: 'calendar_theme',
  selectedCalendar: 'selected_calendar',
  offlineEvents: 'offline_events',
} as const;

// Роли пользователей
export const ROLE_LABELS = {
  owner: 'Владелец',
  editor: 'Редактор',
  viewer: 'Наблюдатель',
} as const;

// Действия в истории
export const ACTION_LABELS = {
  created: 'создал(а)',
  updated: 'изменил(а)',
  deleted: 'удалил(а)',
} as const;
