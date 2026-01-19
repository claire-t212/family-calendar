// ==========================================
// УТИЛИТЫ ДЛЯ РАБОТЫ С ДАТАМИ
// ==========================================

import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  setHours,
  setMinutes,
  getHours,
  getMinutes,
  isWithinInterval,
  startOfDay,
  endOfDay,
} from 'date-fns';
import { ru } from 'date-fns/locale';

// Форматирование даты на русском
export const formatDate = (date: Date | string, formatStr: string = 'dd MMMM yyyy'): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, formatStr, { locale: ru });
};

// Форматирование времени
export const formatTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'HH:mm', { locale: ru });
};

// Форматирование даты и времени
export const formatDateTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'd MMM, HH:mm', { locale: ru });
};

// Получить название месяца
export const getMonthName = (date: Date): string => {
  return format(date, 'LLLL yyyy', { locale: ru });
};

// Получить короткое название дня недели
export const getDayName = (date: Date): string => {
  return format(date, 'EEEEEE', { locale: ru });
};

// Получить полное название дня недели
export const getFullDayName = (date: Date): string => {
  return format(date, 'EEEE', { locale: ru });
};

// Получить все дни для отображения месяца (включая дни из соседних месяцев)
export const getCalendarDays = (date: Date, weekStartsOn: 0 | 1 = 1): Date[] => {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn });
  
  return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
};

// Получить дни недели
export const getWeekDays = (date: Date, weekStartsOn: 0 | 1 = 1): Date[] => {
  const weekStart = startOfWeek(date, { weekStartsOn });
  const weekEnd = endOfWeek(date, { weekStartsOn });
  
  return eachDayOfInterval({ start: weekStart, end: weekEnd });
};

// Получить названия дней недели
export const getWeekDayNames = (weekStartsOn: 0 | 1 = 1): string[] => {
  const days = getWeekDays(new Date(), weekStartsOn);
  return days.map(day => format(day, 'EEEEEE', { locale: ru }));
};

// Проверки дат
export { isSameMonth, isSameDay, isToday };

// Навигация по датам
export const navigateMonth = (date: Date, direction: 'prev' | 'next'): Date => {
  return direction === 'next' ? addMonths(date, 1) : subMonths(date, 1);
};

export const navigateWeek = (date: Date, direction: 'prev' | 'next'): Date => {
  return direction === 'next' ? addWeeks(date, 1) : subWeeks(date, 1);
};

export const navigateDay = (date: Date, direction: 'prev' | 'next'): Date => {
  return direction === 'next' ? addDays(date, 1) : subDays(date, 1);
};

// Преобразование для форм
export const toDateInputValue = (date: Date | string): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'yyyy-MM-dd');
};

export const toTimeInputValue = (date: Date | string): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'HH:mm');
};

// Создание даты из значений формы
export const createDateTime = (dateStr: string, timeStr: string): Date => {
  const date = parseISO(dateStr);
  const [hours, minutes] = timeStr.split(':').map(Number);
  return setMinutes(setHours(date, hours), minutes);
};

// Получить часы и минуты из даты
export const getTimeFromDate = (date: Date | string): { hours: number; minutes: number } => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return {
    hours: getHours(d),
    minutes: getMinutes(d),
  };
};

// Проверка, попадает ли событие в заданный день
export const isEventOnDay = (
  eventStart: Date | string,
  eventEnd: Date | string | null,
  day: Date
): boolean => {
  const start = typeof eventStart === 'string' ? parseISO(eventStart) : eventStart;
  const end = eventEnd 
    ? (typeof eventEnd === 'string' ? parseISO(eventEnd) : eventEnd) 
    : start;
  
  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day);
  
  return (
    isWithinInterval(start, { start: dayStart, end: dayEnd }) ||
    isWithinInterval(end, { start: dayStart, end: dayEnd }) ||
    (start <= dayStart && end >= dayEnd)
  );
};

// Получить относительное время ("через 5 минут", "вчера" и т.д.)
export const getRelativeTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);
  const diffDays = Math.round(diffMs / 86400000);
  
  if (diffMins === 0) return 'сейчас';
  if (diffMins > 0 && diffMins < 60) return `через ${diffMins} мин`;
  if (diffMins < 0 && diffMins > -60) return `${Math.abs(diffMins)} мин назад`;
  if (diffHours > 0 && diffHours < 24) return `через ${diffHours} ч`;
  if (diffHours < 0 && diffHours > -24) return `${Math.abs(diffHours)} ч назад`;
  if (diffDays === 1) return 'завтра';
  if (diffDays === -1) return 'вчера';
  if (diffDays > 1 && diffDays < 7) return `через ${diffDays} дн`;
  if (diffDays < -1 && diffDays > -7) return `${Math.abs(diffDays)} дн назад`;
  
  return formatDate(d, 'd MMM');
};

// Преобразование Date в строку YYYY-MM-DD без UTC-сдвига (использует локальный часовой пояс)
// Важно: toISOString() конвертирует в UTC, что может сдвинуть дату на день назад!
export const toLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Re-export parseISO для использования в других модулях
export { parseISO, startOfDay, endOfDay, addDays, startOfMonth, endOfMonth, subDays };
