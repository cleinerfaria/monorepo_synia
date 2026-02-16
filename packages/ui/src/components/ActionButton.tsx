import { type ComponentPropsWithoutRef } from 'react'
import { createButton } from './Button'

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
} as const

const sizes = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2.5 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2.5',
} as const

export const ActionButton = createButton(
  { base: baseStyles, variants, sizes },
  { variant: 'primary', size: 'md' }
)

export type ActionButtonProps = ComponentPropsWithoutRef<typeof ActionButton>
