// ==========================================
// АВАТАР ПОЛЬЗОВАТЕЛЯ
// ==========================================

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  email?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showOnlineStatus?: boolean;
  isOnline?: boolean;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
};

const getInitials = (name?: string | null, email?: string): string => {
  if (name) {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return '?';
};

const getColorFromString = (str: string): string => {
  const colors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-amber-500',
    'bg-yellow-500',
    'bg-lime-500',
    'bg-green-500',
    'bg-emerald-500',
    'bg-teal-500',
    'bg-cyan-500',
    'bg-sky-500',
    'bg-blue-500',
    'bg-indigo-500',
    'bg-violet-500',
    'bg-purple-500',
    'bg-fuchsia-500',
    'bg-pink-500',
    'bg-rose-500',
  ];
  
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};

export function Avatar({
  src,
  name,
  email,
  size = 'md',
  showOnlineStatus = false,
  isOnline = false,
}: AvatarProps) {
  const initials = getInitials(name, email);
  const bgColor = getColorFromString(name || email || '');

  return (
    <div className="relative inline-flex">
      {src ? (
        <img
          src={src}
          alt={name || email || 'Avatar'}
          className={`${sizeClasses[size]} rounded-full object-cover ring-2 ring-white dark:ring-slate-800`}
        />
      ) : (
        <div
          className={`
            ${sizeClasses[size]} ${bgColor}
            rounded-full flex items-center justify-center
            font-medium text-white
            ring-2 ring-white dark:ring-slate-800
          `}
        >
          {initials}
        </div>
      )}
      
      {showOnlineStatus && (
        <span
          className={`
            absolute bottom-0 right-0
            w-3 h-3 rounded-full
            ring-2 ring-white dark:ring-slate-800
            ${isOnline ? 'bg-green-500' : 'bg-gray-400'}
          `}
        >
          {isOnline && (
            <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75" />
          )}
        </span>
      )}
    </div>
  );
}
