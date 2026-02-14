import { describe, it, expect } from 'vitest'
import { sortPrescriptionItemsByRoute, generateItemNumbers } from '../prescriptionItemSorter'
import type { PrescriptionItem } from '@/types/database'

const mockRoutes = [
  { id: 'route-1', name: 'Oral', prescription_order: 1 },
  { id: 'route-2', name: 'Endovenosa', prescription_order: 2 },
  { id: 'route-3', name: 'Subcutanea', prescription_order: 3 },
  { id: 'route-4', name: 'Intramuscular', prescription_order: 3 },
  { id: 'route-5', name: 'Topica', prescription_order: null },
]

type MockItem = PrescriptionItem & {
  product?: { name?: string | null } | null
  equipment?: { name?: string | null } | null
  procedure?: { name?: string | null } | null
}

const createMockItem = ({
  id,
  routeId,
  productName,
  itemOrder,
  isPrn = false,
  isActive = true,
}: {
  id: string
  routeId: string | null
  productName?: string
  itemOrder?: number | null
  isPrn?: boolean
  isActive?: boolean
}): MockItem =>
  ({
    id,
    company_id: 'company-1',
    prescription_id: 'prescription-1',
    item_type: 'medication',
    route_id: routeId,
    product_id: productName ? `product-${id}` : null,
    equipment_id: null,
    procedure_id: null,
    quantity: 1,
    frequency_mode: null,
    times_value: null,
    times_unit: null,
    interval_minutes: null,
    time_start: null,
    time_checks: null,
    week_days: null,
    start_date: null,
    end_date: null,
    is_prn: isPrn,
    is_continuous_use: true,
    justification: null,
    instructions_use: null,
    instructions_pharmacy: null,
    diluent_text: null,
    item_order: itemOrder ?? null,
    is_active: isActive,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    product: productName ? { name: productName } : null,
  }) as MockItem

describe('prescriptionItemSorter', () => {
  describe('sortPrescriptionItemsByRoute', () => {
    it('sorts items by route prescription_order', () => {
      const items = [
        createMockItem({ id: 'item-1', routeId: 'route-3', productName: 'Ceftriaxona' }),
        createMockItem({ id: 'item-2', routeId: 'route-1', productName: 'Amoxicilina' }),
        createMockItem({ id: 'item-3', routeId: 'route-2', productName: 'Dipirona' }),
      ]

      const sorted = sortPrescriptionItemsByRoute(items, mockRoutes)

      expect(sorted[0].id).toBe('item-2')
      expect(sorted[1].id).toBe('item-3')
      expect(sorted[2].id).toBe('item-1')
    })

    it('uses product name alphabetical order when route order is equal', () => {
      const items = [
        createMockItem({ id: 'item-1', routeId: 'route-3', productName: 'Zinco' }),
        createMockItem({ id: 'item-2', routeId: 'route-4', productName: 'Acetilcisteina' }),
      ]

      const sorted = sortPrescriptionItemsByRoute(items, mockRoutes)

      expect(sorted[0].id).toBe('item-2')
      expect(sorted[1].id).toBe('item-1')
    })

    it('prioritizes manual item_order over automatic route ordering', () => {
      const items = [
        createMockItem({ id: 'item-1', routeId: 'route-1', productName: 'Amoxicilina' }),
        createMockItem({
          id: 'item-2',
          routeId: 'route-3',
          productName: 'Ceftriaxona',
          itemOrder: 1,
        }),
      ]

      const sorted = sortPrescriptionItemsByRoute(items, mockRoutes)

      expect(sorted[0].id).toBe('item-2')
      expect(sorted[1].id).toBe('item-1')
    })

    it('treats null/999 manual order as automatic ordering', () => {
      const items = [
        createMockItem({
          id: 'item-1',
          routeId: 'route-5',
          productName: 'Topico A',
          itemOrder: 999,
        }),
        createMockItem({
          id: 'item-2',
          routeId: 'route-1',
          productName: 'Oral B',
          itemOrder: null,
        }),
      ]

      const sorted = sortPrescriptionItemsByRoute(items, mockRoutes)

      expect(sorted[0].id).toBe('item-2')
      expect(sorted[1].id).toBe('item-1')
    })

    it('puts PRN items last when previous criteria are tied', () => {
      const items = [
        createMockItem({
          id: 'item-1',
          routeId: 'route-3',
          productName: 'Acetilcisteina',
          isPrn: true,
        }),
        createMockItem({
          id: 'item-2',
          routeId: 'route-4',
          productName: 'Acetilcisteina',
          isPrn: false,
        }),
      ]

      const sorted = sortPrescriptionItemsByRoute(items, mockRoutes)

      expect(sorted[0].id).toBe('item-2')
      expect(sorted[1].id).toBe('item-1')
    })

    it('does not mutate original array', () => {
      const items = [
        createMockItem({ id: 'item-1', routeId: 'route-2', productName: 'B' }),
        createMockItem({ id: 'item-2', routeId: 'route-1', productName: 'A' }),
      ]
      const originalOrder = items.map((i) => i.id)

      sortPrescriptionItemsByRoute(items, mockRoutes)

      expect(items.map((i) => i.id)).toEqual(originalOrder)
    })
  })

  describe('generateItemNumbers', () => {
    it('generates sequential numbers following the same sort rules', () => {
      const items = [
        createMockItem({
          id: 'item-1',
          routeId: 'route-2',
          productName: 'Dipirona',
          isActive: true,
        }),
        createMockItem({
          id: 'item-2',
          routeId: 'route-1',
          productName: 'Amoxicilina',
          isActive: true,
        }),
        createMockItem({
          id: 'item-3',
          routeId: 'route-3',
          productName: 'Ceftriaxona',
          isActive: true,
        }),
      ]

      const numbers = generateItemNumbers(items, mockRoutes)

      expect(numbers.get('item-2')).toBe(1)
      expect(numbers.get('item-1')).toBe(2)
      expect(numbers.get('item-3')).toBe(3)
    })

    it('skips inactive items in numbering', () => {
      const items = [
        createMockItem({ id: 'item-1', routeId: 'route-1', productName: 'A', isActive: true }),
        createMockItem({ id: 'item-2', routeId: 'route-2', productName: 'B', isActive: false }),
        createMockItem({ id: 'item-3', routeId: 'route-3', productName: 'C', isActive: true }),
      ]

      const numbers = generateItemNumbers(items, mockRoutes)

      expect(numbers.get('item-1')).toBe(1)
      expect(numbers.has('item-2')).toBe(false)
      expect(numbers.get('item-3')).toBe(2)
    })
  })
})
