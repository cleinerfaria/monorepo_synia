export const BADGE_COLOR_PROFILE = {
  neutral: 'badge-neutral',
  success: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-danger',
  info: 'badge-info',
  gold: 'badge-gold',
  teal: 'badge-teal',
  cyan: 'badge-cyan',
  purple: 'badge-purple',
  pink: 'badge-pink',
} as const

export type BadgeVariant = keyof typeof BADGE_COLOR_PROFILE

export const BADGE_VARIANTS = Object.freeze(Object.keys(BADGE_COLOR_PROFILE) as BadgeVariant[])
