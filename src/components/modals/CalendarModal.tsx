// ==========================================
// МОДАЛЬНОЕ ОКНО СОЗДАНИЯ/РЕДАКТИРОВАНИЯ КАЛЕНДАРЯ
// ==========================================

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { TrashIcon } from '@heroicons/react/24/outline';

import { useCalendarStore, useUIStore, useAuthStore } from '../../stores';
import { Modal, Button, Input, Textarea, ColorPicker } from '../ui';
import type { CalendarFormData, EventColor } from '../../types';

const defaultFormData: CalendarFormData = {
  name: '',
  description: '',
  color: 'blue',
};

export function CalendarModal() {
  const { user } = useAuthStore();
  const { currentCalendar, createCalendar, updateCalendar, deleteCalendar, loading } = useCalendarStore();
  const { isCalendarModalOpen, closeCalendarModal } = useUIStore();

  const [formData, setFormData] = useState<CalendarFormData>(defaultFormData);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Режим: создание нового или редактирование текущего
  useEffect(() => {
    if (isCalendarModalOpen) {
      if (currentCalendar && currentCalendar.owner_id === user?.id) {
        // Можем редактировать только свои календари
        setIsEditing(true);
        setFormData({
          name: currentCalendar.name,
          description: currentCalendar.description || '',
          color: currentCalendar.color as EventColor,
        });
      } else {
        setIsEditing(false);
        setFormData(defaultFormData);
      }
      setDeleteConfirm(false);
    }
  }, [isCalendarModalOpen, currentCalendar, user?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Введите название календаря');
      return;
    }

    if (isEditing && currentCalendar) {
      const { error } = await updateCalendar(currentCalendar.id, formData);
      if (error) {
        toast.error(error);
      } else {
        toast.success('Календарь обновлён');
        closeCalendarModal();
      }
    } else {
      const { error } = await createCalendar(formData);
      if (error) {
        toast.error(error);
      } else {
        toast.success('Календарь создан');
        closeCalendarModal();
      }
    }
  };

  const handleDelete = async () => {
    if (!currentCalendar) return;

    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }

    const { error } = await deleteCalendar(currentCalendar.id);
    if (error) {
      toast.error(error);
    } else {
      toast.success('Календарь удалён');
      closeCalendarModal();
    }
  };

  const updateField = <K extends keyof CalendarFormData>(
    field: K,
    value: CalendarFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Modal
      isOpen={isCalendarModalOpen}
      onClose={closeCalendarModal}
      title={isEditing ? 'Редактировать календарь' : 'Новый календарь'}
      description={
        isEditing
          ? 'Измените настройки календаря'
          : 'Создайте новый календарь для событий'
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Название */}
        <Input
          label="Название"
          placeholder="Например: Семейный, Работа, Спорт..."
          value={formData.name}
          onChange={(e) => updateField('name', e.target.value)}
          autoFocus
        />

        {/* Описание */}
        <Textarea
          label="Описание"
          placeholder="Необязательное описание календаря..."
          value={formData.description}
          onChange={(e) => updateField('description', e.target.value)}
          rows={2}
        />

        {/* Цвет */}
        <ColorPicker
          label="Цвет календаря"
          value={formData.color}
          onChange={(color) => updateField('color', color)}
        />

        {/* Кнопки */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-slate-800">
          {isEditing ? (
            <Button
              type="button"
              variant={deleteConfirm ? 'danger' : 'ghost'}
              onClick={handleDelete}
              leftIcon={<TrashIcon className="w-4 h-4" />}
            >
              {deleteConfirm ? 'Подтвердить' : 'Удалить'}
            </Button>
          ) : (
            <div />
          )}

          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={closeCalendarModal}>
              Отмена
            </Button>
            <Button type="submit" isLoading={loading}>
              {isEditing ? 'Сохранить' : 'Создать'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
