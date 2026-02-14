import { ButtonHTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'brand' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed'

    const variants = {
      primary:
        'border border-primary-600/20 bg-primary-500/90 text-content-inverse shadow-sm hover:bg-primary-600 hover:shadow-md focus:ring-border-focus/60',
      brand:
        'border border-primary-600/90 bg-primary-600/70 text-content-inverse shadow-sm hover:bg-primary-600/80 hover:shadow-md focus:ring-primary-600/90 dark:border-primary-600/90 dark:bg-primary-600/30 dark:hover:bg-primary-600/45 dark:focus:ring-primary-600/50',
      secondary:
        'border border-border/70 bg-surface-elevated/90 text-content-secondary hover:bg-surface-hover focus:ring-border-focus/50',
      ghost: 'text-content-secondary hover:bg-surface-hover focus:ring-border-focus/30',
      danger:
        'border border-feedback-danger-border/50 bg-feedback-danger-solid text-content-inverse hover:bg-feedback-danger-solid/90 focus:ring-feedback-danger-border/60',
    }

    const sizes = {
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      md: 'px-4 py-2.5 text-sm gap-2',
      lg: 'px-6 py-3 text-base gap-2.5',
    }

    return (
      <button
        className={clsx(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg
            className="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
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
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
