// ==========================================
// НЕДЕЛЬНЫЙ ВИД КАЛЕНДАРЯ
// ==========================================

import { useMemo } from 'react';
import { motion } from 'framer-motion';

import { useUIStore, useEventStore } from '../../stores';
import {
  getWeekDays,
  isSameDay,
  isToday,
  parseISO,
  formatDate,
  formatTime,
} from '../../lib/dateUtils';
import { getColorClass, getLightColorClass, getTextColorClass } from '../../lib/constants';
import type { CalendarEvent } from '../../types';

// Часы для отображения
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function WeekView() {
  const { selectedDate, setSelectedDate, openEventModal, settings } = useUIStore();
  const { events, setSelectedEvent } = useEventStore();

  // Получаем дни недели
  const weekDays = useMemo(
    () => getWeekDays(selectedDate, settings.week_starts_on),
    [selectedDate, settings.week_starts_on]
  );

  // Группируем события по дням
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    
    events.forEach((event) => {
      const dateKey = parseISO(event.start_date).toDateString();
      const existing = map.get(dateKey) || [];
      map.set(dateKey, [...existing, event]);
    });
    
    return map;
  }, [events]);

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    openEventModal();
  };

  const handleCellClick = (date: Date, hour: number) => {
    const newDate = new Date(date);
    newDate.setHours(hour, 0, 0, 0);
    setSelectedDate(newDate);
    setSelectedEvent(null);
    openEventModal();
  };

  // Получить позицию события в сетке
  const getEventStyle = (event: CalendarEvent) => {
    const startDate = parseISO(event.start_date);
    const endDate = event.end_date ? parseISO(event.end_date) : new Date(startDate.getTime() + 60 * 60 * 1000);
    
    const startHour = startDate.getHours() + startDate.getMinutes() / 60;
    const duration = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
    
    return {
      top: `${startHour * 60}px`,
      height: `${Math.max(duration * 60, 30)}px`,
    };
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Заголовок с днями недели */}
      <div className="flex border-b border-gray-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-900 z-10">
        {/* Колонка времени */}
        <div className="w-16 flex-shrink-0" />
        
        {/* Дни недели */}
        {weekDays.map((date, index) => {
          const isTodayDate = isToday(date);
          const isSelected = isSameDay(date, selectedDate);
          
          return (
            <div
              key={index}
              className="flex-1 py-3 text-center border-l border-gray-100 dark:border-slate-800"
            >
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                {formatDate(date, 'EEEEEE')}
              </p>
              <p
                className={`
                  mt-1 w-8 h-8 mx-auto flex items-center justify-center rounded-full text-sm font-semibold
                  ${isTodayDate
                    ? 'bg-primary-500 text-white'
                    : isSelected
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                    : 'text-gray-900 dark:text-white'
                  }
                `}
              >
                {date.getDate()}
              </p>
            </div>
          );
        })}
      </div>

      {/* Сетка времени */}
      <div className="flex-1 overflow-auto">
        <div className="flex min-h-[1440px]">
          {/* Колонка времени */}
          <div className="w-16 flex-shrink-0">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="h-[60px] pr-2 text-right text-xs text-gray-400 dark:text-gray-500 -mt-2"
              >
                {hour.toString().padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Колонки дней */}
          {weekDays.map((date, dayIndex) => {
            const dayEvents = eventsByDay.get(date.toDateString()) || [];
            
            return (
              <div
                key={dayIndex}
                className="flex-1 border-l border-gray-100 dark:border-slate-800 relative"
              >
                {/* Линии часов */}
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    onClick={() => handleCellClick(date, hour)}
                    className="h-[60px] border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50 cursor-pointer"
                  />
                ))}

                {/* События */}
                {dayEvents
                  .filter((e) => !e.all_day)
                  .map((event) => (
                    <motion.button
                      key={event.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleEventClick(event)}
                      style={getEventStyle(event)}
                      className={`
                        absolute left-1 right-1 px-2 py-1 rounded-lg text-xs overflow-hidden
                        ${getLightColorClass(event.color)}
                        ${getTextColorClass(event.color)}
                        border-l-4
                        hover:shadow-md transition-shadow cursor-pointer
                      `}
                    >
                      <p className="font-medium truncate">{event.title}</p>
                      <p className="opacity-75">
                        {formatTime(event.start_date)}
                        {event.end_date && ` - ${formatTime(event.end_date)}`}
                      </p>
                    </motion.button>
                  ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Полнодневные события */}
      {events.some((e) => e.all_day) && (
        <div className="border-t border-gray-200 dark:border-slate-700 p-2">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            На весь день
          </p>
          <div className="flex flex-wrap gap-2">
            {events
              .filter((e) => e.all_day)
              .map((event) => (
                <motion.button
                  key={event.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleEventClick(event)}
                  className={`
                    px-3 py-1.5 rounded-lg text-xs font-medium
                    ${getLightColorClass(event.color)}
                    ${getTextColorClass(event.color)}
                  `}
                >
                  <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${getColorClass(event.color)}`} />
                  {event.title}
                </motion.button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
