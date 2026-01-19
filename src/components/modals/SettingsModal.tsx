// ==========================================
// МОДАЛЬНОЕ ОКНО НАСТРОЕК
// ==========================================

import toast from 'react-hot-toast';
import {
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  BellIcon,
  CalendarDaysIcon,
  CloudIcon,
  DevicePhoneMobileIcon,
} from '@heroicons/react/24/outline';

import { useUIStore } from '../../stores';
import { Modal, Toggle, Select } from '../ui';
import { requestNotificationPermission, getNotificationPermission } from '../../lib/notifications';
import { isSupabaseConfigured } from '../../lib/supabase';
import type { Theme } from '../../types';

export function SettingsModal() {
  const { isSettingsOpen, closeSettings, theme, setTheme, settings, updateSettings, syncMode, setSyncMode } = useUIStore();

  const notificationPermission = getNotificationPermission();

  const handleEnableNotifications = async () => {
    const permission = await requestNotificationPermission();
    
    if (permission === 'granted') {
      updateSettings({ notifications_enabled: true });
      toast.success('Уведомления включены');
    } else if (permission === 'denied') {
      toast.error('Уведомления заблокированы в настройках браузера');
    } else if (permission === 'unsupported') {
      toast.error('Уведомления не поддерживаются');
    }
  };

  const themeOptions: { value: Theme; label: string; icon: typeof SunIcon }[] = [
    { value: 'light', label: 'Светлая', icon: SunIcon },
    { value: 'dark', label: 'Тёмная', icon: MoonIcon },
    { value: 'system', label: 'Системная', icon: ComputerDesktopIcon },
  ];

  const weekStartOptions = [
    { value: 1, label: 'Понедельник' },
    { value: 0, label: 'Воскресенье' },
  ];

  const reminderOptions = [
    { value: 0, label: 'В момент события' },
    { value: 5, label: 'За 5 минут' },
    { value: 10, label: 'За 10 минут' },
    { value: 15, label: 'За 15 минут' },
    { value: 30, label: 'За 30 минут' },
    { value: 60, label: 'За 1 час' },
  ];

  return (
    <Modal
      isOpen={isSettingsOpen}
      onClose={closeSettings}
      title="Настройки"
      description="Персонализируйте приложение под себя"
    >
      <div className="space-y-8">
        {/* Тема */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
            Оформление
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {themeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setTheme(option.value)}
                className={`
                  flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all
                  ${theme === option.value
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                    : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                  }
                `}
              >
                <option.icon
                  className={`w-6 h-6 ${
                    theme === option.value
                      ? 'text-primary-600 dark:text-primary-400'
                      : 'text-gray-400'
                  }`}
                />
                <span
                  className={`text-sm font-medium ${
                    theme === option.value
                      ? 'text-primary-700 dark:text-primary-300'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Уведомления */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <BellIcon className="w-5 h-5" />
            Уведомления
          </h3>
          
          {notificationPermission === 'granted' ? (
            <Toggle
              enabled={settings.notifications_enabled}
              onChange={(enabled) => updateSettings({ notifications_enabled: enabled })}
              label="Показывать напоминания"
              description="Push-уведомления о предстоящих событиях"
            />
          ) : notificationPermission === 'denied' ? (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">
              Уведомления заблокированы. Разрешите их в настройках браузера.
            </div>
          ) : (
            <button
              onClick={handleEnableNotifications}
              className="w-full p-4 rounded-xl bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-medium hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
            >
              Включить уведомления
            </button>
          )}
        </div>

        {/* Календарь */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <CalendarDaysIcon className="w-5 h-5" />
            Календарь
          </h3>
          
          <div className="space-y-4">
            <Select
              label="Начало недели"
              value={settings.week_starts_on}
              onChange={(value) => updateSettings({ week_starts_on: value as 0 | 1 })}
              options={weekStartOptions}
            />

            <Select
              label="Напоминание по умолчанию"
              value={settings.default_reminder_minutes}
              onChange={(value) =>
                updateSettings({ default_reminder_minutes: value as number })
              }
              options={reminderOptions}
            />
          </div>
        </div>

        {/* Синхронизация */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <CloudIcon className="w-5 h-5" />
            Синхронизация
          </h3>
          
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                setSyncMode('local');
                toast.success('Локальный режим активирован');
              }}
              className={`
                flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all
                ${syncMode === 'local'
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                  : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                }
              `}
            >
              <DevicePhoneMobileIcon
                className={`w-6 h-6 ${
                  syncMode === 'local'
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-gray-400'
                }`}
              />
              <span
                className={`text-sm font-medium ${
                  syncMode === 'local'
                    ? 'text-primary-700 dark:text-primary-300'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                Локально
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500 text-center">
                Данные на устройстве
              </span>
            </button>
            
            <button
              onClick={() => {
                if (isSupabaseConfigured) {
                  setSyncMode('supabase');
                  toast.success('Облачная синхронизация активирована');
                } else {
                  toast.error('Supabase не настроен. Добавьте ключи в .env файл');
                }
              }}
              disabled={!isSupabaseConfigured}
              className={`
                flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all
                ${!isSupabaseConfigured 
                  ? 'opacity-50 cursor-not-allowed border-gray-200 dark:border-slate-700'
                  : syncMode === 'supabase'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                    : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                }
              `}
            >
              <CloudIcon
                className={`w-6 h-6 ${
                  syncMode === 'supabase' && isSupabaseConfigured
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-gray-400'
                }`}
              />
              <span
                className={`text-sm font-medium ${
                  syncMode === 'supabase' && isSupabaseConfigured
                    ? 'text-primary-700 dark:text-primary-300'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                Облако
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500 text-center">
                {isSupabaseConfigured ? 'Общий доступ' : 'Не настроено'}
              </span>
            </button>
          </div>
          
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            {syncMode === 'supabase' && isSupabaseConfigured
              ? '☁️ События синхронизируются между устройствами' 
              : '📱 События хранятся только на этом устройстве'}
          </p>
        </div>

        {/* Информация о приложении */}
        <div className="pt-4 border-t border-gray-100 dark:border-slate-800">
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
            Семейный Календарь v1.0.0
            <br />
            Сделано с ❤️
          </p>
        </div>
      </div>
    </Modal>
  );
}
