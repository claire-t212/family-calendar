// ==========================================
// ТИПЫ ДАННЫХ ПРИЛОЖЕНИЯ
// ==========================================

// Пользователь
export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

// Календарь
export interface Calendar {
  id: string;
  name: string;
  description: string | null;
  color: EventColor;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

// Роль участника календаря
export type CalendarRole = 'owner' | 'editor' | 'viewer';

// Участник календаря
export interface CalendarMember {
  id: string;
  calendar_id: string;
  user_id: string;
  role: CalendarRole;
  joined_at: string;
  user?: User;
}

// Приглашение в календарь
export interface CalendarInvite {
  id: string;
  calendar_id: string;
  email: string;
  role: CalendarRole;
  token: string;
  expires_at: string;
  created_at: string;
  created_by: string;
}

// Цвета событий
export type EventColor =
  | 'red'
  | 'orange'
  | 'amber'
  | 'yellow'
  | 'lime'
  | 'green'
  | 'emerald'
  | 'teal'
  | 'cyan'
  | 'sky'
  | 'blue'
  | 'indigo'
  | 'violet'
  | 'purple'
  | 'fuchsia'
  | 'pink'
  | 'rose';

// Событие
export interface CalendarEvent {
  id: string;
  calendar_id: string;
  title: string;
  description: string | null;
  notes: string | null;
  start_date: string;
  end_date: string | null;
  all_day: boolean;
  color: EventColor;
  reminder_minutes: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  creator?: User;
}

// История изменений события
export interface EventHistory {
  id: string;
  event_id: string;
  user_id: string;
  action: 'created' | 'updated' | 'deleted';
  changes: Record<string, { old: unknown; new: unknown }>;
  created_at: string;
  user?: User;
}

// Напоминание
export interface Reminder {
  id: string;
  event_id: string;
  user_id: string;
  remind_at: string;
  is_sent: boolean;
  created_at: string;
}

// Режим просмотра календаря
export type CalendarView = 'month' | 'week' | 'day';

// Статус онлайн пользователя
export interface PresenceState {
  user_id: string;
  user_email: string;
  user_name: string | null;
  online_at: string;
}

// Тема приложения
export type Theme = 'light' | 'dark' | 'system';

// Настройки приложения
export interface AppSettings {
  theme: Theme;
  notifications_enabled: boolean;
  default_reminder_minutes: number;
  week_starts_on: 0 | 1; // 0 = Sunday, 1 = Monday
}

// ==========================================
// ТИПЫ ДЛЯ ФОРМ
// ==========================================

export interface EventFormData {
  title: string;
  description: string;
  notes: string;
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  all_day: boolean;
  color: EventColor;
  reminder_minutes: number | null;
}

export interface CalendarFormData {
  name: string;
  description: string;
  color: EventColor;
}

// ==========================================
// ТИПЫ ДЛЯ API ОТВЕТОВ
// ==========================================

export interface ApiResponse<T> {
  data: T | null;
  error: Error | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
}
