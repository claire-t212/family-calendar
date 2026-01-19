// ==========================================
// STORE АВТОРИЗАЦИИ
// ==========================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import type { User } from '../types';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

interface AuthState {
  // Состояние
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  
  // Действия
  initialize: () => Promise<void>;
  setLocalUser: (user: User) => void;
  signInWithEmail: (email: string) => Promise<{ error: string | null }>;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateProfile: (data: { full_name?: string; avatar_url?: string }) => Promise<{ error: string | null }>;
  clearError: () => void;
}

// Преобразование Supabase User в наш User
const mapSupabaseUser = (supabaseUser: SupabaseUser): User => ({
  id: supabaseUser.id,
  email: supabaseUser.email || '',
  full_name: supabaseUser.user_metadata?.full_name || null,
  avatar_url: supabaseUser.user_metadata?.avatar_url || null,
  created_at: supabaseUser.created_at,
});

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      loading: false, // НЕ блокируем UI при старте!
      error: null,

      // Локальный вход (без Supabase)
      setLocalUser: (user: User) => {
        set({ user, loading: false, error: null });
      },

      // Инициализация: проверка существующей сессии (в фоне, не блокирует UI)
      initialize: async () => {
        // Если уже есть локальный пользователь - ничего не делаем
        const currentUser = get().user;
        if (currentUser) {
          return;
        }
        
        // Пытаемся получить Supabase сессию в фоне (не блокируем UI)
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            set({
              session,
              user: mapSupabaseUser(session.user),
            });
          }
        } catch (e) {
          console.log('Supabase auth skipped:', e);
        }
        
        // Подписываемся на изменения авторизации
        supabase.auth.onAuthStateChange((_event, session) => {
          if (session?.user) {
            set({
              session,
              user: mapSupabaseUser(session.user),
            });
          } else {
            // Не сбрасываем локального пользователя при изменении Supabase сессии
            const currentUser = get().user;
            if (currentUser?.id !== 'husband' && currentUser?.id !== 'wife') {
              set({ session: null, user: null });
            }
          }
        });
      },

      // Вход через Magic Link
      signInWithEmail: async (email: string) => {
        try {
          set({ loading: true, error: null });
          
          const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
              emailRedirectTo: window.location.origin,
            },
          });
          
          if (error) throw error;
          
          set({ loading: false });
          return { error: null };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Ошибка отправки ссылки';
          set({ loading: false, error: message });
          return { error: message };
        }
      },

      // Вход с паролем
      signInWithPassword: async (email: string, password: string) => {
        try {
          set({ loading: true, error: null });
          
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          
          if (error) throw error;
          
          if (data.user) {
            set({
              session: data.session,
              user: mapSupabaseUser(data.user),
              loading: false,
            });
          }
          
          return { error: null };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Ошибка входа';
          set({ loading: false, error: message });
          return { error: message };
        }
      },

      // Регистрация
      signUp: async (email: string, password: string, fullName: string) => {
        try {
          set({ loading: true, error: null });
          
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: fullName,
              },
              emailRedirectTo: window.location.origin,
            },
          });
          
          if (error) throw error;
          
          if (data.user) {
            set({
              session: data.session,
              user: mapSupabaseUser(data.user),
              loading: false,
            });
          }
          
          return { error: null };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Ошибка регистрации';
          set({ loading: false, error: message });
          return { error: message };
        }
      },

      // Выход
      signOut: async () => {
        try {
          set({ loading: true });
          await supabase.auth.signOut();
          set({ user: null, session: null, loading: false });
        } catch (error) {
          console.error('Sign out error:', error);
          set({ loading: false });
        }
      },

      // Обновление профиля
      updateProfile: async (data) => {
        try {
          set({ loading: true, error: null });
          
          const { error } = await supabase.auth.updateUser({
            data,
          });
          
          if (error) throw error;
          
          // Обновляем локальное состояние
          const currentUser = get().user;
          if (currentUser) {
            set({
              user: {
                ...currentUser,
                full_name: data.full_name ?? currentUser.full_name,
                avatar_url: data.avatar_url ?? currentUser.avatar_url,
              },
              loading: false,
            });
          }
          
          return { error: null };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Ошибка обновления профиля';
          set({ loading: false, error: message });
          return { error: message };
        }
      },

      // Очистка ошибки
      clearError: () => set({ error: null }),
    }),
    {
      name: 'family-calendar-auth',
      partialize: (state) => ({ user: state.user }),
    }
  )
);
