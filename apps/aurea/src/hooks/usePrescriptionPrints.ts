import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import {
  buildPrescriptionPrintGridSnapshot,
  buildPrescriptionPrintPatientSnapshot,
  buildPrescriptionWeekColumns,
  filterPrescriptionItemsForWeek,
  formatPrescriptionItemDescriptionSnapshot,
  formatPrescriptionPrintFrequency,
  formatPrescriptionRouteSnapshot,
} from '@/lib/prescriptionPrintUtils'
import type {
  PrescriptionPrintHistoryItem,
  PrescriptionPrintOrientation,
  PrescriptionPrintItemSnapshotPayload,
  PrescriptionPrintSourceItem,
  PrescriptionWeekStartDay,
} from '@/types/prescriptionPrint'
import type { GetPrescriptionPrintSnapshotResult, ListPrescriptionPrintsRow } from '@/types/rpcs'

const PRINT_HISTORY_QUERY_KEY = 'prescription-print-history'
const PRINT_SNAPSHOT_QUERY_KEY = 'prescription-print-snapshot'

interface PrescriptionPrintContext {
  id: string
  notes?: string | null
  patient?: {
    name?: string | null
    cpf?: string | null
    birth_date?: string | null
    billing_client?: { name?: string | null } | null
    patient_payer?: Array<{
      is_primary?: boolean | null
      client?: { name?: string | null } | null
    }> | null
  } | null
  professional?: {
    name?: string | null
    role?: string | null
    council_type?: string | null
    council_number?: string | null
    council_uf?: string | null
    signature_path?: string | null
  } | null
}

interface CreatePrescriptionPrintInput {
  prescription: PrescriptionPrintContext
  items: PrescriptionPrintSourceItem[]
  routes: Array<{ id: string; name: string; abbreviation?: string | null }>
  periodStart: string
  periodEnd: string
  weekStartDay: PrescriptionWeekStartDay
  orientation: PrescriptionPrintOrientation
}

interface PrescriptionPrintHistoryFallbackRow {
  id: string
  print_number: string
  period_start: string
  period_end: string
  week_start_day: PrescriptionWeekStartDay
  created_at: string
  created_by: string
}

async function getPrescriptionPrintSnapshotById(
  id: string
): Promise<GetPrescriptionPrintSnapshotResult> {
  const { data, error } = await supabase.rpc('get_prescription_print_snapshot', {
    p_prescription_print_id: id,
  })

  if (error) throw error
  return data as GetPrescriptionPrintSnapshotResult
}

function buildProfessionalCouncil(
  professional: CreatePrescriptionPrintInput['prescription']['professional']
): string {
  if (!professional) return ''
  return [professional.council_type, professional.council_number, professional.council_uf]
    .filter(Boolean)
    .join(' ')
}

function buildItemPayload(
  input: CreatePrescriptionPrintInput,
  periodStart: Date,
  periodEnd: Date
): PrescriptionPrintItemSnapshotPayload[] {
  const routeById = new Map(
    input.routes.map((route) => [route.id, { name: route.name, abbreviation: route.abbreviation }])
  )

  const weekColumns = buildPrescriptionWeekColumns(periodStart, periodEnd)
  const itemsForWeek = filterPrescriptionItemsForWeek(input.items, periodStart, periodEnd)

  return itemsForWeek.map((item, index) => ({
    source_prescription_item_id: item.id,
    order_index: index + 1,
    description_snapshot: formatPrescriptionItemDescriptionSnapshot(item),
    route_snapshot: formatPrescriptionRouteSnapshot(item, routeById),
    frequency_snapshot: formatPrescriptionPrintFrequency(item),
    grid_snapshot: buildPrescriptionPrintGridSnapshot(item, weekColumns),
  }))
}

function buildErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') return ''
  const details = error as { message?: string; details?: string; hint?: string; code?: string }
  return [details.code, details.message, details.details, details.hint]
    .filter(Boolean)
    .join(' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function isAuthorizationError(error: unknown): boolean {
  const message = buildErrorMessage(error)
  return (
    message.includes('nao autenticado') ||
    message.includes('sem permissao') ||
    message.includes('permission denied') ||
    message.includes('jwt')
  )
}

function isRpcStructuralError(error: unknown): boolean {
  const message = buildErrorMessage(error)
  return (
    message.includes('pgrst202') ||
    message.includes('42883') ||
    message.includes('could not find the function') ||
    message.includes('schema cache') ||
    message.includes('function public.list_prescription_prints') ||
    message.includes('returned 0 columns') ||
    message.includes('returned 8 columns')
  )
}

function isFallbackStructuralError(error: unknown): boolean {
  const message = buildErrorMessage(error)
  return (
    message.includes('42p01') ||
    message.includes('42703') ||
    message.includes('relation "prescription_print"') ||
    message.includes('column "created_by"') ||
    message.includes('column "auth_user_id"')
  )
}

async function loadPrescriptionPrintHistoryFallback(
  prescriptionId: string,
  companyId: string
): Promise<PrescriptionPrintHistoryItem[]> {
  const { data: historyRows, error: historyError } = await supabase
    .from('prescription_print')
    .select('id, print_number, period_start, period_end, week_start_day, created_at, created_by')
    .eq('company_id', companyId)
    .eq('prescription_id', prescriptionId)
    .order('created_at', { ascending: false })

  if (historyError) throw historyError

  const rows = (historyRows || []) as PrescriptionPrintHistoryFallbackRow[]
  if (rows.length === 0) return []

  const createdByIds = Array.from(new Set(rows.map((row) => row.created_by).filter(Boolean)))
  const namesByUserId = new Map<string, string>()

  if (createdByIds.length > 0) {
    const { data: users, error: usersError } = await supabase
      .from('app_user')
      .select('auth_user_id, name')
      .eq('company_id', companyId)
      .in('auth_user_id', createdByIds)

    if (usersError) throw usersError
    ;(users || []).forEach((user: any) => {
      if (user?.auth_user_id) {
        namesByUserId.set(user.auth_user_id, user?.name || '')
      }
    })
  }

  return rows.map((row) => ({
    id: row.id,
    print_number: row.print_number,
    period_start: row.period_start,
    period_end: row.period_end,
    week_start_day: row.week_start_day,
    created_at: row.created_at,
    created_by: row.created_by,
    created_by_name: namesByUserId.get(row.created_by) || null,
  }))
}

export function useCreatePrescriptionPrint() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreatePrescriptionPrintInput) => {
      const periodStart = new Date(`${input.periodStart}T12:00:00`)
      const periodEnd = new Date(`${input.periodEnd}T12:00:00`)
      if (Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime())) {
        throw new Error('Periodo inválido para impressão da prescrição')
      }
      if (periodEnd < periodStart) {
        throw new Error('Data final nao pode ser menor que a data inicial')
      }

      const itemsPayload = buildItemPayload(input, periodStart, periodEnd)
      const patientSnapshot = buildPrescriptionPrintPatientSnapshot(input.prescription, periodStart)

      const metadataSnapshot = {
        professional_name: input.prescription.professional?.name || null,
        professional_title: input.prescription.professional?.role || null,
        professional_council: buildProfessionalCouncil(input.prescription.professional) || null,
        professional_signature_path: input.prescription.professional?.signature_path || null,
        period_label: `${format(periodStart, 'dd/MM')} a ${format(periodEnd, 'dd/MM')}`,
        page_orientation: input.orientation,
      }

      const { data, error } = await supabase.rpc('create_prescription_print_snapshot', {
        p_prescription_id: input.prescription.id,
        p_period_start: input.periodStart,
        p_period_end: input.periodEnd,
        p_week_start_day: input.weekStartDay,
        p_patient_snapshot: patientSnapshot,
        p_notes_snapshot: input.prescription.notes || null,
        p_metadata_snapshot: metadataSnapshot,
        p_items: itemsPayload,
      })

      if (error) throw error

      const created = Array.isArray(data) ? data[0] : data
      if (!created?.prescription_print_id) {
        throw new Error('Falha ao gerar impressão da prescrição')
      }

      const snapshot = await getPrescriptionPrintSnapshotById(created.prescription_print_id)

      return {
        prescriptionPrintId: created.prescription_print_id as string,
        printNumber: created.print_number as string,
        snapshot,
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [PRINT_HISTORY_QUERY_KEY, variables.prescription.id],
      })
      toast.success('Prescricao impressa com sucesso')
    },
    onError: (error) => {
      console.error('Error creating prescription print:', error)
      toast.error('Erro ao gerar impressão da prescrição')
    },
  })
}

export function usePrescriptionPrintHistory(
  prescriptionId: string | undefined,
  enabled: boolean = true
) {
  const { company } = useAuthStore()

  return useQuery({
    queryKey: [PRINT_HISTORY_QUERY_KEY, prescriptionId, company?.id],
    queryFn: async () => {
      if (!prescriptionId || !company?.id) return []

      try {
        return await loadPrescriptionPrintHistoryFallback(prescriptionId, company.id)
      } catch (fallbackError) {
        if (isAuthorizationError(fallbackError) || !isFallbackStructuralError(fallbackError)) {
          throw fallbackError
        }
      }

      const rpcResult = await supabase.rpc('list_prescription_prints', {
        p_prescription_id: prescriptionId,
      })
      const { data, error } = rpcResult

      if (error) {
        if (isAuthorizationError(error)) {
          throw error
        }
        if (isRpcStructuralError(error)) {
          return loadPrescriptionPrintHistoryFallback(prescriptionId, company.id)
        }
        throw error
      }

      return (data || []) as ListPrescriptionPrintsRow[] as PrescriptionPrintHistoryItem[]
    },
    enabled: !!prescriptionId && !!company?.id && enabled,
    retry: false,
  })
}

export function usePrescriptionPrintSnapshot(prescriptionPrintId: string | undefined) {
  return useQuery({
    queryKey: [PRINT_SNAPSHOT_QUERY_KEY, prescriptionPrintId],
    queryFn: async () => {
      if (!prescriptionPrintId) return null
      return getPrescriptionPrintSnapshotById(prescriptionPrintId)
    },
    enabled: !!prescriptionPrintId,
  })
}

export function useFetchPrescriptionPrintSnapshot() {
  return useMutation({
    mutationFn: async (prescriptionPrintId: string) =>
      getPrescriptionPrintSnapshotById(prescriptionPrintId),
  })
}

export function useDeletePrescriptionPrint() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      prescriptionPrintId,
    }: {
      prescriptionPrintId: string
      prescriptionId: string
    }) => {
      const { data, error } = await supabase.rpc('delete_prescription_print_snapshot', {
        p_prescription_print_id: prescriptionPrintId,
      })

      if (error) throw error

      const row = Array.isArray(data) ? data[0] : data
      if (!row?.deleted) {
        throw new Error('Falha ao excluir impressao da prescricao')
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [PRINT_HISTORY_QUERY_KEY, variables.prescriptionId],
      })
      queryClient.invalidateQueries({ queryKey: [PRINT_SNAPSHOT_QUERY_KEY] })
      toast.success('Impressao excluida com sucesso')
    },
    onError: (error) => {
      console.error('Error deleting prescription print:', error)
      toast.error('Erro ao excluir impressao da prescricao')
    },
  })
}
