// ==========================================
// УТИЛИТЫ ДЛЯ УВЕДОМЛЕНИЙ
// ==========================================

// Расширенный интерфейс для ServiceWorker notifications
interface ExtendedNotificationOptions extends NotificationOptions {
  vibrate?: number[];
  actions?: Array<{ action: string; title: string; icon?: string }>;
}

// Тип повтора напоминания
export type ReminderRepeatType = 'none' | 'every_5min' | 'every_15min' | 'every_30min' | 'every_hour';

// Интервалы повтора в миллисекундах
const REPEAT_INTERVALS: Record<ReminderRepeatType, number> = {
  none: 0,
  every_5min: 5 * 60 * 1000,
  every_15min: 15 * 60 * 1000,
  every_30min: 30 * 60 * 1000,
  every_hour: 60 * 60 * 1000,
};

// Проверка поддержки уведомлений
export const isNotificationSupported = (): boolean => {
  return 'Notification' in window;
};

// Проверка разрешения на уведомления
export const getNotificationPermission = (): NotificationPermission | 'unsupported' => {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
};

// Запрос разрешения на уведомления
export const requestNotificationPermission = async (): Promise<NotificationPermission | 'unsupported'> => {
  if (!isNotificationSupported()) return 'unsupported';
  
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return 'denied';
  }
};

// Показать уведомление
export const showNotification = async (
  title: string,
  options?: ExtendedNotificationOptions
): Promise<Notification | null> => {
  if (!isNotificationSupported()) return null;
  if (Notification.permission !== 'granted') return null;
  
  try {
    // Используем Service Worker для показа уведомлений (работает в фоне на iOS)
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        vibrate: [200, 100, 200],
        ...options,
      } as NotificationOptions);
      return null;
    }
    
    // Fallback на обычные уведомления
    return new Notification(title, {
      icon: '/pwa-192x192.png',
      ...options,
    });
  } catch (error) {
    console.error('Error showing notification:', error);
    return null;
  }
};

// Показать уведомление о событии
export const showEventNotification = async (
  eventTitle: string,
  eventTime: string,
  eventId: string
): Promise<void> => {
  await showNotification(`📅 ${eventTitle}`, {
    body: `Напоминание: ${eventTime}`,
    tag: `event-${eventId}`,
    data: { eventId },
    requireInteraction: true,
    actions: [
      { action: 'view', title: 'Посмотреть' },
      { action: 'dismiss', title: 'Закрыть' },
    ],
  });
};

// Планирование локального напоминания
export const scheduleLocalReminder = (
  eventId: string,
  eventTitle: string,
  reminderTime: Date,
  eventTime: string
): number | null => {
  const now = new Date();
  const delay = reminderTime.getTime() - now.getTime();
  
  if (delay <= 0) return null;
  
  const timeoutId = window.setTimeout(() => {
    showEventNotification(eventTitle, eventTime, eventId);
  }, delay);
  
  return timeoutId;
};

// Отмена запланированного напоминания
export const cancelLocalReminder = (timeoutId: number): void => {
  window.clearTimeout(timeoutId);
};

// Хранилище для запланированных напоминаний
interface ScheduledReminder {
  timeoutId: number;
  intervalId?: number;
  eventTime: Date;
}

const scheduledReminders = new Map<string, ScheduledReminder>();

// Добавить напоминание с поддержкой повторов
export const addReminder = (
  eventId: string,
  eventTitle: string,
  reminderTime: Date,
  eventTime: string,
  repeatType: ReminderRepeatType = 'none',
  eventDate: Date
): void => {
  // Отменяем существующее напоминание для этого события
  removeReminder(eventId);
  
  const now = new Date();
  const delay = reminderTime.getTime() - now.getTime();
  
  if (delay <= 0) return;
  
  // Первое напоминание
  const timeoutId = window.setTimeout(() => {
    showEventNotification(eventTitle, eventTime, eventId);
    
    // Если есть повтор и событие ещё не началось
    if (repeatType !== 'none') {
      const repeatInterval = REPEAT_INTERVALS[repeatType];
      
      const intervalId = window.setInterval(() => {
        const currentTime = new Date();
        // Прекращаем повторы если событие уже началось
        if (currentTime >= eventDate) {
          const reminder = scheduledReminders.get(eventId);
          if (reminder?.intervalId) {
            window.clearInterval(reminder.intervalId);
          }
          return;
        }
        showEventNotification(eventTitle, eventTime, eventId);
      }, repeatInterval);
      
      // Обновляем информацию о напоминании
      const reminder = scheduledReminders.get(eventId);
      if (reminder) {
        reminder.intervalId = intervalId;
      }
    }
  }, delay);
  
  scheduledReminders.set(eventId, {
    timeoutId,
    eventTime: eventDate,
  });
};

// Удалить напоминание
export const removeReminder = (eventId: string): void => {
  const reminder = scheduledReminders.get(eventId);
  if (reminder) {
    window.clearTimeout(reminder.timeoutId);
    if (reminder.intervalId) {
      window.clearInterval(reminder.intervalId);
    }
    scheduledReminders.delete(eventId);
  }
};

// Очистить все напоминания
export const clearAllReminders = (): void => {
  scheduledReminders.forEach((reminder) => {
    window.clearTimeout(reminder.timeoutId);
    if (reminder.intervalId) {
      window.clearInterval(reminder.intervalId);
    }
  });
  scheduledReminders.clear();
};

// Инициализация напоминаний из localStorage событий
export const initializeReminders = (events: Array<{
  id: string;
  title: string;
  start_date: string;
  reminder?: number | null;
  reminder_repeat?: ReminderRepeatType | null;
}>): void => {
  clearAllReminders();
  
  const now = new Date();
  
  events.forEach((event) => {
    if (!event.reminder) return;
    
    const eventDate = new Date(event.start_date);
    const reminderTime = new Date(eventDate.getTime() - event.reminder * 60 * 1000);
    
    // Только для будущих событий
    if (reminderTime > now) {
      const eventTimeStr = eventDate.toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      addReminder(
        event.id,
        event.title,
        reminderTime,
        eventTimeStr,
        event.reminder_repeat || 'none',
        eventDate
      );
    }
  });
};
