import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { MoreVertical } from 'lucide-react'

interface DropdownMenuProps {
  children: React.ReactNode
  trigger?: React.ReactNode
  buttonClassName?: string
  portal?: boolean
}

interface DropdownMenuItemProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  disabled?: boolean
}

export function DropdownMenu({
  children,
  trigger,
  buttonClassName = 'rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-border-focus/40 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200',
  portal = false,
}: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [openAbove, setOpenAbove] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const menuRef = useRef<HTMLDivElement>(null)
  const menuContentRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const updateMenuPosition = useCallback(() => {
    if (!buttonRef.current) return

    const buttonRect = buttonRef.current.getBoundingClientRect()
    const menuHeight = 200
    const menuWidth = 192 // Tailwind w-48
    const offset = 8
    const spaceBelow = window.innerHeight - buttonRect.bottom
    const shouldOpenAbove = spaceBelow < menuHeight

    setOpenAbove(shouldOpenAbove)

    const nextLeft = Math.min(
      Math.max(offset, buttonRect.right - menuWidth),
      window.innerWidth - menuWidth - offset
    )

    setMenuPosition({
      left: nextLeft,
      top: shouldOpenAbove ? buttonRect.top - offset : buttonRect.bottom + offset,
    })
  }, [])

  const handleOpen = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()

    if (isOpen) {
      setIsOpen(false)
      return
    }

    // Calculate position before opening to avoid visual jump.
    updateMenuPosition()
    setIsOpen(true)
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      if (menuRef.current?.contains(target) || menuContentRef.current?.contains(target)) return
      setIsOpen(false)
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !portal) return

    const handleReposition = () => updateMenuPosition()
    window.addEventListener('resize', handleReposition)
    window.addEventListener('scroll', handleReposition, true)

    return () => {
      window.removeEventListener('resize', handleReposition)
      window.removeEventListener('scroll', handleReposition, true)
    }
  }, [isOpen, portal, updateMenuPosition])

  const menuContent = (
    <div
      ref={menuContentRef}
      className={`z-50 w-48 rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-gray-800 dark:ring-gray-700 ${
        portal
          ? 'fixed origin-top-right'
          : `absolute right-0 ${
              openAbove ? 'bottom-full mb-2 origin-bottom-right' : 'top-full mt-2 origin-top-right'
            }`
      }`}
      style={
        portal
          ? {
              top: menuPosition.top,
              left: menuPosition.left,
              transform: openAbove ? 'translateY(-100%)' : undefined,
            }
          : undefined
      }
      onClick={(e) => {
        e.stopPropagation()
        setIsOpen(false)
      }}
    >
      {children}
    </div>
  )

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button ref={buttonRef} type="button" className={buttonClassName} onClick={handleOpen}>
        {trigger || <MoreVertical className="h-4 w-4" />}
      </button>

      {isOpen &&
        (portal && typeof document !== 'undefined'
          ? createPortal(menuContent, document.body)
          : menuContent)}
    </div>
  )
}

export function DropdownMenuItem({
  children,
  onClick,
  className = '',
  disabled = false,
}: DropdownMenuItemProps) {
  return (
    <button
      type="button"
      className={`block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-700 ${className}`}
      onClick={(e) => {
        e.stopPropagation()
        onClick?.()
      }}
      disabled={disabled}
    >
      {children}
    </button>
  )
}
