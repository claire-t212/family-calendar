// ==========================================
// ВЫБОР ЦВЕТА
// ==========================================

import { motion } from 'framer-motion';
import { CheckIcon } from '@heroicons/react/24/solid';
import { EVENT_COLORS } from '../../lib/constants';
import type { EventColor } from '../../types';

interface ColorPickerProps {
  value: EventColor;
  onChange: (color: EventColor) => void;
  label?: string;
}

export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
        </label>
      )}
      <div className="flex flex-wrap gap-2">
        {EVENT_COLORS.map((color) => (
          <motion.button
            key={color.value}
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={() => onChange(color.value)}
            className={`
              w-8 h-8 rounded-full flex items-center justify-center
              transition-all duration-200
              ${color.class}
              ${value === color.value
                ? 'ring-2 ring-offset-2 ring-gray-900 dark:ring-white dark:ring-offset-slate-900'
                : 'hover:scale-110'
              }
            `}
            title={color.label}
          >
            {value === color.value && (
              <CheckIcon className="w-4 h-4 text-white" />
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
