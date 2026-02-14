import { useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { ClipboardList, Edit, LayoutGrid, Plus, Trash } from 'lucide-react';
import { Card, Button, DataTable, EmptyState, Badge } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import {
  useEvaluations,
  useEvaluationAspects,
  useDeleteEvaluation,
  useDeleteAspect,
  useEvaluationInstances,
  EvaluationDefinition,
  EvaluationAspect,
} from '@/hooks/useWhatsappAspects';
import { useWhatsappInstances } from '@/hooks/useWhatsappInstances';
import { useWhatsappPermissions } from '@/hooks/useWhatsappPermissions';
import EvaluationModal from '@/pages/whatsapp/EvaluationModal';
import AspectModal from '@/pages/whatsapp/AspectModal';
import toast from 'react-hot-toast';

export default function AspectsPage() {
  const { company } = useAuthStore();
  const { canManageAspects } = useWhatsappPermissions();
  const [searchEvaluations, setSearchEvaluations] = useState('');
  const [searchAspects, setSearchAspects] = useState('');
  const [selectedEvaluation, setSelectedEvaluation] = useState<EvaluationDefinition | null>(null);
  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);
  const [isAspectModalOpen, setIsAspectModalOpen] = useState(false);
  const [selectedAspect, setSelectedAspect] = useState<EvaluationAspect | null>(null);

  const { data: evaluations = [], isLoading: isLoadingEvaluations } = useEvaluations(company?.id);
  const { data: instances = [] } = useWhatsappInstances(company?.id);
  const { data: aspects = [], isLoading: isLoadingAspects } = useEvaluationAspects(
    selectedEvaluation?.id
  );

  const deleteEvaluation = useDeleteEvaluation();
  const deleteAspect = useDeleteAspect();

  const filteredEvaluations = useMemo(() => {
    if (!searchEvaluations.trim()) return evaluations;
    const query = searchEvaluations.toLowerCase();
    return evaluations.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        (item.description || '').toLowerCase().includes(query)
    );
  }, [evaluations, searchEvaluations]);

  const filteredAspects = useMemo(() => {
    if (!searchAspects.trim()) return aspects;
    const query = searchAspects.toLowerCase();
    return aspects.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        (item.instructions || '').toLowerCase().includes(query)
    );
  }, [aspects, searchAspects]);

  const aspectColumns: ColumnDef<EvaluationAspect>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Aspecto',
        cell: ({ row }: { row: any }) => (
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{row.original.name}</p>
            <p className="text-sm text-gray-500">{row.original.instructions || 'Sem instrucoes'}</p>
          </div>
        ),
      },
      {
        accessorKey: 'weight',
        header: 'Peso',
        cell: ({ row }: { row: any }) => (
          <span className="text-sm text-gray-600">{row.original.weight ?? '-'}</span>
        ),
      },
      {
        accessorKey: 'sort_order',
        header: 'Ordem',
        cell: ({ row }: { row: any }) => <span>{row.original.sort_order}</span>,
      },
      {
        accessorKey: 'active',
        header: 'Status',
        cell: ({ row }: { row: any }) => (
          <Badge variant={row.original.active ? 'success' : 'neutral'}>
            {row.original.active ? 'Ativo' : 'Inativo'}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }: { row: any }) => (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedAspect(row.original);
                setIsAspectModalOpen(true);
              }}
              disabled={!canManageAspects}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              onClick={async (e) => {
                e.stopPropagation();
                if (!confirm(`Excluir aspecto "${row.original.name}"?`)) return;
                try {
                  await deleteAspect.mutateAsync(row.original.id);
                  toast.success('Aspecto excluido');
                } catch (error: any) {
                  toast.error(error.message || 'Erro ao excluir aspecto');
                }
              }}
              disabled={!canManageAspects}
              className="rounded-lg p-2 text-red-500 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/30"
            >
              <Trash className="h-4 w-4" />
            </button>
          </div>
        ),
      },
    ],
    [canManageAspects, deleteAspect]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
            Aspectos
          </h1>
          <p className="text-sm text-gray-500">Defina os criterios para avaliacao de atendimento</p>
        </div>
        {canManageAspects && (
          <Button
            onClick={() => {
              setSelectedEvaluation(null);
              setIsEvaluationModalOpen(true);
            }}
          >
            <Plus className="h-5 w-5" />
            Nova avaliacao
          </Button>
        )}
      </div>

      <Card padding="none">
        <div className="space-y-4 p-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative w-full sm:w-[30%]">
              <input
                type="text"
                placeholder="Buscar avaliacao..."
                value={searchEvaluations}
                onChange={(e) => setSearchEvaluations(e.target.value)}
                className="focus:ring-primary-500 w-full rounded-lg border border-gray-300 bg-white py-2 pl-4 pr-4 text-gray-900 placeholder-gray-500 focus:border-transparent focus:ring-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>

          {/* Cards de Avaliações */}
          {isLoadingEvaluations ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500">Carregando avaliações...</div>
            </div>
          ) : filteredEvaluations.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="h-12 w-12 text-gray-400" />}
              title="Nenhuma avaliacao cadastrada"
              description="Crie sua primeira avaliacao para adicionar aspectos"
              action={
                canManageAspects ? (
                  <Button
                    onClick={() => {
                      setSelectedEvaluation(null);
                      setIsEvaluationModalOpen(true);
                    }}
                    size="sm"
                  >
                    <Plus className="h-4 w-4" />
                    Nova avaliacao
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto pb-2">
              <div className="flex min-w-max gap-4">
                {filteredEvaluations.map((evaluation) => (
                  <EvaluationCard
                    key={evaluation.id}
                    evaluation={evaluation}
                    instances={instances}
                    canManageAspects={canManageAspects}
                    onSelect={setSelectedEvaluation}
                    onEdit={(evaluation) => {
                      setSelectedEvaluation(evaluation);
                      setIsEvaluationModalOpen(true);
                    }}
                    onDelete={async (evaluation) => {
                      if (!confirm(`Excluir avaliacao "${evaluation.name}"?`)) return;
                      try {
                        await deleteEvaluation.mutateAsync(evaluation.id);
                        toast.success('Avaliacao excluida');
                      } catch (error: any) {
                        toast.error(error.message || 'Erro ao excluir avaliacao');
                      }
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card padding="none">
        <div className="space-y-4 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Aspectos da avaliacao
              </h2>
              <p className="text-sm text-gray-500">
                {selectedEvaluation ? selectedEvaluation.name : 'Selecione uma avaliacao'}
              </p>
            </div>
            {canManageAspects && selectedEvaluation && (
              <Button
                size="sm"
                onClick={() => {
                  setSelectedAspect(null);
                  setIsAspectModalOpen(true);
                }}
              >
                <LayoutGrid className="h-4 w-4" />
                Novo aspecto
              </Button>
            )}
          </div>

          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative w-full sm:w-[30%]">
              <input
                type="text"
                placeholder="Buscar aspecto..."
                value={searchAspects}
                onChange={(e) => setSearchAspects(e.target.value)}
                className="focus:ring-primary-500 w-full rounded-lg border border-gray-300 bg-white py-2 pl-4 pr-4 text-gray-900 placeholder-gray-500 focus:border-transparent focus:ring-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>

          <DataTable
            data={selectedEvaluation ? filteredAspects : []}
            columns={aspectColumns}
            isLoading={isLoadingAspects}
            emptyState={
              <EmptyState
                icon={<LayoutGrid className="h-12 w-12 text-gray-400" />}
                title={selectedEvaluation ? 'Nenhum aspecto cadastrado' : 'Selecione uma avaliacao'}
                description={
                  selectedEvaluation
                    ? 'Crie aspectos para orientar as avaliacoes'
                    : 'Escolha uma avaliacao acima para gerenciar aspectos'
                }
                action={
                  selectedEvaluation && canManageAspects ? (
                    <Button size="sm" onClick={() => setIsAspectModalOpen(true)}>
                      <Plus className="h-4 w-4" />
                      Novo aspecto
                    </Button>
                  ) : undefined
                }
              />
            }
          />
        </div>
      </Card>

      <EvaluationModal
        isOpen={isEvaluationModalOpen}
        onClose={() => {
          setIsEvaluationModalOpen(false);
        }}
        companyId={company?.id || ''}
        evaluation={selectedEvaluation}
      />

      {selectedEvaluation && (
        <AspectModal
          isOpen={isAspectModalOpen}
          onClose={() => {
            setIsAspectModalOpen(false);
            setSelectedAspect(null);
          }}
          companyId={company?.id || ''}
          evaluationId={selectedEvaluation.id}
          aspect={selectedAspect}
        />
      )}
    </div>
  );
}

interface EvaluationCardProps {
  evaluation: EvaluationDefinition;
  instances: any[];
  canManageAspects: boolean;
  onSelect: (evaluation: EvaluationDefinition) => void;
  onEdit: (evaluation: EvaluationDefinition) => void;
  onDelete: (evaluation: EvaluationDefinition) => void;
}

function EvaluationCard({
  evaluation,
  instances,
  canManageAspects,
  onSelect,
  onEdit,
  onDelete,
}: EvaluationCardProps) {
  const { data: instanceIds = [] } = useEvaluationInstances(evaluation.id);

  const truncateDescription = (text: string | null, maxLength: number = 200) => {
    if (!text) return 'Sem descrição';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const renderInstancesInfo = () => {
    if (instanceIds.length === 0) {
      return (
        <div className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
          Global
        </div>
      );
    }

    const associatedInstances = instances.filter((i) => instanceIds.includes(i.id));

    return (
      <div className="flex flex-wrap gap-1">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400"></span>
        {associatedInstances.map((instance, _index) => (
          <div
            key={instance.id}
            className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
          >
            {instance.name}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div
      className="w-80 flex-shrink-0 cursor-pointer rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-gray-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600"
      onClick={() => onSelect(evaluation)}
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-gray-900 dark:text-white">
            {evaluation.name}
          </h3>
          <Badge variant={evaluation.active ? 'success' : 'neutral'} className="mt-1">
            {evaluation.active ? 'Ativa' : 'Inativa'}
          </Badge>
        </div>
        {canManageAspects && (
          <div className="ml-2 flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(evaluation);
              }}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(evaluation);
              }}
              className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-900/30"
            >
              <Trash className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <p className="mb-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
        {truncateDescription(evaluation.description)}
      </p>

      <div className="space-y-2">{renderInstancesInfo()}</div>
    </div>
  );
}
