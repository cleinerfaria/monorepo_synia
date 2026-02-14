import {
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';

interface DropdownMenuProps {
  trigger: ReactNode;
  children: ReactNode;
  buttonClassName?: string;
  portal?: boolean;
}

interface DropdownMenuItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

export function DropdownMenu({
  trigger,
  children,
  buttonClassName,
  portal = false,
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuStyle, setMenuStyle] = useState<Record<string, string | number>>({});

  useEffect(() => {
    if (!open) return;

    const onClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open || !portal || !rootRef.current) return;

    const rect = rootRef.current.getBoundingClientRect();
    setMenuStyle({
      position: 'fixed',
      top: rect.bottom + 8,
      left: rect.right,
      transform: 'translateX(-100%)',
      minWidth: Math.max(rect.width, 180),
      zIndex: 70,
    });
  }, [open, portal]);

  const menuContent = (
    <div
      ref={menuRef}
      className={clsx(
        'border-border bg-surface-elevated rounded-xl border p-1 shadow-xl',
        'animate-fade-in'
      )}
      style={portal ? menuStyle : undefined}
      role="menu"
    >
      {children}
    </div>
  );

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        className={buttonClassName}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {trigger}
      </button>

      {open &&
        (portal ? (
          createPortal(menuContent, document.body)
        ) : (
          <div className="z-70 absolute right-0 top-[calc(100%+8px)] min-w-[180px]">
            {menuContent}
          </div>
        ))}
    </div>
  );
}

export function DropdownMenuItem({ children, className, ...props }: DropdownMenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      className={clsx(
        'text-content-primary flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm',
        'hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function DropdownMenuDivider(props: HTMLAttributes<HTMLHRElement>) {
  return <hr className={clsx('border-border my-1', props.className)} {...props} />;
}
