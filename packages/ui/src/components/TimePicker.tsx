import { Fragment, useState, useEffect, forwardRef, ChangeEvent, FocusEvent } from 'react';
import { Popover, Transition, Listbox } from '@headlessui/react';
import { useFloating, autoUpdate, offset, shift, size, FloatingPortal } from '@floating-ui/react';
import { clsx } from 'clsx';
import { Clock, ChevronUp, ChevronDown } from 'lucide-react';
type ChangeHandler = (event: { target: { value: string; name?: string }; type?: string }) => void;

export interface TimePickerProps {
  label?: string;
  error?: string;
  value?: string;
  defaultValue?: string;
  onChange?:
    | ((value: string) => void)
    | ((event: ChangeEvent<HTMLInputElement>) => void)
    | ChangeHandler;
  onBlur?: (() => void) | ((event: FocusEvent<HTMLInputElement>) => void) | ChangeHandler;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

// Generate hours (0-23)
const generateHours = () => Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));

// Generate minutes (0-59, step 1)
const generateMinutes = () => Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

export const TimePicker = forwardRef<HTMLInputElement, TimePickerProps>(
  (
    {
      label,
      error,
      value,
      defaultValue,
      onChange,
      onBlur,
      name,
      required,
      disabled,
      placeholder = 'HH:MM',
      className,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [displayValue, setDisplayValue] = useState(value || defaultValue || '');
    const [hours, setHours] = useState(value ? value.split(':')[0] : '00');
    const [minutes, setMinutes] = useState(value ? value.split(':')[1] : '00');

    const { refs, floatingStyles } = useFloating({
      open: isOpen,
      onOpenChange: setIsOpen,
      middleware: [
        offset(8),
        shift({ padding: 8 }),
        size({
          apply({ elements }) {
            Object.assign(elements.floating.style, {
              width: 'auto',
            });
          },
        }),
      ],
      whileElementsMounted: autoUpdate,
    });

    useEffect(() => {
      if (value) {
        const [h, m] = value.split(':');
        setHours(h || '00');
        setMinutes(m || '00');
        setDisplayValue(value);
      }
    }, [value]);

    const handleTimeChange = (newHours: string, newMinutes: string) => {
      const newTime = `${newHours}:${newMinutes}`;
      setHours(newHours);
      setMinutes(newMinutes);
      setDisplayValue(newTime);

      if (onChange) {
        if (typeof onChange === 'function') {
          const target = { target: { value: newTime, name } };
          onChange(target as any);
        }
      }
    };

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
      let val = e.target.value;

      // Remove caracteres que não são números
      val = val.replace(/[^\d]/g, '');

      // Aplica máscara HH:MM
      if (val.length >= 2) {
        val = val.substring(0, 2) + ':' + val.substring(2, 4);
      }

      // Limita a 5 caracteres (HH:MM)
      val = val.substring(0, 5);

      setDisplayValue(val);

      // Validar formato de hora completo (HH:MM)
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5]?[0-9])$/;
      if (timeRegex.test(val) && val.length === 5) {
        const [newHours, newMinutes] = val.split(':');
        // Validar se as horas são válidas (00-23)
        const hourNum = parseInt(newHours);
        const minuteNum = parseInt(newMinutes);

        if (hourNum >= 0 && hourNum <= 23 && minuteNum >= 0 && minuteNum <= 59) {
          setHours(newHours.padStart(2, '0'));
          setMinutes(newMinutes.padStart(2, '0'));
        }
      }

      if (onChange) {
        const changeHandler = onChange as (event: ChangeEvent<HTMLInputElement>) => void;
        const syntheticEvent = {
          ...e,
          target: { ...e.target, value: val },
        };
        changeHandler(syntheticEvent);
      }
    };

    const handleBlur = () => {
      if (onBlur) {
        // Criar evento sintético para react-hook-form
        const syntheticEvent = {
          target: { value: displayValue, name: name || '' },
          type: 'blur',
        };
        (onBlur as ChangeHandler)(syntheticEvent);
      }
    };

    return (
      <div className={clsx('w-full', className)}>
        {label && (
          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
            {label}
            {required && <span className="ml-1 text-red-500">*</span>}
          </label>
        )}
        <Popover as="div" className="relative">
          {({ open: _open }) => (
            <>
              <div ref={refs.setReference} className="relative">
                <input
                  type="text"
                  disabled={disabled}
                  value={displayValue}
                  placeholder={placeholder}
                  maxLength={5}
                  onChange={handleInputChange}
                  onBlur={() => {
                    handleBlur();
                  }}
                  onKeyDown={(e) => {
                    // Permite apenas números, backspace, delete, tab, enter e setas
                    const allowedKeys = [
                      'Backspace',
                      'Delete',
                      'Tab',
                      'Enter',
                      'ArrowLeft',
                      'ArrowRight',
                      'ArrowUp',
                      'ArrowDown',
                    ];
                    const isNumber = /^[0-9]$/.test(e.key);

                    if (!allowedKeys.includes(e.key) && !isNumber) {
                      e.preventDefault();
                    }

                    // Impede digitar mais que 4 números
                    if (isNumber && displayValue.replace(/[^\d]/g, '').length >= 4) {
                      e.preventDefault();
                    }
                  }}
                  className={clsx(
                    'relative w-full rounded-xl border border-gray-300 bg-white px-3 py-1.5 pr-10 text-left text-sm outline-none transition-colors',
                    'dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100',
                    'focus-visible:ring-primary-500/10 focus-visible:ring-2 focus-visible:ring-offset-0',
                    'dark:focus-visible:ring-primary-500/10',
                    'hover:border-primary-500 dark:hover:border-primary-500',
                    disabled &&
                      'cursor-not-allowed bg-gray-50 text-gray-500 dark:bg-gray-900 dark:text-gray-400',
                    error && 'border-red-500 dark:border-red-500'
                  )}
                />
                <button
                  type="button"
                  disabled={disabled}
                  tabIndex={-1}
                  onClick={() => {
                    setIsOpen(!isOpen);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Clock className="h-5 w-5 text-gray-400 dark:text-gray-400" />
                </button>
              </div>

              <FloatingPortal>
                <div
                  ref={refs.setFloating}
                  style={floatingStyles}
                  className={clsx(
                    'z-50 rounded-xl border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800',
                    !isOpen && 'hidden'
                  )}
                >
                  <div className="flex gap-3">
                    {/* Hours Column */}
                    <div className="flex flex-col items-center">
                      <label className="mb-1 text-xs font-semibold text-gray-600 dark:text-gray-400">
                        Horas
                      </label>
                      <Listbox value={hours} onChange={(val) => handleTimeChange(val, minutes)}>
                        <div className="relative">
                          <Listbox.Button className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                            <span className="block text-center font-mono text-lg font-semibold">
                              {hours}
                            </span>
                          </Listbox.Button>
                          <Transition
                            as={Fragment}
                            leave="transition ease-in duration-100"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0"
                          >
                            <Listbox.Options className="absolute top-full z-10 mt-1 max-h-48 w-16 overflow-y-auto rounded border border-gray-300 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-700">
                              {generateHours().map((hour) => (
                                <Listbox.Option
                                  key={hour}
                                  value={hour}
                                  className={({ active }) =>
                                    clsx(
                                      'cursor-pointer select-none px-3 py-2 text-center font-mono text-sm',
                                      active && 'bg-primary-500 dark:bg-primary-600 text-white',
                                      !active && 'text-gray-900 dark:text-gray-100'
                                    )
                                  }
                                >
                                  {hour}
                                </Listbox.Option>
                              ))}
                            </Listbox.Options>
                          </Transition>
                        </div>
                      </Listbox>
                      <div className="mt-1.5 flex gap-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            const newHour = String((parseInt(hours) + 1) % 24).padStart(2, '0');
                            handleTimeChange(newHour, minutes);
                          }}
                          className="rounded-md p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <ChevronUp className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const newHour = String((parseInt(hours) - 1 + 24) % 24).padStart(
                              2,
                              '0'
                            );
                            handleTimeChange(newHour, minutes);
                          }}
                          className="rounded-md p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-6 text-xl font-bold text-gray-400 dark:text-gray-600">:</div>

                    {/* Minutes Column */}
                    <div className="flex flex-col items-center">
                      <label className="mb-1 text-xs font-semibold text-gray-600 dark:text-gray-400">
                        Min
                      </label>
                      <Listbox value={minutes} onChange={(val) => handleTimeChange(hours, val)}>
                        <div className="relative">
                          <Listbox.Button className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                            <span className="block text-center font-mono text-lg font-semibold">
                              {minutes}
                            </span>
                          </Listbox.Button>
                          <Transition
                            as={Fragment}
                            leave="transition ease-in duration-100"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0"
                          >
                            <Listbox.Options className="absolute top-full z-10 mt-1 max-h-48 w-16 overflow-y-auto rounded border border-gray-300 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-700">
                              {generateMinutes().map((minute) => (
                                <Listbox.Option
                                  key={minute}
                                  value={minute}
                                  className={({ active }) =>
                                    clsx(
                                      'cursor-pointer select-none px-3 py-2 text-center font-mono text-sm',
                                      active && 'bg-primary-500 dark:bg-primary-600 text-white',
                                      !active && 'text-gray-900 dark:text-gray-100'
                                    )
                                  }
                                >
                                  {minute}
                                </Listbox.Option>
                              ))}
                            </Listbox.Options>
                          </Transition>
                        </div>
                      </Listbox>
                      <div className="mt-1.5 flex gap-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            const newMinute = String((parseInt(minutes) + 1) % 60).padStart(2, '0');
                            handleTimeChange(hours, newMinute);
                          }}
                          className="rounded-md p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <ChevronUp className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const newMinute = String((parseInt(minutes) - 1 + 60) % 60).padStart(
                              2,
                              '0'
                            );
                            handleTimeChange(hours, newMinute);
                          }}
                          className="rounded-md p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="bg-primary-500/90 hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-700 mt-3 w-28 rounded-xl py-1.5 text-sm font-semibold text-white transition-colors"
                  >
                    Confirmar
                  </button>
                </div>
              </FloatingPortal>
            </>
          )}
        </Popover>

        {error && <p className="mt-1.5 text-sm text-red-500">{error}</p>}

        <input
          ref={ref}
          type="hidden"
          name={name}
          value={displayValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
        />
      </div>
    );
  }
);

TimePicker.displayName = 'TimePicker';
