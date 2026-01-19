// ==========================================
// ВЫПАДАЮЩИЙ СПИСОК
// ==========================================

import { Fragment } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/24/outline';

interface SelectOption {
  value: string | number | null;
  label: string;
}

interface SelectProps {
  value: string | number | null;
  onChange: (value: string | number | null) => void;
  options: SelectOption[];
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function Select({
  value,
  onChange,
  options,
  label,
  placeholder = 'Выберите...',
  disabled = false,
}: SelectProps) {
  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {label}
        </label>
      )}
      <Listbox value={value} onChange={onChange} disabled={disabled}>
        <div className="relative">
          <Listbox.Button
            className={`
              relative w-full py-2.5 pl-4 pr-10 text-left
              bg-white dark:bg-slate-800
              border border-gray-200 dark:border-slate-700
              rounded-xl
              focus:outline-none focus:ring-2 focus:ring-primary-500
              transition-all duration-200
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <span className={`block truncate ${!selectedOption ? 'text-gray-400' : 'text-gray-900 dark:text-white'}`}>
              {selectedOption?.label || placeholder}
            </span>
            <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <ChevronUpDownIcon className="w-5 h-5 text-gray-400" />
            </span>
          </Listbox.Button>

          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options
              className={`
                absolute z-10 w-full mt-1 py-1
                bg-white dark:bg-slate-800
                border border-gray-200 dark:border-slate-700
                rounded-xl shadow-lg
                max-h-60 overflow-auto
                focus:outline-none
              `}
            >
              {options.map((option) => (
                <Listbox.Option
                  key={String(option.value)}
                  value={option.value}
                  className={({ active }) => `
                    relative cursor-pointer select-none py-2.5 pl-10 pr-4
                    ${active
                      ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-900 dark:text-primary-100'
                      : 'text-gray-900 dark:text-white'
                    }
                  `}
                >
                  {({ selected }) => (
                    <>
                      <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                        {option.label}
                      </span>
                      {selected && (
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary-600 dark:text-primary-400">
                          <CheckIcon className="w-5 h-5" />
                        </span>
                      )}
                    </>
                  )}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>
    </div>
  );
}
