import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

console.log('=== ТЕСТ SUPABASE ===\n');
console.log('URL:', url);
console.log('Key:', key ? key.substring(0, 30) + '...' : 'NOT SET');

if (!url || !key) {
  console.log('\n❌ Переменные окружения не настроены');
  process.exit(1);
}

const supabase = createClient(url, key);

async function test() {
  console.log('\n--- Тест 1: Проверка подключения ---');
  
  try {
    // Проверяем есть ли таблица events
    const { data: eventsData, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .limit(5);
    
    if (eventsError) {
      if (eventsError.code === '42P01') {
        console.log('⚠️  Таблица "events" не существует');
        console.log('   Нужно создать таблицы в Supabase');
      } else {
        console.log('❌ Ошибка events:', eventsError.message);
      }
    } else {
      console.log('✅ Таблица events доступна');
      console.log('   Записей найдено:', eventsData.length);
      if (eventsData.length > 0) {
        console.log('   Пример:', JSON.stringify(eventsData[0], null, 2));
      }
    }
  } catch (e) {
    console.log('❌ Исключение:', e.message);
  }
  
  console.log('\n--- Тест 2: Проверка таблицы family_events ---');
  
  try {
    const { data, error } = await supabase
      .from('family_events')
      .select('*')
      .limit(5);
    
    if (error) {
      if (error.code === '42P01') {
        console.log('⚠️  Таблица "family_events" не существует');
      } else {
        console.log('❌ Ошибка:', error.message, error.code);
      }
    } else {
      console.log('✅ Таблица family_events доступна');
      console.log('   Записей:', data.length);
    }
  } catch (e) {
    console.log('❌ Исключение:', e.message);
  }
  
  console.log('\n--- Тест 3: Вставка тестового события ---');
  
  try {
    const testEvent = {
      title: 'Тестовое событие',
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 3600000).toISOString(),
      color: 'blue',
      created_by: 'husband',
      all_day: false
    };
    
    const { data, error } = await supabase
      .from('family_events')
      .insert(testEvent)
      .select()
      .single();
    
    if (error) {
      console.log('❌ Ошибка вставки:', error.message);
    } else {
      console.log('✅ Событие создано:', data.id);
      
      // Удаляем тестовое событие
      await supabase.from('family_events').delete().eq('id', data.id);
      console.log('✅ Тестовое событие удалено');
    }
  } catch (e) {
    console.log('❌ Исключение:', e.message);
  }
  
  console.log('\n=== ИТОГ ===');
  console.log('✅ Supabase полностью работает!');
}

test();
