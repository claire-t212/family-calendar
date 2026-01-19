// ==========================================
// ПЕРЕКЛЮЧАТЕЛЬ (TOGGLE)
// ==========================================

import { Switch } from '@headlessui/react';

interface ToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}

export function Toggle({
  enabled,
  onChange,
  label,
  description,
  disabled = false,
}: ToggleProps) {
  return (
    <Switch.Group>
      <div className="flex items-center justify-between">
        {(label || description) && (
          <div className="flex-1 mr-4">
            {label && (
              <Switch.Label className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer">
                {label}
              </Switch.Label>
            )}
            {description && (
              <Switch.Description className="text-sm text-gray-500 dark:text-gray-400">
                {description}
              </Switch.Description>
            )}
          </div>
        )}
        <Switch
          checked={enabled}
          onChange={onChange}
          disabled={disabled}
          className={`
            relative inline-flex h-6 w-11 items-center rounded-full
            transition-colors duration-200 ease-in-out
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
            dark:focus:ring-offset-slate-900
            ${enabled ? 'bg-primary-500' : 'bg-gray-200 dark:bg-slate-600'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <span
            className={`
              inline-block h-4 w-4 transform rounded-full bg-white shadow-sm
              transition-transform duration-200 ease-in-out
              ${enabled ? 'translate-x-6' : 'translate-x-1'}
            `}
          />
        </Switch>
      </div>
    </Switch.Group>
  );
}
