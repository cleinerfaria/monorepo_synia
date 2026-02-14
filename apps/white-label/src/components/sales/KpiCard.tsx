import { clsx } from 'clsx';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { KpiData } from '@/types/sales';

interface KpiCardProps extends KpiData {
  className?: string;
  isLoading?: boolean;
}

/**
 * Card de KPI premium com visual sofisticado
 */
export function KpiCard({
  label,
  value,
  change,
  changeLabel,
  icon: Icon,
  color = 'default',
  className,
  isLoading = false,
}: KpiCardProps) {
  const colorStyles = {
    default: {
      bg: 'bg-gray-50 dark:bg-gray-700/30',
      icon: 'text-gray-500 dark:text-gray-400',
      value: 'text-gray-900 dark:text-white',
    },
    success: {
      bg: 'bg-primary-50 dark:bg-primary-900/20',
      icon: 'text-primary-500 dark:text-primary-400',
      value: 'text-gray-900 dark:text-white',
    },
    teal: {
      bg: 'bg-primary-50 dark:bg-primary-900/20',
      icon: 'text-primary-600 dark:text-primary-400',
      value: 'text-primary-700 dark:text-primary-300',
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      icon: 'text-amber-500 dark:text-amber-400',
      value: 'text-gray-900 dark:text-white',
    },
    danger: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      icon: 'text-red-500 dark:text-red-400',
      value: 'text-gray-900 dark:text-white',
    },
  };

  const styles = colorStyles[color];

  const getTrendIcon = () => {
    if (change === undefined || change === 0) {
      return <Minus className="h-3.5 w-3.5 text-gray-400" />;
    }
    if (change > 0) {
      return <TrendingUp className="h-3.5 w-3.5 text-primary-500" />;
    }
    return <TrendingDown className="h-3.5 w-3.5 text-red-500" />;
  };

  const getTrendColor = () => {
    if (change === undefined || change === 0) return 'text-gray-500';
    return change > 0 ? 'text-primary-600 dark:text-primary-400' : 'text-red-600 dark:text-red-400';
  };

  return (
    <div
      className={clsx(
        'relative rounded-2xl border border-gray-100 bg-white p-5 shadow-sm',
        'dark:border-gray-700/50 dark:bg-gray-800/50',
        'backdrop-blur-sm transition-all duration-300',
        'hover:border-gray-200 hover:shadow-md dark:hover:border-gray-600',
        'z-10 overflow-hidden',
        className
      )}
    >
      {/* Background blur decorativo */}
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-gray-100/50 to-transparent dark:from-gray-700/30" />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/60 backdrop-blur-[1px] dark:bg-gray-800/60">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-500 border-t-transparent dark:border-primary-400 dark:border-t-transparent" />
        </div>
      )}

      <div className="relative">
        {/* Header com ícone */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {label}
            </p>
            <p className={clsx('mt-2 text-2xl font-bold tracking-tight', styles.value)}>{value}</p>
          </div>

          {Icon && (
            <div className={clsx('rounded-xl p-2.5', styles.bg)}>
              <Icon className={clsx('h-5 w-5', styles.icon)} />
            </div>
          )}
        </div>

        {/* Variação */}
        {change !== undefined && (
          <div className="mt-3 flex items-center gap-1.5">
            {getTrendIcon()}
            <span className={clsx('text-sm font-medium', getTrendColor())}>
              {change > 0 ? '+' : ''}
              {change.toFixed(1)}%
            </span>
            {changeLabel && (
              <span className="text-xs text-gray-400 dark:text-gray-500">{changeLabel}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
