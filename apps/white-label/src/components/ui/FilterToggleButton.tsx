import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { clsx } from 'clsx';
import { ButtonNew } from './ButtonNew';
import type { ButtonNewProps } from './ButtonNew';

type FilterToggleState = 'active' | 'inactive';

interface FilterToggleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active: boolean;
  count?: number;
  icon: ReactNode;
  label?: string;
}

const FILTER_TOGGLE_STATE_CONFIG: Record<
  FilterToggleState,
  { buttonVariant: ButtonNewProps['variant']; buttonClassName: string; counterClassName: string }
> = {
  active: {
    buttonVariant: 'soft',
    buttonClassName: 'pr-4',
    counterClassName:
      'bg-primary-500 text-white dark:bg-primary-500 dark:text-white border border-primary-400/40',
  },
  inactive: {
    buttonVariant: 'outline',
    buttonClassName: 'pr-4',
    counterClassName:
      'bg-surface-elevated text-content-secondary dark:bg-surface-elevated dark:text-content-primary border border-border/70',
  },
};

export function FilterToggleButton({
  active,
  count = 0,
  icon,
  label = 'Filtros',
  className,
  disabled,
  type = 'button',
  ...props
}: FilterToggleButtonProps) {
  const state: FilterToggleState = active ? 'active' : 'inactive';
  const config = FILTER_TOGGLE_STATE_CONFIG[state];

  return (
    <div className="relative inline-flex items-center">
      <ButtonNew
        type={type}
        disabled={disabled}
        variant={config.buttonVariant}
        size="md"
        showIcon
        icon={icon}
        label={label}
        className={clsx(config.buttonClassName, className)}
        {...props}
      />
      {count > 0 && (
        <span
          className={clsx(
            'pointer-events-none absolute right-0 top-0 inline-flex min-w-5 -translate-y-1/3 translate-x-1/4 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none',
            config.counterClassName
          )}
        >
          {count}
        </span>
      )}
    </div>
  );
}
