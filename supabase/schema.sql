-- ==================================================
-- СХЕМА БАЗЫ ДАННЫХ SUPABASE
-- ==================================================
-- Выполните этот SQL в SQL Editor вашего проекта Supabase

-- Включаем расширение для генерации UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================================================
-- ТАБЛИЦА ПОЛЬЗОВАТЕЛЕЙ
-- ==================================================
-- Дополнительные данные пользователей (расширение auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Автоматическое создание записи при регистрации
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Триггер для создания пользователя
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==================================================
-- ТАБЛИЦА КАЛЕНДАРЕЙ
-- ==================================================
CREATE TABLE IF NOT EXISTS public.calendars (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT 'blue',
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_calendars_owner ON public.calendars(owner_id);

-- ==================================================
-- ТАБЛИЦА УЧАСТНИКОВ КАЛЕНДАРЯ
-- ==================================================
CREATE TABLE IF NOT EXISTS public.calendar_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  calendar_id UUID NOT NULL REFERENCES public.calendars(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('owner', 'editor', 'viewer')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(calendar_id, user_id)
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_calendar_members_calendar ON public.calendar_members(calendar_id);
CREATE INDEX IF NOT EXISTS idx_calendar_members_user ON public.calendar_members(user_id);

-- ==================================================
-- ТАБЛИЦА ПРИГЛАШЕНИЙ
-- ==================================================
CREATE TABLE IF NOT EXISTS public.calendar_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  calendar_id UUID NOT NULL REFERENCES public.calendars(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('editor', 'viewer')),
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_calendar_invites_token ON public.calendar_invites(token);
CREATE INDEX IF NOT EXISTS idx_calendar_invites_calendar ON public.calendar_invites(calendar_id);

-- ==================================================
-- ТАБЛИЦА СОБЫТИЙ
-- ==================================================
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  calendar_id UUID NOT NULL REFERENCES public.calendars(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  notes TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  all_day BOOLEAN DEFAULT FALSE,
  color TEXT DEFAULT 'blue',
  reminder_minutes INTEGER,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_events_calendar ON public.events(calendar_id);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON public.events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON public.events(created_by);

-- ==================================================
-- ТАБЛИЦА ИСТОРИИ СОБЫТИЙ
-- ==================================================
CREATE TABLE IF NOT EXISTS public.event_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted')),
  changes JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_event_history_event ON public.event_history(event_id);

-- ==================================================
-- ROW LEVEL SECURITY (RLS)
-- ==================================================

-- Включаем RLS для всех таблиц
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_history ENABLE ROW LEVEL SECURITY;

-- ==================================================
-- ПОЛИТИКИ БЕЗОПАСНОСТИ: USERS
-- ==================================================
DROP POLICY IF EXISTS "Users can view all users" ON public.users;
CREATE POLICY "Users can view all users" ON public.users
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- ==================================================
-- ПОЛИТИКИ БЕЗОПАСНОСТИ: CALENDARS
-- ==================================================
DROP POLICY IF EXISTS "Users can view own calendars" ON public.calendars;
CREATE POLICY "Users can view own calendars" ON public.calendars
  FOR SELECT USING (
    owner_id = auth.uid() OR
    id IN (SELECT calendar_id FROM public.calendar_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can create calendars" ON public.calendars;
CREATE POLICY "Users can create calendars" ON public.calendars
  FOR INSERT WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Owners can update calendars" ON public.calendars;
CREATE POLICY "Owners can update calendars" ON public.calendars
  FOR UPDATE USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Owners can delete calendars" ON public.calendars;
CREATE POLICY "Owners can delete calendars" ON public.calendars
  FOR DELETE USING (owner_id = auth.uid());

-- ==================================================
-- ПОЛИТИКИ БЕЗОПАСНОСТИ: CALENDAR_MEMBERS
-- ==================================================
DROP POLICY IF EXISTS "Members can view calendar members" ON public.calendar_members;
CREATE POLICY "Members can view calendar members" ON public.calendar_members
  FOR SELECT USING (
    calendar_id IN (
      SELECT id FROM public.calendars WHERE owner_id = auth.uid()
      UNION
      SELECT calendar_id FROM public.calendar_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can join calendars" ON public.calendar_members;
CREATE POLICY "Users can join calendars" ON public.calendar_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Owners can manage members" ON public.calendar_members;
CREATE POLICY "Owners can manage members" ON public.calendar_members
  FOR DELETE USING (
    calendar_id IN (SELECT id FROM public.calendars WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Owners can update member roles" ON public.calendar_members;
CREATE POLICY "Owners can update member roles" ON public.calendar_members
  FOR UPDATE USING (
    calendar_id IN (SELECT id FROM public.calendars WHERE owner_id = auth.uid())
  );

-- ==================================================
-- ПОЛИТИКИ БЕЗОПАСНОСТИ: CALENDAR_INVITES
-- ==================================================
DROP POLICY IF EXISTS "Anyone can view invites by token" ON public.calendar_invites;
CREATE POLICY "Anyone can view invites by token" ON public.calendar_invites
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Owners can create invites" ON public.calendar_invites;
CREATE POLICY "Owners can create invites" ON public.calendar_invites
  FOR INSERT WITH CHECK (
    calendar_id IN (SELECT id FROM public.calendars WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Owners can delete invites" ON public.calendar_invites;
CREATE POLICY "Owners can delete invites" ON public.calendar_invites
  FOR DELETE USING (
    calendar_id IN (SELECT id FROM public.calendars WHERE owner_id = auth.uid())
  );

-- ==================================================
-- ПОЛИТИКИ БЕЗОПАСНОСТИ: EVENTS
-- ==================================================
DROP POLICY IF EXISTS "Members can view events" ON public.events;
CREATE POLICY "Members can view events" ON public.events
  FOR SELECT USING (
    calendar_id IN (
      SELECT id FROM public.calendars WHERE owner_id = auth.uid()
      UNION
      SELECT calendar_id FROM public.calendar_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Editors can create events" ON public.events;
CREATE POLICY "Editors can create events" ON public.events
  FOR INSERT WITH CHECK (
    calendar_id IN (
      SELECT id FROM public.calendars WHERE owner_id = auth.uid()
      UNION
      SELECT calendar_id FROM public.calendar_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

DROP POLICY IF EXISTS "Editors can update events" ON public.events;
CREATE POLICY "Editors can update events" ON public.events
  FOR UPDATE USING (
    calendar_id IN (
      SELECT id FROM public.calendars WHERE owner_id = auth.uid()
      UNION
      SELECT calendar_id FROM public.calendar_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

DROP POLICY IF EXISTS "Editors can delete events" ON public.events;
CREATE POLICY "Editors can delete events" ON public.events
  FOR DELETE USING (
    calendar_id IN (
      SELECT id FROM public.calendars WHERE owner_id = auth.uid()
      UNION
      SELECT calendar_id FROM public.calendar_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

-- ==================================================
-- ПОЛИТИКИ БЕЗОПАСНОСТИ: EVENT_HISTORY
-- ==================================================
DROP POLICY IF EXISTS "Members can view event history" ON public.event_history;
CREATE POLICY "Members can view event history" ON public.event_history
  FOR SELECT USING (
    event_id IN (
      SELECT id FROM public.events WHERE calendar_id IN (
        SELECT id FROM public.calendars WHERE owner_id = auth.uid()
        UNION
        SELECT calendar_id FROM public.calendar_members WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Editors can create history" ON public.event_history;
CREATE POLICY "Editors can create history" ON public.event_history
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ==================================================
-- ВКЛЮЧЕНИЕ REALTIME
-- ==================================================
-- Включаем реалтайм для таблиц
ALTER PUBLICATION supabase_realtime ADD TABLE public.calendars;
ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;

-- ==================================================
-- ГОТОВО!
-- ==================================================
-- После выполнения этого скрипта ваша база данных готова к использованию
