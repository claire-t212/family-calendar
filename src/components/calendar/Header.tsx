// ==========================================
// ШАПКА ПРИЛОЖЕНИЯ - Стиль как на скриншоте
// ==========================================

import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  SunIcon,
  MoonIcon,
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

import { useAuthStore, useUIStore } from '../../stores';
import { Avatar } from '../ui';
import { getMonthName, formatDate, getWeekDays, isSameDay, isToday } from '../../lib/dateUtils';
import type { CalendarView } from '../../types';

export function Header() {
  const { user, signOut } = useAuthStore();
  const {
    calendarView,
    setCalendarView,
    selectedDate,
    setSelectedDate,
    openSettings,
    theme,
    setTheme,
  } = useUIStore();

  // Навигация по датам
  const handleNavigate = (direction: 'prev' | 'next') => {
    const date = new Date(selectedDate);
    
    if (calendarView === 'month') {
      date.setMonth(date.getMonth() + (direction === 'next' ? 1 : -1));
    } else if (calendarView === 'week') {
      date.setDate(date.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      date.setDate(date.getDate() + (direction === 'next' ? 1 : -1));
    }
    
    setSelectedDate(date);
  };

  // Получение заголовка
  const getTitle = () => {
    if (calendarView === 'day') {
      const month = formatDate(selectedDate, 'LLLL');
      const day = selectedDate.getDate();
      return { month: month.charAt(0).toUpperCase() + month.slice(1), day };
    }
    if (calendarView === 'week') {
      const month = formatDate(selectedDate, 'LLLL');
      return { month: month.charAt(0).toUpperCase() + month.slice(1), day: null };
    }
    const monthYear = getMonthName(selectedDate);
    return { month: monthYear.charAt(0).toUpperCase() + monthYear.slice(1), day: null };
  };

  const title = getTitle();

  const viewOptions: { value: CalendarView; label: string }[] = [
    { value: 'day', label: 'День' },
    { value: 'week', label: 'Неделя' },
    { value: 'month', label: 'Месяц' },
  ];

  // Дни недели для горизонтальной полоски (только для Day и Week)
  const weekDays = getWeekDays(selectedDate);

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 safe-top">
      <div className="px-4 pt-4 pb-2">
        {/* Переключатель вида */}
        <div className="flex justify-center mb-4">
          <div className="inline-flex items-center bg-gray-100 dark:bg-slate-800 rounded-full p-1">
            {viewOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setCalendarView(option.value)}
                className={`
                  px-5 py-2 text-sm font-medium rounded-full transition-all duration-200
                  ${calendarView === option.value
                    ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400'
                  }
                `}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Заголовок с месяцем и навигацией */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-primary-600 dark:text-primary-400">
            {title.month}
            {title.day && <span className="ml-2">{title.day}</span>}
          </h1>
          
          {/* Правая часть - аватар и меню */}
          <Menu as="div" className="relative">
            <Menu.Button className="flex items-center">
              <Avatar
                src={user?.avatar_url}
                name={user?.full_name}
                email={user?.email}
                size="sm"
              />
            </Menu.Button>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 focus:outline-none">
                <div className="p-3 border-b border-gray-100 dark:border-slate-700">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {user?.full_name || 'Пользователь'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user?.email}
                  </p>
                </div>
                <div className="p-1">
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        className={`
                          flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg
                          ${active ? 'bg-gray-100 dark:bg-slate-700' : ''}
                          text-gray-700 dark:text-gray-300
                        `}
                      >
                        {theme === 'dark' ? (
                          <>
                            <SunIcon className="w-4 h-4" />
                            Светлая тема
                          </>
                        ) : (
                          <>
                            <MoonIcon className="w-4 h-4" />
                            Тёмная тема
                          </>
                        )}
                      </button>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={openSettings}
                        className={`
                          flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg
                          ${active ? 'bg-gray-100 dark:bg-slate-700' : ''}
                          text-gray-700 dark:text-gray-300
                        `}
                      >
                        <Cog6ToothIcon className="w-4 h-4" />
                        Настройки
                      </button>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={signOut}
                        className={`
                          flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg
                          ${active ? 'bg-gray-100 dark:bg-slate-700' : ''}
                          text-red-600 dark:text-red-400
                        `}
                      >
                        <ArrowRightOnRectangleIcon className="w-4 h-4" />
                        Выйти
                      </button>
                    )}
                  </Menu.Item>
                </div>
              </Menu.Items>
            </Transition>
          </Menu>
        </div>

        {/* Навигация и дни недели */}
        <div className="flex items-center gap-2">
          {/* Стрелки навигации */}
          <div className="flex items-center gap-1">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => handleNavigate('prev')}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => handleNavigate('next')}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </motion.button>
          </div>

          {/* Горизонтальная полоска дней */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide flex-1 justify-center">
            {weekDays.map((day) => {
              const isSelected = isSameDay(day, selectedDate);
              const isTodayDate = isToday(day);
              
              return (
                <motion.button
                  key={day.toISOString()}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedDate(day)}
                  className={`
                    flex flex-col items-center justify-center min-w-[40px] h-[40px] rounded-full
                    transition-all duration-200
                    ${isSelected
                      ? 'bg-primary-600 text-white'
                      : isTodayDate
                        ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'
                    }
                  `}
                >
                  <span className="text-sm font-semibold">{day.getDate()}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
}
