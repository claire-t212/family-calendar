// ==========================================
// ДНЕВНОЙ ВИД КАЛЕНДАРЯ
// ==========================================

import { useMemo } from 'react';
import { motion } from 'framer-motion';

import { useUIStore, useEventStore } from '../../stores';
import {
  parseISO,
  formatTime,
  formatDate,
  isSameDay,
} from '../../lib/dateUtils';
import { getColorClass, getLightColorClass, getTextColorClass } from '../../lib/constants';
import type { CalendarEvent } from '../../types';

// Часы для отображения
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function DayView() {
  const { selectedDate, setSelectedDate, openEventModal } = useUIStore();
  const { events, setSelectedEvent } = useEventStore();

  // Фильтруем события на выбранный день
  const dayEvents = useMemo(() => {
    return events.filter((event) =>
      isSameDay(parseISO(event.start_date), selectedDate)
    );
  }, [events, selectedDate]);

  const allDayEvents = dayEvents.filter((e) => e.all_day);
  const timedEvents = dayEvents.filter((e) => !e.all_day);

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    openEventModal();
  };

  const handleCellClick = (hour: number) => {
    const newDate = new Date(selectedDate);
    newDate.setHours(hour, 0, 0, 0);
    setSelectedDate(newDate);
    setSelectedEvent(null);
    openEventModal();
  };

  // Получить позицию события в сетке
  const getEventStyle = (event: CalendarEvent) => {
    const startDate = parseISO(event.start_date);
    const endDate = event.end_date
      ? parseISO(event.end_date)
      : new Date(startDate.getTime() + 60 * 60 * 1000);

    const startHour = startDate.getHours() + startDate.getMinutes() / 60;
    const duration = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);

    return {
      top: `${startHour * 80}px`,
      height: `${Math.max(duration * 80, 40)}px`,
    };
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Полнодневные события */}
      {allDayEvents.length > 0 && (
        <div className="border-b border-gray-200 dark:border-slate-700 p-4 bg-gray-50 dark:bg-slate-800/50">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">
            На весь день
          </p>
          <div className="space-y-2">
            {allDayEvents.map((event) => (
              <motion.button
                key={event.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleEventClick(event)}
                className={`
                  w-full text-left px-4 py-3 rounded-xl
                  ${getLightColorClass(event.color)}
                  ${getTextColorClass(event.color)}
                  hover:shadow-md transition-all
                `}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${getColorClass(event.color)}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{event.title}</p>
                    {event.description && (
                      <p className="text-sm opacity-75 truncate mt-0.5">
                        {event.description}
                      </p>
                    )}
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Почасовая сетка */}
      <div className="flex-1 overflow-auto">
        <div className="flex min-h-[1920px]">
          {/* Колонка времени */}
          <div className="w-20 flex-shrink-0">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="h-[80px] pr-4 text-right"
              >
                <span className="text-sm font-medium text-gray-400 dark:text-gray-500 -mt-2 block">
                  {hour.toString().padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>

          {/* Основная область */}
          <div className="flex-1 relative border-l border-gray-200 dark:border-slate-700">
            {/* Линии часов */}
            {HOURS.map((hour) => (
              <div
                key={hour}
                onClick={() => handleCellClick(hour)}
                className="h-[80px] border-b border-gray-100 dark:border-slate-800 hover:bg-primary-50 dark:hover:bg-primary-900/10 cursor-pointer transition-colors"
              />
            ))}

            {/* События */}
            <div className="absolute inset-0 pointer-events-none">
              {timedEvents.map((event, index) => (
                <motion.button
                  key={event.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleEventClick(event)}
                  style={{
                    ...getEventStyle(event),
                    left: '8px',
                    right: '8px',
                  }}
                  className={`
                    absolute px-4 py-2 rounded-xl text-left overflow-hidden pointer-events-auto
                    ${getLightColorClass(event.color)}
                    ${getTextColorClass(event.color)}
                    border-l-4 shadow-sm
                    hover:shadow-lg transition-all cursor-pointer
                  `}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${getColorClass(event.color)}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{event.title}</p>
                      <p className="text-sm opacity-75 mt-0.5">
                        {formatTime(event.start_date)}
                        {event.end_date && ` – ${formatTime(event.end_date)}`}
                      </p>
                      {event.description && (
                        <p className="text-sm opacity-60 truncate mt-1">
                          {event.description}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Текущее время */}
            {isSameDay(new Date(), selectedDate) && (
              <div
                className="absolute left-0 right-0 flex items-center pointer-events-none z-10"
                style={{
                  top: `${(new Date().getHours() + new Date().getMinutes() / 60) * 80}px`,
                }}
              >
                <div className="w-3 h-3 rounded-full bg-red-500 -ml-1.5" />
                <div className="flex-1 h-0.5 bg-red-500" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Пустое состояние */}
      {dayEvents.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-gray-400 dark:text-gray-500 text-lg mb-2">
              Нет событий на {formatDate(selectedDate, 'd MMMM')}
            </p>
            <p className="text-gray-400 dark:text-gray-600 text-sm">
              Нажмите на время, чтобы создать событие
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
