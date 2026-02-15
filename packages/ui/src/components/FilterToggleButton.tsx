import { Button } from './Button'
import type { ButtonProps } from './Button'

export interface FilterToggleButtonProps extends Omit<ButtonProps, 'variant'> {}

export function FilterToggleButton({
  label = 'Filtros',
  ...props
}: FilterToggleButtonProps) {
  return <Button variant="filter" label={label} {...props} />
}
