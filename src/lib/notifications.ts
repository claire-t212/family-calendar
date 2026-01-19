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
    // Используем Service Worker для показа уведомлений (работает в фоне)
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        icon: '/family-calendar/pwa-192x192.png',
        badge: '/family-calendar/pwa-192x192.png',
        vibrate: [200, 100, 200],
        requireInteraction: true,
        ...options,
      } as NotificationOptions);
      return null;
    }
    
    // Fallback на обычные уведомления
    return new Notification(title, {
      icon: '/family-calendar/pwa-192x192.png',
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
  });
};

// Хранилище для запланированных напоминаний
interface ScheduledReminder {
  timeoutId: number;
  intervalId?: number;
  eventTime: Date;
}

const scheduledReminders = new Map<string, ScheduledReminder>();

// Ключ для localStorage
const REMINDERS_STORAGE_KEY = 'family-calendar-pending-reminders';

// Интерфейс для сохранённых напоминаний
interface SavedReminder {
  eventId: string;
  eventTitle: string;
  reminderTime: string; // ISO string
  eventTime: string;
  repeatType: ReminderRepeatType;
  eventDate: string; // ISO string
  lastShownAt?: string; // ISO string
}

// Сохранить напоминания в localStorage
const saveRemindersToStorage = (reminders: SavedReminder[]): void => {
  try {
    localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(reminders));
  } catch (e) {
    console.error('Error saving reminders:', e);
  }
};

// Загрузить напоминания из localStorage
const loadRemindersFromStorage = (): SavedReminder[] => {
  try {
    const data = localStorage.getItem(REMINDERS_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error loading reminders:', e);
    return [];
  }
};

// Проверить и показать пропущенные/текущие напоминания
export const checkMissedReminders = async (): Promise<void> => {
  const savedReminders = loadRemindersFromStorage();
  const now = new Date();
  const updatedReminders: SavedReminder[] = [];
  
  for (const reminder of savedReminders) {
    const reminderTime = new Date(reminder.reminderTime);
    const eventDate = new Date(reminder.eventDate);
    
    // Если событие уже прошло - пропускаем
    if (eventDate < now) continue;
    
    // Если время напоминания прошло или наступило, но событие ещё не началось
    if (reminderTime <= now && eventDate > now) {
      // Проверяем, не показывали ли мы уже это напоминание недавно
      const lastShown = reminder.lastShownAt ? new Date(reminder.lastShownAt) : null;
      const minInterval = 60 * 1000; // Минимум 1 минута между показами
      
      if (!lastShown || (now.getTime() - lastShown.getTime() > minInterval)) {
        console.log('Showing missed reminder for:', reminder.eventTitle);
        await showEventNotification(reminder.eventTitle, reminder.eventTime, reminder.eventId);
        reminder.lastShownAt = now.toISOString();
      }
    }
    
    // Сохраняем напоминание если событие ещё не прошло
    updatedReminders.push(reminder);
  }
  
  saveRemindersToStorage(updatedReminders);
};

// Добавить напоминание
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
  
  // Сохраняем в localStorage для проверки при открытии приложения
  const savedReminders = loadRemindersFromStorage();
  const existingIndex = savedReminders.findIndex(r => r.eventId === eventId);
  
  const newReminder: SavedReminder = {
    eventId,
    eventTitle,
    reminderTime: reminderTime.toISOString(),
    eventTime,
    repeatType,
    eventDate: eventDate.toISOString(),
  };
  
  if (existingIndex >= 0) {
    savedReminders[existingIndex] = newReminder;
  } else {
    savedReminders.push(newReminder);
  }
  
  saveRemindersToStorage(savedReminders);
  
  // Если время уже прошло - показываем сразу
  if (delay <= 0) {
    showEventNotification(eventTitle, eventTime, eventId);
    return;
  }
  
  // Планируем напоминание
  const timeoutId = window.setTimeout(() => {
    showEventNotification(eventTitle, eventTime, eventId);
    
    // Обновляем lastShownAt в localStorage
    const reminders = loadRemindersFromStorage();
    const idx = reminders.findIndex(r => r.eventId === eventId);
    if (idx >= 0) {
      reminders[idx].lastShownAt = new Date().toISOString();
      saveRemindersToStorage(reminders);
    }
    
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
  
  // Удаляем из localStorage
  const savedReminders = loadRemindersFromStorage();
  const filtered = savedReminders.filter(r => r.eventId !== eventId);
  saveRemindersToStorage(filtered);
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

// Инициализация напоминаний из событий
export const initializeReminders = (events: Array<{
  id: string;
  title: string;
  start_date: string;
  reminder?: number | null;
  reminder_repeat?: ReminderRepeatType | null;
}>): void => {
  clearAllReminders();
  
  const now = new Date();
  const newSavedReminders: SavedReminder[] = [];
  
  events.forEach((event) => {
    if (!event.reminder) return;
    
    const eventDate = new Date(event.start_date);
    
    // Только для будущих событий
    if (eventDate <= now) return;
    
    const reminderTime = new Date(eventDate.getTime() - event.reminder * 60 * 1000);
    
    const eventTimeStr = eventDate.toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    // Сохраняем для проверки при открытии
    newSavedReminders.push({
      eventId: event.id,
      eventTitle: event.title,
      reminderTime: reminderTime.toISOString(),
      eventTime: eventTimeStr,
      repeatType: event.reminder_repeat || 'none',
      eventDate: eventDate.toISOString(),
    });
    
    // Планируем (addReminder сам покажет если время прошло)
    addReminder(
      event.id,
      event.title,
      reminderTime,
      eventTimeStr,
      event.reminder_repeat || 'none',
      eventDate
    );
  });
  
  saveRemindersToStorage(newSavedReminders);
};

// Запуск периодической проверки напоминаний (каждую минуту)
let checkInterval: number | null = null;

export const startReminderChecker = (): void => {
  if (checkInterval) return;
  
  // Проверяем сразу при запуске
  checkMissedReminders();
  
  // И каждую минуту
  checkInterval = window.setInterval(() => {
    checkMissedReminders();
  }, 60 * 1000);
};

export const stopReminderChecker = (): void => {
  if (checkInterval) {
    window.clearInterval(checkInterval);
    checkInterval = null;
  }
};
