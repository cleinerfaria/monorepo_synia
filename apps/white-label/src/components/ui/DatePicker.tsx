import { Fragment, useState, useEffect, forwardRef, ChangeEvent, FocusEvent } from 'react';
import { Popover, Listbox, Transition } from '@headlessui/react';
import { useFloating, autoUpdate, offset, shift, size, FloatingPortal } from '@floating-ui/react';
import { Calendar, ChevronLeft, ChevronRight, ChevronsUpDown } from 'lucide-react';
import { clsx } from 'clsx';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  parse,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ChangeHandler type from react-hook-form
type ChangeHandler = (event: { target: { value: string; name?: string }; type?: string }) => void;

export interface DatePickerProps {
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
  minDate?: Date;
  maxDate?: Date;
  min?: string;
  max?: string;
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
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
      placeholder = 'Selecione uma data',
      className,
      minDate,
      maxDate,
      min,
      max,
    },
    ref
  ) => {
    // Converter string min/max para Date se fornecidos
    const parsedMinDate = min ? parse(min, 'yyyy-MM-dd', new Date()) : minDate;
    const parsedMaxDate = max ? parse(max, 'yyyy-MM-dd', new Date()) : maxDate;
    const [internalValue, setInternalValue] = useState<string>(value || defaultValue || '');
    const [currentMonth, setCurrentMonth] = useState<Date>(
      internalValue ? parse(internalValue, 'yyyy-MM-dd', new Date()) : new Date()
    );

    // Floating UI para posicionamento automático
    const { refs, floatingStyles } = useFloating({
      placement: 'bottom-start',
      middleware: [
        offset(8),
        shift({ padding: 8 }),
        size({
          apply({ availableHeight, elements }) {
            Object.assign(elements.floating.style, {
              maxHeight: `${Math.min(availableHeight - 16, 400)}px`,
            });
          },
          padding: 8,
        }),
      ],
      whileElementsMounted: autoUpdate,
    });

    useEffect(() => {
      if (value !== undefined && typeof value === 'string') {
        setInternalValue(value);
        if (value && value.length > 0) {
          try {
            setCurrentMonth(parse(value, 'yyyy-MM-dd', new Date()));
          } catch (e) {
            console.error('Error parsing date:', e);
          }
        }
      }
    }, [value]);

    const selectedDate =
      internalValue && typeof internalValue === 'string' && internalValue.length > 0
        ? (() => {
            try {
              return parse(internalValue, 'yyyy-MM-dd', new Date());
            } catch (e) {
              console.error('Error parsing date:', e);
              return null;
            }
          })()
        : null;

    // Helper to call onChange with synthetic event for react-hook-form compatibility
    const triggerOnChange = (newValue: string) => {
      if (onChange) {
        const syntheticEvent = {
          target: { value: newValue, name: name || '' },
          currentTarget: { value: newValue, name: name || '' },
          type: 'change',
        };
        (onChange as ChangeHandler)(syntheticEvent);
      }
    };

    const handleDateSelect = (date: Date, close: () => void) => {
      const formatted = format(date, 'yyyy-MM-dd');
      setInternalValue(formatted);
      triggerOnChange(formatted);
      close();
    };

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      setInternalValue('');
      triggerOnChange('');
    };

    const generateCalendarDays = () => {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(monthStart);
      const startDate = startOfWeek(monthStart);
      const endDate = endOfWeek(monthEnd);

      const days: Date[] = [];
      let day = startDate;

      while (day <= endDate) {
        days.push(day);
        day = addDays(day, 1);
      }

      return days;
    };

    const isDateDisabled = (date: Date) => {
      if (parsedMinDate && date < parsedMinDate) return true;
      if (parsedMaxDate && date > parsedMaxDate) return true;
      return false;
    };

    return (
      <div className={clsx('w-full', className)}>
        <input type="hidden" ref={ref} name={name} value={internalValue} onChange={() => {}} />

        {label && (
          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
            {label}
            {required && <span className="ml-1 text-red-500">*</span>}
          </label>
        )}

        <Popover className="relative">
          {({ open, close }) => (
            <>
              <div className="relative">
                <Popover.Button
                  ref={refs.setReference}
                  disabled={disabled}
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
                    'relative w-full cursor-pointer rounded-xl py-1.5 pl-3 pr-10 text-left',
                    'bg-white dark:bg-gray-800',
                    'border transition-all duration-200',
                    error
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-gray-300 hover:border-gray-400 focus:border-primary-500 dark:border-gray-600 dark:hover:border-gray-500 dark:focus:border-primary-500',
                    'focus:outline-none focus:ring-2 focus:ring-primary-500',
                    'shadow-sm',
                    disabled && 'cursor-not-allowed bg-gray-50 opacity-50 dark:bg-gray-900'
                  )}
                >
                  <span
                    className={clsx(
                      'block truncate text-sm',
                      selectedDate
                        ? 'text-gray-900 dark:text-white'
                        : 'text-gray-400 dark:text-gray-500'
                    )}
                  >
                    {selectedDate
                      ? format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                      : placeholder}
                  </span>
                  <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <Calendar className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </span>
                </Popover.Button>
                {selectedDate && !disabled && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="absolute inset-y-0 right-8 z-10 flex items-center pr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>

              <FloatingPortal>
                {open && (
                  <Popover.Panel
                    static
                    ref={refs.setFloating}
                    style={floatingStyles}
                    className={clsx(
                      'z-[9999] w-80',
                      'rounded-2xl p-4',
                      'bg-white dark:bg-gray-800',
                      'border border-gray-200 dark:border-gray-700',
                      'shadow-xl shadow-black/10 dark:shadow-black/30',
                      'ring-1 ring-black/5',
                      'overflow-auto'
                    )}
                  >
                    {/* Calendar Header */}
                    <div className="mb-4 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                        className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                      </button>

                      <div className="flex flex-1 gap-2">
                        {/* Month Selector */}
                        <Listbox
                          value={currentMonth.getMonth()}
                          onChange={(month) => {
                            const newDate = new Date(currentMonth);
                            newDate.setMonth(month);
                            setCurrentMonth(newDate);
                          }}
                        >
                          <div className="relative flex-[3]">
                            <Listbox.Button className="relative w-full cursor-pointer rounded-lg border border-gray-200 bg-white py-1.5 pl-3 pr-8 text-left text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600">
                              <span className="block capitalize">
                                {format(new Date(2000, currentMonth.getMonth(), 1), 'MMMM', {
                                  locale: ptBR,
                                })}
                              </span>
                              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                <ChevronsUpDown className="h-4 w-4 text-gray-400" />
                              </span>
                            </Listbox.Button>
                            <Transition
                              as={Fragment}
                              leave="transition ease-in duration-100"
                              leaveFrom="opacity-100"
                              leaveTo="opacity-0"
                            >
                              <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 text-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-gray-700">
                                {Array.from({ length: 12 }, (_, i) => (
                                  <Listbox.Option
                                    key={i}
                                    value={i}
                                    className={({ active }) =>
                                      clsx(
                                        'relative cursor-pointer select-none py-2 pl-3 pr-9',
                                        active
                                          ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400'
                                          : 'text-gray-900 dark:text-white'
                                      )
                                    }
                                  >
                                    {({ selected }) => (
                                      <span
                                        className={clsx(
                                          'block capitalize',
                                          selected ? 'font-semibold' : 'font-normal'
                                        )}
                                      >
                                        {format(new Date(2000, i, 1), 'MMMM', { locale: ptBR })}
                                      </span>
                                    )}
                                  </Listbox.Option>
                                ))}
                              </Listbox.Options>
                            </Transition>
                          </div>
                        </Listbox>

                        {/* Year Selector */}
                        <Listbox
                          value={currentMonth.getFullYear()}
                          onChange={(year) => {
                            const newDate = new Date(currentMonth);
                            newDate.setFullYear(year);
                            setCurrentMonth(newDate);
                          }}
                        >
                          <div className="relative flex-1">
                            <Listbox.Button className="relative w-full cursor-pointer rounded-lg border border-gray-200 bg-white py-1.5 pl-3 pr-8 text-left text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600">
                              <span className="block">{currentMonth.getFullYear()}</span>
                              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                <ChevronsUpDown className="h-4 w-4 text-gray-400" />
                              </span>
                            </Listbox.Button>
                            <Transition
                              as={Fragment}
                              leave="transition ease-in duration-100"
                              leaveFrom="opacity-100"
                              leaveTo="opacity-0"
                            >
                              <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 text-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-gray-700">
                                {Array.from({ length: 120 }, (_, i) => {
                                  const year = new Date().getFullYear() - i;
                                  return (
                                    <Listbox.Option
                                      key={year}
                                      value={year}
                                      className={({ active }) =>
                                        clsx(
                                          'relative cursor-pointer select-none py-2 pl-3 pr-9',
                                          active
                                            ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400'
                                            : 'text-gray-900 dark:text-white'
                                        )
                                      }
                                    >
                                      {({ selected }) => (
                                        <span
                                          className={clsx(
                                            'block',
                                            selected ? 'font-semibold' : 'font-normal'
                                          )}
                                        >
                                          {year}
                                        </span>
                                      )}
                                    </Listbox.Option>
                                  );
                                })}
                              </Listbox.Options>
                            </Transition>
                          </div>
                        </Listbox>
                      </div>

                      <button
                        type="button"
                        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                        className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                      </button>
                    </div>

                    {/* Weekday Headers */}
                    <div className="mb-2 grid grid-cols-7 gap-1">
                      {WEEKDAYS.map((day) => (
                        <div
                          key={day}
                          className="py-1 text-center text-xs font-medium text-gray-500 dark:text-gray-400"
                        >
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Calendar Days */}
                    <div className="grid grid-cols-7 gap-1">
                      {generateCalendarDays().map((day, idx) => {
                        const isCurrentMonth = isSameMonth(day, currentMonth);
                        const isSelected = selectedDate && isSameDay(day, selectedDate);
                        const isTodayDate = isToday(day);
                        const isDisabled = isDateDisabled(day);

                        return (
                          <button
                            key={idx}
                            type="button"
                            disabled={isDisabled}
                            onClick={() => handleDateSelect(day, close)}
                            className={clsx(
                              'relative rounded-lg p-2 text-sm transition-all duration-150',
                              'focus:outline-none focus:ring-2 focus:ring-primary-500/50',
                              !isCurrentMonth && 'text-gray-300 dark:text-gray-600',
                              isCurrentMonth &&
                                !isSelected &&
                                !isDisabled &&
                                'text-gray-900 hover:bg-primary-50 dark:text-gray-100 dark:hover:bg-primary-900/20',
                              isSelected && 'bg-primary-500 font-semibold text-white shadow-md',
                              isTodayDate && !isSelected && 'ring-2 ring-primary-500/50',
                              isDisabled && 'cursor-not-allowed opacity-30'
                            )}
                          >
                            {format(day, 'd')}
                          </button>
                        );
                      })}
                    </div>

                    {/* Quick Actions */}
                    <div className="mt-4 flex gap-2 border-t border-gray-100 pt-4 dark:border-gray-700">
                      <button
                        type="button"
                        onClick={() => handleDateSelect(new Date(), close)}
                        className="flex-1 rounded-lg bg-primary-50 px-3 py-2 text-sm font-medium text-primary-600 transition-colors hover:bg-primary-100 dark:bg-primary-900/20 dark:text-primary-400 dark:hover:bg-primary-900/30"
                      >
                        Hoje
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleClear({ stopPropagation: () => {} } as React.MouseEvent);
                          close();
                        }}
                        className="flex-1 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600"
                      >
                        Limpar
                      </button>
                    </div>
                  </Popover.Panel>
                )}
              </FloatingPortal>
            </>
          )}
        </Popover>

        {error && <p className="mt-1.5 text-sm text-red-500">{error}</p>}
      </div>
    );
  }
);

DatePicker.displayName = 'DatePicker';
