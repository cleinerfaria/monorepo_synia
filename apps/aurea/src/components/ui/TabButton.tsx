import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { clsx } from 'clsx'

interface TabButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  active: boolean
  icon?: ReactNode
  badge?: ReactNode
  compact?: boolean
  nowrap?: boolean
  hoverBorder?: boolean
}

export function TabButton({
  active,
  icon,
  badge,
  compact = false,
  nowrap = false,
  hoverBorder = false,
  className,
  children,
  ...props
}: TabButtonProps) {
  return (
    <button
      type="button"
      className={clsx(
        'border-b-2 text-sm font-medium transition-colors',
        compact ? 'px-4 py-2' : 'px-4 py-3',
        (icon || badge) && 'flex items-center gap-2',
        nowrap && 'whitespace-nowrap',
        active
          ? 'border-primary-500 text-primary-600 dark:text-primary-400'
          : clsx(
              'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300',
              hoverBorder && 'hover:border-gray-300'
            ),
        className
      )}
      {...props}
    >
      {icon}
      {children}
      {badge}
    </button>
  )
}
