import { Fragment, ReactNode } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { clsx } from 'clsx';
import { X } from 'lucide-react';
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' | 'screen';
  panelClassName?: string;
  /** Se true, não fecha ao clicar no backdrop ou pressionar ESC */
  static?: boolean;
  /** Se true, usa z-index maior para modais aninhados */
  nested?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  panelClassName,
  static: isStatic = false,
  nested = false,
}: ModalProps) {
  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-5xl',
    full: 'max-w-[90vw]',
    screen: 'w-[80vw] h-[80vh]',
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className={nested ? 'relative z-[60]' : 'relative z-50'}
        onClose={isStatic ? () => {} : onClose}
        static={isStatic}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="bg-overlay/50 fixed inset-0 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel
                className={clsx(
                  'transform overflow-hidden rounded-2xl',
                  'bg-surface-card',
                  'p-6 shadow-2xl transition-all',
                  size !== 'screen' && 'w-full',
                  size === 'screen' && 'flex flex-col',
                  sizes[size],
                  panelClassName
                )}
              >
                {(title || description) && (
                  <div className={size === 'screen' ? 'mb-2 flex-shrink-0' : 'mb-2'}>
                    <div className="flex items-start justify-between">
                      {title && (
                        <Dialog.Title
                          as="h3"
                          className="font-display text-content-primary text-xl font-semibold"
                        >
                          {title}
                        </Dialog.Title>
                      )}
                      <button
                        type="button"
                        className="text-content-muted hover:bg-surface-hover hover:text-content-secondary rounded-lg p-1 transition-colors"
                        onClick={onClose}
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    {description && (
                      <Dialog.Description className="text-content-muted mt-2 text-sm">
                        {description}
                      </Dialog.Description>
                    )}
                  </div>
                )}

                <div
                  className={size === 'screen' ? 'flex flex-1 flex-col overflow-hidden' : undefined}
                >
                  {children}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

interface ModalFooterProps {
  children: ReactNode;
  className?: string;
}

export function ModalFooter({ children, className }: ModalFooterProps) {
  return (
    <div className={clsx('mt-6 flex items-center justify-end gap-3', className)}>{children}</div>
  );
}

