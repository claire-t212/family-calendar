// ==========================================
// МОДАЛЬНОЕ ОКНО СОЗДАНИЯ/РЕДАКТИРОВАНИЯ СОБЫТИЯ
// ==========================================

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  TrashIcon,
  ClockIcon,
  DocumentTextIcon,
  BellIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';

import { useEventStore, useCalendarStore, useUIStore } from '../../stores';
import { Modal, Button, Input, Textarea, Toggle, ColorPicker, Select } from '../ui';
import { toDateInputValue, toTimeInputValue } from '../../lib/dateUtils';
import { REMINDER_OPTIONS } from '../../lib/constants';
import type { EventFormData, EventColor } from '../../types';
import { EventHistory } from './EventHistory';

const defaultFormData: EventFormData = {
  title: '',
  description: '',
  notes: '',
  start_date: toDateInputValue(new Date()),
  start_time: '09:00',
  end_date: '',
  end_time: '10:00',
  all_day: false,
  color: 'blue',
  reminder_minutes: 30,
};

export function EventModal() {
  const { currentCalendar } = useCalendarStore();
  const { selectedEvent, createEvent, updateEvent, deleteEvent, loading, fetchEventHistory, eventHistory } = useEventStore();
  const { isEventModalOpen, closeEventModal, selectedDate, settings } = useUIStore();

  const [formData, setFormData] = useState<EventFormData>(defaultFormData);
  const [showHistory, setShowHistory] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Заполняем форму при открытии
  useEffect(() => {
    if (isEventModalOpen) {
      if (selectedEvent) {
        // Режим редактирования
        const startDate = new Date(selectedEvent.start_date);
        const endDate = selectedEvent.end_date ? new Date(selectedEvent.end_date) : null;

        setFormData({
          title: selectedEvent.title,
          description: selectedEvent.description || '',
          notes: selectedEvent.notes || '',
          start_date: toDateInputValue(startDate),
          start_time: toTimeInputValue(startDate),
          end_date: endDate ? toDateInputValue(endDate) : '',
          end_time: endDate ? toTimeInputValue(endDate) : '',
          all_day: selectedEvent.all_day,
          color: selectedEvent.color as EventColor,
          reminder_minutes: selectedEvent.reminder_minutes,
        });

        // Загружаем историю
        fetchEventHistory(selectedEvent.id);
      } else {
        // Режим создания
        setFormData({
          ...defaultFormData,
          start_date: toDateInputValue(selectedDate),
          start_time: toTimeInputValue(selectedDate),
          reminder_minutes: settings.default_reminder_minutes,
        });
      }
      setShowHistory(false);
      setDeleteConfirm(false);
    }
  }, [isEventModalOpen, selectedEvent, selectedDate, settings.default_reminder_minutes, fetchEventHistory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Введите название события');
      return;
    }

    if (!currentCalendar) {
      toast.error('Выберите календарь');
      return;
    }

    if (selectedEvent) {
      // Обновление
      const { error } = await updateEvent(selectedEvent.id, formData);
      if (error) {
        toast.error(error);
      } else {
        toast.success('Событие обновлено');
        closeEventModal();
      }
    } else {
      // Создание
      const { error } = await createEvent(currentCalendar.id, formData);
      if (error) {
        toast.error(error);
      } else {
        toast.success('Событие создано');
        closeEventModal();
      }
    }
  };

  const handleDelete = async () => {
    if (!selectedEvent) return;

    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }

    const { error } = await deleteEvent(selectedEvent.id);
    if (error) {
      toast.error(error);
    } else {
      toast.success('Событие удалено');
      closeEventModal();
    }
  };

  const updateField = <K extends keyof EventFormData>(
    field: K,
    value: EventFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Modal
      isOpen={isEventModalOpen}
      onClose={closeEventModal}
      title={selectedEvent ? 'Редактировать событие' : 'Новое событие'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Название */}
        <Input
          label="Название"
          placeholder="Введите название события"
          value={formData.title}
          onChange={(e) => updateField('title', e.target.value)}
          autoFocus
        />

        {/* Дата и время */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <CalendarDaysIcon className="w-5 h-5 text-gray-400" />
            <Toggle
              enabled={formData.all_day}
              onChange={(enabled) => updateField('all_day', enabled)}
              label="Весь день"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Дата начала"
              type="date"
              value={formData.start_date}
              onChange={(e) => updateField('start_date', e.target.value)}
            />
            {!formData.all_day && (
              <Input
                label="Время начала"
                type="time"
                value={formData.start_time}
                onChange={(e) => updateField('start_time', e.target.value)}
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Дата окончания"
              type="date"
              value={formData.end_date}
              onChange={(e) => updateField('end_date', e.target.value)}
              hint="Необязательно"
            />
            {!formData.all_day && (
              <Input
                label="Время окончания"
                type="time"
                value={formData.end_time}
                onChange={(e) => updateField('end_time', e.target.value)}
              />
            )}
          </div>
        </div>

        {/* Описание */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <DocumentTextIcon className="w-5 h-5" />
            <span className="text-sm font-medium">Описание</span>
          </div>
          <Input
            placeholder="Краткое описание"
            value={formData.description}
            onChange={(e) => updateField('description', e.target.value)}
          />
        </div>

        {/* Заметки */}
        <Textarea
          label="Заметки"
          placeholder="Дополнительные заметки..."
          value={formData.notes}
          onChange={(e) => updateField('notes', e.target.value)}
          rows={3}
        />

        {/* Напоминание */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-gray-400">
            <BellIcon className="w-5 h-5" />
            <span className="text-sm font-medium">Напоминание</span>
          </div>
          <Select
            value={formData.reminder_minutes}
            onChange={(value) => updateField('reminder_minutes', value as number | null)}
            options={REMINDER_OPTIONS}
          />
        </div>

        {/* Цвет */}
        <ColorPicker
          label="Цвет"
          value={formData.color}
          onChange={(color) => updateField('color', color)}
        />

        {/* История изменений */}
        {selectedEvent && eventHistory.length > 0 && (
          <div className="border-t border-gray-100 dark:border-slate-800 pt-4">
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              <ClockIcon className="w-4 h-4" />
              {showHistory ? 'Скрыть историю' : 'Показать историю изменений'}
            </button>
            
            <AnimatePresence>
              {showHistory && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <EventHistory history={eventHistory} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Кнопки действий */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-slate-800">
          {selectedEvent ? (
            <Button
              type="button"
              variant={deleteConfirm ? 'danger' : 'ghost'}
              onClick={handleDelete}
              leftIcon={<TrashIcon className="w-4 h-4" />}
            >
              {deleteConfirm ? 'Подтвердить удаление' : 'Удалить'}
            </Button>
          ) : (
            <div />
          )}

          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={closeEventModal}>
              Отмена
            </Button>
            <Button type="submit" isLoading={loading}>
              {selectedEvent ? 'Сохранить' : 'Создать'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
