import { clsx } from 'clsx'

export type AlertTone = 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'

interface AlertProps {
  tone?: AlertTone
  title?: React.ReactNode
  icon?: React.ReactNode
  children?: React.ReactNode
  className?: string
}

export function Alert({ tone = 'neutral', title, icon, children, className }: AlertProps) {
  return (
    <div className={clsx('alert', `alert-${tone}`, className)}>
      <div className="flex items-start gap-3">
        {icon && <div className="mt-0.5 flex-shrink-0">{icon}</div>}
        <div className="min-w-0 flex-1">
          {title && <h4 className="text-sm font-medium">{title}</h4>}
          {children && <div className={clsx(title && 'mt-1', 'text-sm')}>{children}</div>}
        </div>
      </div>
    </div>
  )
}
