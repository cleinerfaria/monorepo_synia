import { forwardRef, useState, useEffect, useCallback, useRef } from 'react'
import { clsx } from 'clsx'

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  description?: string
  showStatus?: boolean
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  (
    {
      label,
      description,
      disabled,
      onChange,
      name,
      onBlur,
      showStatus = false,
      checked,
      defaultChecked,
      ...props
    },
    ref
  ) => {
    const [isChecked, setIsChecked] = useState(checked || defaultChecked || false)
    const internalRef = useRef<HTMLInputElement>(null)
    const isControlled = checked !== undefined

    // Combine refs
    const setRefs = useCallback(
      (node: HTMLInputElement | null) => {
        // Set internal ref
        ;(internalRef as React.MutableRefObject<HTMLInputElement | null>).current = node
        // Set external ref
        if (typeof ref === 'function') {
          ref(node)
        } else if (ref) {
          ;(ref as React.MutableRefObject<HTMLInputElement | null>).current = node
        }
      },
      [ref]
    )

    // Update internal state when controlled prop changes
    useEffect(() => {
      if (isControlled) {
        setIsChecked(checked || false)
      }
    }, [checked, isControlled])

    const handleToggle = () => {
      if (disabled) return

      const newChecked = !isChecked

      // Update internal state only if uncontrolled
      if (!isControlled) {
        setIsChecked(newChecked)
      }

      const input = internalRef.current
      if (input) {
        input.checked = newChecked
      }

      // Call onChange with proper event
      if (onChange) {
        const syntheticEvent = {
          target: {
            name,
            type: 'checkbox',
            checked: newChecked,
            value: newChecked,
          },
          type: 'change',
        } as unknown as React.ChangeEvent<HTMLInputElement>

        onChange(syntheticEvent)
      }
    }

    return (
      <div className="flex items-center gap-2 py-1">
        <div>
          {label && (
            <label className="text-xs font-medium text-gray-900 dark:text-white">{label}</label>
          )}
          {description && <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggle}
            disabled={disabled}
            className={clsx(
              'focus:ring-primary-500 relative inline-flex w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent p-0.5 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900',
              isChecked
                ? 'bg-primary-500/80 dark:bg-primary-400/80'
                : 'bg-gray-300 dark:bg-gray-600',
              disabled && 'cursor-not-allowed opacity-50'
            )}
          >
            <span
              className={clsx(
                'pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                isChecked ? 'translate-x-6' : 'translate-x-0'
              )}
            />
          </button>
          {showStatus && (
            <span
              className={clsx(
                'text-xs font-medium',
                isChecked
                  ? 'text-primary-500 dark:text-primary-400'
                  : 'text-gray-500 dark:text-gray-400'
              )}
            >
              {isChecked ? 'Ativo' : 'Inativo'}
            </span>
          )}
        </div>
        <input
          ref={setRefs}
          type="checkbox"
          name={name}
          className="hidden"
          disabled={disabled}
          onBlur={onBlur}
          checked={isChecked}
          onChange={() => {}} // Controlled by button click
          {...props}
        />
      </div>
    )
  }
)

Switch.displayName = 'Switch'
