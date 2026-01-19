// ==========================================
// ГЛАВНАЯ СТРАНИЦА КАЛЕНДАРЯ - новая структура
// ==========================================

import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  CalendarDaysIcon,
  StarIcon,
  ArrowRightOnRectangleIcon,
  ShareIcon,
  PhotoIcon,
  XMarkIcon,
  BellIcon,
  SunIcon,
  MoonIcon,
  CloudIcon,
  CloudArrowUpIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

import { useAuthStore, useUIStore } from '../stores';
import { useLocalEventStore, LocalEvent, EventFormData } from '../stores/localEventStore';
import { useSyncEventStore, FamilyEvent } from '../stores/syncEventStore';
import { isSupabaseConfigured } from '../lib/supabase';
import { Modal } from '../components/ui';
import type { EventColor } from '../types';
import {
  getCalendarDays,
  getWeekDayNames,
  isSameMonth,
  isSameDay,
  isToday,
  formatDate,
  formatTime,
  getMonthName,
  toLocalDateString,
} from '../lib/dateUtils';
import { EVENT_COLORS, getColorClass, getLightColorClass, getTextColorClass } from '../lib/constants';
import { 
  requestNotificationPermission, 
  initializeReminders,
  getNotificationPermission 
} from '../lib/notifications';

type Tab = 'calendar' | 'important';

// Информация о создателе
const CREATORS = {
  husband: { name: 'Костя', emoji: '👨', color: 'from-blue-500 to-indigo-600' },
  wife: { name: 'Саня', emoji: '👩', color: 'from-pink-500 to-rose-600' },
};

export function CalendarPage() {
  const { user, signOut } = useAuthStore();
  const { theme, setTheme, syncMode, setSyncMode } = useUIStore();
  
  // Локальный store
  const localStore = useLocalEventStore();
  
  // Синхронизированный store
  const syncStore = useSyncEventStore();
  
  // Выбираем store в зависимости от режима (если Supabase не настроен - только локальный)
  const isSync = syncMode === 'supabase' && isSupabaseConfigured;
  const events = isSync ? syncStore.events : localStore.events;
  const addEvent = isSync ? syncStore.addEvent : localStore.addEvent;
  const updateEvent = isSync ? syncStore.updateEvent : localStore.updateEvent;
  const deleteEvent = isSync ? syncStore.deleteEvent : localStore.deleteEvent;
  const selectedEvent = isSync ? syncStore.selectedEvent : localStore.selectedEvent;
  const setSelectedEvent = isSync ? syncStore.setSelectedEvent : localStore.setSelectedEvent;
  
  // Автоматически переключаем на локальный режим если Supabase не настроен
  useEffect(() => {
    if (syncMode === 'supabase' && !isSupabaseConfigured) {
      setSyncMode('local');
      console.log('Supabase не настроен, используется локальный режим');
    }
  }, [syncMode, setSyncMode]);

  const [activeTab, setActiveTab] = useState<Tab>('calendar');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [eventModalOpen, setEventModalOpen] = useState(false);

  // Фото пользователей из localStorage
  const [userPhotos, setUserPhotos] = useState<Record<string, string>>({});
  
  // Инициализация синхронизированного store
  useEffect(() => {
    if (isSync) {
      syncStore.initialize();
    }
    
    return () => {
      if (isSync) {
        syncStore.unsubscribe();
      }
    };
  }, [isSync]);
  
  // Загрузка фото
  useEffect(() => {
    const saved = localStorage.getItem('family-calendar-photos');
    if (saved) {
      try {
        setUserPhotos(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  // Инициализация уведомлений
  useEffect(() => {
    const initNotifications = async () => {
      const permission = getNotificationPermission();
      
      if (permission === 'default') {
        // Запрашиваем разрешение при первом запуске
        const result = await requestNotificationPermission();
        if (result === 'granted') {
          toast.success('Уведомления включены! 🔔');
        }
      }
      
      // Инициализируем напоминания для существующих событий
      if (permission === 'granted' || getNotificationPermission() === 'granted') {
        initializeReminders(events);
      }
    };
    
    initNotifications();
  }, []);

  // Обновляем напоминания при изменении событий
  useEffect(() => {
    if (getNotificationPermission() === 'granted') {
      initializeReminders(events);
    }
  }, [events]);

  // Дни календаря
  const calendarDays = useMemo(
    () => getCalendarDays(selectedDate, 1),
    [selectedDate]
  );

  const weekDayNames = useMemo(() => getWeekDayNames(1), []);

  // События по дням
  const eventsByDay = useMemo(() => {
    const map = new Map<string, (LocalEvent | FamilyEvent)[]>();
    events.forEach((event) => {
      const dateKey = event.start_date.split('T')[0];
      const existing = map.get(dateKey) || [];
      map.set(dateKey, [...existing, event]);
    });
    return map;
  }, [events]);

  // Важные события, сгруппированные по месяцам
  const importantEventsByMonth = useMemo(() => {
    const important = events.filter((e) => e.is_important);
    const map = new Map<string, (LocalEvent | FamilyEvent)[]>();
    
    important.forEach((event) => {
      const date = new Date(event.start_date);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      const existing = map.get(monthKey) || [];
      map.set(monthKey, [...existing, event]);
    });
    
    // Сортируем по дате
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, evts]) => {
        const [year, month] = key.split('-').map(Number);
        return {
          year,
          month,
          events: evts.sort((a, b) => 
            new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
          ),
        };
      });
  }, [events]);

  // Навигация по месяцам
  const handlePrevMonth = () => {
    setSelectedDate((d) => {
      const newDate = new Date(d);
      newDate.setMonth(d.getMonth() - 1);
      return newDate;
    });
  };

  const handleNextMonth = () => {
    setSelectedDate((d) => {
      const newDate = new Date(d);
      newDate.setMonth(d.getMonth() + 1);
      return newDate;
    });
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
  };

  const handleDayDoubleClick = (date: Date) => {
    setSelectedDate(date);
    setSelectedEvent(null);
    setEventModalOpen(true);
  };

  const handleEventClick = (event: LocalEvent) => {
    setSelectedEvent(event);
    setEventModalOpen(true);
  };

  const handleCreateEvent = () => {
    setSelectedEvent(null);
    setEventModalOpen(true);
  };

  // Поделиться ссылкой на приложение
  const handleShare = async () => {
    const shareUrl = window.location.origin;
    const shareData = {
      title: 'Наш Календарь 💕',
      text: 'Присоединяйся к нашему семейному календарю!',
      url: shareUrl,
    };
    
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: копируем в буфер
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Ссылка скопирована! 📋');
      }
    } catch (e) {
      // Пользователь отменил или ошибка
      if ((e as Error).name !== 'AbortError') {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Ссылка скопирована! 📋');
      }
    }
  };

  // Рендер аватара создателя
  const renderCreatorAvatar = (createdBy: 'husband' | 'wife', size: 'sm' | 'md' = 'sm') => {
    const creator = CREATORS[createdBy];
    const photo = userPhotos[createdBy];
    const sizeClass = size === 'sm' ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-sm';
    
    return (
      <div
        className={`${sizeClass} rounded-full bg-gradient-to-br ${creator.color} flex items-center justify-center text-white overflow-hidden flex-shrink-0`}
        title={creator.name}
      >
        {photo ? (
          <img src={photo} alt={creator.name} className="w-full h-full object-cover" />
        ) : (
          <span>{creator.emoji}</span>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 flex flex-col">
      {/* Шапка */}
      <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 safe-top">
        <div className="px-4 py-3">
          {/* Верхняя часть */}
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Наш Календарь 💕
            </h1>
            
            <div className="flex items-center gap-2">
              {/* Индикатор синхронизации */}
              {isSync && (
                <div 
                  className={`p-2 rounded-xl ${syncStore.syncing ? 'text-primary-500 animate-pulse' : syncStore.isOnline ? 'text-green-500' : 'text-gray-400'}`}
                  title={syncStore.syncing ? 'Синхронизация...' : syncStore.isOnline ? 'Онлайн' : 'Офлайн'}
                >
                  {syncStore.syncing ? (
                    <CloudArrowUpIcon className="w-5 h-5" />
                  ) : (
                    <CloudIcon className="w-5 h-5" />
                  )}
                </div>
              )}
              
              {/* Поделиться */}
              <button
                onClick={handleShare}
                className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl"
                title="Поделиться"
              >
                <ShareIcon className="w-5 h-5" />
              </button>
              
              {/* Аватар */}
              <div className="flex items-center gap-2">
                {/* Кнопка смены темы */}
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl"
                  title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
                >
                  {theme === 'dark' ? (
                    <SunIcon className="w-5 h-5" />
                  ) : (
                    <MoonIcon className="w-5 h-5" />
                  )}
                </button>
                {user && renderCreatorAvatar(user.id as 'husband' | 'wife', 'md')}
                <button
                  onClick={signOut}
                  className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl"
                  title="Выйти"
                >
                  <ArrowRightOnRectangleIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Вкладки */}
          <div className="flex gap-1 p-1 bg-gray-100 dark:bg-slate-800 rounded-2xl">
            <button
              onClick={() => setActiveTab('calendar')}
              className={`
                flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm transition-all
                ${activeTab === 'calendar'
                  ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400'
                }
              `}
            >
              <CalendarDaysIcon className="w-5 h-5" />
              <span>Календарь</span>
            </button>
            <button
              onClick={() => setActiveTab('important')}
              className={`
                flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm transition-all
                ${activeTab === 'important'
                  ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400'
                }
              `}
            >
              <StarIcon className="w-5 h-5" />
              <span>Важные события</span>
            </button>
          </div>
        </div>
      </header>

      {/* Контент */}
      <main className="flex-1 overflow-auto pb-24">
        <AnimatePresence mode="wait">
          {activeTab === 'calendar' ? (
            <motion.div
              key="calendar"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-4"
            >
              {/* Навигация по месяцам */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={handlePrevMonth}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  <ChevronLeftIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </button>
                <h2 className="text-2xl font-bold text-primary-600 dark:text-primary-400 capitalize">
                  {getMonthName(selectedDate)}
                </h2>
                <button
                  onClick={handleNextMonth}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  <ChevronRightIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              {/* Дни недели */}
              <div className="grid grid-cols-7 mb-2">
                {weekDayNames.map((day, i) => (
                  <div key={i} className="text-center text-xs font-medium text-gray-400 uppercase py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Сетка календаря */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((date, i) => {
                  const dateKey = toLocalDateString(date);
                  const dayEvents = eventsByDay.get(dateKey) || [];
                  const isCurrentMonth = isSameMonth(date, selectedDate);
                  const isSelected = isSameDay(date, selectedDate);
                  const isTodayDate = isToday(date);

                  return (
                    <motion.button
                      key={i}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleDayClick(date)}
                      onDoubleClick={() => handleDayDoubleClick(date)}
                      className={`
                        min-h-[80px] p-1 rounded-xl relative flex flex-col items-stretch
                        border border-rose-200/50 dark:border-rose-500/20
                        ${isSelected
                          ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-400 dark:border-primary-600'
                          : isTodayDate
                            ? 'bg-primary-50/50 dark:bg-primary-900/10 border-primary-300 dark:border-primary-700'
                            : isCurrentMonth
                              ? 'hover:bg-gray-50 dark:hover:bg-slate-800/50'
                              : 'opacity-40'
                        }
                      `}
                    >
                      {/* Число дня */}
                      <div className={`
                        text-xs font-semibold mb-0.5 text-center
                        ${isSelected
                          ? 'text-primary-600 dark:text-primary-400'
                          : isTodayDate
                            ? 'text-primary-600 dark:text-primary-400'
                            : isCurrentMonth
                              ? 'text-gray-700 dark:text-gray-300'
                              : 'text-gray-400 dark:text-gray-600'
                        }
                      `}>
                        {isTodayDate ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 bg-primary-600 text-white rounded-full text-[10px]">
                            {date.getDate()}
                          </span>
                        ) : (
                          date.getDate()
                        )}
                      </div>
                      
                      {/* События дня */}
                      <div className="flex-1 overflow-hidden space-y-0.5">
                        {dayEvents.slice(0, 2).map((evt) => {
                          const creator = CREATORS[evt.created_by as keyof typeof CREATORS];
                          const creatorPhoto = userPhotos[evt.created_by];
                          
                          return (
                          <div
                            key={evt.id}
                            className={`
                              flex items-center gap-1 px-1 py-0.5 rounded text-[9px] leading-tight
                              ${getLightColorClass(evt.color)}
                              ${getTextColorClass(evt.color)}
                              truncate
                            `}
                          >
                            {/* Аватар создателя */}
                            {creatorPhoto ? (
                              <img src={creatorPhoto} alt="" className="w-3 h-3 rounded-full object-cover flex-shrink-0" />
                            ) : creator ? (
                              <span className="w-3 h-3 flex items-center justify-center text-[8px] flex-shrink-0">{creator.emoji}</span>
                            ) : null}
                            {/* Фото события */}
                            {evt.image_url && (
                              <img src={evt.image_url} alt="" className="w-3 h-3 rounded-sm object-cover flex-shrink-0" />
                            )}
                            <span className="truncate font-medium">{evt.title}</span>
                          </div>
                          );
                        })}
                        {dayEvents.length > 2 && (
                          <div className="text-[9px] text-gray-400 dark:text-gray-500 text-center">
                            +{dayEvents.length - 2}
                          </div>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* События выбранного дня */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  {formatDate(selectedDate, 'd MMMM, EEEE')}
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(eventsByDay.get(toLocalDateString(selectedDate)) || []).map((event) => (
                    <motion.button
                      key={event.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleEventClick(event)}
                      className={`
                        w-full text-left rounded-2xl overflow-hidden shadow-sm
                        bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700
                      `}
                    >
                      {/* Фото события (если есть) */}
                      {event.image_url && (
                        <div className="aspect-[4/3] relative overflow-hidden">
                          <img
                            src={event.image_url}
                            alt={event.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      
                      {/* Контент карточки */}
                      <div className={`p-3 ${getLightColorClass(event.color)} border-l-4 ${getColorClass(event.color).replace('bg-', 'border-')}`}>
                        <div className="flex items-start gap-2">
                          {/* Аватар создателя */}
                          {renderCreatorAvatar(event.created_by)}
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={`font-semibold ${getTextColorClass(event.color)} truncate`}>
                                {event.title}
                              </p>
                              {event.is_important && (
                                <StarIconSolid className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                              )}
                            </div>
                            {!event.all_day && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                {formatTime(event.start_date)}
                                {event.end_date && ` – ${formatTime(event.end_date)}`}
                              </p>
                            )}
                            {event.description && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
                                {event.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>

                {(eventsByDay.get(toLocalDateString(selectedDate)) || []).length === 0 && (
                  <p className="text-center text-gray-400 py-8">
                    Нет событий на этот день
                  </p>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="important"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-4"
            >
              {importantEventsByMonth.length > 0 ? (
                <div className="space-y-6">
                  {importantEventsByMonth.map(({ year, month, events: monthEvents }) => (
                    <div key={`${year}-${month}`}>
                      <h3 className="text-lg font-bold text-primary-600 dark:text-primary-400 mb-3 capitalize">
                        {formatDate(new Date(year, month), 'LLLL yyyy')}
                      </h3>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {monthEvents.map((event) => (
                          <motion.button
                            key={event.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleEventClick(event)}
                            className={`
                              w-full text-left rounded-2xl overflow-hidden shadow-sm
                              bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700
                            `}
                          >
                            {/* Фото события */}
                            {event.image_url && (
                              <div className="aspect-[4/3] relative overflow-hidden">
                                <img
                                  src={event.image_url}
                                  alt={event.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            
                            {/* Контент карточки */}
                            <div className={`p-3 ${getLightColorClass(event.color)} border-l-4 ${getColorClass(event.color).replace('bg-', 'border-')}`}>
                              <div className="flex items-start gap-2">
                                {/* Аватар создателя */}
                                {renderCreatorAvatar(event.created_by)}
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className={`font-semibold ${getTextColorClass(event.color)} truncate`}>
                                      {event.title}
                                    </p>
                                    <StarIconSolid className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                                  </div>
                                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                    {formatDate(event.start_date, 'd MMMM')}
                                    {!event.all_day && `, ${formatTime(event.start_date)}`}
                                  </p>
                                  {event.description && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
                                      {event.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <StarIcon className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 text-lg">
                    Нет важных событий
                  </p>
                  <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                    Отметьте событие как важное при создании
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* FAB кнопка */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleCreateEvent}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary-600 text-white rounded-full shadow-lg flex items-center justify-center z-50 safe-bottom"
      >
        <PlusIcon className="w-7 h-7" />
      </motion.button>

      {/* Модальное окно события */}
      <EventModal
        isOpen={eventModalOpen}
        onClose={() => {
          setEventModalOpen(false);
          setSelectedEvent(null);
        }}
        event={selectedEvent}
        selectedDate={selectedDate}
        onSave={async (data) => {
          try {
            if (selectedEvent) {
              await updateEvent(selectedEvent.id, data);
              toast.success('Событие обновлено! ✏️');
            } else {
              await addEvent(data, user?.id as 'husband' | 'wife');
              toast.success('Событие создано! 🎉');
            }
            setEventModalOpen(false);
            setSelectedEvent(null);
          } catch (error) {
            console.error('Ошибка сохранения:', error);
            toast.error('Ошибка сохранения события');
          }
        }}
        onDelete={async (id) => {
          try {
            await deleteEvent(id);
            toast.success('Событие удалено');
            setEventModalOpen(false);
            setSelectedEvent(null);
          } catch (error) {
            console.error('Ошибка удаления:', error);
            toast.error('Ошибка удаления события');
          }
        }}
      />
    </div>
  );
}

// ==========================================
// МОДАЛЬНОЕ ОКНО СОБЫТИЯ
// ==========================================

// Опции напоминаний
const REMINDER_OPTIONS = [
  { value: undefined, label: 'Без напоминания' },
  { value: 5, label: 'За 5 минут' },
  { value: 15, label: 'За 15 минут' },
  { value: 30, label: 'За 30 минут' },
  { value: 60, label: 'За 1 час' },
  { value: 120, label: 'За 2 часа' },
  { value: 1440, label: 'За 1 день' },
  { value: 2880, label: 'За 2 дня' },
  { value: 10080, label: 'За 1 неделю' },
];

const REMINDER_REPEAT_OPTIONS = [
  { value: 'none', label: 'Не повторять' },
  { value: 'every_5min', label: 'Каждые 5 минут' },
  { value: 'every_15min', label: 'Каждые 15 минут' },
  { value: 'every_30min', label: 'Каждые 30 минут' },
  { value: 'every_hour', label: 'Каждый час' },
];

// Функция кадрирования с сохранением качества
function getCroppedImg(
  image: HTMLImageElement,
  crop: PixelCrop,
  maxSize: number = 1200
): Promise<string> {
  const canvas = document.createElement('canvas');
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  
  // Реальные размеры кропа
  const realWidth = crop.width * scaleX;
  const realHeight = crop.height * scaleY;
  
  // Сохраняем оригинальный размер если не слишком большой
  let outputWidth = realWidth;
  let outputHeight = realHeight;
  
  if (realWidth > maxSize || realHeight > maxSize) {
    const ratio = Math.min(maxSize / realWidth, maxSize / realHeight);
    outputWidth = realWidth * ratio;
    outputHeight = realHeight * ratio;
  }
  
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2d context');
  
  // Включаем сглаживание для лучшего качества
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    realWidth,
    realHeight,
    0,
    0,
    outputWidth,
    outputHeight
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve('');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    }, 'image/jpeg', 0.95); // Максимальное качество
  });
}

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: LocalEvent | null;
  selectedDate: Date;
  onSave: (data: EventFormData) => void;
  onDelete: (id: string) => void;
}

function EventModal({ isOpen, onClose, event, selectedDate, onSave, onDelete }: EventModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('10:00');
  const [allDay, setAllDay] = useState(false);
  const [color, setColor] = useState<EventColor>('blue');
  const [isImportant, setIsImportant] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [reminder, setReminder] = useState<number | null>(null);
  const [reminderRepeat, setReminderRepeat] = useState<'none' | 'every_5min' | 'every_15min' | 'every_30min' | 'every_hour'>('none');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Кадрирование - отдельное состояние
  const [showCropper, setShowCropper] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState('');
  const [crop, setCrop] = useState<Crop>({ unit: '%', width: 90, height: 60, x: 5, y: 20 });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const cropImgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Инициализация формы
  useEffect(() => {
    if (!isOpen) return;
    
    if (event) {
      setTitle(event.title);
      setDescription(event.description || '');
      setStartDate(event.start_date.split('T')[0]);
      setStartTime(event.start_date.includes('T') ? event.start_date.split('T')[1].slice(0, 5) : '09:00');
      setEndDate(event.end_date?.split('T')[0] || event.start_date.split('T')[0]);
      setEndTime(event.end_date?.includes('T') ? event.end_date.split('T')[1].slice(0, 5) : '10:00');
      setAllDay(event.all_day);
      setColor(event.color);
      setIsImportant(event.is_important);
      setImageUrl(event.image_url);
      setReminder(event.reminder);
      setReminderRepeat(event.reminder_repeat || 'none');
    } else {
      setTitle('');
      setDescription('');
      setStartDate(toLocalDateString(selectedDate));
      setStartTime('09:00');
      setEndDate(toLocalDateString(selectedDate));
      setEndTime('10:00');
      setAllDay(false);
      setColor('blue');
      setIsImportant(false);
      setImageUrl(null);
      setReminder(null);
      setReminderRepeat('none');
    }
    // Сброс состояния кроппера и отправки
    setShowCropper(false);
    setTempImageSrc('');
    setCompletedCrop(null);
    setIsSubmitting(false);
  }, [event, selectedDate, isOpen]);

  // Выбор фото - открывает кроппер
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Выберите изображение');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setTempImageSrc(result);
      setCrop({ unit: '%', width: 90, height: 60, x: 5, y: 20 });
      setCompletedCrop(null);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Сохранение кадрированного фото
  const handleSaveCrop = async () => {
    if (!cropImgRef.current || !completedCrop) {
      toast.error('Выберите область для кадрирования');
      return;
    }
    
    try {
      const croppedImage = await getCroppedImg(cropImgRef.current, completedCrop);
      setImageUrl(croppedImage);
      setShowCropper(false);
      setTempImageSrc('');
      toast.success('Фото добавлено! 📸');
    } catch (e) {
      toast.error('Ошибка обработки изображения');
    }
  };

  // Отмена кадрирования
  const handleCancelCrop = () => {
    setShowCropper(false);
    setTempImageSrc('');
    setCompletedCrop(null);
  };

  // Отправка формы
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Не отправляем если открыт кроппер или уже отправляется
    if (showCropper || isSubmitting) return;
    
    if (!title.trim()) {
      toast.error('Введите название события');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || undefined,
        start_date: startDate,
        start_time: startTime,
        end_date: endDate || startDate,
        end_time: endTime,
        all_day: allDay,
        color,
        is_important: isImportant,
        image_url: imageUrl,
        reminder,
        reminder_repeat: reminderRepeat,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Если открыт кроппер - показываем только его
  if (showCropper && isOpen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleCancelCrop} />
        
        {/* Content */}
        <div className="relative z-10 w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Кадрирование фото</h3>
            <button
              type="button"
              onClick={handleCancelCrop}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-6 space-y-4">
            {tempImageSrc && (
              <div className="max-h-[50vh] overflow-auto flex justify-center bg-gray-100 dark:bg-slate-800 rounded-xl p-2">
                <ReactCrop
                  crop={crop}
                  onChange={(c) => setCrop(c)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={16 / 9}
                >
                  <img
                    ref={cropImgRef}
                    src={tempImageSrc}
                    alt="Crop"
                    className="max-w-full"
                    onLoad={() => {
                      // Устанавливаем начальный кроп после загрузки изображения
                      setCrop({ unit: '%', width: 90, height: 60, x: 5, y: 20 });
                    }}
                  />
                </ReactCrop>
              </div>
            )}
            
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              Выберите область для отображения в карточке события
            </p>
            
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={handleCancelCrop}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleSaveCrop}
                className="px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700"
              >
                Сохранить фото
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={event ? 'Редактировать событие' : 'Новое событие'}>
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Фото события */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Фото события
            </label>
            
            {imageUrl ? (
              <div className="relative rounded-xl overflow-hidden">
                <img
                  src={imageUrl}
                  alt="Event"
                  className="w-full h-40 object-cover"
                />
                <button
                  type="button"
                  onClick={() => setImageUrl(null)}
                  className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-2 right-2 px-3 py-1.5 bg-black/50 text-white text-sm rounded-lg hover:bg-black/70"
                >
                  Заменить
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-32 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-primary-500 hover:text-primary-500 transition-colors"
              >
                <PhotoIcon className="w-8 h-8" />
                <span className="text-sm">Добавить фото</span>
              </button>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
          
          {/* Название */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Название
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Название события"
              className="w-full px-4 py-3 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              autoFocus
            />
          </div>

          {/* Описание */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Описание
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Описание (необязательно)"
              rows={2}
              className="w-full px-4 py-3 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Дата и время */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Дата начала
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (!endDate || endDate < e.target.value) {
                    setEndDate(e.target.value);
                  }
                }}
                className="w-full px-4 py-3 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            {!allDay && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Время начала
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            )}
          </div>

          {/* Весь день */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-gray-700 dark:text-gray-300">Весь день</span>
          </label>

          {/* Важное событие */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isImportant}
              onChange={(e) => setIsImportant(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-yellow-500 focus:ring-yellow-500"
            />
            <span className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <StarIcon className="w-5 h-5 text-yellow-500" />
              Важное событие
            </span>
          </label>

          {/* Напоминание */}
          <div className="space-y-3 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl">
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <BellIcon className="w-5 h-5" />
              <span className="font-medium">Напоминание</span>
            </div>
            
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                Напомнить за
              </label>
              <select
                value={reminder ?? ''}
                onChange={(e) => setReminder(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {REMINDER_OPTIONS.map((opt) => (
                  <option key={opt.label} value={opt.value ?? ''}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            
            {reminder && (
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Повторять напоминание
                </label>
                <select
                  value={reminderRepeat}
                  onChange={(e) => setReminderRepeat(e.target.value as typeof reminderRepeat)}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {REMINDER_REPEAT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Цвет */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Цвет
            </label>
            <div className="flex flex-wrap gap-2">
              {EVENT_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`
                    w-8 h-8 rounded-full ${c.class}
                    ${color === c.value ? 'ring-2 ring-offset-2 ring-gray-400' : ''}
                  `}
                />
              ))}
            </div>
          </div>

          {/* Кнопки */}
          <div className="flex gap-3 pt-2 sticky bottom-0 bg-white dark:bg-slate-900 pb-1">
            {event && (
              <button
                type="button"
                onClick={() => onDelete(event.id)}
                className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl"
              >
                Удалить
              </button>
            )}
            <div className="flex-1" />
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Сохранение...' : event ? 'Сохранить' : 'Создать'}
            </button>
          </div>
        </form>
      </Modal>
  );
}