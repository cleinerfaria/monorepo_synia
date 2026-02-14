import { forwardRef, useState, useEffect, useRef, useCallback } from 'react';
import { clsx } from 'clsx';

interface RadioOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface RadioGroupProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  options: RadioOption[];
  error?: string;
  required?: boolean;
  /** Estilo visual: 'default' para radio tradicional, 'cards' para cards clicáveis */
  variant?: 'default' | 'cards';
}

export const RadioGroup = forwardRef<HTMLInputElement, RadioGroupProps>(
  (
    {
      label,
      options,
      error,
      required,
      className,
      name,
      onChange,
      value,
      variant = 'cards',
      ...props
    },
    ref
  ) => {
    const [selectedValue, setSelectedValue] = useState<string>(
      (value as string) || options[0]?.value || ''
    );
    const hiddenInputRef = useRef<HTMLInputElement>(null);

    // Combine refs
    const setRefs = useCallback(
      (node: HTMLInputElement | null) => {
        (hiddenInputRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
        }
      },
      [ref]
    );

    // Sync with external value
    useEffect(() => {
      if (value !== undefined && value !== selectedValue) {
        setSelectedValue(value as string);
      }
    }, [value, selectedValue]);

    const handleSelect = (optionValue: string) => {
      setSelectedValue(optionValue);

      // Update hidden input
      if (hiddenInputRef.current) {
        hiddenInputRef.current.value = optionValue;
      }

      // Call onChange with synthetic event
      if (onChange) {
        const syntheticEvent = {
          target: {
            name,
            value: optionValue,
            type: 'radio',
          },
          type: 'change',
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        onChange(syntheticEvent);
      }
    };

    return (
      <div className={clsx('space-y-1', className)}>
        {label && (
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
            {label}
            {required && <span className="ml-1 text-red-500">*</span>}
          </label>
        )}

        {/* Hidden input for react-hook-form */}
        <input ref={setRefs} type="hidden" name={name} value={selectedValue} {...props} />

        {variant === 'cards' ? (
          <div className="flex items-center gap-2">
            {options.map((option) => {
              const isSelected = selectedValue === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={clsx(
                    'relative flex cursor-pointer items-center justify-center rounded-lg px-3 py-1.5 transition-all duration-200',
                    'border text-xs font-medium',
                    isSelected
                      ? 'border-primary-500 bg-primary-500 dark:border-primary-500 dark:bg-primary-600 text-white shadow-sm dark:text-white'
                      : 'hover:border-primary-300 hover:bg-primary-50 dark:hover:border-primary-500 dark:hover:bg-primary-900/20 border-gray-200 bg-white text-gray-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400'
                  )}
                >
                  {option.icon && <span className="mr-2">{option.icon}</span>}
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center gap-4">
            {options.map((option) => {
              const isSelected = selectedValue === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className="group flex cursor-pointer items-center gap-1.5"
                >
                  <div
                    className={clsx(
                      'flex h-4 w-4 items-center justify-center rounded-full border transition-all duration-200',
                      isSelected
                        ? 'border-primary-500 bg-primary-500'
                        : 'group-hover:border-primary-300 dark:group-hover:border-primary-500 border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-700'
                    )}
                  >
                    {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </div>
                  <span
                    className={clsx(
                      'text-xs transition-colors',
                      isSelected
                        ? 'text-primary-600 dark:text-primary-400 font-medium'
                        : 'text-gray-600 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-gray-200'
                    )}
                  >
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);

RadioGroup.displayName = 'RadioGroup';
