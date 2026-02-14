import type { CSSProperties, HTMLAttributes } from 'react'

const BADGE_BG_ALPHA = 0.125
const BADGE_BORDER_ALPHA = 0.44
const LIGHT_TEXT_DARKEN_FACTOR = 0.58
const PRIMARY_COLOR_VAR = 'var(--color-primary-500)'
const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

const hexToRgb = (hex: string) => {
  const normalized = hex.replace('#', '')
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => char + char)
          .join('')
      : normalized

  const int = Number.parseInt(full, 16)
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  }
}

const darkenRgb = (value: number) =>
  Math.max(0, Math.min(255, Math.round(value * LIGHT_TEXT_DARKEN_FACTOR)))

type BadgeStyle = CSSProperties & {
  '--badge-text-light'?: string
  '--badge-text-dark'?: string
}

const buildBadgeStyle = (color?: string | null): BadgeStyle => {
  if (!color || !HEX_COLOR_REGEX.test(color)) {
    return {
      backgroundColor: `rgb(${PRIMARY_COLOR_VAR} / ${BADGE_BG_ALPHA})`,
      borderColor: `rgb(${PRIMARY_COLOR_VAR} / ${BADGE_BORDER_ALPHA})`,
      '--badge-text-light': `rgb(${PRIMARY_COLOR_VAR})`,
      '--badge-text-dark': `rgb(${PRIMARY_COLOR_VAR})`,
    }
  }

  const { r, g, b } = hexToRgb(color)
  const lightR = darkenRgb(r)
  const lightG = darkenRgb(g)
  const lightB = darkenRgb(b)

  return {
    backgroundColor: `rgb(${r} ${g} ${b} / ${BADGE_BG_ALPHA})`,
    borderColor: `rgb(${r} ${g} ${b} / ${BADGE_BORDER_ALPHA})`,
    '--badge-text-light': `rgb(${lightR} ${lightG} ${lightB})`,
    '--badge-text-dark': `rgb(${r} ${g} ${b})`,
  }
}

type ColorBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  color?: string | null
}

export function ColorBadge({ color, className, style, children, ...props }: ColorBadgeProps) {
  const badgeStyle = buildBadgeStyle(color)
  const composedClassName = [
    'inline-flex items-center rounded-full border border-opacity-80 px-2.5 py-0.5 text-xs font-medium text-[color:var(--badge-text-light)] dark:border-opacity-90 dark:text-[color:var(--badge-text-dark)] dark:brightness-150',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <span {...props} className={composedClassName} style={{ ...badgeStyle, ...style }}>
      {children}
    </span>
  )
}
