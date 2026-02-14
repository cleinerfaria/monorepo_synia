import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IconButton } from '../IconButton'

describe('IconButton', () => {
  describe('rendering', () => {
    it('should render children correctly', () => {
      render(
        <IconButton aria-label="Edit">
          <svg data-testid="icon" />
        </IconButton>
      )
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
      expect(screen.getByTestId('icon')).toBeInTheDocument()
    })

    it('should have type="button" by default', () => {
      render(<IconButton>Icon</IconButton>)
      expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
    })

    it('should apply default variant', () => {
      render(<IconButton>Icon</IconButton>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('text-gray-500')
      expect(button).not.toHaveClass('hover:bg-red-50')
      expect(button).not.toHaveClass('hover:bg-green-50')
      expect(button).not.toHaveClass('hover:bg-orange-50')
    })

    it('should apply danger variant', () => {
      render(<IconButton variant="danger">Icon</IconButton>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('hover:bg-red-50', 'hover:text-red-600')
    })

    it('should apply success variant', () => {
      render(<IconButton variant="success">Icon</IconButton>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('hover:bg-green-50', 'hover:text-green-600')
    })

    it('should apply warning variant', () => {
      render(<IconButton variant="warning">Icon</IconButton>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('hover:bg-orange-50', 'hover:text-orange-600')
    })
  })

  describe('sizes', () => {
    it('should apply medium size by default', () => {
      render(<IconButton>Icon</IconButton>)
      expect(screen.getByRole('button')).toHaveClass('p-2')
    })

    it('should apply small size', () => {
      render(<IconButton size="sm">Icon</IconButton>)
      expect(screen.getByRole('button')).toHaveClass('p-1.5')
    })
  })

  describe('states', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<IconButton disabled>Icon</IconButton>)
      expect(screen.getByRole('button')).toBeDisabled()
    })
  })

  describe('interactions', () => {
    it('should call onClick when clicked', async () => {
      const user = userEvent.setup()
      const handleClick = vi.fn()

      render(<IconButton onClick={handleClick}>Icon</IconButton>)
      await user.click(screen.getByRole('button'))

      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('should not call onClick when disabled', async () => {
      const user = userEvent.setup()
      const handleClick = vi.fn()

      render(
        <IconButton onClick={handleClick} disabled>
          Icon
        </IconButton>
      )
      await user.click(screen.getByRole('button'))

      expect(handleClick).not.toHaveBeenCalled()
    })
  })

  describe('custom props', () => {
    it('should accept custom className', () => {
      render(<IconButton className="custom-class">Icon</IconButton>)
      expect(screen.getByRole('button')).toHaveClass('custom-class')
    })

    it('should pass through HTML button attributes', () => {
      render(
        <IconButton data-testid="icon-btn" title="Edit item">
          Icon
        </IconButton>
      )
      const button = screen.getByTestId('icon-btn')
      expect(button).toHaveAttribute('title', 'Edit item')
    })
  })
})
