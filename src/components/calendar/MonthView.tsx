// ==========================================
// МЕСЯЧНЫЙ ВИД КАЛЕНДАРЯ - Стиль как на скриншоте
// ==========================================

import { useMemo } from 'react';
import { motion } from 'framer-motion';

import { useUIStore, useEventStore } from '../../stores';
import {
  getCalendarDays,
  getWeekDayNames,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
  formatDate,
  formatTime,
} from '../../lib/dateUtils';
import { getColorClass, getLightColorClass, getTextColorClass } from '../../lib/constants';
import type { CalendarEvent } from '../../types';

export function MonthView() {
  const { selectedDate, setSelectedDate, openEventModal, settings } = useUIStore();
  const { events, setSelectedEvent } = useEventStore();

  // Получаем дни для отображения
  const calendarDays = useMemo(
    () => getCalendarDays(selectedDate, settings.week_starts_on),
    [selectedDate, settings.week_starts_on]
  );

  const weekDayNames = useMemo(
    () => getWeekDayNames(settings.week_starts_on),
    [settings.week_starts_on]
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

  // События для отображения в списке (текущий и следующие дни)
  const upcomingEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return events
      .filter((event) => {
        const eventDate = parseISO(event.start_date);
        return eventDate >= today || isSameDay(eventDate, selectedDate);
      })
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
      .slice(0, 10);
  }, [events, selectedDate]);

  // Группируем события по дате для списка
  const groupedUpcomingEvents = useMemo(() => {
    const groups: { date: Date; events: CalendarEvent[] }[] = [];
    
    upcomingEvents.forEach((event) => {
      const eventDate = parseISO(event.start_date);
      const existingGroup = groups.find((g) => isSameDay(g.date, eventDate));
      
      if (existingGroup) {
        existingGroup.events.push(event);
      } else {
        groups.push({ date: eventDate, events: [event] });
      }
    });
    
    return groups;
  }, [upcomingEvents]);

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    openEventModal();
  };

  // Получить день недели
  const getDayOfWeek = (date: Date) => {
    return formatDate(date, 'EEEE');
  };

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* Мини-календарь */}
      <div className="p-4">
        {/* Названия дней недели */}
        <div className="grid grid-cols-7 mb-2">
          {weekDayNames.map((day, index) => (
            <div
              key={index}
              className="py-2 text-center text-xs font-medium text-gray-400 dark:text-gray-500 uppercase"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Сетка дней */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((date, index) => {
            const dayEvents = eventsByDay.get(date.toDateString()) || [];
            const isCurrentMonth = isSameMonth(date, selectedDate);
            const isSelected = isSameDay(date, selectedDate);
            const isTodayDate = isToday(date);
            const hasEvents = dayEvents.length > 0;

            return (
              <motion.button
                key={index}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleDayClick(date)}
                className={`
                  aspect-square flex flex-col items-center justify-center rounded-full
                  text-sm font-medium relative
                  ${isSelected
                    ? 'bg-primary-600 text-white'
                    : isTodayDate
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                      : isCurrentMonth
                        ? 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-800'
                        : 'text-gray-300 dark:text-gray-600'
                  }
                `}
              >
                {date.getDate()}
                {/* Индикатор событий */}
                {hasEvents && !isSelected && (
                  <div className="absolute bottom-1 flex gap-0.5">
                    {dayEvents.slice(0, 3).map((event, i) => (
                      <div
                        key={i}
                        className={`w-1 h-1 rounded-full ${getColorClass(event.color)}`}
                      />
                    ))}
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Список событий */}
      <div className="flex-1 px-4 pb-20 space-y-4">
        {groupedUpcomingEvents.length > 0 ? (
          groupedUpcomingEvents.map((group, groupIndex) => (
            <div key={groupIndex}>
              {/* Заголовок дня */}
              <div className="flex items-baseline gap-3 mb-3">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                  {group.date.getDate()}
                </span>
                <span className="text-lg font-medium text-primary-600 dark:text-primary-400 capitalize">
                  {getDayOfWeek(group.date)}
                </span>
              </div>

              {/* События дня */}
              <div className="space-y-2">
                {group.events.map((event, eventIndex) => (
                  <motion.button
                    key={event.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: eventIndex * 0.05 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleEventClick(event)}
                    className={`
                      w-full text-left p-4 rounded-2xl
                      ${getLightColorClass(event.color)}
                      border-l-4 ${getColorClass(event.color).replace('bg-', 'border-')}
                      hover:shadow-md transition-all
                    `}
                  >
                    <div className="flex items-start gap-3">
                      {/* Время */}
                      <div className="text-sm text-gray-500 dark:text-gray-400 w-16 flex-shrink-0">
                        {event.all_day ? (
                          <span>Весь день</span>
                        ) : (
                          <span>{formatTime(event.start_date)}</span>
                        )}
                      </div>

                      {/* Контент */}
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold ${getTextColorClass(event.color)}`}>
                          {event.title}
                        </p>
                        {!event.all_day && event.end_date && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            {formatTime(event.start_date)} - {formatTime(event.end_date)}
                          </p>
                        )}
                        {event.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
                            {event.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-400 dark:text-gray-500 text-lg">
              Нет предстоящих событий
            </p>
            <p className="text-gray-400 dark:text-gray-600 text-sm mt-2">
              Нажмите + чтобы создать событие
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
