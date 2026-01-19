// ==========================================
// STORE НАСТРОЕК И UI
// ==========================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Theme, CalendarView, AppSettings, PresenceState } from '../types';
import { DEFAULT_SETTINGS } from '../lib/constants';
import { supabase } from '../lib/supabase';

interface UIState {
  // Тема
  theme: Theme;
  setTheme: (theme: Theme) => void;
  
  // Режим синхронизации
  syncMode: 'local' | 'supabase';
  setSyncMode: (mode: 'local' | 'supabase') => void;
  
  // Вид календаря
  calendarView: CalendarView;
  setCalendarView: (view: CalendarView) => void;
  
  // Выбранная дата
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  
  // Модальные окна
  isEventModalOpen: boolean;
  isCalendarModalOpen: boolean;
  isSettingsOpen: boolean;
  isInviteModalOpen: boolean;
  openEventModal: () => void;
  closeEventModal: () => void;
  openCalendarModal: () => void;
  closeCalendarModal: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  openInviteModal: () => void;
  closeInviteModal: () => void;
  
  // Сайдбар
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  
  // Настройки
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
  
  // Presence (кто онлайн)
  onlineUsers: PresenceState[];
  subscribeToPresence: (calendarId: string, userId: string, userEmail: string, userName: string | null) => () => void;
}

// Применение темы к документу
const applyTheme = (theme: Theme) => {
  const root = document.documentElement;
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
};

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Тема - светлая по умолчанию
      theme: 'light',
      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
      },
      
      // Режим синхронизации - supabase по умолчанию для совместной работы
      syncMode: 'supabase',
      setSyncMode: (mode) => set({ syncMode: mode }),
      
      // Вид календаря
      calendarView: 'month',
      setCalendarView: (view) => set({ calendarView: view }),
      
      // Выбранная дата
      selectedDate: new Date(),
      setSelectedDate: (date) => set({ selectedDate: date }),
      
      // Модальные окна
      isEventModalOpen: false,
      isCalendarModalOpen: false,
      isSettingsOpen: false,
      isInviteModalOpen: false,
      openEventModal: () => set({ isEventModalOpen: true }),
      closeEventModal: () => set({ isEventModalOpen: false }),
      openCalendarModal: () => set({ isCalendarModalOpen: true }),
      closeCalendarModal: () => set({ isCalendarModalOpen: false }),
      openSettings: () => set({ isSettingsOpen: true }),
      closeSettings: () => set({ isSettingsOpen: false }),
      openInviteModal: () => set({ isInviteModalOpen: true }),
      closeInviteModal: () => set({ isInviteModalOpen: false }),
      
      // Сайдбар
      isSidebarOpen: false,
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      setSidebarOpen: (open) => set({ isSidebarOpen: open }),
      
      // Настройки
      settings: DEFAULT_SETTINGS,
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),
      
      // Presence
      onlineUsers: [],
      subscribeToPresence: (calendarId, userId, userEmail, userName) => {
        const channel = supabase.channel(`presence-${calendarId}`, {
          config: {
            presence: {
              key: userId,
            },
          },
        });

        channel
          .on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState();
            const users: PresenceState[] = [];
            
            Object.values(state).forEach((presences) => {
              const presenceArray = presences as unknown as PresenceState[];
              presenceArray.forEach((presence) => {
                users.push(presence);
              });
            });
            
            set({ onlineUsers: users });
          })
          .on('presence', { event: 'join' }, ({ key, newPresences }) => {
            console.log('User joined:', key, newPresences);
          })
          .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
            console.log('User left:', key, leftPresences);
          })
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
              await channel.track({
                user_id: userId,
                user_email: userEmail,
                user_name: userName,
                online_at: new Date().toISOString(),
              });
            }
          });

        return () => {
          channel.untrack();
          supabase.removeChannel(channel);
        };
      },
    }),
    {
      name: 'calendar-ui-storage',
      partialize: (state) => ({
        theme: state.theme,
        calendarView: state.calendarView,
        settings: state.settings,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyTheme(state.theme);
        }
      },
    }
  )
);

// Слушаем изменения системной темы
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const { theme } = useUIStore.getState();
    if (theme === 'system') {
      applyTheme('system');
    }
  });
}
