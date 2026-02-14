import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge, StatusBadge } from '@synia/ui'

describe('Badge', () => {
  describe('rendering', () => {
    it('should render children correctly', () => {
      render(<Badge>Test Badge</Badge>)
      expect(screen.getByText('Test Badge')).toBeInTheDocument()
    })

    it('should apply neutral variant by default', () => {
      render(<Badge>Default</Badge>)
      const badge = screen.getByText('Default')
      expect(badge).toHaveClass('badge-neutral')
    })
  })

  describe('variants', () => {
    it('should apply success variant', () => {
      render(<Badge variant="success">Success</Badge>)
      expect(screen.getByText('Success')).toHaveClass('badge-success')
    })

    it('should apply warning variant', () => {
      render(<Badge variant="warning">Warning</Badge>)
      expect(screen.getByText('Warning')).toHaveClass('badge-warning')
    })

    it('should apply danger variant', () => {
      render(<Badge variant="danger">Danger</Badge>)
      expect(screen.getByText('Danger')).toHaveClass('badge-danger')
    })

    it('should apply info variant', () => {
      render(<Badge variant="info">Info</Badge>)
      expect(screen.getByText('Info')).toHaveClass('badge-info')
    })

    it('should apply gold variant', () => {
      render(<Badge variant="gold">Gold</Badge>)
      expect(screen.getByText('Gold')).toHaveClass('badge-gold')
    })

    it('should apply neutral variant', () => {
      render(<Badge variant="neutral">Neutral</Badge>)
      expect(screen.getByText('Neutral')).toHaveClass('badge-neutral')
    })

    it('should apply teal variant', () => {
      render(<Badge variant="teal">Teal</Badge>)
      expect(screen.getByText('Teal')).toHaveClass('badge-teal')
    })

    it('should apply cyan variant', () => {
      render(<Badge variant="cyan">Cyan</Badge>)
      expect(screen.getByText('Cyan')).toHaveClass('badge-cyan')
    })

    it('should apply purple variant', () => {
      render(<Badge variant="purple">Purple</Badge>)
      expect(screen.getByText('Purple')).toHaveClass('badge-purple')
    })

    it('should apply pink variant', () => {
      render(<Badge variant="pink">Pink</Badge>)
      expect(screen.getByText('Pink')).toHaveClass('badge-pink')
    })
  })

  describe('custom styling', () => {
    it('should accept custom className', () => {
      render(<Badge className="custom-class">Custom</Badge>)
      expect(screen.getByText('Custom')).toHaveClass('custom-class')
    })

    it('should have base styling', () => {
      render(<Badge>Base</Badge>)
      const badge = screen.getByText('Base')
      expect(badge).toHaveClass(
        'inline-flex',
        'items-center',
        'rounded-full',
        'text-xs',
        'font-medium'
      )
    })
  })
})

describe('StatusBadge', () => {
  it('should render correct label and variant for draft status', () => {
    render(<StatusBadge status="draft" />)
    expect(screen.getByText('Rascunho')).toBeInTheDocument()
  })

  it('should render correct label and variant for active status', () => {
    render(<StatusBadge status="active" />)
    const badge = screen.getByText('Ativo')
    expect(badge).toHaveClass('badge-success')
  })

  it('should render correct label and variant for admin role', () => {
    render(<StatusBadge status="admin" />)
    const badge = screen.getByText('Administrador')
    expect(badge).toHaveClass('badge-gold')
  })

  it('should render correct label and variant for medication type', () => {
    render(<StatusBadge status="medication" />)
    const badge = screen.getByText('Medicamento')
    expect(badge).toHaveClass('badge-teal')
  })

  it('should handle unknown status with fallback', () => {
    render(<StatusBadge status="unknown_status" />)
    expect(screen.getByText('unknown_status')).toBeInTheDocument()
  })

  it('should render NFe statuses in Portuguese', () => {
    render(<StatusBadge status="importada" />)
    expect(screen.getByText('Importada')).toBeInTheDocument()
  })

  it('should render movement types correctly', () => {
    render(<StatusBadge status="IN" />)
    const badge = screen.getByText('Entrada')
    expect(badge).toHaveClass('badge-success')
  })
})
