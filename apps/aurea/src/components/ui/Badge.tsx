import { clsx } from 'clsx'
import { getStatusBadgeConfig } from './badgeConfig'
import { BADGE_COLOR_PROFILE, type BadgeVariant } from './badgeProfile'

export type { BadgeVariant } from './badgeProfile'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

export function Badge({ children, variant = 'neutral', className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        BADGE_COLOR_PROFILE[variant],
        className
      )}
    >
      {children}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const config = getStatusBadgeConfig(status)

  return <Badge variant={config.variant}>{config.label}</Badge>
}
