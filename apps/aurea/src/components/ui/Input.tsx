import { forwardRef, InputHTMLAttributes } from 'react'
import { clsx } from 'clsx'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  inputSize?: 'sm' | 'md'
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, type = 'text', inputSize = 'md', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className={clsx('label', inputSize === 'sm' && 'mb-0.5 text-xs')}>
            {label}
            {props.required && <span className="ml-1 text-feedback-danger-fg">*</span>}
          </label>
        )}
        <input
          type={type}
          className={clsx(
            'input-field',
            inputSize === 'sm' && 'px-2.5 py-1.5 text-sm',
            error &&
              'border-feedback-danger-fg focus:border-feedback-danger-fg focus:ring-feedback-danger-fg/20',
            className
          )}
          ref={ref}
          {...props}
        />
        {hint && !error && <p className="mt-1.5 text-sm text-content-muted">{hint}</p>}
        {error && <p className="mt-1.5 text-sm text-feedback-danger-fg">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
