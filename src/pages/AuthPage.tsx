// ==========================================
// СТРАНИЦА ВЫБОРА ПОЛЬЗОВАТЕЛЯ
// ==========================================

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { CameraIcon, SunIcon, MoonIcon, PencilIcon } from '@heroicons/react/24/outline';

import { useAuthStore, useUIStore } from '../stores';
import { Modal } from '../components/ui';

interface FamilyMember {
  id: 'husband' | 'wife';
  role: string;
  name: string;
  birthDate: string;
  emoji: string;
  gradient: string;
}

// Дефолтные данные
const DEFAULT_FAMILY_MEMBERS: FamilyMember[] = [
  {
    id: 'husband',
    role: 'Муж',
    name: 'Костя',
    birthDate: '19.08.2002',
    emoji: '👨',
    gradient: 'from-blue-500 to-indigo-600',
  },
  {
    id: 'wife',
    role: 'Жена',
    name: 'Саня',
    birthDate: '11.10.2001',
    emoji: '👩',
    gradient: 'from-pink-500 to-rose-600',
  },
];

const DEFAULT_TOGETHER_SINCE = '2021';

const STORAGE_KEY_PHOTOS = 'family-calendar-photos';
const STORAGE_KEY_MEMBERS = 'family-calendar-members';
const STORAGE_KEY_TOGETHER = 'family-calendar-together';

// Функция для получения обрезанного изображения с сохранением качества
function getCroppedImg(
  image: HTMLImageElement,
  crop: PixelCrop,
  maxSize: number = 500 // Максимальный размер для аватара
): Promise<string> {
  const canvas = document.createElement('canvas');
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  
  // Реальные размеры кропа в пикселях оригинала
  const realWidth = crop.width * scaleX;
  const realHeight = crop.height * scaleY;
  
  // Сохраняем оригинальный размер если он не слишком большой
  let outputSize = Math.min(realWidth, realHeight);
  if (outputSize > maxSize) {
    outputSize = maxSize;
  }
  
  canvas.width = outputSize;
  canvas.height = outputSize;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('No 2d context');
  }
  
  // Включаем высококачественное сглаживание
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    realWidth,
    realHeight,
    0,
    0,
    outputSize,
    outputSize
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve('');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.readAsDataURL(blob);
    }, 'image/jpeg', 0.95); // Высокое качество JPEG
  });
}

export function AuthPage() {
  const { setLocalUser } = useAuthStore();
  const { theme, setTheme } = useUIStore();
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [members, setMembers] = useState<FamilyMember[]>(DEFAULT_FAMILY_MEMBERS);
  const [togetherSince, setTogetherSince] = useState(DEFAULT_TOGETHER_SINCE);
  
  // Модальные окна
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTogetherModalOpen, setEditTogetherModalOpen] = useState(false);
  
  const [currentMember, setCurrentMember] = useState<'husband' | 'wife' | null>(null);
  const [imageSrc, setImageSrc] = useState<string>('');
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 80,
    height: 80,
    x: 10,
    y: 10,
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  
  // Временные данные для редактирования
  const [editName, setEditName] = useState('');
  const [editBirthDate, setEditBirthDate] = useState('');
  const [editTogether, setEditTogether] = useState('');
  
  const fileInputRefs = {
    husband: useRef<HTMLInputElement>(null),
    wife: useRef<HTMLInputElement>(null),
  };

  // Загружаем сохранённые данные при старте
  useEffect(() => {
    // Фото
    const savedPhotos = localStorage.getItem(STORAGE_KEY_PHOTOS);
    if (savedPhotos) {
      try {
        setPhotos(JSON.parse(savedPhotos));
      } catch (e) {
        console.error('Error loading photos:', e);
      }
    }
    
    // Данные членов семьи
    const savedMembers = localStorage.getItem(STORAGE_KEY_MEMBERS);
    if (savedMembers) {
      try {
        const parsed = JSON.parse(savedMembers);
        setMembers(DEFAULT_FAMILY_MEMBERS.map(m => ({
          ...m,
          name: parsed[m.id]?.name || m.name,
          birthDate: parsed[m.id]?.birthDate || m.birthDate,
        })));
      } catch (e) {
        console.error('Error loading members:', e);
      }
    }
    
    // Дата "вместе с"
    const savedTogether = localStorage.getItem(STORAGE_KEY_TOGETHER);
    if (savedTogether) {
      setTogetherSince(savedTogether);
    }
  }, []);

  const handleFileSelect = (memberId: 'husband' | 'wife', event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Выберите изображение');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setImageSrc(e.target?.result as string);
      setCurrentMember(memberId);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
    
    // Сброс input чтобы можно было выбрать тот же файл
    event.target.value = '';
  };

  const handleCropComplete = useCallback(async () => {
    if (!imgRef.current || !completedCrop || !currentMember) return;
    
    try {
      const croppedImage = await getCroppedImg(imgRef.current, completedCrop);
      const newPhotos = { ...photos, [currentMember]: croppedImage };
      setPhotos(newPhotos);
      localStorage.setItem(STORAGE_KEY_PHOTOS, JSON.stringify(newPhotos));
      toast.success('Фото обновлено! 📸');
      setCropModalOpen(false);
      setImageSrc('');
      setCurrentMember(null);
    } catch (e) {
      toast.error('Ошибка обработки изображения');
    }
  }, [completedCrop, currentMember, photos]);

  // Открытие редактирования члена семьи
  const handleEditMember = (memberId: 'husband' | 'wife') => {
    const member = members.find(m => m.id === memberId);
    if (member) {
      setCurrentMember(memberId);
      setEditName(member.name);
      setEditBirthDate(member.birthDate);
      setEditModalOpen(true);
    }
  };

  // Сохранение изменений члена семьи
  const handleSaveMember = () => {
    if (!currentMember || !editName.trim()) {
      toast.error('Введите имя');
      return;
    }

    const newMembers = members.map(m => 
      m.id === currentMember 
        ? { ...m, name: editName.trim(), birthDate: editBirthDate.trim() }
        : m
    );
    
    setMembers(newMembers);
    
    // Сохраняем в localStorage
    const dataToSave = newMembers.reduce((acc, m) => ({
      ...acc,
      [m.id]: { name: m.name, birthDate: m.birthDate }
    }), {});
    localStorage.setItem(STORAGE_KEY_MEMBERS, JSON.stringify(dataToSave));
    
    toast.success('Данные обновлены! ✨');
    setEditModalOpen(false);
    setCurrentMember(null);
  };

  // Открытие редактирования "вместе с"
  const handleEditTogether = () => {
    setEditTogether(togetherSince);
    setEditTogetherModalOpen(true);
  };

  // Сохранение "вместе с"
  const handleSaveTogether = () => {
    if (!editTogether.trim()) {
      toast.error('Введите дату');
      return;
    }
    
    setTogetherSince(editTogether.trim());
    localStorage.setItem(STORAGE_KEY_TOGETHER, editTogether.trim());
    toast.success('Дата обновлена! 💕');
    setEditTogetherModalOpen(false);
  };

  const handleLogin = (member: FamilyMember) => {
    setLocalUser({
      id: member.id,
      email: `${member.id}@family.local`,
      full_name: member.name,
      avatar_url: photos[member.id] || null,
      created_at: new Date().toISOString(),
    });
    toast.success(`Привет, ${member.name}! 💕`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary-50 via-white to-rose-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
      {/* Переключатель темы */}
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="absolute top-4 right-4 p-3 rounded-full bg-white dark:bg-slate-800 shadow-lg border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
        title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
      >
        {theme === 'dark' ? (
          <SunIcon className="w-6 h-6" />
        ) : (
          <MoonIcon className="w-6 h-6" />
        )}
      </motion.button>

      {/* Логотип и заголовок */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <motion.img
          src={import.meta.env.BASE_URL + 'logo.png'}
          alt="Наш Календарь"
          className="w-24 h-24 mx-auto mb-4 drop-shadow-lg"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Наш Календарь
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Выберите, кто вы 💑
        </p>
      </motion.div>

      {/* Карточки пользователей */}
      <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-6">
        {members.map((member, index) => (
          <motion.div
            key={member.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl overflow-hidden"
          >
            {/* Фото */}
            <div 
              className={`relative h-48 bg-gradient-to-br ${member.gradient} flex items-center justify-center cursor-pointer group`}
              onClick={() => fileInputRefs[member.id].current?.click()}
            >
              {photos[member.id] ? (
                <img
                  src={photos[member.id]}
                  alt={member.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-8xl">{member.emoji}</span>
              )}
              
              {/* Оверлей для загрузки фото */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="text-white text-center">
                  <CameraIcon className="w-10 h-10 mx-auto mb-2" />
                  <span className="text-sm font-medium">Загрузить фото</span>
                </div>
              </div>

              <input
                ref={fileInputRefs[member.id]}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileSelect(member.id, e)}
              />
            </div>

            {/* Информация */}
            <div className="p-6 text-center relative">
              {/* Кнопка редактирования */}
              <button
                onClick={() => handleEditMember(member.id)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                title="Редактировать"
              >
                <PencilIcon className="w-4 h-4" />
              </button>
              
              <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-2 bg-gradient-to-r ${member.gradient} text-white`}>
                {member.role}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {member.name}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                📅 {member.birthDate}
              </p>

              {/* Кнопка входа */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleLogin(member)}
                className={`w-full py-4 px-6 rounded-2xl text-white font-semibold text-lg bg-gradient-to-r ${member.gradient} shadow-lg hover:shadow-xl transition-shadow`}
              >
                Войти как {member.role.toLowerCase()}
              </motion.button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Подпись с датой "вместе с" */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        onClick={handleEditTogether}
        className="mt-8 px-4 py-2 text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-2"
      >
        <span className="text-rose-500">💕</span>
        <span>Вместе с {togetherSince}</span>
        <PencilIcon className="w-3 h-3 opacity-50" />
      </motion.button>

      {/* Модальное окно кадрирования */}
      <Modal
        isOpen={cropModalOpen}
        onClose={() => {
          setCropModalOpen(false);
          setImageSrc('');
          setCurrentMember(null);
        }}
        title="Кадрирование фото"
      >
        <div className="space-y-4">
          {imageSrc && (
            <div className="max-h-[60vh] overflow-auto flex justify-center">
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1}
                circularCrop
              >
                <img
                  ref={imgRef}
                  src={imageSrc}
                  alt="Crop"
                  className="max-w-full"
                />
              </ReactCrop>
            </div>
          )}
          
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => {
                setCropModalOpen(false);
                setImageSrc('');
                setCurrentMember(null);
              }}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl"
            >
              Отмена
            </button>
            <button
              onClick={handleCropComplete}
              className="px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700"
            >
              Сохранить
            </button>
          </div>
        </div>
      </Modal>

      {/* Модальное окно редактирования профиля */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setCurrentMember(null);
        }}
        title="Редактировать профиль"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Имя
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Введите имя"
              className="w-full px-4 py-3 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Дата рождения
            </label>
            <input
              type="text"
              value={editBirthDate}
              onChange={(e) => setEditBirthDate(e.target.value)}
              placeholder="ДД.ММ.ГГГГ"
              className="w-full px-4 py-3 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          
          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={() => {
                setEditModalOpen(false);
                setCurrentMember(null);
              }}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl"
            >
              Отмена
            </button>
            <button
              onClick={handleSaveMember}
              className="px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700"
            >
              Сохранить
            </button>
          </div>
        </div>
      </Modal>

      {/* Модальное окно редактирования "вместе с" */}
      <Modal
        isOpen={editTogetherModalOpen}
        onClose={() => setEditTogetherModalOpen(false)}
        title="Вместе с..."
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Год или дата начала отношений
            </label>
            <input
              type="text"
              value={editTogether}
              onChange={(e) => setEditTogether(e.target.value)}
              placeholder="2021 или 14.02.2021"
              className="w-full px-4 py-3 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              💕 Можно указать просто год или точную дату
            </p>
          </div>
          
          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={() => setEditTogetherModalOpen(false)}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl"
            >
              Отмена
            </button>
            <button
              onClick={handleSaveTogether}
              className="px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700"
            >
              Сохранить
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
