// ==========================================
// БОКОВАЯ ПАНЕЛЬ
// ==========================================

import { Fragment, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { motion } from 'framer-motion';
import {
  XMarkIcon,
  PlusIcon,
  CalendarIcon,
  UserGroupIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';

import { useCalendarStore, useUIStore, useAuthStore } from '../../stores';
import { Button, Avatar } from '../ui';
import { getColorClass } from '../../lib/constants';

export function Sidebar() {
  const { user } = useAuthStore();
  const {
    calendars,
    currentCalendar,
    members,
    setCurrentCalendar,
    fetchMembers,
  } = useCalendarStore();
  const {
    isSidebarOpen,
    setSidebarOpen,
    openCalendarModal,
    openInviteModal,
  } = useUIStore();

  // Загружаем участников при смене календаря
  useEffect(() => {
    if (currentCalendar) {
      fetchMembers(currentCalendar.id);
    }
  }, [currentCalendar, fetchMembers]);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Заголовок */}
      <div className="p-4 border-b border-gray-100 dark:border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Календари
          </h2>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={openCalendarModal}
            className="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800"
          >
            <PlusIcon className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Список календарей */}
        <div className="space-y-1">
          {calendars.map((calendar) => (
            <motion.button
              key={calendar.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setCurrentCalendar(calendar);
                setSidebarOpen(false);
              }}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                transition-colors duration-200
                ${currentCalendar?.id === calendar.id
                  ? 'bg-primary-50 dark:bg-primary-900/30'
                  : 'hover:bg-gray-100 dark:hover:bg-slate-800'
                }
              `}
            >
              <div className={`w-3 h-3 rounded-full ${getColorClass(calendar.color)}`} />
              <span
                className={`
                  flex-1 text-left text-sm font-medium truncate
                  ${currentCalendar?.id === calendar.id
                    ? 'text-primary-700 dark:text-primary-300'
                    : 'text-gray-700 dark:text-gray-300'
                  }
                `}
              >
                {calendar.name}
              </span>
              {currentCalendar?.id === calendar.id && (
                <CheckIcon className="w-4 h-4 text-primary-500" />
              )}
            </motion.button>
          ))}

          {calendars.length === 0 && (
            <div className="text-center py-8">
              <CalendarIcon className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                У вас пока нет календарей
              </p>
              <Button
                onClick={openCalendarModal}
                variant="ghost"
                size="sm"
                className="mt-2"
              >
                Создать первый
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Участники текущего календаря */}
      {currentCalendar && (
        <div className="flex-1 p-4 overflow-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <UserGroupIcon className="w-4 h-4" />
              Участники
            </h3>
            {currentCalendar.owner_id === user?.id && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={openInviteModal}
                className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
              >
                Пригласить
              </motion.button>
            )}
          </div>

          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/50"
              >
                <Avatar
                  src={member.user?.avatar_url}
                  name={member.user?.full_name}
                  email={member.user?.email}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {member.user?.full_name || member.user?.email}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {member.role === 'owner'
                      ? 'Владелец'
                      : member.role === 'editor'
                      ? 'Редактор'
                      : 'Наблюдатель'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Мини-календарь или дополнительная информация */}
      <div className="p-4 border-t border-gray-100 dark:border-slate-800">
        <p className="text-xs text-center text-gray-400 dark:text-gray-500">
          Семейный Календарь v1.0
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Десктопный сайдбар */}
      <aside className="hidden lg:flex w-72 border-r border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-col">
        <SidebarContent />
      </aside>

      {/* Мобильный сайдбар */}
      <Transition.Root show={isSidebarOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50 lg:hidden"
          onClose={setSidebarOpen}
        >
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                <div className="flex grow flex-col bg-white dark:bg-slate-900 overflow-y-auto">
                  {/* Кнопка закрытия */}
                  <div className="absolute top-4 right-0 -mr-12">
                    <button
                      onClick={() => setSidebarOpen(false)}
                      className="p-2 rounded-full bg-white/10 text-white"
                    >
                      <XMarkIcon className="w-6 h-6" />
                    </button>
                  </div>
                  
                  <SidebarContent />
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>
    </>
  );
}
