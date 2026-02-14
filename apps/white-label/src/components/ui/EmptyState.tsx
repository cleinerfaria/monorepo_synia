import { ReactNode } from 'react';
import { clsx } from 'clsx';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={clsx('flex flex-col items-center justify-center py-12 text-center', className)}>
      {icon && <div className="mb-4 h-16 w-16 text-gray-300 dark:text-gray-600">{icon}</div>}
      <h3 className="mb-2 text-lg font-medium text-gray-600 dark:text-gray-400">{title}</h3>
      {description && (
        <p className="mb-4 max-w-sm text-sm text-gray-400 dark:text-gray-500">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
