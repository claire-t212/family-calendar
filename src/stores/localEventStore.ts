// ==========================================
// ЛОКАЛЬНЫЙ STORE СОБЫТИЙ (без Supabase)
// ==========================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toLocalDateString } from '../lib/dateUtils';
import type { EventColor } from '../types';

export interface LocalEvent {
  id: string;
  title: string;
  description: string | null;
  notes?: string;
  start_date: string;
  end_date: string | null;
  all_day: boolean;
  color: EventColor;
  reminder: number | null;
  reminder_repeat: 'none' | 'every_5min' | 'every_15min' | 'every_30min' | 'every_hour' | null;
  is_important: boolean;
  image_url: string | null;
  created_by: 'husband' | 'wife';
  created_at: string;
  updated_at: string;
}

export interface EventFormData {
  title: string;
  description?: string | null;
  notes?: string;
  start_date: string;
  start_time: string;
  end_date?: string;
  end_time?: string;
  all_day: boolean;
  color: EventColor;
  reminder?: number | null;
  reminder_repeat?: 'none' | 'every_5min' | 'every_15min' | 'every_30min' | 'every_hour';
  is_important: boolean;
  image_url?: string | null;
}

interface LocalEventState {
  events: LocalEvent[];
  selectedEvent: LocalEvent | null;
  
  // Actions
  addEvent: (data: EventFormData, createdBy: 'husband' | 'wife') => LocalEvent;
  updateEvent: (id: string, data: Partial<EventFormData>) => void;
  deleteEvent: (id: string) => void;
  setSelectedEvent: (event: LocalEvent | null) => void;
  getEventsByDate: (date: Date) => LocalEvent[];
  getImportantEvents: () => LocalEvent[];
  exportEvents: () => string;
  importEvents: (json: string) => boolean;
}

// Генератор уникальных ID
const generateId = () => {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Преобразование формы в событие
const formToEvent = (data: EventFormData, createdBy: 'husband' | 'wife'): LocalEvent => {
  const now = new Date().toISOString();
  
  let startDate = data.start_date;
  if (!data.all_day && data.start_time) {
    startDate = `${data.start_date}T${data.start_time}:00`;
  }
  
  let endDate = data.end_date || null;
  if (!data.all_day && data.end_time && data.end_date) {
    endDate = `${data.end_date}T${data.end_time}:00`;
  }
  
  return {
    id: generateId(),
    title: data.title,
    description: data.description || null,
    notes: data.notes,
    start_date: startDate,
    end_date: endDate,
    all_day: data.all_day,
    color: data.color,
    reminder: data.reminder ?? null,
    reminder_repeat: data.reminder_repeat ?? null,
    is_important: data.is_important,
    image_url: data.image_url || null,
    created_by: createdBy,
    created_at: now,
    updated_at: now,
  };
};

export const useLocalEventStore = create<LocalEventState>()(
  persist(
    (set, get) => ({
      events: [],
      selectedEvent: null,

      addEvent: (data, createdBy) => {
        const newEvent = formToEvent(data, createdBy);
        set((state) => ({
          events: [...state.events, newEvent].sort(
            (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
          ),
        }));
        return newEvent;
      },

      updateEvent: (id, data) => {
        set((state) => ({
          events: state.events.map((event): LocalEvent => {
            if (event.id !== id) return event;
            
            let startDate = data.start_date || event.start_date.split('T')[0];
            if (data.all_day === false && data.start_time) {
              startDate = `${startDate}T${data.start_time}:00`;
            } else if (data.all_day === true) {
              startDate = startDate.split('T')[0];
            }
            
            const baseEndDate = data.end_date ?? event.end_date;
            let endDate: string | null = baseEndDate ? baseEndDate.split('T')[0] : null;
            if (data.all_day === false && data.end_time && endDate) {
              endDate = `${endDate}T${data.end_time}:00`;
            }
            
            return {
              ...event,
              title: data.title ?? event.title,
              description: data.description !== undefined ? (data.description || null) : event.description,
              notes: data.notes ?? event.notes,
              all_day: data.all_day ?? event.all_day,
              color: data.color ?? event.color,
              reminder: data.reminder !== undefined ? (data.reminder ?? null) : event.reminder,
              reminder_repeat: data.reminder_repeat !== undefined ? (data.reminder_repeat ?? null) : event.reminder_repeat,
              is_important: data.is_important ?? event.is_important,
              image_url: data.image_url !== undefined ? (data.image_url || null) : event.image_url,
              start_date: startDate,
              end_date: endDate,
              updated_at: new Date().toISOString(),
            };
          }).sort(
            (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
          ),
          selectedEvent: state.selectedEvent?.id === id
            ? { ...state.selectedEvent, ...data, updated_at: new Date().toISOString() } as LocalEvent
            : state.selectedEvent,
        }));
      },

      deleteEvent: (id) => {
        set((state) => ({
          events: state.events.filter((e) => e.id !== id),
          selectedEvent: state.selectedEvent?.id === id ? null : state.selectedEvent,
        }));
      },

      setSelectedEvent: (event) => {
        set({ selectedEvent: event });
      },

      getEventsByDate: (date) => {
        const dateStr = toLocalDateString(date);
        return get().events.filter((event) => {
          const eventDate = event.start_date.split('T')[0];
          return eventDate === dateStr;
        });
      },

      getImportantEvents: () => {
        return get().events.filter((event) => event.is_important);
      },

      // Экспорт всех событий в JSON
      exportEvents: () => {
        return JSON.stringify(get().events, null, 2);
      },

      // Импорт событий из JSON (объединяет с существующими)
      importEvents: (json) => {
        try {
          const importedEvents = JSON.parse(json) as LocalEvent[];
          
          set((state) => {
            const existingIds = new Set(state.events.map((e) => e.id));
            const newEvents = importedEvents.filter((e) => !existingIds.has(e.id));
            
            return {
              events: [...state.events, ...newEvents].sort(
                (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
              ),
            };
          });
          
          return true;
        } catch (e) {
          console.error('Import error:', e);
          return false;
        }
      },
    }),
    {
      name: 'family-calendar-events',
    }
  )
);
