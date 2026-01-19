// ==========================================
// STORE СОБЫТИЙ
// ==========================================

import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { CalendarEvent, EventFormData, EventHistory } from '../types';
import { startOfMonth, endOfMonth, addDays, subDays } from '../lib/dateUtils';

interface EventState {
  // Состояние
  events: CalendarEvent[];
  selectedEvent: CalendarEvent | null;
  eventHistory: EventHistory[];
  loading: boolean;
  error: string | null;

  // Действия
  fetchEvents: (calendarId: string, startDate?: Date, endDate?: Date) => Promise<void>;
  fetchEvent: (eventId: string) => Promise<CalendarEvent | null>;
  createEvent: (calendarId: string, data: EventFormData) => Promise<{ event: CalendarEvent | null; error: string | null }>;
  updateEvent: (eventId: string, data: Partial<EventFormData>) => Promise<{ error: string | null }>;
  deleteEvent: (eventId: string) => Promise<{ error: string | null }>;
  setSelectedEvent: (event: CalendarEvent | null) => void;

  // История
  fetchEventHistory: (eventId: string) => Promise<void>;

  // Realtime подписка
  subscribeToEvents: (calendarId: string) => () => void;

  // Офлайн поддержка
  saveOfflineEvent: (event: Partial<CalendarEvent>) => void;
  syncOfflineEvents: (calendarId: string) => Promise<void>;

  clearError: () => void;
}

// Преобразование данных формы в данные для БД
const formDataToDbData = (data: EventFormData) => {
  const startDateTime = data.all_day
    ? `${data.start_date}T00:00:00`
    : `${data.start_date}T${data.start_time}:00`;
  
  const endDateTime = data.end_date
    ? data.all_day
      ? `${data.end_date}T23:59:59`
      : `${data.end_date}T${data.end_time}:00`
    : null;

  return {
    title: data.title,
    description: data.description || null,
    notes: data.notes || null,
    start_date: startDateTime,
    end_date: endDateTime,
    all_day: data.all_day,
    color: data.color,
    reminder_minutes: data.reminder_minutes,
  };
};

export const useEventStore = create<EventState>((set, get) => ({
  events: [],
  selectedEvent: null,
  eventHistory: [],
  loading: false,
  error: null,

  // Получить события за период
  fetchEvents: async (calendarId: string, startDate?: Date, endDate?: Date) => {
    try {
      set({ loading: true, error: null });

      // По умолчанию загружаем месяц с запасом
      const start = startDate || subDays(startOfMonth(new Date()), 7);
      const end = endDate || addDays(endOfMonth(new Date()), 7);

      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          creator:users!events_created_by_fkey(id, email, full_name, avatar_url)
        `)
        .eq('calendar_id', calendarId)
        .gte('start_date', start.toISOString())
        .lte('start_date', end.toISOString())
        .order('start_date', { ascending: true });

      if (error) throw error;

      set({ events: data || [], loading: false });
    } catch (error) {
      console.error('Fetch events error:', error);
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Ошибка загрузки событий',
      });
    }
  },

  // Получить одно событие
  fetchEvent: async (eventId: string) => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          creator:users!events_created_by_fkey(id, email, full_name, avatar_url)
        `)
        .eq('id', eventId)
        .single();

      if (error) throw error;

      set({ selectedEvent: data });
      return data;
    } catch (error) {
      console.error('Fetch event error:', error);
      return null;
    }
  },

  // Создать событие
  createEvent: async (calendarId: string, data: EventFormData) => {
    try {
      set({ loading: true, error: null });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Не авторизован');

      const dbData = formDataToDbData(data);

      const { data: event, error } = await supabase
        .from('events')
        .insert({
          ...dbData,
          calendar_id: calendarId,
          created_by: user.id,
        })
        .select(`
          *,
          creator:users!events_created_by_fkey(id, email, full_name, avatar_url)
        `)
        .single();

      if (error) throw error;

      // Записываем в историю
      await supabase
        .from('event_history')
        .insert({
          event_id: event.id,
          user_id: user.id,
          action: 'created',
          changes: { event: dbData },
        });

      set((state) => ({
        events: [...state.events, event].sort(
          (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
        ),
        loading: false,
      }));

      return { event, error: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка создания события';
      set({ loading: false, error: message });
      return { event: null, error: message };
    }
  },

  // Обновить событие
  updateEvent: async (eventId: string, data: Partial<EventFormData>) => {
    try {
      set({ loading: true, error: null });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Не авторизован');

      // Получаем текущее событие для истории
      const currentEvent = get().events.find((e) => e.id === eventId);

      const dbData: Record<string, unknown> = {};
      
      if (data.title !== undefined) dbData.title = data.title;
      if (data.description !== undefined) dbData.description = data.description || null;
      if (data.notes !== undefined) dbData.notes = data.notes || null;
      if (data.color !== undefined) dbData.color = data.color;
      if (data.reminder_minutes !== undefined) dbData.reminder_minutes = data.reminder_minutes;
      if (data.all_day !== undefined) dbData.all_day = data.all_day;
      
      if (data.start_date !== undefined) {
        const startDateTime = data.all_day
          ? `${data.start_date}T00:00:00`
          : `${data.start_date}T${data.start_time || '00:00'}:00`;
        dbData.start_date = startDateTime;
      }
      
      if (data.end_date !== undefined) {
        const endDateTime = data.end_date
          ? data.all_day
            ? `${data.end_date}T23:59:59`
            : `${data.end_date}T${data.end_time || '23:59'}:00`
          : null;
        dbData.end_date = endDateTime;
      }

      dbData.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('events')
        .update(dbData)
        .eq('id', eventId);

      if (error) throw error;

      // Записываем изменения в историю
      if (currentEvent) {
        const changes: Record<string, { old: unknown; new: unknown }> = {};
        Object.keys(dbData).forEach((key) => {
          if (key !== 'updated_at' && currentEvent[key as keyof CalendarEvent] !== dbData[key]) {
            changes[key] = {
              old: currentEvent[key as keyof CalendarEvent],
              new: dbData[key],
            };
          }
        });

        if (Object.keys(changes).length > 0) {
          await supabase
            .from('event_history')
            .insert({
              event_id: eventId,
              user_id: user.id,
              action: 'updated',
              changes,
            });
        }
      }

      set((state) => ({
        events: state.events.map((e) =>
          e.id === eventId ? { ...e, ...dbData } : e
        ),
        selectedEvent:
          state.selectedEvent?.id === eventId
            ? { ...state.selectedEvent, ...dbData }
            : state.selectedEvent,
        loading: false,
      }));

      return { error: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка обновления события';
      set({ loading: false, error: message });
      return { error: message };
    }
  },

  // Удалить событие
  deleteEvent: async (eventId: string) => {
    try {
      set({ loading: true, error: null });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Не авторизован');

      // Записываем удаление в историю
      await supabase
        .from('event_history')
        .insert({
          event_id: eventId,
          user_id: user.id,
          action: 'deleted',
          changes: {},
        });

      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      set((state) => ({
        events: state.events.filter((e) => e.id !== eventId),
        selectedEvent:
          state.selectedEvent?.id === eventId ? null : state.selectedEvent,
        loading: false,
      }));

      return { error: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка удаления события';
      set({ loading: false, error: message });
      return { error: message };
    }
  },

  // Установить выбранное событие
  setSelectedEvent: (event) => {
    set({ selectedEvent: event });
  },

  // Получить историю события
  fetchEventHistory: async (eventId: string) => {
    try {
      const { data, error } = await supabase
        .from('event_history')
        .select(`
          *,
          user:users(id, email, full_name, avatar_url)
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      set({ eventHistory: data || [] });
    } catch (error) {
      console.error('Fetch event history error:', error);
    }
  },

  // Подписка на realtime обновления событий
  subscribeToEvents: (calendarId: string) => {
    const channel = supabase
      .channel(`events-${calendarId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
          filter: `calendar_id=eq.${calendarId}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            // Загружаем полные данные события с creator
            const { data: newEvent } = await supabase
              .from('events')
              .select(`
                *,
                creator:users!events_created_by_fkey(id, email, full_name, avatar_url)
              `)
              .eq('id', payload.new.id)
              .single();

            if (newEvent) {
              set((state) => ({
                events: [...state.events, newEvent].sort(
                  (a, b) =>
                    new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
                ),
              }));
            }
          } else if (payload.eventType === 'UPDATE') {
            set((state) => {
              const updatedEvents = state.events.map((e) =>
                e.id === payload.new.id
                  ? { ...e, ...payload.new }
                  : e
              );
              
              let updatedSelectedEvent = state.selectedEvent;
              if (state.selectedEvent?.id === payload.new.id) {
                updatedSelectedEvent = { ...state.selectedEvent, ...payload.new } as CalendarEvent;
              }
              
              return {
                events: updatedEvents,
                selectedEvent: updatedSelectedEvent,
              };
            });
          } else if (payload.eventType === 'DELETE') {
            set((state) => ({
              events: state.events.filter((e) => e.id !== payload.old.id),
              selectedEvent:
                state.selectedEvent?.id === payload.old.id
                  ? null
                  : state.selectedEvent,
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  // Сохранить событие офлайн
  saveOfflineEvent: (event) => {
    const offlineEvents = JSON.parse(
      localStorage.getItem('offline_events') || '[]'
    );
    offlineEvents.push({
      ...event,
      _offline: true,
      _offlineId: crypto.randomUUID(),
      _createdAt: new Date().toISOString(),
    });
    localStorage.setItem('offline_events', JSON.stringify(offlineEvents));
  },

  // Синхронизировать офлайн события
  syncOfflineEvents: async (calendarId: string) => {
    const offlineEvents = JSON.parse(
      localStorage.getItem('offline_events') || '[]'
    );

    if (offlineEvents.length === 0) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    for (const event of offlineEvents) {
      if (event.calendar_id === calendarId) {
        try {
          const { _offline, _offlineId, _createdAt, ...eventData } = event;
          
          await supabase
            .from('events')
            .insert({
              ...eventData,
              created_by: user.id,
            });

          // Удаляем успешно синхронизированное событие
          const remaining = offlineEvents.filter(
            (e: { _offlineId: string }) => e._offlineId !== _offlineId
          );
          localStorage.setItem('offline_events', JSON.stringify(remaining));
        } catch (error) {
          console.error('Failed to sync offline event:', error);
        }
      }
    }

    // Перезагружаем события
    await get().fetchEvents(calendarId);
  },

  clearError: () => set({ error: null }),
}));
