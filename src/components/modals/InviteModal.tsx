// ==========================================
// МОДАЛЬНОЕ ОКНО ПРИГЛАШЕНИЯ
// ==========================================

import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  EnvelopeIcon,
  LinkIcon,
  ClipboardDocumentIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';

import { useCalendarStore, useUIStore } from '../../stores';
import { Modal, Button, Input, Select } from '../ui';
import type { CalendarRole } from '../../types';

export function InviteModal() {
  const { currentCalendar, createInvite } = useCalendarStore();
  const { isInviteModalOpen, closeInviteModal } = useUIStore();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<CalendarRole>('editor');
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error('Введите email');
      return;
    }

    if (!currentCalendar) {
      toast.error('Календарь не выбран');
      return;
    }

    setLoading(true);
    const { invite, error } = await createInvite(currentCalendar.id, email, role);
    setLoading(false);

    if (error) {
      toast.error(error);
      return;
    }

    if (invite) {
      const link = `${window.location.origin}/invite/${invite.token}`;
      setInviteLink(link);
      toast.success('Приглашение создано');
    }
  };

  const handleCopyLink = async () => {
    if (!inviteLink) return;

    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success('Ссылка скопирована');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Не удалось скопировать');
    }
  };

  const handleClose = () => {
    setEmail('');
    setRole('editor');
    setInviteLink(null);
    setCopied(false);
    closeInviteModal();
  };

  const roleOptions = [
    { value: 'editor', label: 'Редактор — может создавать и изменять события' },
    { value: 'viewer', label: 'Наблюдатель — может только просматривать' },
  ];

  return (
    <Modal
      isOpen={isInviteModalOpen}
      onClose={handleClose}
      title="Пригласить в календарь"
      description={`Отправьте приглашение для доступа к календарю "${currentCalendar?.name || ''}"`}
    >
      {!inviteLink ? (
        <form onSubmit={handleSendInvite} className="space-y-6">
          {/* Email */}
          <Input
            label="Email"
            type="email"
            placeholder="email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<EnvelopeIcon className="w-5 h-5" />}
            autoFocus
          />

          {/* Роль */}
          <Select
            label="Права доступа"
            value={role}
            onChange={(value) => setRole(value as CalendarRole)}
            options={roleOptions}
          />

          {/* Информация о ролях */}
          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-sm text-blue-700 dark:text-blue-300">
            <p className="font-medium mb-1">О правах доступа:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-600 dark:text-blue-400">
              <li><strong>Редактор</strong> — создание, редактирование и удаление событий</li>
              <li><strong>Наблюдатель</strong> — только просмотр событий</li>
            </ul>
          </div>

          {/* Кнопки */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={handleClose}>
              Отмена
            </Button>
            <Button type="submit" isLoading={loading}>
              Создать приглашение
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          {/* Успех */}
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Приглашение создано!
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Отправьте эту ссылку пользователю для доступа к календарю
            </p>
          </div>

          {/* Ссылка */}
          <div className="flex items-center gap-2">
            <div className="flex-1 p-3 rounded-xl bg-gray-100 dark:bg-slate-800 text-sm text-gray-700 dark:text-gray-300 truncate">
              <LinkIcon className="w-4 h-4 inline mr-2" />
              {inviteLink}
            </div>
            <Button
              variant={copied ? 'primary' : 'secondary'}
              onClick={handleCopyLink}
              leftIcon={
                copied ? (
                  <CheckIcon className="w-4 h-4" />
                ) : (
                  <ClipboardDocumentIcon className="w-4 h-4" />
                )
              }
            >
              {copied ? 'Скопировано' : 'Копировать'}
            </Button>
          </div>

          {/* Информация */}
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-sm text-amber-700 dark:text-amber-300">
            <p>
              ⚠️ Ссылка действительна 7 дней. После перехода по ссылке пользователь
              должен войти или зарегистрироваться.
            </p>
          </div>

          {/* Закрыть */}
          <div className="flex justify-end">
            <Button onClick={handleClose}>Готово</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
