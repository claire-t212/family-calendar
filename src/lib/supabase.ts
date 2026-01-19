import { createClient } from '@supabase/supabase-js';

// Supabase конфигурация для семейного календаря
// Ключи вшиты для работы на GitHub Pages
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rdebiqnreymcibsznjzi.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_I4ora5efVyjT3e0BOkSeyA_Zges2YxA';

// Supabase всегда настроен
export const isSupabaseConfigured = true;

// Создаем клиент Supabase только если настроен
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Отключаем для PWA
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Типы для базы данных (для типизации запросов)
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
        };
        Update: {
          full_name?: string | null;
          avatar_url?: string | null;
        };
      };
      calendars: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          color: string;
          owner_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          description?: string | null;
          color?: string;
          owner_id: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          color?: string;
        };
      };
      calendar_members: {
        Row: {
          id: string;
          calendar_id: string;
          user_id: string;
          role: string;
          joined_at: string;
        };
        Insert: {
          calendar_id: string;
          user_id: string;
          role?: string;
        };
        Update: {
          role?: string;
        };
      };
      calendar_invites: {
        Row: {
          id: string;
          calendar_id: string;
          email: string;
          role: string;
          token: string;
          expires_at: string;
          created_at: string;
          created_by: string;
        };
        Insert: {
          calendar_id: string;
          email: string;
          role?: string;
          token: string;
          expires_at: string;
          created_by: string;
        };
        Update: {
          expires_at?: string;
        };
      };
      events: {
        Row: {
          id: string;
          calendar_id: string;
          title: string;
          description: string | null;
          notes: string | null;
          start_date: string;
          end_date: string | null;
          all_day: boolean;
          color: string;
          reminder_minutes: number | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          calendar_id: string;
          title: string;
          description?: string | null;
          notes?: string | null;
          start_date: string;
          end_date?: string | null;
          all_day?: boolean;
          color?: string;
          reminder_minutes?: number | null;
          created_by: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          notes?: string | null;
          start_date?: string;
          end_date?: string | null;
          all_day?: boolean;
          color?: string;
          reminder_minutes?: number | null;
        };
      };
      event_history: {
        Row: {
          id: string;
          event_id: string;
          user_id: string;
          action: string;
          changes: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          event_id: string;
          user_id: string;
          action: string;
          changes: Record<string, unknown>;
        };
        Update: never;
      };
    };
  };
};
