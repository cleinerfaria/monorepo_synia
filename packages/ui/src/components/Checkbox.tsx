import { forwardRef, InputHTMLAttributes, useId, useMemo, useState } from 'react';
import { clsx } from 'clsx';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
  error?: string;
  hint?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      className,
      label,
      description,
      error,
      hint,
      id,
      checked,
      defaultChecked,
      onChange,
      disabled,
      required,
      ...props
    },
    ref
  ) => {
    const autoId = useId();
    const inputId = id ?? autoId;

    const hintId = useMemo(() => `${inputId}-hint`, [inputId]);
    const errorId = useMemo(() => `${inputId}-error`, [inputId]);

    const isControlled = checked !== undefined;
    const [internalChecked, setInternalChecked] = useState(Boolean(defaultChecked));
    const resolvedChecked = isControlled ? Boolean(checked) : internalChecked;

    const describedBy = clsx(hint && !error ? hintId : null, error ? errorId : null).trim();

    return (
      <div className="w-full">
        <label
          htmlFor={inputId}
          className={clsx(
            'group flex select-none items-start gap-3',
            disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
          )}
        >
          {/* Input (acessível, mas visualmente oculto) */}
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            checked={resolvedChecked}
            disabled={disabled}
            required={required}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={describedBy || undefined}
            onChange={(event) => {
              if (!isControlled) setInternalChecked(event.target.checked);
              onChange?.(event);
            }}
            className={clsx('peer sr-only', className)}
            {...props}
          />

          {/* Caixa custom (UI) */}
          <span
            aria-hidden="true"
            className={clsx(
              'relative mt-0.5 grid h-5 w-5 place-items-center rounded-[7px]',
              // base
              'border-border bg-surface-card border',
              // “tech” feel: sombra + brilho sutil
              'shadow-[0_1px_0_rgba(0,0,0,0.04)]',
              'transition-all duration-200',
              // hover (só quando não disabled)
              !disabled && 'group-hover:shadow-[0_4px_14px_rgba(0,0,0,0.08)]',
              // focus ring (no input peer)
              'peer-focus-visible:ring-primary-500/25 peer-focus-visible:ring-offset-bg-canvas peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2',
              // checked state (gradiente + glow)
              'peer-checked:border-primary-600 peer-checked:bg-primary-600',
              !disabled && 'peer-checked:shadow-[0_6px_18px_rgba(0,0,0,0.10)]',
              // error state
              error &&
                'border-feedback-danger-fg peer-checked:border-feedback-danger-fg peer-checked:bg-feedback-danger-fg'
            )}
          >
            {/* Glow interno (bem sutil) */}
            <span
              className={clsx(
                'pointer-events-none absolute inset-0 rounded-[7px] opacity-0',
                'bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.40),rgba(255,255,255,0.00)_55%)]',
                'transition-opacity duration-200',
                'peer-checked:opacity-100'
              )}
            />

            {/* Check (SVG) com animação */}
            <svg
              viewBox="0 0 14 14"
              className={clsx(
                'h-3.5 w-3.5',
                'text-white',
                'translate-y-[1px] scale-75 opacity-0',
                'transition-all duration-200',
                'peer-checked:translate-y-0 peer-checked:scale-100 peer-checked:opacity-100'
              )}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 7.25 5.75 10 11 4.5" />
            </svg>
          </span>

          {/* Textos */}
          {(label || description) && (
            <div className="min-w-0">
              {label && (
                <div className="flex items-center gap-2">
                  <span
                    className={clsx(
                      'block text-sm font-medium leading-5',
                      disabled ? 'text-content-muted' : 'text-content-primary'
                    )}
                  >
                    {label}
                  </span>
                  {required && <span className="text-feedback-danger-fg">*</span>}
                </div>
              )}

              {description && (
                <p
                  className={clsx(
                    'mt-0.5 text-xs leading-4',
                    disabled ? 'text-content-muted/80' : 'text-content-muted'
                  )}
                >
                  {description}
                </p>
              )}
            </div>
          )}
        </label>

        {hint && !error && (
          <p id={hintId} className="text-content-muted mt-1.5 text-xs">
            {hint}
          </p>
        )}

        {error && (
          <p id={errorId} className="text-feedback-danger-fg mt-1.5 text-xs font-medium">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
