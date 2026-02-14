import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { DropdownMenu, DropdownMenuItem } from "./DropdownMenu";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export type ButtonStyleConfig<Variant extends string, Size extends string> = {
  base: string;
  variants: Record<Variant, string>;
  sizes: Record<Size, string>;
};

export type SharedButtonProps<Variant extends string, Size extends string> =
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
    size?: Size;
    isLoading?: boolean;
  };

export function createButton<
  Variant extends string,
  Size extends string,
  DefaultVariant extends Variant,
  DefaultSize extends Size
>(
  config: ButtonStyleConfig<Variant, Size>,
  defaults: { variant: DefaultVariant; size: DefaultSize }
) {
  const Component = forwardRef<HTMLButtonElement, SharedButtonProps<Variant, Size>>(
    ({ className, variant = defaults.variant, size = defaults.size, isLoading, children, disabled, ...props }, ref) => {
      const classes = cx(config.base, config.variants[variant], config.sizes[size], className);

      return (
        <button className={classes} ref={ref} disabled={disabled || isLoading} {...props}>
          {isLoading && (
            <svg
              className="h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          )}
          {children}
        </button>
      );
    }
  );

  Component.displayName = "Button";
  return Component;
}

export type ButtonVariant =
  | "solid"
  | "soft"
  | "outline"
  | "neutral"
  | "danger"
  | "filter"
  | "primary"
  | "secondary"
  | "ghost"
  | "brand";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonDropdownItem {
  id?: string;
  label: string;
  onClick?: () => void;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "size"> {
  label?: string;
  children?: ReactNode;
  variant?: ButtonVariant;
  active?: boolean;
  count?: number;
  size?: ButtonSize;
  isLoading?: boolean;
  showIcon?: boolean;
  icon?: ReactNode;
  dropdownItems?: ButtonDropdownItem[];
  dropdownPortal?: boolean;
}

const buttonSizeStyles: Record<ButtonSize, string> = {
  sm: "h-7 px-3 text-xs gap-1 mx-0.5 rounded-xl",
  md: "h-9 px-4 text-sm gap-1 mx-0.5 rounded-xl",
  lg: "h-11 px-5 text-base gap-1 mx-0.5 rounded-xl",
};

const iconSizeStyles: Record<ButtonSize, string> = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-5 w-5",
};

const splitSizeStyles: Record<ButtonSize, string> = {
  sm: "h-7 px-3 rounded-xl",
  md: "h-9 px-3.5 rounded-xl",
  lg: "h-11 px-4 rounded-xl",
};

const glowHaloOuter: Record<"solid" | "soft" | "outline" | "neutral" | "danger", string> = {
  solid:
    "bg-[radial-gradient(ellipse_at_center,theme(colors.primary.400)/55%,transparent_65%)] dark:bg-[radial-gradient(ellipse_at_center,theme(colors.primary.400)/40%,transparent_65%)]",
  soft: "bg-[radial-gradient(ellipse_at_center,theme(colors.primary.400)/30%,transparent_65%)] dark:bg-[radial-gradient(ellipse_at_center,theme(colors.primary.400)/22%,transparent_65%)]",
  outline:
    "bg-[radial-gradient(ellipse_at_center,theme(colors.primary.400)/30%,transparent_65%)] dark:bg-[radial-gradient(ellipse_at_center,theme(colors.primary.400)/22%,transparent_65%)]",
  neutral:
    "bg-[radial-gradient(ellipse_at_center,theme(colors.feedback.neutral.border)/32%,transparent_65%)] dark:bg-[radial-gradient(ellipse_at_center,theme(colors.feedback.neutral.border)/25%,transparent_65%)]",
  danger:
    "bg-[radial-gradient(ellipse_at_center,theme(colors.feedback.danger.border)/38%,transparent_65%)] dark:bg-[radial-gradient(ellipse_at_center,theme(colors.feedback.danger.border)/30%,transparent_65%)]",
};

const glowHaloCore: Record<"solid" | "soft" | "outline" | "neutral" | "danger", string> = {
  solid:
    "bg-[radial-gradient(ellipse_at_center,theme(colors.primary.500)/45%,transparent_62%)] dark:bg-[radial-gradient(ellipse_at_center,theme(colors.primary.500)/32%,transparent_62%)]",
  soft: "bg-[radial-gradient(ellipse_at_center,theme(colors.primary.500)/22%,transparent_62%)] dark:bg-[radial-gradient(ellipse_at_center,theme(colors.primary.500)/16%,transparent_62%)]",
  outline:
    "bg-[radial-gradient(ellipse_at_center,theme(colors.primary.500)/22%,transparent_62%)] dark:bg-[radial-gradient(ellipse_at_center,theme(colors.primary.500)/16%,transparent_62%)]",
  neutral:
    "bg-[radial-gradient(ellipse_at_center,theme(colors.feedback.neutral.fg)/22%,transparent_62%)] dark:bg-[radial-gradient(ellipse_at_center,theme(colors.feedback.neutral.fg)/16%,transparent_62%)]",
  danger:
    "bg-[radial-gradient(ellipse_at_center,theme(colors.feedback.danger.solid)/30%,transparent_62%)] dark:bg-[radial-gradient(ellipse_at_center,theme(colors.feedback.danger.solid)/24%,transparent_62%)]",
};

const variantStyles: Record<"solid" | "soft" | "outline" | "neutral" | "danger", string> = {
  solid: cx(
    "text-content-inverse",
    "bg-gradient-to-b from-primary-500 to-primary-700",
    "border border-primary-300/20",
    "shadow-sm hover:shadow-lg",
    "focus:ring-border-focus/60",
    "before:pointer-events-none before:absolute before:inset-[1px] before:rounded-[inherit] before:bg-gradient-to-b before:from-primary-200/20 before:to-transparent before:opacity-80"
  ),
  soft: cx(
    "text-primary-800 dark:text-primary-200",
    "bg-primary-500/14 dark:bg-primary-500/18",
    "border border-primary-500/22 dark:border-primary-400/18",
    "shadow-sm hover:shadow-lg",
    "focus:ring-border-focus/50",
    "before:pointer-events-none before:absolute before:inset-[1px] before:rounded-[inherit] before:bg-gradient-to-b before:from-primary-200/14 before:to-transparent before:opacity-70"
  ),
  outline: cx(
    "text-content-secondary dark:text-content-secondary",
    "bg-surface-elevated",
    "border border-border/80",
    "shadow-sm hover:shadow-lg",
    "focus:ring-border-focus/50",
    "before:pointer-events-none before:absolute before:inset-[1px] before:rounded-[inherit] before:bg-gradient-to-b before:from-primary-200/10 before:to-transparent before:opacity-60"
  ),
  neutral: cx(
    "text-content-primary",
    "bg-feedback-neutral-bg dark:bg-feedback-neutral-bg/35",
    "border border-feedback-neutral-border/80",
    "shadow-sm hover:shadow-lg",
    "focus:ring-feedback-neutral-border/45",
    "before:pointer-events-none before:absolute before:inset-[1px] before:rounded-[inherit] before:bg-gradient-to-b before:from-feedback-neutral-border/35 before:to-transparent before:opacity-65"
  ),
  danger: cx(
    "text-content-inverse",
    "bg-feedback-danger-solid",
    "border border-feedback-danger-border/55",
    "shadow-sm hover:shadow-lg",
    "focus:ring-feedback-danger-border/60",
    "before:pointer-events-none before:absolute before:inset-[1px] before:rounded-[inherit] before:bg-gradient-to-b before:from-feedback-danger-border/24 before:to-transparent before:opacity-70"
  ),
};

const iconWrapperStyles: Record<"solid" | "soft" | "outline" | "neutral" | "danger", string> = {
  solid: "text-content-inverse",
  soft: "text-primary-800 dark:text-primary-200",
  outline: "text-primary-700 dark:text-primary-300",
  neutral: "text-content-primary",
  danger: "text-content-inverse",
};

const sheenByVariant: Record<"solid" | "soft" | "outline" | "neutral" | "danger", string> = {
  solid:
    "bg-gradient-to-r from-primary-300/0 via-primary-200/35 to-primary-300/0 dark:via-primary-200/25 shadow-sm hover:shadow-lg",
  soft: "bg-gradient-to-r from-primary-400/0 via-primary-300/18 to-primary-400/0 dark:via-primary-300/14 shadow-sm hover:shadow-lg",
  outline:
    "bg-gradient-to-r from-primary-400/0 via-primary-300/18 to-primary-400/0 dark:via-primary-300/14 shadow-sm hover:shadow-lg",
  neutral:
    "bg-gradient-to-r from-feedback-neutral-border/0 via-feedback-neutral-border/30 to-feedback-neutral-border/0 shadow-sm hover:shadow-lg",
  danger:
    "bg-gradient-to-r from-feedback-danger-border/0 via-feedback-danger-border/30 to-feedback-danger-border/0 shadow-sm hover:shadow-lg",
};

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function resolveVariant(variant: ButtonVariant): "solid" | "soft" | "outline" | "neutral" | "danger" {
  if (variant === "filter") return "outline";
  if (variant === "primary" || variant === "brand") return "solid";
  if (variant === "secondary") return "soft";
  if (variant === "ghost") return "outline";
  return variant;
}

export function Button({
  label = "Novo Cliente",
  children,
  variant = "solid",
  active = false,
  count = 0,
  size = "md",
  isLoading = false,
  showIcon = true,
  icon,
  dropdownItems,
  dropdownPortal = false,
  className,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  const visualVariant = variant === "filter" ? (active ? "soft" : "outline") : resolveVariant(variant);
  const hasDropdown = Boolean(dropdownItems && dropdownItems.length > 0);
  const isDisabled = Boolean(disabled || isLoading);
  const resolvedIcon = icon ?? <PlusIcon className={iconSizeStyles[size]} />;

  return (
    <div className="group relative inline-flex items-stretch overflow-x-clip">
      <span
        aria-hidden
        className={cx(
          "pointer-events-none absolute -z-20 -inset-8 opacity-80 blur-3xl transition-opacity duration-300 group-hover:opacity-100",
          size === "sm" ? "rounded-2xl" : size === "md" ? "rounded-[22px]" : "rounded-[26px]",
          glowHaloOuter[visualVariant]
        )}
      />
      <span
        aria-hidden
        className={cx(
          "pointer-events-none absolute -z-20 -inset-4 opacity-70 blur-2xl transition-opacity duration-300 group-hover:opacity-95",
          size === "sm" ? "rounded-2xl" : size === "md" ? "rounded-[22px]" : "rounded-[26px]",
          glowHaloCore[visualVariant]
        )}
      />

      <button
        type={type}
        disabled={isDisabled}
        className={cx(
          "relative inline-flex items-center justify-center overflow-hidden whitespace-nowrap font-medium transition-all duration-300",
          "focus:outline-none focus:ring-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          variantStyles[visualVariant],
          buttonSizeStyles[size],
          variant === "filter" && "pr-4",
          hasDropdown && "rounded-r-none border-r-0",
          className
        )}
        {...props}
      >
        <span
          aria-hidden
          className={cx(
            "pointer-events-none absolute inset-y-0 left-0 w-1/2 -translate-x-full transition-transform duration-700 group-hover:translate-x-[180%]",
            sheenByVariant[visualVariant]
          )}
        />

        {isLoading && (
          <svg
            className="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}

        {showIcon && (
          <span className={cx("relative inline-flex items-center justify-center", iconWrapperStyles[visualVariant])}>
            {resolvedIcon}
          </span>
        )}

        <span className="relative truncate">{children ?? label}</span>
      </button>

      {variant === "filter" && count > 0 && (
        <span
          className={cx(
            "pointer-events-none absolute right-0 top-0 inline-flex min-w-5 -translate-y-1/3 translate-x-1/4 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none",
            active
              ? "bg-primary-500 text-white dark:bg-primary-500 dark:text-white border border-primary-400/40"
              : "bg-surface-elevated text-content-secondary dark:bg-surface-elevated dark:text-content-primary border border-border/70"
          )}
        >
          {count}
        </span>
      )}

      {hasDropdown && !isDisabled && (
        <DropdownMenu
          portal={dropdownPortal}
          buttonClassName={cx(
            "relative inline-flex items-center justify-center overflow-hidden whitespace-nowrap font-medium transition-all duration-300",
            "focus:outline-none focus:ring-2 -ml-1 mr-0.5",
            variantStyles[visualVariant],
            splitSizeStyles[size],
            "rounded-l-none"
          )}
          trigger={<ChevronDownIcon className={iconSizeStyles[size]} />}
        >
          {dropdownItems?.map((item, index) => (
            <DropdownMenuItem
              key={item.id ?? `${item.label}-${index}`}
              onClick={item.onClick}
              disabled={item.disabled}
              className={cx(Boolean(item.icon) && "flex items-center gap-0")}
            >
              {item.icon}
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenu>
      )}

      {hasDropdown && isDisabled && (
        <button
          type="button"
          disabled
          className={cx(
            "relative inline-flex items-center justify-center whitespace-nowrap font-medium opacity-50",
            variantStyles[visualVariant],
            splitSizeStyles[size],
            "rounded-l-none"
          )}
        >
          <ChevronDownIcon className={iconSizeStyles[size]} />
        </button>
      )}
    </div>
  );
}
