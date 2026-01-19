// ==========================================
// WEB PUSH УВЕДОМЛЕНИЯ
// ==========================================

import { supabase, isSupabaseConfigured } from './supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

// ==========================================
// ПРОВЕРКА ПОДДЕРЖКИ
// ==========================================
export const isPushSupported = (): boolean => {
  return 'serviceWorker' in navigator && 
         'PushManager' in window && 
         'Notification' in window;
};

// ==========================================
// КОНВЕРТАЦИЯ КЛЮЧА
// ==========================================
const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  
  return outputArray;
};

// ==========================================
// ПОДПИСКА НА PUSH
// ==========================================
export const subscribeToPush = async (userId: string): Promise<PushSubscription | null> => {
  if (!isPushSupported()) {
    console.log('[Push] Не поддерживается в этом браузере');
    return null;
  }

  if (!VAPID_PUBLIC_KEY) {
    console.log('[Push] VAPID ключ не настроен');
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('[Push] Разрешение не получено:', permission);
      return null;
    }

    const registration = await navigator.serviceWorker.ready;
    
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource
      });
      console.log('[Push] Новая подписка создана');
    } else {
      console.log('[Push] Используем существующую подписку');
    }

    if (isSupabaseConfigured) {
      await savePushSubscription(userId, subscription);
    }

    localStorage.setItem('push_subscription', JSON.stringify({
      endpoint: subscription.endpoint,
      userId
    }));

    return subscription;
  } catch (error) {
    console.error('[Push] Ошибка подписки:', error);
    return null;
  }
};

// ==========================================
// СОХРАНЕНИЕ ПОДПИСКИ В SUPABASE
// ==========================================
const savePushSubscription = async (
  userId: string, 
  subscription: PushSubscription
): Promise<void> => {
  const subscriptionJson = subscription.toJSON();
  
  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: userId,
    endpoint: subscription.endpoint,
    p256dh: subscriptionJson.keys?.p256dh || '',
    auth: subscriptionJson.keys?.auth || '',
    updated_at: new Date().toISOString()
  }, {
    onConflict: 'endpoint'
  });

  if (error) {
    console.error('[Push] Ошибка сохранения подписки:', error);
  } else {
    console.log('[Push] Подписка сохранена в Supabase');
  }
};

// ==========================================
// ОТПИСКА ОТ PUSH
// ==========================================
export const unsubscribeFromPush = async (): Promise<boolean> => {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      if (isSupabaseConfigured) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', subscription.endpoint);
      }
      
      await subscription.unsubscribe();
      localStorage.removeItem('push_subscription');
      console.log('[Push] Отписка выполнена');
    }
    
    return true;
  } catch (error) {
    console.error('[Push] Ошибка отписки:', error);
    return false;
  }
};

// ==========================================
// ПЛАНИРОВАНИЕ УВЕДОМЛЕНИЯ
// ==========================================
export const scheduleNotification = async (params: {
  eventId: string;
  eventTitle: string;
  userId: string;
  eventTime: Date;
  reminderMinutes: number;
}): Promise<boolean> => {
  const { eventId, eventTitle, userId, eventTime, reminderMinutes } = params;
  
  const sendAt = new Date(eventTime.getTime() - reminderMinutes * 60 * 1000);
  
  // Если время уже прошло — не планируем
  if (sendAt <= new Date()) {
    console.log('[Push] Время напоминания уже прошло');
    return false;
  }

  const title = '📅 Напоминание';
  const body = reminderMinutes >= 1440 
    ? `Завтра: ${eventTitle}`
    : reminderMinutes >= 60 
      ? `Через ${Math.round(reminderMinutes / 60)} ч: ${eventTitle}`
      : `Через ${reminderMinutes} мин: ${eventTitle}`;

  if (isSupabaseConfigured) {
    const { error } = await supabase.from('scheduled_notifications').insert({
      event_id: eventId,
      user_id: userId,
      title,
      body,
      send_at: sendAt.toISOString(),
      sent: false
    });

    if (error) {
      console.error('[Push] Ошибка планирования:', error);
      return false;
    }

    console.log('[Push] Уведомление запланировано на:', sendAt);
    return true;
  }
  
  return false;
};

// ==========================================
// ОТМЕНА ЗАПЛАНИРОВАННОГО УВЕДОМЛЕНИЯ
// ==========================================
export const cancelScheduledNotification = async (eventId: string): Promise<void> => {
  if (!isSupabaseConfigured) return;

  const { error } = await supabase
    .from('scheduled_notifications')
    .delete()
    .eq('event_id', eventId)
    .eq('sent', false);
    
  if (error) {
    console.error('[Push] Ошибка отмены уведомления:', error);
  }
};

// ==========================================
// ПОЛУЧЕНИЕ СТАТУСА ПОДПИСКИ
// ==========================================
export const getPushStatus = async (): Promise<{
  supported: boolean;
  permission: NotificationPermission | 'unsupported';
  subscribed: boolean;
}> => {
  if (!isPushSupported()) {
    return { supported: false, permission: 'unsupported', subscribed: false };
  }

  const permission = Notification.permission;
  let subscribed = false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    subscribed = !!subscription;
  } catch {
    // Игнорируем
  }

  return { supported: true, permission, subscribed };
};
