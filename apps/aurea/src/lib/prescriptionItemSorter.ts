import type { PrescriptionItem } from '@/types/database'

interface AdministrationRoute {
  id: string
  name: string
  prescription_order: number | null
}

type SortablePrescriptionItem = PrescriptionItem & {
  product?: { name?: string | null } | null
  procedure?: { name?: string | null } | null
  equipment?: { name?: string | null } | null
  name?: string | null
}

function resolveManualOrder(value: number | null | undefined): number | null {
  if (value == null || value === 999) return null
  return value
}

function resolveItemName(item: SortablePrescriptionItem): string {
  return (
    item.product?.name ||
    item.procedure?.name ||
    item.equipment?.name ||
    item.name ||
    ''
  ).trim()
}

/**
 * Sort prescription items using the following precedence:
 * 1) manual item_order (when provided)
 * 2) administration route prescription_order
 * 3) non-PRN items first (is_prn=true goes last)
 * 4) product/item name in alphabetical order
 */
export function sortPrescriptionItemsByRoute(
  items: SortablePrescriptionItem[],
  routes: AdministrationRoute[]
): SortablePrescriptionItem[] {
  const routeMap = new Map(routes.map((r) => [r.id, r]))

  return [...items].sort((a, b) => {
    const manualOrderA = resolveManualOrder(a.item_order)
    const manualOrderB = resolveManualOrder(b.item_order)
    const hasManualOrderA = manualOrderA !== null
    const hasManualOrderB = manualOrderB !== null

    if (hasManualOrderA && hasManualOrderB && manualOrderA !== manualOrderB) {
      return manualOrderA - manualOrderB
    }

    if (hasManualOrderA !== hasManualOrderB) {
      return hasManualOrderA ? -1 : 1
    }

    const routeA = a.route_id ? routeMap.get(a.route_id) : null
    const routeB = b.route_id ? routeMap.get(b.route_id) : null

    const orderA = routeA?.prescription_order ?? 999
    const orderB = routeB?.prescription_order ?? 999

    if (orderA !== orderB) {
      return orderA - orderB
    }

    const isPrnA = a.is_prn === true
    const isPrnB = b.is_prn === true
    if (isPrnA !== isPrnB) {
      return isPrnA ? 1 : -1
    }

    const nameA = resolveItemName(a)
    const nameB = resolveItemName(b)
    const byName = nameA.localeCompare(nameB, 'pt-BR', { sensitivity: 'base' })
    if (byName !== 0) {
      return byName
    }

    return a.id.localeCompare(b.id, 'pt-BR', { sensitivity: 'base' })
  })
}

/**
 * Generate sequential item numbers only for active items.
 */
export function generateItemNumbers(
  items: SortablePrescriptionItem[],
  routes: AdministrationRoute[]
): Map<string, number> {
  const sortedItems = sortPrescriptionItemsByRoute(items, routes)
  const itemNumbers = new Map<string, number>()

  let itemNumber = 1
  sortedItems.forEach((item) => {
    if (item.is_active !== false) {
      itemNumbers.set(item.id, itemNumber)
      itemNumber++
    }
  })

  return itemNumbers
}
