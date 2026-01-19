// ==========================================
// ГЛАВНАЯ СТРАНИЦА КАЛЕНДАРЯ
// ==========================================

import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PlusIcon } from '@heroicons/react/24/outline';

import { useCalendarStore, useEventStore, useUIStore, useAuthStore } from '../stores';
import { Header, Sidebar, MonthView, WeekView, DayView } from '../components/calendar';
import { EventModal, CalendarModal, InviteModal, SettingsModal } from '../components/modals';
import { LoadingScreen } from '../components/ui';

export function CalendarPage() {
  const { calendarId } = useParams<{ calendarId: string }>();
  const { user } = useAuthStore();
  const {
    calendars,
    currentCalendar,
    setCurrentCalendar,
    fetchCalendar,
    subscribeToCalendars,
    loading: calendarsLoading,
  } = useCalendarStore();
  const {
    fetchEvents,
    subscribeToEvents,
    syncOfflineEvents,
    loading: eventsLoading,
  } = useEventStore();
  const {
    calendarView,
    selectedDate,
    subscribeToPresence,
    openEventModal,
  } = useUIStore();

  // Подписка на realtime обновления календарей
  useEffect(() => {
    const unsubscribe = subscribeToCalendars();
    return unsubscribe;
  }, [subscribeToCalendars]);

  // Установка текущего календаря
  useEffect(() => {
    if (calendarId) {
      fetchCalendar(calendarId);
    } else if (calendars.length > 0 && !currentCalendar) {
      setCurrentCalendar(calendars[0]);
    }
  }, [calendarId, calendars, currentCalendar, setCurrentCalendar, fetchCalendar]);

  // Загрузка событий при смене календаря или месяца
  useEffect(() => {
    if (currentCalendar) {
      fetchEvents(currentCalendar.id);
      syncOfflineEvents(currentCalendar.id);
    }
  }, [currentCalendar, selectedDate, fetchEvents, syncOfflineEvents]);

  // Подписка на realtime обновления событий
  useEffect(() => {
    if (currentCalendar) {
      const unsubscribe = subscribeToEvents(currentCalendar.id);
      return unsubscribe;
    }
  }, [currentCalendar, subscribeToEvents]);

  // Подписка на presence (кто онлайн)
  useEffect(() => {
    if (currentCalendar && user) {
      const unsubscribe = subscribeToPresence(
        currentCalendar.id,
        user.id,
        user.email,
        user.full_name
      );
      return unsubscribe;
    }
  }, [currentCalendar, user, subscribeToPresence]);

  // Показываем загрузку
  if (calendarsLoading && calendars.length === 0) {
    return <LoadingScreen />;
  }

  // Выбор компонента вида
  const renderCalendarView = () => {
    switch (calendarView) {
      case 'week':
        return <WeekView />;
      case 'day':
        return <DayView />;
      default:
        return <MonthView />;
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white dark:bg-slate-900">
      {/* Шапка */}
      <Header />

      {/* Основной контент */}
      <div className="flex-1 flex overflow-hidden">
        {/* Боковая панель */}
        <Sidebar />

        {/* Календарь */}
        <main className="flex-1 overflow-hidden relative">
          {eventsLoading && (
            <div className="absolute top-4 right-4 z-10">
              <div className="animate-spin w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full" />
            </div>
          )}

          {currentCalendar ? (
            renderCalendarView()
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                  <svg
                    className="w-12 h-12 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Создайте первый календарь
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  Нажмите на + в боковой панели
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Модальные окна */}
      <EventModal />
      <CalendarModal />
      <InviteModal />
      <SettingsModal />

      {/* FAB кнопка добавления события */}
      {currentCalendar && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={openEventModal}
          className="fixed bottom-6 right-6 w-14 h-14 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-lg flex items-center justify-center z-50 safe-bottom"
        >
          <PlusIcon className="w-7 h-7" />
        </motion.button>
      )}
    </div>
  );
}
