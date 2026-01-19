// ==========================================
// CUSTOM SERVICE WORKER ДЛЯ PUSH УВЕДОМЛЕНИЙ
// ==========================================

// Обработка push уведомлений
self.addEventListener('push', (event) => {
  console.log('[SW] Push получен:', event);
  
  let data = {
    title: 'Семейный Календарь 📅',
    body: 'У вас новое событие!',
    icon: '/family-calendar/pwa-192x192.png',
    badge: '/family-calendar/pwa-192x192.png'
  };
  
  try {
    if (event.data) {
      const payload = event.data.json();
      data = {
        title: payload.title || data.title,
        body: payload.body || data.body,
        icon: payload.icon || data.icon,
        badge: payload.badge || data.badge,
        data: payload.data || {}
      };
    }
  } catch (e) {
    console.error('[SW] Ошибка парсинга push данных:', e);
  }
  
  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    vibrate: [200, 100, 200],
    data: data.data,
    actions: [
      { action: 'open', title: 'Открыть' },
      { action: 'close', title: 'Закрыть' }
    ],
    tag: 'family-calendar-notification',
    renotify: true
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Клик по уведомлению
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Клик по уведомлению:', event.action);
  
  event.notification.close();
  
  if (event.action === 'close') {
    return;
  }
  
  // Открываем приложение
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Если уже открыто - фокусируемся
        for (const client of clientList) {
          if (client.url.includes('/family-calendar/') && 'focus' in client) {
            return client.focus();
          }
        }
        // Иначе открываем новое окно
        if (clients.openWindow) {
          return clients.openWindow('/family-calendar/');
        }
      })
  );
});

// Закрытие уведомления
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Уведомление закрыто');
});

console.log('[SW] Custom Service Worker загружен');
