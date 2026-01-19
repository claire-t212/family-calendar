-- ==================================================
-- СХЕМА ДЛЯ СЕМЕЙНОГО КАЛЕНДАРЯ
-- ==================================================
-- Простая схема без сложной авторизации
-- Выполните этот SQL в SQL Editor вашего проекта Supabase

-- Включаем расширение для генерации UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================================================
-- ТАБЛИЦА СОБЫТИЙ СЕМЕЙНОГО КАЛЕНДАРЯ
-- ==================================================
CREATE TABLE IF NOT EXISTS public.family_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  all_day BOOLEAN DEFAULT FALSE,
  color TEXT DEFAULT 'blue',
  is_important BOOLEAN DEFAULT FALSE,
  image_url TEXT,
  reminder INTEGER, -- минуты до события
  reminder_repeat TEXT DEFAULT 'none', -- 'none', 'every_5min', etc.
  created_by TEXT NOT NULL, -- 'husband' или 'wife'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_family_events_start_date ON public.family_events(start_date);
CREATE INDEX IF NOT EXISTS idx_family_events_created_by ON public.family_events(created_by);
CREATE INDEX IF NOT EXISTS idx_family_events_is_important ON public.family_events(is_important);

-- ==================================================
-- ТАБЛИЦА НАСТРОЕК ПОЛЬЗОВАТЕЛЕЙ
-- ==================================================
CREATE TABLE IF NOT EXISTS public.family_members (
  id TEXT PRIMARY KEY, -- 'husband' или 'wife'
  name TEXT NOT NULL,
  avatar_url TEXT,
  birth_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Вставляем начальные данные
INSERT INTO public.family_members (id, name) VALUES 
  ('husband', 'Костя'),
  ('wife', 'Саня')
ON CONFLICT (id) DO NOTHING;

-- ==================================================
-- ТАБЛИЦА ОБЩИХ НАСТРОЕК
-- ==================================================
CREATE TABLE IF NOT EXISTS public.family_settings (
  id TEXT PRIMARY KEY DEFAULT 'main',
  together_since DATE,
  calendar_name TEXT DEFAULT 'Наш Календарь 💕',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Вставляем начальные настройки
INSERT INTO public.family_settings (id) VALUES ('main')
ON CONFLICT (id) DO NOTHING;

-- ==================================================
-- ROW LEVEL SECURITY
-- ==================================================
-- Отключаем RLS для простоты (это семейный календарь)
ALTER TABLE public.family_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_settings DISABLE ROW LEVEL SECURITY;

-- Разрешаем анонимный доступ для чтения и записи
-- (в production лучше настроить RLS или использовать API key)

-- ==================================================
-- ПОЛИТИКИ ДЛЯ АНОНИМНОГО ДОСТУПА
-- ==================================================
-- Включаем RLS но разрешаем всё
ALTER TABLE public.family_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_settings ENABLE ROW LEVEL SECURITY;

-- Политики для family_events
DROP POLICY IF EXISTS "Allow all for family_events" ON public.family_events;
CREATE POLICY "Allow all for family_events" ON public.family_events
  FOR ALL USING (true) WITH CHECK (true);

-- Политики для family_members
DROP POLICY IF EXISTS "Allow all for family_members" ON public.family_members;
CREATE POLICY "Allow all for family_members" ON public.family_members
  FOR ALL USING (true) WITH CHECK (true);

-- Политики для family_settings
DROP POLICY IF EXISTS "Allow all for family_settings" ON public.family_settings;
CREATE POLICY "Allow all for family_settings" ON public.family_settings
  FOR ALL USING (true) WITH CHECK (true);

-- ==================================================
-- ФУНКЦИЯ ОБНОВЛЕНИЯ updated_at
-- ==================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для автоматического обновления updated_at
DROP TRIGGER IF EXISTS update_family_events_updated_at ON public.family_events;
CREATE TRIGGER update_family_events_updated_at
    BEFORE UPDATE ON public.family_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_family_members_updated_at ON public.family_members;
CREATE TRIGGER update_family_members_updated_at
    BEFORE UPDATE ON public.family_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_family_settings_updated_at ON public.family_settings;
CREATE TRIGGER update_family_settings_updated_at
    BEFORE UPDATE ON public.family_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================================================
-- ВКЛЮЧЕНИЕ REALTIME
-- ==================================================
-- Добавляем таблицы в публикацию realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.family_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.family_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.family_settings;
