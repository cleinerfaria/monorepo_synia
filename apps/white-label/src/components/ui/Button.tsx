import { type ComponentPropsWithoutRef } from 'react';
import { createButton } from '@synia/ui';

const baseStyles =
  'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed';

const variants = {
  primary:
    'bg-primary-600/60 hover:bg-primary-600/80 text-white shadow-sm hover:shadow-md focus:ring-primary-600/80 border border-primary-600/90 dark:bg-primary-600/40 dark:hover:bg-primary-600/60',
  secondary:
    'bg-gray-100/50 dark:bg-gray-700/50 hover:bg-gray-200/50 dark:hover:bg-gray-600/50 text-gray-700 dark:text-gray-200 focus:ring-gray-500/50 border border-gray-300/30 dark:border-gray-600/30',
  ghost:
    'hover:bg-gray-100/50 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-300 focus:ring-gray-500/30',
  danger:
    'bg-red-500/50 hover:bg-red-600/50 text-white focus:ring-red-500/50 border border-red-600/20',
} as const;

const sizes = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2.5 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2.5',
} as const;

export const Button = createButton(
  { base: baseStyles, variants, sizes },
  { variant: 'primary', size: 'md' }
);

export type ButtonProps = ComponentPropsWithoutRef<typeof Button>;
