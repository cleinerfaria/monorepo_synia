import { describe, it, expect } from 'vitest'
import { getStatusBadgeConfig } from '@synia/ui'

describe('getStatusBadgeConfig', () => {
  describe('Prescription statuses', () => {
    it('should return correct config for draft status', () => {
      const config = getStatusBadgeConfig('draft')
      expect(config.label).toBe('Rascunho')
      expect(config.variant).toBe('neutral')
    })

    it('should return correct config for active status', () => {
      const config = getStatusBadgeConfig('active')
      expect(config.label).toBe('Ativo')
      expect(config.variant).toBe('success')
    })

    it('should return correct config for suspended status', () => {
      const config = getStatusBadgeConfig('suspended')
      expect(config.label).toBe('Suspensa')
      expect(config.variant).toBe('warning')
    })

    it('should return correct config for finished status', () => {
      const config = getStatusBadgeConfig('finished')
      expect(config.label).toBe('Finalizada')
      expect(config.variant).toBe('info')
    })
  })

  describe('Equipment statuses', () => {
    it('should return correct config for available status', () => {
      const config = getStatusBadgeConfig('available')
      expect(config.label).toBe('Disponível')
      expect(config.variant).toBe('success')
    })

    it('should return correct config for in_use status', () => {
      const config = getStatusBadgeConfig('in_use')
      expect(config.label).toBe('Em Uso')
      expect(config.variant).toBe('cyan')
    })

    it('should return correct config for maintenance status', () => {
      const config = getStatusBadgeConfig('maintenance')
      expect(config.label).toBe('Manutenção')
      expect(config.variant).toBe('warning')
    })

    it('should return correct config for inactive status', () => {
      const config = getStatusBadgeConfig('inactive')
      expect(config.label).toBe('Inativo')
      expect(config.variant).toBe('danger')
    })
  })

  describe('NFe statuses', () => {
    it('should return correct config for importada status', () => {
      const config = getStatusBadgeConfig('importada')
      expect(config.label).toBe('Importada')
      expect(config.variant).toBe('neutral')
    })

    it('should return correct config for pendente status', () => {
      const config = getStatusBadgeConfig('pendente')
      expect(config.label).toBe('Pendente')
      expect(config.variant).toBe('warning')
    })

    it('should return correct config for lancada status', () => {
      const config = getStatusBadgeConfig('lancada')
      expect(config.label).toBe('Lançada')
      expect(config.variant).toBe('success')
    })
  })

  describe('User roles', () => {
    it('should return correct config for admin role', () => {
      const config = getStatusBadgeConfig('admin')
      expect(config.label).toBe('Administrador')
      expect(config.variant).toBe('gold')
    })

    it('should return correct config for clinician role', () => {
      const config = getStatusBadgeConfig('clinician')
      expect(config.label).toBe('Clínico')
      expect(config.variant).toBe('teal')
    })
  })

  describe('Item types', () => {
    it('should return correct config for medication type', () => {
      const config = getStatusBadgeConfig('medication')
      expect(config.label).toBe('Medicamento')
      expect(config.variant).toBe('teal')
    })

    it('should return correct config for material type', () => {
      const config = getStatusBadgeConfig('material')
      expect(config.label).toBe('Material')
      expect(config.variant).toBe('cyan')
    })

    it('should return correct config for procedure type', () => {
      const config = getStatusBadgeConfig('procedure')
      expect(config.label).toBe('Procedimento')
      expect(config.variant).toBe('purple')
    })
  })

  describe('Movement types', () => {
    it('should return correct config for IN movement', () => {
      const config = getStatusBadgeConfig('IN')
      expect(config.label).toBe('Entrada')
      expect(config.variant).toBe('success')
    })

    it('should return correct config for OUT movement', () => {
      const config = getStatusBadgeConfig('OUT')
      expect(config.label).toBe('Saída')
      expect(config.variant).toBe('danger')
    })

    it('should return correct config for ADJUST movement', () => {
      const config = getStatusBadgeConfig('ADJUST')
      expect(config.label).toBe('Ajuste')
      expect(config.variant).toBe('warning')
    })
  })

  describe('Unknown status fallback', () => {
    it('should return neutral variant with original label for unknown status', () => {
      const config = getStatusBadgeConfig('unknown_status')
      expect(config.label).toBe('unknown_status')
      expect(config.variant).toBe('neutral')
    })

    it('should handle empty string', () => {
      const config = getStatusBadgeConfig('')
      expect(config.label).toBe('')
      expect(config.variant).toBe('neutral')
    })
  })

  describe('Normalization and aliases', () => {
    it('should normalize case and whitespace', () => {
      const config = getStatusBadgeConfig('  IN_USE  ')
      expect(config.label).toBe('Em Uso')
      expect(config.variant).toBe('cyan')
    })

    it('should normalize accents and map aliases', () => {
      const config = getStatusBadgeConfig('Lançada')
      expect(config.label).toBe('Lançada')
      expect(config.variant).toBe('success')
    })

    it('should map english aliases to portuguese keys', () => {
      const config = getStatusBadgeConfig('cancelled')
      expect(config.label).toBe('Cancelada')
      expect(config.variant).toBe('danger')
    })
  })
})
