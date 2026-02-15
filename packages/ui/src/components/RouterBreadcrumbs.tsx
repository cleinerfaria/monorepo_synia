import { Link } from 'react-router-dom'
import { clsx } from 'clsx'
import { ChevronRight, Home } from 'lucide-react'
export interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  className?: string
  /** Função opcional para interceptar navegação. Recebe o evento e href. Se chamar e.preventDefault(), impede a navegação. */
  onNavigate?: (e: React.MouseEvent, href: string) => void
}

export function RouterBreadcrumbs({ items, className, onNavigate }: BreadcrumbsProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (onNavigate) {
      onNavigate(e, href)
    }
  }

  return (
    <nav className={clsx('flex items-center space-x-1 text-sm', className)}>
      <Link
        to="/"
        className="flex items-center text-gray-400 transition-colors hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
        onClick={(e) => handleClick(e, '/')}
      >
        <Home className="h-4 w-4" />
      </Link>

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
              <Link
                to={item.href}
                className="text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                onClick={(e) => handleClick(e, item.href!)}
              >
                {item.label}
              </Link>
            )}
          </div>
        )
      })}
    </nav>
  )
}
