import { useState, useRef, useEffect, forwardRef, ChangeEvent, FocusEvent } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronsUpDown, Search, X, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

// ChangeHandler type from react-hook-form
type ChangeHandler = (event: { target: { value: string; name?: string }; type?: string }) => void;

export interface MultiSelectOption {
  value: string;
  label: string;
  description?: string;
}

export interface MultiSelectProps {
  label?: string;
  error?: string;
  options: MultiSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  value?: string[];
  defaultValue?: string[];
  onChange?:
    | ((value: string[]) => void)
    | ((event: ChangeEvent<HTMLInputElement>) => void)
    | ChangeHandler;
  onBlur?: (() => void) | ((event: FocusEvent<HTMLInputElement>) => void) | ChangeHandler;
  onSearch?: (searchTerm: string) => void;
  onApply?: () => void;
  onCancel?: () => void;
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
  /** Máximo de itens selecionáveis */
  maxSelected?: number;
  /** Mostrar badges dos itens selecionados no input */
  showSelectedAsBadges?: boolean;
  /** Callback para carregar mais itens (infinite scroll) */
  onLoadMore?: () => void;
  /** Indica se há mais itens para carregar */
  hasMore?: boolean;
  /** Indica se está carregando mais itens */
  isLoadingMore?: boolean;
}

function MultiSelectComponent(props: MultiSelectProps & { ref?: React.Ref<HTMLInputElement> }) {
  const {
    label,
    error,
    options,
    placeholder = 'Selecione...',
    searchPlaceholder = 'Buscar...',
    value = [],
    defaultValue = [],
    onChange,
    onBlur,
    onSearch,
    onApply,
    onCancel,
    name,
    required,
    disabled,
    className,
    emptyMessage = 'Nenhum item encontrado',
    searchValue,
    onCreateNew,
    createNewLabel = 'Cadastrar novo',
    maxSelected,
    showSelectedAsBadges = true,
    onLoadMore,
    hasMore = false,
    isLoadingMore = false,
    ref,
  } = props;
  const [internalValue, setInternalValue] = useState<string[]>(() => {
    const initial = value || defaultValue || [];
    return Array.isArray(initial) ? initial : [];
  });
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const loadMoreRef = useRef<HTMLLIElement>(null);

  // Infinite scroll: observer para carregar mais itens
  useEffect(() => {
    if (!isOpen || !hasMore || !onLoadMore || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    const currentLoadMoreRef = loadMoreRef.current;
    if (currentLoadMoreRef) {
      observer.observe(currentLoadMoreRef);
    }

    return () => {
      if (currentLoadMoreRef) {
        observer.unobserve(currentLoadMoreRef);
      }
    };
  }, [isOpen, hasMore, onLoadMore, isLoadingMore]);

  // Sync with external value
  useEffect(() => {
    if (value !== undefined) {
      const safeValue = Array.isArray(value) ? value : [];
      setInternalValue(safeValue);
      // Clear search query when external value changes
      if (safeValue.length > 0) {
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
        const portalElement = document.getElementById('multi-select-portal');
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

  const selectedOptions = options.filter(
    (opt) => Array.isArray(internalValue) && internalValue.includes(opt.value)
  );

  // Filter options based on search
  const filteredOptions = options.filter((option) => {
    const query = searchQuery.toLowerCase();
    return (
      option.label.toLowerCase().includes(query) ||
      option.description?.toLowerCase().includes(query) ||
      option.value.toLowerCase().includes(query)
    );
  });

  const handleSelect = (option: MultiSelectOption) => {
    const currentValue = Array.isArray(internalValue) ? internalValue : [];
    const newValue = [...currentValue];
    const index = newValue.indexOf(option.value);

    if (index > -1) {
      // Remove if already selected
      newValue.splice(index, 1);
    } else {
      // Add if not selected (check max limit)
      if (!maxSelected || newValue.length < maxSelected) {
        newValue.push(option.value);
      }
    }

    setInternalValue(newValue);

    // Trigger change on hidden input for react-hook-form
    if (hiddenInputRef.current) {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set;
      nativeInputValueSetter?.call(hiddenInputRef.current, newValue.join(','));

      const event = new Event('change', { bubbles: true });
      hiddenInputRef.current.dispatchEvent(event);
    }

    // Call onChange immediately with the new value
    if (onChange) {
      try {
        // First try to call it as a direct array function
        (onChange as (value: string[]) => void)(newValue);
      } catch {
        // If that fails, try as event handler
        const syntheticEvent = {
          target: { value: newValue.join(','), name: name || '' },
          currentTarget: { value: newValue.join(','), name: name || '' },
          type: 'change',
        } as ChangeEvent<HTMLInputElement>;
        (onChange as (event: ChangeEvent<HTMLInputElement>) => void)(syntheticEvent);
      }
    }
  };

  const handleRemove = (valueToRemove: string, _e: React.MouseEvent) => {
    _e.stopPropagation();
    const currentValue = Array.isArray(internalValue) ? internalValue : [];
    const newValue = currentValue.filter((v) => v !== valueToRemove);
    setInternalValue(newValue);

    // Trigger change
    if (onChange) {
      try {
        (onChange as (value: string[]) => void)(newValue);
      } catch {
        const syntheticEvent = {
          target: { value: newValue.join(','), name: name || '' },
          type: 'change',
        } as ChangeEvent<HTMLInputElement>;
        (onChange as (event: ChangeEvent<HTMLInputElement>) => void)(syntheticEvent);
      }
    }
  };

  const handleClearAll = (_e: React.MouseEvent) => {
    _e.stopPropagation();
    setInternalValue([]);
    if (onChange) {
      try {
        (onChange as (value: string[]) => void)([]);
      } catch (
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _e
      ) {
        const syntheticEvent = {
          target: { value: '', name: name || '' },
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

  const dropdownContent = (
    <div
      id="multi-select-portal"
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
        <ul ref={listRef} className="max-h-60 overflow-auto py-1">
          {filteredOptions.length === 0 && !isLoadingMore ? (
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
            <>
              {filteredOptions.map((option) => {
                const isSelected =
                  Array.isArray(internalValue) && internalValue.includes(option.value);
                const isDisabled =
                  maxSelected &&
                  !isSelected &&
                  Array.isArray(internalValue) &&
                  internalValue.length >= maxSelected;
                return (
                  <li
                    key={option.value}
                    className={clsx(
                      'relative cursor-pointer select-none py-1.5 pl-8 pr-3',
                      isDisabled
                        ? 'cursor-not-allowed opacity-50'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700',
                      isSelected && 'bg-gray-100 dark:bg-gray-700/50'
                    )}
                    onClick={() => !isDisabled && handleSelect(option)}
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
              })}
              {/* Load More Trigger */}
              {(hasMore || isLoadingMore) && (
                <li ref={loadMoreRef} className="px-4 py-2 text-center">
                  {isLoadingMore ? (
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Carregando...</span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">Role para carregar mais</span>
                  )}
                </li>
              )}
            </>
          )}
        </ul>

        {/* Selected Count Footer */}
        {Array.isArray(internalValue) && internalValue.length > 0 && (
          <div className="border-t border-gray-200 px-4 py-2 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
            {internalValue.length} selecionado{internalValue.length !== 1 ? 's' : ''}
            {maxSelected && ` de ${maxSelected} máximo`}
          </div>
        )}

        {/* Apply/Cancel Buttons */}
        <div className="border-t border-gray-200 p-3 dark:border-gray-700">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                if (onApply) {
                  onApply();
                }
                setIsOpen(false);
                setSearchQuery('');
              }}
              className="flex-1 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            >
              Aplicar
            </button>
            {onCancel && (
              <button
                type="button"
                onClick={() => {
                  onCancel();
                  setIsOpen(false);
                  setSearchQuery('');
                }}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 dark:focus:ring-offset-gray-800"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
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
        value={internalValue.join(',')}
        onBlur={() => {
          if (onBlur) {
            const syntheticEvent = {
              target: { value: internalValue.join(','), name: name || '' },
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
        <div className="flex min-h-[20px] flex-wrap items-center gap-1">
          {showSelectedAsBadges && Array.isArray(internalValue) && internalValue.length > 0 ? (
            <>
              {selectedOptions.slice(0, 3).map((option) => (
                <span
                  key={option.value}
                  className="inline-flex items-center gap-1 rounded-md bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-800 dark:bg-primary-900/30 dark:text-primary-300"
                >
                  {option.label}
                  <span
                    onClick={(e) => handleRemove(option.value, e)}
                    className="cursor-pointer hover:text-primary-600 dark:hover:text-primary-200"
                  >
                    <X className="h-3 w-3" />
                  </span>
                </span>
              ))}
              {Array.isArray(internalValue) && internalValue.length > 3 && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  +{internalValue.length - 3} mais
                </span>
              )}
            </>
          ) : (
            <span
              className={clsx(
                'block truncate',
                selectedOptions.length > 0 ? 'text-gray-900 dark:text-white' : 'text-gray-400'
              )}
            >
              {selectedOptions.length > 0
                ? `${selectedOptions.length} selecionado${selectedOptions.length !== 1 ? 's' : ''}`
                : placeholder}
            </span>
          )}
        </div>

        <span className="absolute inset-y-0 right-0 flex items-center gap-1 pr-3">
          <ChevronsUpDown className="h-5 w-5 text-gray-400" />
        </span>
      </button>

      {Array.isArray(internalValue) && internalValue.length > 0 && !disabled && (
        <button
          type="button"
          onClick={handleClearAll}
          className="absolute right-8 top-1/2 z-10 translate-y-[-50%] rounded-full p-1 hover:bg-gray-200 dark:hover:bg-gray-700"
          style={{ marginTop: label ? '10px' : '0' }}
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

const MultiSelectWithRef = forwardRef<HTMLInputElement, MultiSelectProps>((props, ref) => (
  <MultiSelectComponent {...props} ref={ref} />
));

MultiSelectWithRef.displayName = 'MultiSelect';

export const MultiSelect = MultiSelectWithRef;
