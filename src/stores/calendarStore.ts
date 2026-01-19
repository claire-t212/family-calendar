// ==========================================
// STORE КАЛЕНДАРЕЙ
// ==========================================

import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Calendar, CalendarMember, CalendarInvite, CalendarFormData, CalendarRole } from '../types';

interface CalendarState {
  // Состояние
  calendars: Calendar[];
  currentCalendar: Calendar | null;
  members: CalendarMember[];
  invites: CalendarInvite[];
  loading: boolean;
  error: string | null;

  // Действия
  fetchCalendars: () => Promise<void>;
  fetchCalendar: (id: string) => Promise<void>;
  createCalendar: (data: CalendarFormData) => Promise<{ calendar: Calendar | null; error: string | null }>;
  updateCalendar: (id: string, data: Partial<CalendarFormData>) => Promise<{ error: string | null }>;
  deleteCalendar: (id: string) => Promise<{ error: string | null }>;
  setCurrentCalendar: (calendar: Calendar | null) => void;

  // Участники
  fetchMembers: (calendarId: string) => Promise<void>;
  removeMember: (calendarId: string, userId: string) => Promise<{ error: string | null }>;
  updateMemberRole: (calendarId: string, userId: string, role: CalendarRole) => Promise<{ error: string | null }>;

  // Приглашения
  createInvite: (calendarId: string, email: string, role: CalendarRole) => Promise<{ invite: CalendarInvite | null; error: string | null }>;
  acceptInvite: (token: string) => Promise<{ error: string | null }>;
  deleteInvite: (inviteId: string) => Promise<{ error: string | null }>;

  // Realtime подписки
  subscribeToCalendars: () => () => void;
  
  clearError: () => void;
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  calendars: [],
  currentCalendar: null,
  members: [],
  invites: [],
  loading: false,
  error: null,

  // Получить все календари пользователя
  fetchCalendars: async () => {
    try {
      set({ loading: true, error: null });

      // Получаем календари, где пользователь является владельцем или участником
      const { data: ownedCalendars, error: ownedError } = await supabase
        .from('calendars')
        .select('*')
        .order('created_at', { ascending: false });

      if (ownedError) throw ownedError;

      // Получаем календари, в которых пользователь - участник
      const { data: memberCalendars, error: memberError } = await supabase
        .from('calendar_members')
        .select(`
          calendar:calendars(*)
        `)
        .order('joined_at', { ascending: false });

      if (memberError) throw memberError;

      // Объединяем и убираем дубликаты
      const memberCalendarsList: Calendar[] = [];
      if (memberCalendars) {
        for (const m of memberCalendars) {
          const cal = m.calendar as unknown as Calendar;
          if (cal) {
            memberCalendarsList.push(cal);
          }
        }
      }
      
      const allCalendars = [...(ownedCalendars || [])];
      memberCalendarsList.forEach((cal: Calendar) => {
        if (!allCalendars.find(c => c.id === cal.id)) {
          allCalendars.push(cal);
        }
      });

      set({ calendars: allCalendars, loading: false });

      // Если нет текущего календаря, выбираем первый
      if (!get().currentCalendar && allCalendars.length > 0) {
        set({ currentCalendar: allCalendars[0] });
      }
    } catch (error) {
      console.error('Fetch calendars error:', error);
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Ошибка загрузки календарей',
      });
    }
  },

  // Получить один календарь
  fetchCalendar: async (id: string) => {
    try {
      set({ loading: true, error: null });

      const { data, error } = await supabase
        .from('calendars')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      set({ currentCalendar: data, loading: false });
    } catch (error) {
      console.error('Fetch calendar error:', error);
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Ошибка загрузки календаря',
      });
    }
  },

  // Создать календарь
  createCalendar: async (data: CalendarFormData) => {
    try {
      set({ loading: true, error: null });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Не авторизован');

      const { data: calendar, error } = await supabase
        .from('calendars')
        .insert({
          name: data.name,
          description: data.description || null,
          color: data.color,
          owner_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Добавляем владельца как участника
      await supabase
        .from('calendar_members')
        .insert({
          calendar_id: calendar.id,
          user_id: user.id,
          role: 'owner',
        });

      set((state) => ({
        calendars: [calendar, ...state.calendars],
        currentCalendar: calendar,
        loading: false,
      }));

      return { calendar, error: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка создания календаря';
      set({ loading: false, error: message });
      return { calendar: null, error: message };
    }
  },

  // Обновить календарь
  updateCalendar: async (id: string, data: Partial<CalendarFormData>) => {
    try {
      set({ loading: true, error: null });

      const { error } = await supabase
        .from('calendars')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        calendars: state.calendars.map((c) =>
          c.id === id ? { ...c, ...data } : c
        ),
        currentCalendar:
          state.currentCalendar?.id === id
            ? { ...state.currentCalendar, ...data }
            : state.currentCalendar,
        loading: false,
      }));

      return { error: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка обновления календаря';
      set({ loading: false, error: message });
      return { error: message };
    }
  },

  // Удалить календарь
  deleteCalendar: async (id: string) => {
    try {
      set({ loading: true, error: null });

      const { error } = await supabase
        .from('calendars')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        calendars: state.calendars.filter((c) => c.id !== id),
        currentCalendar:
          state.currentCalendar?.id === id
            ? state.calendars.find((c) => c.id !== id) || null
            : state.currentCalendar,
        loading: false,
      }));

      return { error: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка удаления календаря';
      set({ loading: false, error: message });
      return { error: message };
    }
  },

  // Установить текущий календарь
  setCurrentCalendar: (calendar) => {
    set({ currentCalendar: calendar });
  },

  // Получить участников календаря
  fetchMembers: async (calendarId: string) => {
    try {
      const { data, error } = await supabase
        .from('calendar_members')
        .select(`
          *,
          user:users(*)
        `)
        .eq('calendar_id', calendarId);

      if (error) throw error;

      set({ members: data || [] });
    } catch (error) {
      console.error('Fetch members error:', error);
    }
  },

  // Удалить участника
  removeMember: async (calendarId: string, userId: string) => {
    try {
      const { error } = await supabase
        .from('calendar_members')
        .delete()
        .eq('calendar_id', calendarId)
        .eq('user_id', userId);

      if (error) throw error;

      set((state) => ({
        members: state.members.filter(
          (m) => !(m.calendar_id === calendarId && m.user_id === userId)
        ),
      }));

      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Ошибка удаления участника' };
    }
  },

  // Обновить роль участника
  updateMemberRole: async (calendarId: string, userId: string, role: CalendarRole) => {
    try {
      const { error } = await supabase
        .from('calendar_members')
        .update({ role })
        .eq('calendar_id', calendarId)
        .eq('user_id', userId);

      if (error) throw error;

      set((state) => ({
        members: state.members.map((m) =>
          m.calendar_id === calendarId && m.user_id === userId
            ? { ...m, role }
            : m
        ),
      }));

      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Ошибка обновления роли' };
    }
  },

  // Создать приглашение
  createInvite: async (calendarId: string, email: string, role: CalendarRole) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Не авторизован');

      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 дней

      const { data, error } = await supabase
        .from('calendar_invites')
        .insert({
          calendar_id: calendarId,
          email,
          role,
          token,
          expires_at: expiresAt.toISOString(),
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        invites: [...state.invites, data],
      }));

      return { invite: data, error: null };
    } catch (error) {
      return {
        invite: null,
        error: error instanceof Error ? error.message : 'Ошибка создания приглашения',
      };
    }
  },

  // Принять приглашение
  acceptInvite: async (token: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Не авторизован');

      // Получаем приглашение
      const { data: invite, error: inviteError } = await supabase
        .from('calendar_invites')
        .select('*')
        .eq('token', token)
        .single();

      if (inviteError) throw new Error('Приглашение не найдено');
      if (!invite) throw new Error('Приглашение не найдено');

      // Проверяем срок действия
      if (new Date(invite.expires_at) < new Date()) {
        throw new Error('Срок действия приглашения истёк');
      }

      // Добавляем пользователя в календарь
      const { error: memberError } = await supabase
        .from('calendar_members')
        .insert({
          calendar_id: invite.calendar_id,
          user_id: user.id,
          role: invite.role,
        });

      if (memberError) {
        if (memberError.code === '23505') {
          throw new Error('Вы уже являетесь участником этого календаря');
        }
        throw memberError;
      }

      // Удаляем приглашение
      await supabase
        .from('calendar_invites')
        .delete()
        .eq('id', invite.id);

      // Обновляем список календарей
      await get().fetchCalendars();

      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Ошибка принятия приглашения' };
    }
  },

  // Удалить приглашение
  deleteInvite: async (inviteId: string) => {
    try {
      const { error } = await supabase
        .from('calendar_invites')
        .delete()
        .eq('id', inviteId);

      if (error) throw error;

      set((state) => ({
        invites: state.invites.filter((i) => i.id !== inviteId),
      }));

      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Ошибка удаления приглашения' };
    }
  },

  // Подписка на realtime обновления
  subscribeToCalendars: () => {
    const channel = supabase
      .channel('calendars-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'calendars' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            set((state) => ({
              calendars: [payload.new as Calendar, ...state.calendars],
            }));
          } else if (payload.eventType === 'UPDATE') {
            set((state) => ({
              calendars: state.calendars.map((c) =>
                c.id === payload.new.id ? (payload.new as Calendar) : c
              ),
              currentCalendar:
                state.currentCalendar?.id === payload.new.id
                  ? (payload.new as Calendar)
                  : state.currentCalendar,
            }));
          } else if (payload.eventType === 'DELETE') {
            set((state) => ({
              calendars: state.calendars.filter((c) => c.id !== payload.old.id),
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  clearError: () => set({ error: null }),
}));
