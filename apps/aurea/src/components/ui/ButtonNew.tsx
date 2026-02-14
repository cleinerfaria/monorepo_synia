import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { ChevronDown, Plus } from 'lucide-react'
import { clsx } from 'clsx'
import { DropdownMenu, DropdownMenuItem } from './DropdownMenu'

type ButtonNewVariant = 'solid' | 'soft' | 'outline' | 'neutral' | 'danger'
type ButtonNewSize = 'sm' | 'md' | 'lg'

export interface ButtonNewDropdownItem {
  id?: string
  label: string
  onClick?: () => void
  icon?: ReactNode
  disabled?: boolean
}

export interface ButtonNewProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'size'> {
  label?: string
  variant?: ButtonNewVariant
  size?: ButtonNewSize
  showIcon?: boolean
  icon?: ReactNode
  dropdownItems?: ButtonNewDropdownItem[]
  dropdownPortal?: boolean
}

/**
 * Goal (reference image):
 * - pill button with indirect glow halo around the whole control
 * - subtle inner highlight
 * - no "icon chip" circle unless explicitly desired
 * - glow uses primary tokens (no hardcoded hex)
 */

const buttonSizeStyles: Record<ButtonNewSize, string> = {
  sm: 'h-7 px-3 text-xs gap-1 mx-0.5 rounded-xl',
  md: 'h-9 px-4 text-sm gap-1 mx-0.5 rounded-xl', // a bit taller/rounder to match the pill feel
  lg: 'h-11 px-5 text-base gap-1 mx-0.5 rounded-xl',
}

const splitSizeStyles: Record<ButtonNewSize, string> = {
  sm: 'h-7 px-3 rounded-xl',
  md: 'h-9 px-3.5 rounded-xl',
  lg: 'h-11 px-4 rounded-xl',
}

const iconSizeStyles: Record<ButtonNewSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-5 w-5',
}

const caretSizeStyles: Record<ButtonNewSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-5 w-5',
}

/**
 * Premium indirect glow:
 * - 2 blurred layers behind the entire control
 * - uses primary tokens only
 * - slightly stronger to be visible on dark backgrounds
 */
const glowHaloOuter: Record<ButtonNewVariant, string> = {
  solid:
    'bg-[radial-gradient(ellipse_at_center,theme(colors.primary.400)/55%,transparent_65%)] dark:bg-[radial-gradient(ellipse_at_center,theme(colors.primary.400)/40%,transparent_65%)]',
  soft: 'bg-[radial-gradient(ellipse_at_center,theme(colors.primary.400)/30%,transparent_65%)] dark:bg-[radial-gradient(ellipse_at_center,theme(colors.primary.400)/22%,transparent_65%)]',
  outline:
    'bg-[radial-gradient(ellipse_at_center,theme(colors.primary.400)/30%,transparent_65%)] dark:bg-[radial-gradient(ellipse_at_center,theme(colors.primary.400)/22%,transparent_65%)]',
  neutral:
    'bg-[radial-gradient(ellipse_at_center,theme(colors.feedback.neutral.border)/32%,transparent_65%)] dark:bg-[radial-gradient(ellipse_at_center,theme(colors.feedback.neutral.border)/25%,transparent_65%)]',
  danger:
    'bg-[radial-gradient(ellipse_at_center,theme(colors.feedback.danger.border)/38%,transparent_65%)] dark:bg-[radial-gradient(ellipse_at_center,theme(colors.feedback.danger.border)/30%,transparent_65%)]',
}

const glowHaloCore: Record<ButtonNewVariant, string> = {
  solid:
    'bg-[radial-gradient(ellipse_at_center,theme(colors.primary.500)/45%,transparent_62%)] dark:bg-[radial-gradient(ellipse_at_center,theme(colors.primary.500)/32%,transparent_62%)]',
  soft: 'bg-[radial-gradient(ellipse_at_center,theme(colors.primary.500)/22%,transparent_62%)] dark:bg-[radial-gradient(ellipse_at_center,theme(colors.primary.500)/16%,transparent_62%)]',
  outline:
    'bg-[radial-gradient(ellipse_at_center,theme(colors.primary.500)/22%,transparent_62%)] dark:bg-[radial-gradient(ellipse_at_center,theme(colors.primary.500)/16%,transparent_62%)]',
  neutral:
    'bg-[radial-gradient(ellipse_at_center,theme(colors.feedback.neutral.fg)/22%,transparent_62%)] dark:bg-[radial-gradient(ellipse_at_center,theme(colors.feedback.neutral.fg)/16%,transparent_62%)]',
  danger:
    'bg-[radial-gradient(ellipse_at_center,theme(colors.feedback.danger.solid)/30%,transparent_62%)] dark:bg-[radial-gradient(ellipse_at_center,theme(colors.feedback.danger.solid)/24%,transparent_62%)]',
}

/**
 * Main / Split surfaces:
 * - keep a clean pill with subtle top highlight and depth
 * - avoid "white chip" or hardcoded colors
 */
const mainVariantStyles: Record<ButtonNewVariant, string> = {
  solid: clsx(
    'text-content-inverse',
    'bg-gradient-to-b from-primary-500 to-primary-700',
    'border border-primary-300/20',
    'shadow-sm hover:shadow-lg',
    'focus:ring-border-focus/60',
    // inner highlight
    'before:pointer-events-none before:absolute before:inset-[1px] before:rounded-[inherit] before:bg-gradient-to-b before:from-primary-200/20 before:to-transparent before:opacity-80'
  ),
  soft: clsx(
    'text-primary-800 dark:text-primary-200',
    'bg-primary-500/14 dark:bg-primary-500/18',
    'border border-primary-500/22 dark:border-primary-400/18',
    'shadow-sm hover:shadow-lg',
    'focus:ring-border-focus/50',
    'before:pointer-events-none before:absolute before:inset-[1px] before:rounded-[inherit] before:bg-gradient-to-b before:from-primary-200/14 before:to-transparent before:opacity-70'
  ),
  outline: clsx(
    'text-content-secondary dark:text-content-secondary',
    'bg-surface-elevated',
    'border border-border/80',
    'shadow-sm hover:shadow-lg',
    'focus:ring-border-focus/50',
    'before:pointer-events-none before:absolute before:inset-[1px] before:rounded-[inherit] before:bg-gradient-to-b before:from-primary-200/10 before:to-transparent before:opacity-60'
  ),
  neutral: clsx(
    'text-content-primary',
    'bg-feedback-neutral-bg dark:bg-feedback-neutral-bg/35',
    'border border-feedback-neutral-border/80',
    'shadow-sm hover:shadow-lg',
    'focus:ring-feedback-neutral-border/45',
    'before:pointer-events-none before:absolute before:inset-[1px] before:rounded-[inherit] before:bg-gradient-to-b before:from-feedback-neutral-border/35 before:to-transparent before:opacity-65'
  ),
  danger: clsx(
    'text-content-inverse',
    'bg-feedback-danger-solid',
    'border border-feedback-danger-border/55',
    'shadow-sm hover:shadow-lg',
    'focus:ring-feedback-danger-border/60',
    'before:pointer-events-none before:absolute before:inset-[1px] before:rounded-[inherit] before:bg-gradient-to-b before:from-feedback-danger-border/24 before:to-transparent before:opacity-70'
  ),
}

const splitVariantStyles: Record<ButtonNewVariant, string> = {
  solid: clsx(
    'text-content-inverse',
    'bg-gradient-to-b from-primary-500 to-primary-700',
    'border border-primary-300/20',
    'shadow-sm hover:shadow-lg',
    'focus:ring-border-focus/60',
    // super subtle divider (almost invisible like the reference)
    'relative before:pointer-events-none before:absolute before:inset-y-3 before:left-0 before:w-px before:bg-primary-200/10',
    // inner highlight
    'after:pointer-events-none after:absolute after:inset-[1px] after:rounded-[inherit] after:bg-gradient-to-b after:from-primary-200/16 after:to-transparent after:opacity-70'
  ),
  soft: clsx(
    'text-primary-800 dark:text-primary-200',
    'bg-primary-500/14 dark:bg-primary-500/18',
    'border border-primary-500/22 dark:border-primary-400/18',
    'shadow-sm hover:shadow-lg',
    'focus:ring-border-focus/50',
    'relative before:pointer-events-none before:absolute before:inset-y-3 before:left-0 before:w-px before:bg-primary-500/10',
    'after:pointer-events-none after:absolute after:inset-[1px] after:rounded-[inherit] after:bg-gradient-to-b after:from-primary-200/10 after:to-transparent after:opacity-60'
  ),
  outline: clsx(
    'text-content-secondary dark:text-content-secondary',
    'bg-surface-elevated',
    'border border-border/80',
    'shadow-sm hover:shadow-lg',
    'focus:ring-border-focus/50',
    'relative before:pointer-events-none before:absolute before:inset-y-3 before:left-0 before:w-px before:bg-border/50',
    'after:pointer-events-none after:absolute after:inset-[1px] after:rounded-[inherit] after:bg-gradient-to-b after:from-primary-200/08 after:to-transparent after:opacity-55'
  ),
  neutral: clsx(
    'text-content-primary',
    'bg-feedback-neutral-bg dark:bg-feedback-neutral-bg/35',
    'border border-feedback-neutral-border/80',
    'shadow-sm hover:shadow-lg',
    'focus:ring-feedback-neutral-border/45',
    'relative before:pointer-events-none before:absolute before:inset-y-3 before:left-0 before:w-px before:bg-feedback-neutral-border/45',
    'after:pointer-events-none after:absolute after:inset-[1px] after:rounded-[inherit] after:bg-gradient-to-b after:from-feedback-neutral-border/30 after:to-transparent after:opacity-60'
  ),
  danger: clsx(
    'text-content-inverse',
    'bg-feedback-danger-solid',
    'border border-feedback-danger-border/55',
    'shadow-sm hover:shadow-lg',
    'focus:ring-feedback-danger-border/60',
    'relative before:pointer-events-none before:absolute before:inset-y-3 before:left-0 before:w-px before:bg-feedback-danger-border/45',
    'after:pointer-events-none after:absolute after:inset-[1px] after:rounded-[inherit] after:bg-gradient-to-b after:from-feedback-danger-border/18 after:to-transparent after:opacity-60'
  ),
}

/**
 * Icon: no chip/circle. Just spacing + the icon itself.
 * (keeps the reference look closer)
 */
const iconWrapperStyles: Record<ButtonNewVariant, string> = {
  solid: 'text-content-inverse',
  soft: 'text-primary-800 dark:text-primary-200',
  outline: 'text-primary-700 dark:text-primary-300',
  neutral: 'text-content-primary',
  danger: 'text-content-inverse',
}

/**
 * Subtle moving sheen on hover (optional, but helps "premium")
 */
const sheenByVariant: Record<ButtonNewVariant, string> = {
  solid:
    'bg-gradient-to-r from-primary-300/0 via-primary-200/35 to-primary-300/0 dark:via-primary-200/25  shadow-sm hover:shadow-lg',
  soft: 'bg-gradient-to-r from-primary-400/0 via-primary-300/18 to-primary-400/0 dark:via-primary-300/14  shadow-sm hover:shadow-lg',
  outline:
    'bg-gradient-to-r from-primary-400/0 via-primary-300/18 to-primary-400/0 dark:via-primary-300/14  shadow-sm hover:shadow-lg',
  neutral:
    'bg-gradient-to-r from-feedback-neutral-border/0 via-feedback-neutral-border/30 to-feedback-neutral-border/0  shadow-sm hover:shadow-lg',
  danger:
    'bg-gradient-to-r from-feedback-danger-border/0 via-feedback-danger-border/30 to-feedback-danger-border/0  shadow-sm hover:shadow-lg',
}

export function ButtonNew({
  label = 'Novo Cliente',
  variant = 'solid',
  size = 'md',
  showIcon = true,
  icon,
  dropdownItems,
  dropdownPortal = false,
  className,
  disabled,
  type = 'button',
  ...props
}: ButtonNewProps) {
  const hasDropdown = Boolean(dropdownItems && dropdownItems.length > 0)
  const resolvedIcon = icon ?? <Plus className={iconSizeStyles[size]} />

  return (
    <div className="group relative inline-flex items-stretch overflow-x-clip">
      {/* Indirect glow halo (outer) */}
      <span
        aria-hidden
        className={clsx(
          'pointer-events-none absolute -z-20',
          // bigger halo around button
          '-inset-8 opacity-80 blur-3xl transition-opacity duration-300 group-hover:opacity-100',
          // match radius of the control
          size === 'sm' ? 'rounded-2xl' : size === 'md' ? 'rounded-[22px]' : 'rounded-[26px]',
          glowHaloOuter[variant]
        )}
      />
      {/* Indirect glow core (inner) */}
      <span
        aria-hidden
        className={clsx(
          'pointer-events-none absolute -z-20',
          '-inset-4 opacity-70 blur-2xl transition-opacity duration-300 group-hover:opacity-95',
          size === 'sm' ? 'rounded-2xl' : size === 'md' ? 'rounded-[22px]' : 'rounded-[26px]',
          glowHaloCore[variant]
        )}
      />

      <button
        type={type}
        disabled={disabled}
        className={clsx(
          'relative inline-flex items-center justify-center overflow-hidden whitespace-nowrap font-medium transition-all duration-300',
          'focus:outline-none focus:ring-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          mainVariantStyles[variant],
          buttonSizeStyles[size],
          hasDropdown && 'rounded-r-none border-r-0',
          className
        )}
        {...props}
      >
        {/* Hover sheen sweep */}
        <span
          aria-hidden
          className={clsx(
            'pointer-events-none absolute inset-y-0 left-0 w-1/2 -translate-x-full transition-transform duration-700 group-hover:translate-x-[180%]',
            sheenByVariant[variant]
          )}
        />

        {showIcon && (
          <span
            className={clsx(
              'relative inline-flex items-center justify-center',
              iconWrapperStyles[variant]
            )}
          >
            {resolvedIcon}
          </span>
        )}

        <span className="relative truncate">{label}</span>
      </button>

      {hasDropdown && !disabled && (
        <DropdownMenu
          portal={dropdownPortal}
          buttonClassName={clsx(
            'relative inline-flex items-center justify-center overflow-hidden whitespace-nowrap font-medium transition-all duration-300',
            'focus:outline-none focus:ring-2 -ml-1 mr-0.5',
            splitVariantStyles[variant],
            splitSizeStyles[size],
            'rounded-l-none'
          )}
          trigger={<ChevronDown className={caretSizeStyles[size]} />}
        >
          {dropdownItems?.map((item, index) => (
            <DropdownMenuItem
              key={item.id ?? `${item.label}-${index}`}
              onClick={item.onClick}
              disabled={item.disabled}
              className={clsx(item.icon && 'flex items-center gap-0')}
            >
              {item.icon}
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenu>
      )}

      {hasDropdown && disabled && (
        <button
          type="button"
          disabled
          className={clsx(
            'relative inline-flex items-center justify-center whitespace-nowrap font-medium opacity-50',
            splitVariantStyles[variant],
            splitSizeStyles[size],
            'rounded-l-none'
          )}
        >
          <ChevronDown className={caretSizeStyles[size]} />
        </button>
      )}
    </div>
  )
}
