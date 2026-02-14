import * as React from 'react';
import { forwardRef, useEffect, useId, useState } from 'react';
import { clsx } from 'clsx';

interface SwitchNewProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
  showStatus?: boolean;
  labelPosition?: 'side' | 'above';
}

export const SwitchNew = forwardRef<HTMLInputElement, SwitchNewProps>(
  (
    {
      label,
      description,
      disabled,
      onChange,
      onBlur,
      name,
      checked,
      defaultChecked,
      showStatus = false,
      labelPosition = 'side',
      className,
      id,
      ...props
    },
    ref
  ) => {
    const autoId = useId();
    const inputId = id ?? autoId;

    const isControlled = checked !== undefined;
    const [internalChecked, setInternalChecked] = useState(Boolean(defaultChecked));

    useEffect(() => {
      if (isControlled) setInternalChecked(Boolean(checked));
    }, [checked, isControlled]);

    const resolvedChecked = isControlled ? Boolean(checked) : internalChecked;

    return (
      <div
        className={clsx(
          labelPosition === 'above'
            ? 'flex flex-col items-start gap-2'
            : 'inline-flex max-w-full items-center gap-3',
          className
        )}
      >
        {(label || description) && (
          <div className={clsx(labelPosition === 'side' ? 'min-w-0' : 'w-full')}>
            {label && (
              <label
                htmlFor={inputId}
                className={clsx(
                  'block text-xs font-medium',
                  disabled ? 'text-content-muted' : 'text-content-primary'
                )}
              >
                {label}
              </label>
            )}
            {description && (
              <p
                className={clsx(
                  'mt-0.5 text-xs',
                  disabled ? 'text-content-muted/80' : 'text-content-muted'
                )}
              >
                {description}
              </p>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <label
            htmlFor={inputId}
            className={clsx(
              'group relative inline-flex select-none items-center',
              disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
            )}
          >
            <input
              ref={ref}
              id={inputId}
              type="checkbox"
              name={name}
              disabled={disabled}
              checked={resolvedChecked}
              onBlur={onBlur}
              onChange={(event) => {
                if (!isControlled) setInternalChecked(event.target.checked);
                onChange?.(event);
              }}
              className="peer sr-only"
              {...props}
            />

            <span
              aria-hidden="true"
              className={clsx(
                'relative h-6 w-11 rounded-full',
                !resolvedChecked && 'bg-content-muted/30 dark:bg-content-muted/25',
                resolvedChecked &&
                  clsx(
                    'border-primary-300/20 from-primary-500 via-primary-600 to-primary-700 border bg-gradient-to-b',
                    'dark:from-primary-500/80 dark:via-primary-600/70 dark:to-primary-700/60',
                    'shadow-sm hover:shadow-lg'
                  ),
                'peer-disabled:bg-border/70 dark:peer-disabled:bg-border/50',
                'transition-[background-image,background-color,box-shadow,transform] duration-300 ease-[cubic-bezier(.2,.8,.2,1)]',
                'group-active:scale-[0.985]',
                'peer-focus-visible:primary-offset-1 peer-focus-visible:ring-primary-500/10 peer-focus-visible:outline-none peer-focus-visible:ring-4',
                !resolvedChecked && clsx('shadow-sm hover:shadow-lg')
              )}
            >
              <span
                aria-hidden="true"
                className={clsx(
                  'pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b to-transparent',
                  !resolvedChecked && 'dark:from-white/12 from-white/35 opacity-55',
                  resolvedChecked && 'dark:from-white/14 from-white/20 opacity-70'
                )}
              />
            </span>

            <span
              aria-hidden="true"
              className={clsx(
                'pointer-events-none absolute top-1/2 h-10 w-10 -translate-y-1/2 rounded-full blur-xl',
                'bg-primary-500/38',
                'transition-[opacity,transform,left] duration-[350ms] ease-[cubic-bezier(.2,.8,.2,1)]',
                resolvedChecked ? 'left-[1.35rem] opacity-100' : 'left-0.5 opacity-0',
                disabled && 'opacity-0'
              )}
            />

            <span
              aria-hidden="true"
              className={clsx(
                'absolute left-[3px] top-[3px] h-[1.125rem] w-[1.125rem] rounded-full',
                !resolvedChecked && 'bg-surface-card',
                resolvedChecked && clsx('bg-white', 'shadow-sm hover:shadow-lg'),
                !resolvedChecked && clsx('shadow-sm hover:shadow-lg'),
                'transition-[transform,background-color,box-shadow,width] duration-[350ms] ease-[cubic-bezier(.2,.9,.2,1)]',
                resolvedChecked
                  ? 'translate-x-5 group-active:w-[1.4rem] group-active:translate-x-[0.95rem]'
                  : 'group-active:w-[1.4rem]',
                'group-active:scale-[0.97]',
                disabled && 'bg-surface-elevated shadow-none'
              )}
            />

            <span
              aria-hidden="true"
              className={clsx(
                'pointer-events-none absolute top-[0.65rem] h-[0.25rem] w-[0.25rem] rounded-full',
                resolvedChecked ? 'bg-black/10 dark:bg-black/25' : 'dark:bg-white/6 bg-black/5',
                'transition-[left,opacity] duration-[350ms] ease-[cubic-bezier(.2,.9,.2,1)]',
                resolvedChecked ? 'left-[1.85rem] opacity-25' : 'left-[0.7rem] opacity-60'
              )}
            />
          </label>

          {showStatus && (
            <span
              className={clsx(
                'text-xs font-medium transition-colors duration-200',
                resolvedChecked ? 'text-primary-600 dark:text-primary-400' : 'text-content-muted'
              )}
            >
              {resolvedChecked ? 'Ativo' : 'Inativo'}
            </span>
          )}
        </div>
      </div>
    );
  }
);

SwitchNew.displayName = 'SwitchNew';
