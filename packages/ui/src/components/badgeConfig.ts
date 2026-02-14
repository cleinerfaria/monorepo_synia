import type { BadgeVariant } from './badgeProfile'

interface StatusBadgeConfig {
  label: string
  variant: BadgeVariant
}

const DEFAULT_BADGE_VARIANT: BadgeVariant = 'neutral'

const STATUS_BADGE_CONFIG: Record<string, StatusBadgeConfig> = {
  draft: { label: 'Rascunho', variant: 'neutral' },
  active: { label: 'Ativo', variant: 'success' },
  suspended: { label: 'Suspensa', variant: 'warning' },
  finished: { label: 'Finalizada', variant: 'info' },
  available: { label: 'Disponível', variant: 'success' },
  in_use: { label: 'Em Uso', variant: 'cyan' },
  maintenance: { label: 'Manutenção', variant: 'warning' },
  inactive: { label: 'Inativo', variant: 'danger' },
  importada: { label: 'Importada', variant: 'neutral' },
  pendente: { label: 'Pendente', variant: 'warning' },
  lancada: { label: 'Lançada', variant: 'success' },
  processada: { label: 'Processada', variant: 'success' },
  parsed: { label: 'Importada', variant: 'info' },
  cancelada: { label: 'Cancelada', variant: 'danger' },
  error: { label: 'Erro', variant: 'danger' },
  admin: { label: 'Administrador', variant: 'gold' },
  manager: { label: 'Gerente', variant: 'purple' },
  clinician: { label: 'Clínico', variant: 'teal' },
  stock: { label: 'Estoque', variant: 'warning' },
  finance: { label: 'Financeiro', variant: 'info' },
  viewer: { label: 'Visualizador', variant: 'neutral' },
  insurer: { label: 'Operadora', variant: 'gold' },
  company: { label: 'Empresa', variant: 'info' },
  individual: { label: 'Pessoa Física', variant: 'neutral' },
  medication: { label: 'Medicamento', variant: 'teal' },
  material: { label: 'Material', variant: 'cyan' },
  diet: { label: 'Dieta', variant: 'gold' },
  equipment: { label: 'Equipamento', variant: 'info' },
  procedure: { label: 'Procedimento', variant: 'purple' },
  medical: { label: 'Médica', variant: 'teal' },
  nursing: { label: 'Enfermagem', variant: 'pink' },
  nutrition: { label: 'Nutrição', variant: 'gold' },
  in: { label: 'Entrada', variant: 'success' },
  out: { label: 'Saída', variant: 'danger' },
  adjust: { label: 'Ajuste', variant: 'warning' },
  family: { label: 'Família', variant: 'purple' },
  government: { label: 'Governo', variant: 'gold' },
  other: { label: 'Outros', variant: 'neutral' },
}

const STATUS_ALIASES: Record<string, string> = {
  imported: 'importada',
  pending: 'pendente',
  launched: 'lancada',
  posted: 'lancada',
  processed: 'processada',
  cancelled: 'cancelada',
  canceled: 'cancelada',
  erro: 'error',
  em_uso: 'in_use',
  manutencao: 'maintenance',
  entrada: 'in',
  saida: 'out',
  ajuste: 'adjust',
}

const normalizeStatusKey = (status: string) =>
  status
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[-\s]+/g, '_')

export const getStatusBadgeConfig = (status: string): StatusBadgeConfig => {
  const normalizedStatus = normalizeStatusKey(status)
  const normalizedAlias = STATUS_ALIASES[normalizedStatus] || normalizedStatus

  return (
    STATUS_BADGE_CONFIG[normalizedAlias] || {
      label: status,
      variant: DEFAULT_BADGE_VARIANT,
    }
  )
}
