import { useState, useRef, useEffect, forwardRef, ChangeEvent, FocusEvent, Ref } from 'react'
import { createPortal } from 'react-dom'
import { clsx } from 'clsx'
import { Check, ChevronsUpDown, X } from 'lucide-react'
// ChangeHandler type from react-hook-form
type ChangeHandler = (event: { target: { value: string; name?: string }; type?: string }) => void

export interface SelectOption {
  value: string
  label: string
  description?: string
}

export interface SelectProps {
  label?: string
  error?: string
  options: SelectOption[]
  placeholder?: string
  searchPlaceholder?: string
  value?: string
  defaultValue?: string
  onChange?:
    | ((value: string) => void)
    | ((event: ChangeEvent<HTMLInputElement>) => void)
    | ChangeHandler
  onBlur?: (() => void) | ((event: FocusEvent<HTMLInputElement>) => void) | ChangeHandler
  onSearch?: (searchTerm: string) => void
  name?: string
  required?: boolean
  disabled?: boolean
  className?: string
  emptyMessage?: string
  /** Valor externo para definir a busca programaticamente */
  searchValue?: string
  /** Callback para criar novo item quando não encontrado */
  onCreateNew?: () => void
  /** Label do botão de criar novo (padrão: "Cadastrar novo") */
  createNewLabel?: string
  /** Estado de carregamento */
  isLoading?: boolean
  /** Ref opcional para o input visível (campo de busca) */
  searchInputRef?: Ref<HTMLInputElement>
}

export const Select = forwardRef<HTMLInputElement, SelectProps>(
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
      isLoading = false,
      searchInputRef: externalSearchInputRef,
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = useState<string>(value || defaultValue || '')
    const [isOpen, setIsOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
    const [focusedIndex, setFocusedIndex] = useState<number | null>(null)

    const containerRef = useRef<HTMLDivElement>(null)
    const searchInputRef = useRef<HTMLInputElement>(null)
    const hiddenInputRef = useRef<HTMLInputElement>(null)

    // Sync with external value
    useEffect(() => {
      if (value !== undefined) {
        setInternalValue(value)
        // Clear search query when external value changes to show the selected item clearly
        if (value) {
          setSearchQuery('')
        }
      }
    }, [value])

    // Sync with external search value
    useEffect(() => {
      if (searchValue !== undefined && searchValue !== searchQuery) {
        setSearchQuery(searchValue)
        // Abrir o dropdown quando uma busca externa é definida
        if (searchValue && !isOpen) {
          setIsOpen(true)
        }
        // Chamar onSearch se definido
        if (onSearch) {
          onSearch(searchValue)
        }
      }
    }, [searchValue, searchQuery, isOpen, onSearch])

    // Update dropdown position when opening
    useEffect(() => {
      if (isOpen && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        // Encontra o input dentro do container
        const input = containerRef.current.querySelector(
          'input:not([type="hidden"])'
        ) as HTMLInputElement
        const inputRect = input?.getBoundingClientRect()

        setDropdownPosition({
          top: (inputRect?.bottom || rect.bottom) + 4,
          left: rect.left,
          width: rect.width,
        })

        // Focus search input when opening
        setTimeout(() => {
          searchInputRef.current?.focus()
        }, 10)
      }
    }, [isOpen])

    // Close on outside click
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          // Check if click is in portal
          const portalElement = document.getElementById('searchable-select-portal')
          if (portalElement && portalElement.contains(event.target as Node)) {
            return
          }
          setIsOpen(false)
          setSearchQuery('')
        }
      }

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside)
      }
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isOpen])

    // Handle keyboard events (escape, tab, arrows)
    useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          setIsOpen(false)
          setSearchQuery('')
          setFocusedIndex(null)
          searchInputRef.current?.focus()
        }
      }

      if (isOpen) {
        document.addEventListener('keydown', handleKeyDown)
      }
      return () => document.removeEventListener('keydown', handleKeyDown)
    }, [isOpen])

    const selectedOption = options.find((opt) => opt.value === internalValue)

    // Filter options based on search
    // When onSearch is provided, the backend already filters, so skip local filtering
    const filteredOptions = onSearch
      ? options
      : options.filter((option) => {
          const query = searchQuery.toLowerCase()
          return (
            option.label.toLowerCase().includes(query) ||
            option.description?.toLowerCase().includes(query) ||
            option.value.toLowerCase().includes(query)
          )
        })

    const handleSelect = (option: SelectOption) => {
      const newValue = option.value
      setInternalValue(newValue)
      setIsOpen(false)
      setSearchQuery('')
      setFocusedIndex(null)
      searchInputRef.current?.focus()

      // Trigger change on hidden input for react-hook-form
      if (hiddenInputRef.current) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value'
        )?.set
        nativeInputValueSetter?.call(hiddenInputRef.current, newValue)

        const event = new Event('change', { bubbles: true })
        hiddenInputRef.current.dispatchEvent(event)
      }

      // Call onChange immediately with the new value
      if (onChange) {
        const syntheticEvent = {
          target: { value: newValue, name: name || '' },
          currentTarget: { value: newValue, name: name || '' },
          type: 'change',
        } as ChangeEvent<HTMLInputElement>
        ;(onChange as (event: ChangeEvent<HTMLInputElement>) => void)(syntheticEvent)
      }
    }

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation()
      handleSelect({ value: '', label: '' })
    }

    const assignRef = (
      targetRef: Ref<HTMLInputElement> | undefined,
      el: HTMLInputElement | null
    ) => {
      if (!targetRef) return
      if (typeof targetRef === 'function') {
        targetRef(el)
        return
      }
      ;(targetRef as React.MutableRefObject<HTMLInputElement | null>).current = el
    }

    // Merge refs
    const setRefs = (el: HTMLInputElement | null) => {
      ;(hiddenInputRef as React.MutableRefObject<HTMLInputElement | null>).current = el
      assignRef(ref, el)
    }

    // Merge refs for search input (visible input)
    const setSearchInputRefs = (el: HTMLInputElement | null) => {
      ;(searchInputRef as React.MutableRefObject<HTMLInputElement | null>).current = el
      assignRef(externalSearchInputRef, el)
    }

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
          {/* Options List */}
          <ul className="max-h-60 overflow-auto py-1">
            {isLoading ? (
              <li className="px-4 py-8 text-center">
                <div className="flex items-center justify-center gap-2">
                  <svg
                    className="h-4 w-4 animate-spin text-primary-500"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Buscando...</span>
                </div>
              </li>
            ) : filteredOptions.length === 0 ? (
              <li className="px-4 py-3 text-center">
                <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">{emptyMessage}</p>
                {onCreateNew && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false)
                      setSearchQuery('')
                      onCreateNew()
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
              filteredOptions.map((option, index) => {
                const isSelected = option.value === internalValue
                return (
                  <li
                    key={option.value}
                    data-option-index={index}
                    tabIndex={focusedIndex === index ? 0 : -1}
                    className={clsx(
                      'relative cursor-pointer select-none py-1.5 pl-8 pr-3',
                      'hover:bg-gray-100 dark:hover:bg-gray-700',
                      isSelected && 'bg-gray-100 dark:bg-gray-700/50'
                    )}
                    onClick={() => handleSelect(option)}
                    onFocus={() => setFocusedIndex(index)}
                    onBlur={(e) => {
                      // Só limpar o focusedIndex se não estiver indo para outra opção ou input
                      const relatedTarget = e.relatedTarget as HTMLElement
                      const isMovingToInput = relatedTarget === searchInputRef.current
                      const isMovingToOption =
                        relatedTarget?.getAttribute('data-option-index') !== null

                      if (!isMovingToInput && !isMovingToOption) {
                        setFocusedIndex(null)
                      }
                    }}
                    onKeyDown={(e) => {
                      // Evitar propagação para não interferir com o modal
                      e.stopPropagation()

                      if (e.key === 'ArrowDown') {
                        e.preventDefault()
                        if (index < filteredOptions.length - 1) {
                          const nextIndex = index + 1
                          setFocusedIndex(nextIndex)
                          const nextOption = document.querySelector(
                            `[data-option-index="${nextIndex}"]`
                          ) as HTMLLIElement
                          setTimeout(() => nextOption?.focus(), 0)
                        }
                      }
                      if (e.key === 'ArrowUp') {
                        e.preventDefault()
                        if (index > 0) {
                          const prevIndex = index - 1
                          setFocusedIndex(prevIndex)
                          const prevOption = document.querySelector(
                            `[data-option-index="${prevIndex}"]`
                          ) as HTMLLIElement
                          setTimeout(() => prevOption?.focus(), 0)
                        } else {
                          // Voltar para input de busca
                          setFocusedIndex(null)
                          searchInputRef.current?.focus()
                        }
                      }
                      if (e.key === 'Tab') {
                        e.preventDefault()
                        // Selecionar item atual com Tab
                        handleSelect(option)
                      }
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleSelect(option)
                      }
                    }}
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
                )
              })
            )}
          </ul>
        </div>
      </div>
    )

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
              }
              ;(onBlur as ChangeHandler)(syntheticEvent)
            }
          }}
        />

        {label && (
          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
            {label}
            {required && <span className="ml-1 text-red-500">*</span>}
          </label>
        )}

        <div className="relative">
          <input
            ref={setSearchInputRefs}
            type="text"
            disabled={disabled}
            placeholder={isOpen ? searchPlaceholder : selectedOption ? '' : placeholder}
            value={isOpen ? searchQuery : selectedOption?.label || ''}
            onChange={(e) => {
              const newValue = e.target.value
              setSearchQuery(newValue)
              // Abrir dropdown automaticamente ao digitar
              if (newValue && !isOpen) {
                setIsOpen(true)
              }
              if (onSearch) {
                onSearch(newValue)
              }
            }}
            onFocus={() => {
              if (!disabled && !isOpen) {
                setIsOpen(true)
              }
            }}
            onBlur={(e) => {
              // Só fechar se o foco não for para uma opção do dropdown
              const relatedTarget = e.relatedTarget as HTMLElement
              const isMovingToDropdown = relatedTarget?.getAttribute('data-option-index') !== null

              if (!isMovingToDropdown) {
                // Fechar dropdown ao perder foco (mas não quando vai para o dropdown)
                setTimeout(() => {
                  // Verificar novamente se o foco não está no dropdown
                  const activeElement = document.activeElement as HTMLElement
                  const isInDropdown = activeElement?.getAttribute('data-option-index') !== null

                  if (!isInDropdown) {
                    setIsOpen(false)
                    setSearchQuery('')
                  }
                }, 150)
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown' && isOpen && filteredOptions.length > 0) {
                e.preventDefault()
                e.stopPropagation() // Evita que o evento se propague para o modal
                // Focar na primeira opção
                if (focusedIndex === null) {
                  setFocusedIndex(0)
                  const firstOption = document.querySelector(
                    '[data-option-index="0"]'
                  ) as HTMLLIElement
                  setTimeout(() => firstOption?.focus(), 0)
                }
              }
              if (e.key === 'ArrowUp' && isOpen) {
                e.preventDefault()
                e.stopPropagation() // Evita que o evento se propague para o modal
              }
              if (e.key === 'Escape') {
                e.stopPropagation() // Deixa o próprio componente lidar com o escape
              }
              if (e.key === 'Enter' && isOpen) {
                e.stopPropagation() // Evita que o modal seja fechado ao selecionar
                // Se há filteredOptions, selecionar o primeiro
                if (filteredOptions.length > 0) {
                  e.preventDefault()
                  handleSelect(filteredOptions[0])
                }
              }
              if (e.key === 'Tab' && isOpen && filteredOptions.length > 0) {
                e.preventDefault()
                e.stopPropagation() // Evita que o modal seja fechado
                // Selecionar primeiro item da lista com Tab
                handleSelect(filteredOptions[0])
              }
            }}
            className={clsx(
              'relative w-full px-3 py-1.5 pl-4 pr-10 text-sm',
              'bg-surface-elevated',
              'border border-gray-200 hover:border-gray-300 focus:border-primary-500 dark:border-gray-600 dark:hover:border-gray-500 dark:focus:border-primary-500',
              'shadow-sm hover:shadow-lg',
              'rounded-xl',
              error
                ? 'border-red-500 dark:border-red-500'
                : 'border-gray-200 hover:border-gray-300 focus:border-primary-500 dark:border-gray-600 dark:hover:border-gray-500 dark:focus:border-primary-500',
              !disabled && 'hover:border-gray-300 dark:hover:border-gray-600',
              'focus:outline-none focus:ring-4 focus:ring-primary-500/10',
              'text-gray-900 dark:text-white',
              'placeholder:text-gray-400',
              disabled && 'cursor-not-allowed opacity-50'
            )}
          />

          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center gap-1 pr-3">
            <ChevronsUpDown className="h-5 w-5 text-gray-400" />
          </span>
        </div>

        {internalValue && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-8 top-1/2 z-10 translate-y-[-10%] rounded-full p-1 hover:bg-gray-200 dark:hover:bg-gray-700"
            tabIndex={-1}
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        )}

        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}

        {/* Dropdown via Portal */}
        {isOpen && createPortal(dropdownContent, document.body)}
      </div>
    )
  }
)

Select.displayName = 'Select'

