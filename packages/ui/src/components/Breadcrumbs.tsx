import { clsx } from 'clsx'
import { ChevronRight, Home } from 'lucide-react'
import type { MouseEvent } from 'react'

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  className?: string
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, href: string) => void
}

export function Breadcrumbs({ items, className, onNavigate }: BreadcrumbsProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    onNavigate?.(event, href)
  }

  return (
    <nav className={clsx('flex items-center space-x-1 text-sm', className)}>
      <a
        href="/"
        className="flex items-center text-gray-400 transition-colors hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
        onClick={(event) => handleClick(event, '/')}
      >
        <Home className="h-4 w-4" />
      </a>

      {items.map((item, index) => {
        const isLast = index === items.length - 1

        return (
          <div key={index} className="flex items-center">
            <ChevronRight className="mx-1 h-4 w-4 text-gray-300 dark:text-gray-600" />
            {isLast || !item.href ? (
              <span
                className={clsx(
                  'font-medium',
                  isLast ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
                )}
              >
                {item.label}
              </span>
            ) : (
              <a
                href={item.href}
                className="text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                onClick={(event) => handleClick(event, item.href!)}
              >
                {item.label}
              </a>
            )}
          </div>
        )
      })}
    </nav>
  )
}
