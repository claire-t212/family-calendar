// ==========================================
// STORE СОБЫТИЙ С СИНХРОНИЗАЦИЕЙ SUPABASE
// ==========================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { toLocalDateString } from '../lib/dateUtils';
import type { EventColor } from '../types';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Типы
export interface FamilyEvent {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  all_day: boolean;
  color: EventColor;
  is_important: boolean;
  image_url: string | null;
  reminder: number | null;
  reminder_repeat: 'none' | 'every_5min' | 'every_15min' | 'every_30min' | 'every_hour' | null;
  created_by: 'husband' | 'wife';
  created_at: string;
  updated_at: string;
}

export interface EventFormData {
  title: string;
  description?: string | null;
  start_date: string;
  start_time: string;
  end_date?: string;
  end_time?: string;
  all_day: boolean;
  color: EventColor;
  is_important: boolean;
  image_url?: string | null;
  reminder?: number | null;
  reminder_repeat?: 'none' | 'every_5min' | 'every_15min' | 'every_30min' | 'every_hour';
}

export interface FamilyMember {
  id: 'husband' | 'wife';
  name: string;
  avatar_url?: string;
  birth_date?: string;
}

export interface FamilySettings {
  together_since?: string;
  calendar_name: string;
}

interface SyncEventState {
  // Состояние
  events: FamilyEvent[];
  members: FamilyMember[];
  settings: FamilySettings;
  selectedEvent: FamilyEvent | null;
  loading: boolean;
  syncing: boolean;
  lastSyncAt: string | null;
  isOnline: boolean;
  
  // Подписка на реалтайм
  channel: RealtimeChannel | null;
  
  // Actions
  initialize: () => Promise<void>;
  fetchEvents: () => Promise<void>;
  fetchMembers: () => Promise<void>;
  fetchSettings: () => Promise<void>;
  
  addEvent: (data: EventFormData, createdBy: 'husband' | 'wife') => Promise<FamilyEvent | null>;
  updateEvent: (id: string, data: Partial<EventFormData>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  
  updateMember: (id: 'husband' | 'wife', data: Partial<FamilyMember>) => Promise<void>;
  updateSettings: (data: Partial<FamilySettings>) => Promise<void>;
  
  setSelectedEvent: (event: FamilyEvent | null) => void;
  getEventsByDate: (date: Date) => FamilyEvent[];
  getImportantEvents: () => FamilyEvent[];
  
  subscribeToChanges: () => void;
  unsubscribe: () => void;
}

// Преобразование формы в событие
const formToEventData = (data: EventFormData) => {
  let startDate = data.start_date;
  if (!data.all_day && data.start_time) {
    startDate = `${data.start_date}T${data.start_time}:00`;
  }
  
  let endDate = data.end_date || null;
  if (!data.all_day && data.end_time && data.end_date) {
    endDate = `${data.end_date}T${data.end_time}:00`;
  }
  
  return {
    title: data.title,
    description: data.description || null,
    start_date: startDate,
    end_date: endDate,
    all_day: data.all_day,
    color: data.color,
    is_important: data.is_important,
    image_url: data.image_url || null,
    reminder: data.reminder || null,
    reminder_repeat: data.reminder_repeat || 'none',
  };
};

export const useSyncEventStore = create<SyncEventState>()(
  persist(
    (set, get) => ({
      events: [],
      members: [
        { id: 'husband', name: 'Костя' },
        { id: 'wife', name: 'Саня' },
      ],
      settings: { calendar_name: 'Наш Календарь 💕' },
      selectedEvent: null,
      loading: false,
      syncing: false,
      lastSyncAt: null,
      isOnline: navigator.onLine,
      channel: null,

      // Инициализация
      initialize: async () => {
        const state = get();
        
        // Слушаем статус сети
        window.addEventListener('online', () => set({ isOnline: true }));
        window.addEventListener('offline', () => set({ isOnline: false }));
        
        set({ loading: true });
        
        try {
          await Promise.all([
            state.fetchEvents(),
            state.fetchMembers(),
            state.fetchSettings(),
          ]);
          
          // Подписываемся на изменения
          state.subscribeToChanges();
          
          set({ lastSyncAt: new Date().toISOString() });
        } catch (error) {
          console.error('Ошибка инициализации:', error);
        } finally {
          set({ loading: false });
        }
      },

      // Загрузка событий
      fetchEvents: async () => {
        try {
          const { data, error } = await supabase
            .from('family_events')
            .select('*')
            .order('start_date', { ascending: true });
          
          if (error) throw error;
          
          if (data) {
            set({ events: data as FamilyEvent[] });
          }
        } catch (error) {
          console.error('Ошибка загрузки событий:', error);
        }
      },

      // Загрузка участников
      fetchMembers: async () => {
        try {
          const { data, error } = await supabase
            .from('family_members')
            .select('*');
          
          if (error) throw error;
          
          if (data && data.length > 0) {
            set({ members: data as FamilyMember[] });
          }
        } catch (error) {
          console.error('Ошибка загрузки участников:', error);
        }
      },

      // Загрузка настроек
      fetchSettings: async () => {
        try {
          const { data, error } = await supabase
            .from('family_settings')
            .select('*')
            .eq('id', 'main')
            .single();
          
          if (error && error.code !== 'PGRST116') throw error;
          
          if (data) {
            set({ 
              settings: {
                together_since: data.together_since,
                calendar_name: data.calendar_name || 'Наш Календарь 💕',
              }
            });
          }
        } catch (error) {
          console.error('Ошибка загрузки настроек:', error);
        }
      },

      // Добавление события
      addEvent: async (data, createdBy) => {
        set({ syncing: true });
        
        try {
          const eventData = {
            ...formToEventData(data),
            created_by: createdBy,
          };
          
          const { data: newEvent, error } = await supabase
            .from('family_events')
            .insert(eventData)
            .select()
            .single();
          
          if (error) throw error;
          
          if (newEvent) {
            set(state => ({
              events: [...state.events, newEvent as FamilyEvent].sort(
                (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
              ),
            }));
            return newEvent as FamilyEvent;
          }
          
          return null;
        } catch (error) {
          console.error('Ошибка добавления события:', error);
          return null;
        } finally {
          set({ syncing: false });
        }
      },

      // Обновление события
      updateEvent: async (id, data) => {
        set({ syncing: true });
        
        try {
          const updateData = data.title !== undefined ? formToEventData(data as EventFormData) : data;
          
          const { error } = await supabase
            .from('family_events')
            .update(updateData)
            .eq('id', id);
          
          if (error) throw error;
          
          set(state => ({
            events: state.events.map(evt => 
              evt.id === id ? { ...evt, ...updateData, updated_at: new Date().toISOString() } : evt
            ),
          }));
        } catch (error) {
          console.error('Ошибка обновления события:', error);
        } finally {
          set({ syncing: false });
        }
      },

      // Удаление события
      deleteEvent: async (id) => {
        set({ syncing: true });
        
        try {
          const { error } = await supabase
            .from('family_events')
            .delete()
            .eq('id', id);
          
          if (error) throw error;
          
          set(state => ({
            events: state.events.filter(evt => evt.id !== id),
          }));
        } catch (error) {
          console.error('Ошибка удаления события:', error);
        } finally {
          set({ syncing: false });
        }
      },

      // Обновление участника
      updateMember: async (id, data) => {
        try {
          const { error } = await supabase
            .from('family_members')
            .update(data)
            .eq('id', id);
          
          if (error) throw error;
          
          set(state => ({
            members: state.members.map(m => 
              m.id === id ? { ...m, ...data } : m
            ),
          }));
        } catch (error) {
          console.error('Ошибка обновления участника:', error);
        }
      },

      // Обновление настроек
      updateSettings: async (data) => {
        try {
          const { error } = await supabase
            .from('family_settings')
            .update(data)
            .eq('id', 'main');
          
          if (error) throw error;
          
          set(state => ({
            settings: { ...state.settings, ...data },
          }));
        } catch (error) {
          console.error('Ошибка обновления настроек:', error);
        }
      },

      setSelectedEvent: (event) => set({ selectedEvent: event }),

      getEventsByDate: (date) => {
        const dateStr = toLocalDateString(date);
        return get().events.filter(evt => {
          const eventDate = evt.start_date.split('T')[0];
          return eventDate === dateStr;
        });
      },

      getImportantEvents: () => {
        return get().events.filter(evt => evt.is_important);
      },

      // Подписка на изменения в реальном времени
      subscribeToChanges: () => {
        const channel = supabase
          .channel('family_calendar_changes')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'family_events' },
            (payload) => {
              const { eventType, new: newRecord, old: oldRecord } = payload;
              
              set(state => {
                let events = [...state.events];
                
                if (eventType === 'INSERT' && newRecord) {
                  // Проверяем, нет ли уже такого события
                  if (!events.find(e => e.id === newRecord.id)) {
                    events = [...events, newRecord as FamilyEvent].sort(
                      (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
                    );
                  }
                } else if (eventType === 'UPDATE' && newRecord) {
                  events = events.map(evt => 
                    evt.id === newRecord.id ? (newRecord as FamilyEvent) : evt
                  );
                } else if (eventType === 'DELETE' && oldRecord) {
                  events = events.filter(evt => evt.id !== oldRecord.id);
                }
                
                return { events };
              });
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'family_members' },
            (payload) => {
              if (payload.new) {
                set(state => ({
                  members: state.members.map(m => 
                    m.id === (payload.new as FamilyMember).id 
                      ? (payload.new as FamilyMember) 
                      : m
                  ),
                }));
              }
            }
          )
          .subscribe();
        
        set({ channel });
      },

      // Отписка
      unsubscribe: () => {
        const { channel } = get();
        if (channel) {
          supabase.removeChannel(channel);
          set({ channel: null });
        }
      },
    }),
    {
      name: 'family-calendar-sync',
      partialize: (state) => ({
        events: state.events,
        members: state.members,
        settings: state.settings,
        lastSyncAt: state.lastSyncAt,
      }),
    }
  )
);
