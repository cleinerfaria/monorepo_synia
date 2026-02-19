import { forwardRef, InputHTMLAttributes } from 'react';
import { clsx } from 'clsx';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  inputSize?: 'sm' | 'md';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, type = 'text', inputSize = 'md', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className={clsx('label', inputSize === 'sm' && 'mb-0.5 text-xs')}>
            {label}
            {props.required && <span className="text-feedback-danger-fg ml-1">*</span>}
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
        {hint && !error && <p className="text-content-muted ml-1 mt-1 text-xs">{hint}</p>}
        {error && <p className="text-feedback-danger-fg mt-1.5 text-sm">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
