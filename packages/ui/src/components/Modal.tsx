import { Fragment, ReactNode } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { clsx } from 'clsx'
import { X } from 'lucide-react'
interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' | 'screen'
  /** Se true, não fecha ao clicar no backdrop ou pressionar ESC */
  static?: boolean
  /** Se true, usa z-index maior para modais aninhados */
  nested?: boolean
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
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
  }

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
          <div className="fixed inset-0 bg-overlay/50 backdrop-blur-sm" />
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
                  sizes[size]
                )}
              >
                {(title || description) && (
                  <div className={size === 'screen' ? 'mb-4 flex-shrink-0' : 'mb-6'}>
                    <div className="flex items-start justify-between">
                      {title && (
                        <Dialog.Title
                          as="h3"
                          className="font-display text-xl font-semibold text-content-primary"
                        >
                          {title}
                        </Dialog.Title>
                      )}
                      <button
                        type="button"
                        className="rounded-lg p-1 text-content-muted transition-colors hover:bg-surface-hover hover:text-content-secondary"
                        onClick={onClose}
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    {description && (
                      <Dialog.Description className="mt-2 text-sm text-content-muted">
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
  )
}

interface ModalFooterProps {
  children: ReactNode
  className?: string
}

export function ModalFooter({ children, className }: ModalFooterProps) {
  return (
    <div className={clsx('mt-6 flex items-center justify-end gap-3', className)}>{children}</div>
  )
}
