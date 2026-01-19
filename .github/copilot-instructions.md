# Copilot Instructions — Семейный Календарь PWA

## Архитектура

PWA для семейного планирования: React 18 + TypeScript + Vite + Tailwind. Два режима синхронизации:

- **Локальный** (`localEventStore`) — localStorage, без сервера
- **Supabase** (`syncEventStore`) — Realtime синхронизация через PostgreSQL

Переключение режима: `uiStore.syncMode` ('local' | 'supabase'). Главная страница [src/pages/NewCalendarPage.tsx](src/pages/NewCalendarPage.tsx) выбирает store динамически:
```typescript
const isSync = syncMode === 'supabase' && isSupabaseConfigured;
const events = isSync ? syncStore.events : localStore.events;
```

## Структура проекта

```
src/
├── stores/          # Zustand + persist (authStore, uiStore, localEventStore, syncEventStore)
├── pages/           # NewCalendarPage.tsx — главная страница календаря
├── components/ui/   # Button, Input, Modal, ColorPicker и др.
├── lib/             # dateUtils.ts, constants.ts, supabase.ts, notifications.ts
└── types/           # EventColor, LocalEvent, FamilyEvent, CalendarView
```

## Ключевые типы

События для двух пользователей семьи (`created_by: 'husband' | 'wife'`):
- `LocalEvent` — [src/stores/localEventStore.ts](src/stores/localEventStore.ts)
- `FamilyEvent` — [src/stores/syncEventStore.ts](src/stores/syncEventStore.ts)
- `EventColor` — 17 цветов Tailwind (red, orange... rose) в [src/types/index.ts](src/types/index.ts)

## Работа с цветами событий

Используй хелперы из [src/lib/constants.ts](src/lib/constants.ts):
```typescript
getColorClass(color)       // 'bg-blue-500'
getLightColorClass(color)  // 'bg-blue-100 dark:bg-blue-900/30'
getTextColorClass(color)   // 'text-blue-700 dark:text-blue-300'
```

## Даты — date-fns с русской локалью

Утилиты в [src/lib/dateUtils.ts](src/lib/dateUtils.ts):
```typescript
formatDate(date, 'dd MMMM yyyy'); // "18 января 2026"
getCalendarDays(date, 1);         // weekStartsOn: 1 = понедельник
```

## Соглашения

1. **Комментарии на русском**, заголовки файлов:
   ```typescript
   // ==========================================
   // НАЗВАНИЕ МОДУЛЯ
   // ==========================================
   ```
2. **Barrel exports** — `index.ts` в каждой папке компонентов
3. **Иконки**: `@heroicons/react/24/outline` и `/24/solid`
4. **Уведомления**: `toast.success('Готово! 🎉')` из `react-hot-toast`
5. **Анимации**: `framer-motion` для модалок и переходов

## Команды

```bash
npm run dev      # localhost:5173
npm run build    # tsc && vite build
npm run lint     # ESLint
```

## Supabase (опционально)

Схема в [supabase/schema.sql](supabase/schema.sql). Realtime подписки через `supabase.channel()`. Если `VITE_SUPABASE_URL` не задан — работает только локальный режим.
