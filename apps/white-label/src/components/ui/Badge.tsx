import { clsx } from 'clsx';

type BadgeVariant = 'primary' | 'gold' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = 'neutral', className }: BadgeProps) {
  const variants = {
    primary: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400',
    gold: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400',
    success: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    danger: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    neutral: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

// Status-specific badges for common use cases
export function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; variant: BadgeVariant }> = {
    // Prescription statuses
    draft: { label: 'Rascunho', variant: 'neutral' },
    active: { label: 'Ativo', variant: 'success' },
    suspended: { label: 'Suspensa', variant: 'warning' },
    finished: { label: 'Finalizada', variant: 'info' },

    // Equipment statuses
    available: { label: 'Disponível', variant: 'success' },
    in_use: { label: 'Em Uso', variant: 'info' },
    maintenance: { label: 'Manutenção', variant: 'warning' },
    inactive: { label: 'Inativo', variant: 'danger' },

    // NFe statuses (Portuguese)
    importada: { label: 'Importada', variant: 'neutral' },
    pendente: { label: 'Pendente', variant: 'warning' },
    lancada: { label: 'Lançada', variant: 'success' },
    processada: { label: 'Processada', variant: 'success' },
    error: { label: 'Erro', variant: 'danger' },

    // NFe statuses (English - fallback)
    imported: { label: 'Importada', variant: 'neutral' },
    pending: { label: 'Pendente', variant: 'warning' },
    processed: { label: 'Processada', variant: 'success' },
    launched: { label: 'Lançada', variant: 'success' },
    cancelled: { label: 'Cancelada', variant: 'danger' },
    parsed: { label: 'Importada', variant: 'info' },
    posted: { label: 'Lançada', variant: 'success' },

    // User roles
    admin: { label: 'Administrador', variant: 'primary' },
    manager: { label: 'Gerente', variant: 'info' },
    clinician: { label: 'Clínico', variant: 'success' },
    stock: { label: 'Estoque', variant: 'warning' },
    finance: { label: 'Financeiro', variant: 'info' },
    viewer: { label: 'Visualizador', variant: 'neutral' },

    // Client types
    insurer: { label: 'Operadora', variant: 'info' },
    company: { label: 'Empresa', variant: 'primary' },
    individual: { label: 'Pessoa Física', variant: 'neutral' },

    // Item types
    medication: { label: 'Medicamento', variant: 'info' },
    material: { label: 'Material', variant: 'warning' },
    diet: { label: 'Dieta', variant: 'success' },
    equipment: { label: 'Equipamento', variant: 'primary' },

    // Movement types
    IN: { label: 'Entrada', variant: 'success' },
    OUT: { label: 'Saída', variant: 'danger' },
    ADJUST: { label: 'Ajuste', variant: 'warning' },
  };

  const config = statusConfig[status] || {
    label: status,
    variant: 'neutral' as BadgeVariant,
  };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
