// ==========================================
// СТРАНИЦА ПРИНЯТИЯ ПРИГЛАШЕНИЯ
// ==========================================

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  CheckCircleIcon,
  XCircleIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';

import { useAuthStore, useCalendarStore } from '../stores';
import { Button, LoadingScreen } from '../components/ui';
import { AuthPage } from './AuthPage';

type InviteStatus = 'loading' | 'success' | 'error' | 'needsAuth';

export function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuthStore();
  const { acceptInvite } = useCalendarStore();

  const [status, setStatus] = useState<InviteStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  // Принятие приглашения
  useEffect(() => {
    const handleAcceptInvite = async () => {
      if (!token) {
        setStatus('error');
        setErrorMessage('Неверная ссылка приглашения');
        return;
      }

      if (authLoading) return;

      if (!user) {
        setStatus('needsAuth');
        return;
      }

      setStatus('loading');
      const { error } = await acceptInvite(token);

      if (error) {
        setStatus('error');
        setErrorMessage(error);
      } else {
        setStatus('success');
        toast.success('Приглашение принято!');
      }
    };

    handleAcceptInvite();
  }, [token, user, authLoading, acceptInvite]);

  // Показываем загрузку
  if (authLoading || status === 'loading') {
    return <LoadingScreen />;
  }

  // Нужна авторизация
  if (status === 'needsAuth') {
    return (
      <div>
        <div className="bg-primary-500 text-white p-4 text-center text-sm">
          <CalendarIcon className="w-5 h-5 inline mr-2" />
          Войдите или зарегистрируйтесь, чтобы принять приглашение
        </div>
        <AuthPage />
      </div>
    );
  }

  // Успех
  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-white dark:from-slate-900 dark:to-slate-800 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="w-24 h-24 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center"
          >
            <CheckCircleIcon className="w-14 h-14 text-green-600 dark:text-green-400" />
          </motion.div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            Добро пожаловать!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Вы успешно присоединились к календарю
          </p>
          <Button onClick={() => navigate('/')}>
            Перейти к календарю
          </Button>
        </motion.div>
      </div>
    );
  }

  // Ошибка
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-white dark:from-slate-900 dark:to-slate-800 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
          className="w-24 h-24 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center"
        >
          <XCircleIcon className="w-14 h-14 text-red-600 dark:text-red-400" />
        </motion.div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          Ошибка
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {errorMessage || 'Не удалось принять приглашение'}
        </p>
        <Button variant="secondary" onClick={() => navigate('/')}>
          На главную
        </Button>
      </motion.div>
    </div>
  );
}
