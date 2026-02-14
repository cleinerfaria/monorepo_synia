import { describe, it, expect } from 'vitest'
import {
  formatCompactTimeChecks,
  formatCompactInstructions,
  formatAdministrationGuidance,
  formatTimeAndGuidance,
} from '../prescriptionFormatters'

describe('prescriptionFormatters', () => {
  describe('formatCompactTimeChecks', () => {
    it('should return dash for null input', () => {
      expect(formatCompactTimeChecks(null)).toBe('-')
    })

    it('should return empty string for empty array', () => {
      // Array vazio retorna string vazia (join de array vazio)
      expect(formatCompactTimeChecks([])).toBe('')
    })

    it('should format array of times removing seconds and leading zeros', () => {
      const times = ['08:00:00', '12:00:00', '17:15:00']
      expect(formatCompactTimeChecks(times)).toBe('8:00, 12:00, 17:15')
    })

    it('should handle string input with comma-separated times', () => {
      const times = '08:00:00, 14:00:00, 20:00:00'
      expect(formatCompactTimeChecks(times)).toBe('8:00, 14:00, 20:00')
    })

    it('should handle single time', () => {
      expect(formatCompactTimeChecks(['09:30:00'])).toBe('9:30')
    })

    it('should handle times without leading zeros', () => {
      expect(formatCompactTimeChecks(['8:00:00', '12:00:00'])).toBe('8:00, 12:00')
    })

    it('should preserve minutes when not :00', () => {
      expect(formatCompactTimeChecks(['08:30:00', '17:45:00'])).toBe('8:30, 17:45')
    })
  })

  describe('formatCompactInstructions', () => {
    it('should return dash for null input', () => {
      expect(formatCompactInstructions(null)).toBe('-')
    })

    it('should return full text if under 50 chars', () => {
      const text = 'Administrar com água'
      expect(formatCompactInstructions(text)).toBe(text)
    })

    it('should truncate text over 50 chars with ellipsis', () => {
      const text = 'Administrar lentamente por via endovenosa durante 30 minutos com monitorização'
      const result = formatCompactInstructions(text)
      // O trim() pode remover 1 caractere, então verificamos apenas que termina com ...
      expect(result.length).toBeLessThanOrEqual(53)
      expect(result).toMatch(/\.\.\.$/)
    })

    it('should handle exactly 50 chars', () => {
      const text = '12345678901234567890123456789012345678901234567890' // 50 chars
      expect(formatCompactInstructions(text)).toBe(text)
    })
  })

  describe('formatAdministrationGuidance', () => {
    it('should return dash for no route and no instructions', () => {
      expect(formatAdministrationGuidance(null, null)).toBe('-')
      expect(formatAdministrationGuidance(undefined, undefined)).toBe('-')
    })

    it('should return route name only', () => {
      expect(formatAdministrationGuidance({ name: 'Oral' }, null)).toBe('Oral')
    })

    it('should return instructions only', () => {
      expect(formatAdministrationGuidance(null, 'Com água')).toBe('Com água')
    })

    it('should combine route and instructions with separator', () => {
      expect(formatAdministrationGuidance({ name: 'Endovenosa' }, 'Infusão lenta')).toBe(
        'Endovenosa • Infusão lenta'
      )
    })
  })

  describe('formatTimeAndGuidance', () => {
    it('should return dash when all inputs are null', () => {
      expect(formatTimeAndGuidance(null, null, null)).toBe('-')
    })

    it('should return only times when no guidance', () => {
      expect(formatTimeAndGuidance(['08:00:00', '20:00:00'], null, null)).toBe('8:00, 20:00')
    })

    it('should return only guidance when no times', () => {
      expect(formatTimeAndGuidance(null, { name: 'Oral' }, 'Com alimentos')).toBe(
        'Oral • Com alimentos'
      )
    })

    it('should combine times and guidance', () => {
      expect(formatTimeAndGuidance(['08:00:00'], { name: 'IV' }, 'Lento')).toBe('8:00 • IV • Lento')
    })
  })
})
