import { useEffect, useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Pencil, Briefcase, Search, FunnelX, Plus } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  DataTable,
  ListPagination,
  EmptyState,
  Input,
  Modal,
  ModalFooter,
  SwitchNew,
  Textarea,
  IconButton,
} from '@/components/ui';
import { useProfessions, useCreateProfession, useUpdateProfession } from '@/hooks/useProfessions';
import { useListPageState } from '@/hooks/useListPageState';
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination';
import { useForm } from 'react-hook-form';
import type { Profession } from '@/hooks/useProfessions';

interface ProfessionFormData {
  name: string;
  code: string;
  description: string;
  active: boolean;
}

const PAGE_SIZE = DEFAULT_LIST_PAGE_SIZE;

export default function ProfessionsPage() {
  const { data: professions = [], isLoading } = useProfessions();
  const createProfession = useCreateProfession();
  const updateProfession = useUpdateProfession();

  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [currentPage, setCurrentPage] = useListPageState();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProfession, setSelectedProfession] = useState<Profession | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProfessionFormData>();

  const { name: activeName, ref: activeRef, onBlur: activeOnBlur } = register('active');
  const activeValue = watch('active');

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearchTerm(searchInput);
      setCurrentPage(1);
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchInput, setCurrentPage]);

  const filteredProfessions = useMemo(() => {
    if (!searchTerm) return professions;

    const normalizedSearch = searchTerm.toLowerCase();
    return professions.filter((profession) =>
      [profession.name, profession.code, profession.description].some((value) =>
        String(value ?? '')
          .toLowerCase()
          .includes(normalizedSearch)
      )
    );
  }, [professions, searchTerm]);

  const hasActiveSearch = searchTerm.trim().length > 0;

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const totalCount = filteredProfessions.length;
  const totalPages = Math.max(Math.ceil(totalCount / PAGE_SIZE), 1);
  const paginatedProfessions = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredProfessions.slice(start, start + PAGE_SIZE);
  }, [filteredProfessions, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages, setCurrentPage]);

  const openCreateModal = () => {
    setSelectedProfession(null);
    reset({
      name: '',
      code: '',
      description: '',
      active: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (profession: Profession) => {
    setSelectedProfession(profession);
    reset({
      name: profession.name,
      code: profession.code || '',
      description: profession.description || '',
      active: profession.active ?? true,
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: ProfessionFormData) => {
    const payload = {
      name: data.name,
      code: data.code || null,
      description: data.description || null,
      active: data.active,
    };

    if (selectedProfession) {
      await updateProfession.mutateAsync({
        id: selectedProfession.id,
        ...payload,
      });
    } else {
      await createProfession.mutateAsync(payload);
    }
    setIsModalOpen(false);
  };

  const columns: ColumnDef<Profession>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Profissão',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{row.original.name}</p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'code',
        header: 'Código',
        cell: ({ row }) =>
          row.original.code ? (
            <Badge variant="info">{row.original.code}</Badge>
          ) : (
            <span className="text-gray-500">-</span>
          ),
      },
      {
        accessorKey: 'description',
        header: 'Descrição',
        cell: ({ row }) => (
          <span className="text-gray-700 dark:text-gray-300">
            {row.original.description || '-'}
          </span>
        ),
      },
      {
        accessorKey: 'active',
        header: 'Status',
        cell: ({ row }) => (
          <Badge variant={row.original.active ? 'success' : 'neutral'}>
            {row.original.active ? 'Ativo' : 'Inativo'}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                openEditModal(row.original);
              }}
              title="Editar profissão"
            >
              <Pencil className="h-4 w-4" />
            </IconButton>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
            Profissões
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={openCreateModal}
            variant="solid"
            icon={<Plus className="h-4 w-4" />}
            label="Nova Profissão"
          />
        </div>
      </div>

      {/* Table */}
      <Card padding="none">
        <div className="space-y-4 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-[30%]">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Buscar por nome, código ou descrição..."
                className="focus:ring-primary-500 w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 placeholder-gray-500 focus:border-transparent focus:ring-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
            {hasActiveSearch && (
              <Button
                onClick={handleClearSearch}
                variant="outline"
                size="md"
                showIcon
                icon={<FunnelX className="h-4 w-4" />}
                label=""
                title="Limpar filtros"
                aria-label="Limpar filtros"
                className="w-9 justify-center pr-3"
              />
            )}
          </div>
          <DataTable
            data={paginatedProfessions}
            columns={columns}
            showPagination={false}
            isLoading={isLoading}
            onRowClick={openEditModal}
            emptyState={
              <EmptyState
                icon={<Briefcase className="h-12 w-12 text-gray-400" />}
                title={searchTerm ? 'Nenhum resultado encontrado' : 'Nenhuma profissão cadastrada'}
                description={
                  searchTerm
                    ? 'Tente uma busca diferente'
                    : 'Cadastre as profissões para usar nos profissionais'
                }
                action={
                  !searchTerm && (
                    <Button
                      onClick={openCreateModal}
                      size="sm"
                      variant="solid"
                      label="Cadastrar Profissão"
                    />
                  )
                }
              />
            }
          />
          <ListPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={PAGE_SIZE}
            itemLabel="profissões"
            onPreviousPage={() => setCurrentPage((page) => page - 1)}
            onNextPage={() => setCurrentPage((page) => page + 1)}
            isLoading={isLoading}
          />
        </div>
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedProfession ? 'Editar Profissão' : 'Nova Profissão'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-1">
              <Input label="Código" placeholder="Ex: NURSE, DOCTOR" {...register('code')} />
            </div>
            <div className="md:col-span-1">
              <Input
                label="Nome"
                placeholder="Ex: Enfermeira, Médico"
                {...register('name', { required: 'Nome é obrigatório' })}
                error={errors.name?.message}
                required
              />
            </div>
          </div>

          <Textarea
            label="Descrição"
            placeholder="Descrição ou observações da profissão..."
            rows={3}
            {...register('description')}
          />

          <SwitchNew
            label="Status"
            showStatus
            name={activeName}
            ref={activeRef}
            onBlur={activeOnBlur}
            checked={!!activeValue}
            onChange={(e) => {
              setValue('active', e.target.checked, { shouldDirty: true });
            }}
          />

          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              showIcon={false}
              onClick={() => setIsModalOpen(false)}
              label="Cancelar"
            />
            <Button
              type="submit"
              variant="solid"
              showIcon={false}
              disabled={createProfession.isPending || updateProfession.isPending}
              label={selectedProfession ? 'Salvar Alterações' : 'Cadastrar'}
            />
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
