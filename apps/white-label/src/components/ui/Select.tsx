import { Fragment, useState, useEffect, forwardRef, useRef, ChangeEvent } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { clsx } from 'clsx';

// ChangeHandler type from react-hook-form
type ChangeHandler = (event: { target: { value: string; name?: string }; type?: string }) => void;

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface SelectProps {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onChange?:
    | ((value: string) => void)
    | ((event: ChangeEvent<HTMLInputElement>) => void)
    | ChangeHandler;
  onBlur?: (() => void) | ((event: React.FocusEvent<HTMLInputElement>) => void) | ChangeHandler;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export const Select = forwardRef<HTMLInputElement, SelectProps>(
  (
    {
      label,
      error,
      options,
      placeholder = 'Selecione...',
      value,
      defaultValue,
      onChange,
      onBlur,
      name,
      required,
      disabled,
      className,
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = useState<string>(value || defaultValue || '');
    const hiddenInputRef = useRef<HTMLInputElement>(null);

    // Sync with external value (controlled mode)
    useEffect(() => {
      if (value !== undefined) {
        setInternalValue(value);
      }
    }, [value]);

    // Sync with defaultValue changes (for react-hook-form reset)
    useEffect(() => {
      if (defaultValue !== undefined) {
        setInternalValue(defaultValue);
      }
    }, [defaultValue]);

    const selectedOption = options.find((opt) => opt.value === internalValue);

    const handleChange = (option: SelectOption) => {
      const newValue = option.value;
      setInternalValue(newValue);

      // Trigger change on hidden input for react-hook-form
      if (hiddenInputRef.current) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value'
        )?.set;
        nativeInputValueSetter?.call(hiddenInputRef.current, newValue);

        const event = new Event('change', { bubbles: true });
        hiddenInputRef.current.dispatchEvent(event);
      }

      // Call onChange - handle both event-based (react-hook-form) and value-based callbacks
      if (onChange) {
        try {
          // First try calling as a direct value function
          (onChange as (value: string) => void)(newValue);
        } catch {
          // If that fails, try as event handler (react-hook-form style)
          const syntheticEvent = {
            target: { value: newValue, name: name || '' },
            currentTarget: { value: newValue, name: name || '' },
            type: 'change',
          } as ChangeEvent<HTMLInputElement>;

          (onChange as (event: ChangeEvent<HTMLInputElement>) => void)(syntheticEvent);
        }
      }
    };

    // Merge refs
    const setRefs = (el: HTMLInputElement | null) => {
      (hiddenInputRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
      if (typeof ref === 'function') {
        ref(el);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLInputElement | null>).current = el;
      }
    };

    return (
      <div className={clsx('w-full', className)}>
        {/* Hidden input for react-hook-form compatibility */}
        <input
          type="hidden"
          ref={setRefs}
          name={name}
          value={internalValue}
          onChange={() => {}} // Prevent React warning
        />

        {label && (
          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
            {label}
            {required && <span className="ml-1 text-red-500">*</span>}
          </label>
        )}

        <Listbox value={selectedOption || null} onChange={handleChange} disabled={disabled}>
          <div className="relative">
            <Listbox.Button
              onBlur={() => {
                if (onBlur) {
                  const syntheticEvent = {
                    target: { value: internalValue, name: name || '' },
                    type: 'blur',
                  };
                  (onBlur as ChangeHandler)(syntheticEvent);
                }
              }}
              className={clsx(
                'relative w-full cursor-pointer rounded-xl py-1.5 pl-3 pr-10 text-left text-sm',
                'bg-gray-50 dark:bg-gray-700/50',
                'border transition-all duration-200',
                error
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-gray-200 hover:border-gray-300 focus:border-primary-500 dark:border-gray-600 dark:hover:border-gray-500 dark:focus:border-primary-500',
                'focus:outline-none focus:ring-4 focus:ring-primary-500/10',
                'shadow-sm hover:shadow-md',
                disabled && 'cursor-not-allowed bg-gray-100 opacity-50 dark:bg-gray-800/70'
              )}
            >
              <span
                className={clsx(
                  'block truncate',
                  selectedOption
                    ? 'text-gray-900 dark:text-white'
                    : 'text-gray-400 dark:text-gray-500'
                )}
              >
                {selectedOption ? (
                  <span className="flex items-center gap-2">
                    {selectedOption.icon && (
                      <selectedOption.icon className="h-5 w-5 text-primary-500" />
                    )}
                    {selectedOption.label}
                  </span>
                ) : (
                  placeholder
                )}
              </span>
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <ChevronsUpDown className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </span>
            </Listbox.Button>

            <Transition
              as={Fragment}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Listbox.Options
                className={clsx(
                  'absolute z-[9999] mt-2 max-h-60 w-full overflow-auto',
                  'rounded-xl py-2',
                  'bg-white dark:bg-gray-800',
                  'border border-gray-200 dark:border-gray-700',
                  'shadow-xl shadow-black/10 dark:shadow-black/30',
                  'ring-1 ring-black/5',
                  'focus:outline-none'
                )}
              >
                {options.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    Nenhuma opção disponível
                  </div>
                ) : (
                  options.map((option) => (
                    <Listbox.Option
                      key={option.value}
                      value={option}
                      className={({ active }) =>
                        clsx(
                          'relative mx-2 cursor-pointer select-none rounded-lg py-1.5 pl-3 pr-10 text-sm',
                          'transition-colors duration-150',
                          active
                            ? 'bg-primary-50 text-primary-900 dark:bg-primary-900/20 dark:text-primary-100'
                            : 'text-gray-900 dark:text-gray-100'
                        )
                      }
                    >
                      {({ selected: isSelected, active }) => (
                        <>
                          <div className="flex items-center gap-3">
                            {option.icon && (
                              <option.icon
                                className={clsx(
                                  'h-5 w-5 flex-shrink-0',
                                  active || isSelected
                                    ? 'text-primary-500'
                                    : 'text-gray-400 dark:text-gray-500'
                                )}
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <span
                                className={clsx(
                                  'block truncate',
                                  isSelected ? 'font-semibold' : 'font-normal'
                                )}
                              >
                                {option.label}
                              </span>
                              {option.description && (
                                <span
                                  className={clsx(
                                    'mt-0.5 block truncate text-xs',
                                    active
                                      ? 'text-primary-700 dark:text-primary-300'
                                      : 'text-gray-500 dark:text-gray-400'
                                  )}
                                >
                                  {option.description}
                                </span>
                              )}
                            </div>
                          </div>

                          {isSelected && (
                            <span className="absolute inset-y-0 right-0 flex items-center pr-4">
                              <Check className="h-5 w-5 text-primary-500" aria-hidden="true" />
                            </span>
                          )}
                        </>
                      )}
                    </Listbox.Option>
                  ))
                )}
              </Listbox.Options>
            </Transition>
          </div>
        </Listbox>

        {error && <p className="mt-1.5 text-sm text-red-500">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
