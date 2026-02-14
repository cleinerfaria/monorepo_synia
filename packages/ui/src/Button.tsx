import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
};

const variantClass: Record<ButtonVariant, string> = {
  primary: "synia-btn synia-btn-primary",
  secondary: "synia-btn synia-btn-secondary"
};

export function Button({ children, variant = "primary", className, ...props }: ButtonProps) {
  const classes = [variantClass[variant], className].filter(Boolean).join(" ");
  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
