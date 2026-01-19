// ==========================================
// ОСНОВНОЙ КОМПОНЕНТ ПРИЛОЖЕНИЯ
// ==========================================

import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Stores
import { useAuthStore, useUIStore } from './stores';

// Pages & Components
import { AuthPage } from './pages/AuthPage';
import { CalendarPage } from './pages/NewCalendarPage';
import { InvitePage } from './pages/InvitePage';
import { LoadingScreen } from './components/ui/LoadingScreen';

function App() {
  const { user, loading: authLoading, initialize } = useAuthStore();
  const { theme } = useUIStore();

  // Инициализация авторизации при загрузке
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Применение темы
  useEffect(() => {
    const root = document.documentElement;
    const isDark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Показываем загрузку при инициализации
  if (authLoading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: theme === 'dark' ? '#1e293b' : '#ffffff',
            color: theme === 'dark' ? '#f1f5f9' : '#1f2937',
            borderRadius: '12px',
            padding: '12px 16px',
            boxShadow: '0 10px 40px -3px rgba(0, 0, 0, 0.1)',
          },
        }}
      />

      <Routes>
        <Route
          path="/auth"
          element={user ? <Navigate to="/" replace /> : <AuthPage />}
        />
        <Route path="/invite/:token" element={<InvitePage />} />
        <Route
          path="/"
          element={user ? <CalendarPage /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/calendar/:calendarId"
          element={user ? <CalendarPage /> : <Navigate to="/auth" replace />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
