import { useState, useRef, useEffect, forwardRef, ChangeEvent, FocusEvent } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronsUpDown, Search, X } from 'lucide-react';
import { clsx } from 'clsx';

// ChangeHandler type from react-hook-form
type ChangeHandler = (event: { target: { value: string; name?: string }; type?: string }) => void;

export interface SearchableSelectOption {
  value: string;
  label: string;
  description?: string;
}

export interface SearchableSelectProps {
  label?: string;
  error?: string;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  value?: string;
  defaultValue?: string;
  onChange?:
    | ((value: string) => void)
    | ((event: ChangeEvent<HTMLInputElement>) => void)
    | ChangeHandler;
  onBlur?: (() => void) | ((event: FocusEvent<HTMLInputElement>) => void) | ChangeHandler;
  onSearch?: (searchTerm: string) => void;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  emptyMessage?: string;
  /** Valor externo para definir a busca programaticamente */
  searchValue?: string;
  /** Callback para criar novo item quando não encontrado */
  onCreateNew?: () => void;
  /** Label do botão de criar novo (padrão: "Cadastrar novo") */
  createNewLabel?: string;
}

export const SearchableSelect = forwardRef<HTMLInputElement, SearchableSelectProps>(
  (
    {
      label,
      error,
      options,
      placeholder = 'Selecione...',
      searchPlaceholder = 'Buscar...',
      value,
      defaultValue,
      onChange,
      onBlur,
      onSearch,
      name,
      required,
      disabled,
      className,
      emptyMessage = 'Nenhum item encontrado',
      searchValue,
      onCreateNew,
      createNewLabel = 'Cadastrar novo',
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = useState<string>(value || defaultValue || '');
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

    const containerRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const hiddenInputRef = useRef<HTMLInputElement>(null);

    // Sync with external value
    useEffect(() => {
      if (value !== undefined) {
        setInternalValue(value);
        // Clear search query when external value changes to show the selected item clearly
        if (value) {
          setSearchQuery('');
        }
      }
    }, [value]);

    // Sync with external search value
    useEffect(() => {
      if (searchValue !== undefined && searchValue !== searchQuery) {
        setSearchQuery(searchValue);
        // Abrir o dropdown quando uma busca externa é definida
        if (searchValue && !isOpen) {
          setIsOpen(true);
        }
        // Chamar onSearch se definido
        if (onSearch) {
          onSearch(searchValue);
        }
      }
    }, [searchValue, searchQuery, isOpen, onSearch]);

    // Update dropdown position when opening
    useEffect(() => {
      if (isOpen && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + 4,
          left: rect.left,
          width: rect.width,
        });

        // Clear search query when opening dropdown to show all options
        setSearchQuery('');

        // Focus search input when opening
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 10);
      }
    }, [isOpen]);

    // Close on outside click
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          // Check if click is in portal
          const portalElement = document.getElementById('searchable-select-portal');
          if (portalElement && portalElement.contains(event.target as Node)) {
            return;
          }
          setIsOpen(false);
          setSearchQuery('');
        }
      };

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
      }
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Close on escape
    useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          setIsOpen(false);
          setSearchQuery('');
        }
      };

      if (isOpen) {
        document.addEventListener('keydown', handleKeyDown);
      }
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    const selectedOption = options.find((opt) => opt.value === internalValue);

    // Filter options based on search
    const filteredOptions = options.filter((option) => {
      const query = searchQuery.toLowerCase();
      return (
        option.label.toLowerCase().includes(query) ||
        option.description?.toLowerCase().includes(query) ||
        option.value.toLowerCase().includes(query)
      );
    });

    const handleSelect = (option: SearchableSelectOption) => {
      const newValue = option.value;
      setInternalValue(newValue);
      setIsOpen(false);
      setSearchQuery('');

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

      // Call onChange immediately with the new value
      if (onChange) {
        const syntheticEvent = {
          target: { value: newValue, name: name || '' },
          currentTarget: { value: newValue, name: name || '' },
          type: 'change',
        } as ChangeEvent<HTMLInputElement>;
        (onChange as (event: ChangeEvent<HTMLInputElement>) => void)(syntheticEvent);
      }
    };

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      handleSelect({ value: '', label: '' });
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

    const dropdownContent = (
      <div
        id="searchable-select-portal"
        className="fixed z-[9999]"
        style={{
          top: dropdownPosition.top,
          left: dropdownPosition.left,
          width: dropdownPosition.width,
        }}
      >
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
          {/* Search Input */}
          <div className="border-b border-gray-200 p-2 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                className={clsx(
                  'w-full py-2 pl-9 pr-3 text-sm',
                  'bg-gray-50 dark:bg-gray-900',
                  'rounded-lg border border-gray-200 dark:border-gray-700',
                  'text-gray-900 dark:text-white',
                  'placeholder:text-gray-400',
                  'focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500'
                )}
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (onSearch) {
                    onSearch(e.target.value);
                  }
                }}
              />
            </div>
          </div>

          {/* Options List */}
          <ul className="max-h-60 overflow-auto py-1">
            {filteredOptions.length === 0 ? (
              <li className="px-4 py-3 text-center">
                <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">{emptyMessage}</p>
                {onCreateNew && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      setSearchQuery('');
                      onCreateNew();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600/10 px-3 py-1.5 text-sm font-medium text-primary-600 transition-colors hover:bg-primary-600/20 dark:bg-primary-400/10 dark:text-primary-400 dark:hover:bg-primary-400/20"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    {createNewLabel}
                  </button>
                )}
              </li>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = option.value === internalValue;
                return (
                  <li
                    key={option.value}
                    className={clsx(
                      'relative cursor-pointer select-none py-1.5 pl-8 pr-3',
                      'hover:bg-gray-100 dark:hover:bg-gray-700',
                      isSelected && 'bg-gray-100 dark:bg-gray-700/50'
                    )}
                    onClick={() => handleSelect(option)}
                  >
                    <div className="flex flex-col">
                      <span
                        className={clsx(
                          'block truncate text-sm',
                          isSelected
                            ? 'font-semibold text-gray-900 dark:text-white'
                            : 'text-gray-900 dark:text-white'
                        )}
                      >
                        {option.label}
                      </span>
                      {option.description && (
                        <span className="truncate text-xs text-gray-500 dark:text-gray-400">
                          {option.description}
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <span className="absolute inset-y-0 left-0 flex items-center pl-2">
                        <Check className="h-4 w-4 text-primary-500" />
                      </span>
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </div>
    );

    return (
      <div ref={containerRef} className={clsx('relative', className)}>
        {/* Hidden input for form compatibility */}
        <input
          type="hidden"
          ref={setRefs}
          name={name}
          value={internalValue}
          onBlur={() => {
            if (onBlur) {
              const syntheticEvent = {
                target: { value: internalValue, name: name || '' },
                type: 'blur',
              };
              (onBlur as ChangeHandler)(syntheticEvent);
            }
          }}
        />

        {label && (
          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
            {label}
            {required && <span className="ml-1 text-red-500">*</span>}
          </label>
        )}

        <button
          ref={buttonRef}
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={clsx(
            'relative w-full cursor-pointer rounded-xl py-1.5 pl-3 pr-10 text-left text-sm',
            'bg-gray-50 dark:bg-gray-900',
            'border transition-colors duration-200',
            error ? 'border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-gray-700',
            !disabled && 'hover:border-gray-300 dark:hover:border-gray-600',
            'focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500',
            disabled && 'cursor-not-allowed opacity-50'
          )}
        >
          <span
            className={clsx(
              'block truncate',
              selectedOption ? 'text-gray-900 dark:text-white' : 'text-gray-400'
            )}
          >
            {selectedOption?.label || placeholder}
          </span>

          <span className="absolute inset-y-0 right-0 flex items-center gap-1 pr-3">
            <ChevronsUpDown className="h-5 w-5 text-gray-400" />
          </span>
        </button>

        {internalValue && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-8 top-1/2 z-10 translate-y-[-10%] rounded-full p-1 hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        )}

        {error && <p className="mt-1.5 text-sm text-red-500">{error}</p>}

        {/* Dropdown via Portal */}
        {isOpen && createPortal(dropdownContent, document.body)}
      </div>
    );
  }
);

SearchableSelect.displayName = 'SearchableSelect';
