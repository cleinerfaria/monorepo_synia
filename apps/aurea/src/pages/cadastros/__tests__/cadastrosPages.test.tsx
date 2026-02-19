import * as React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ActiveIngredientsPage from '@/pages/cadastros/ActiveIngredientsPage';
import AdministrationRoutesPage from '@/pages/cadastros/AdministrationRoutesPage';
import ClientsPage from '@/pages/cadastros/ClientsPage';
import EquipmentPage from '@/pages/cadastros/EquipmentPage';
import ManufacturersPage from '@/pages/cadastros/ManufacturersPage';
import SuppliersPage from '@/pages/cadastros/SuppliersPage';
import PatientsPage from '@/pages/cadastros/PatientsPage';
import ProceduresPage from '@/pages/cadastros/ProceduresPage';
import ProductsPage from '@/pages/cadastros/ProductsPage';
import PresentationsPage from '@/pages/cadastros/PresentationsPage';
import ProfessionalsPage from '@/pages/cadastros/ProfessionalsPage';
import ProfessionsPage from '@/pages/cadastros/ProfessionsPage';
import UnitsOfMeasurePage from '@/pages/cadastros/UnitsOfMeasurePage';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  setSearchParams: vi.fn(),
  setListPage: vi.fn(),
  searchParams: new URLSearchParams(),

  createActiveIngredient: vi.fn().mockResolvedValue({ id: 'active-created' }),
  updateActiveIngredient: vi.fn().mockResolvedValue({}),

  createAdministrationRoute: vi.fn().mockResolvedValue({ id: 'route-created' }),
  updateAdministrationRoute: vi.fn().mockResolvedValue({}),

  createClient: vi.fn().mockResolvedValue({ id: 'client-created' }),
  updateClient: vi.fn().mockResolvedValue({}),
  deleteClient: vi.fn().mockResolvedValue({}),
  saveClientContacts: vi.fn().mockResolvedValue({}),

  createEquipment: vi.fn().mockResolvedValue({ id: 'equipment-created' }),
  updateEquipment: vi.fn().mockResolvedValue({}),
  deleteEquipment: vi.fn().mockResolvedValue({}),
  assignEquipment: vi.fn().mockResolvedValue({}),

  createManufacturer: vi.fn().mockResolvedValue({ id: 'manufacturer-created' }),
  updateManufacturer: vi.fn().mockResolvedValue({}),
  deleteManufacturer: vi.fn().mockResolvedValue({}),
  syncManufacturers: vi.fn().mockResolvedValue({}),

  createSupplier: vi.fn().mockResolvedValue({ id: 'supplier-created' }),
  updateSupplier: vi.fn().mockResolvedValue({}),
  deleteSupplier: vi.fn().mockResolvedValue({}),

  updatePatient: vi.fn().mockResolvedValue({}),

  createProcedure: vi.fn().mockResolvedValue({ id: 'procedure-created' }),
  updateProcedure: vi.fn().mockResolvedValue({}),

  updateProduct: vi.fn().mockResolvedValue({}),

  createPresentation: vi.fn().mockResolvedValue({ id: 'presentation-created' }),
  updatePresentation: vi.fn().mockResolvedValue({}),
  deletePresentation: vi.fn().mockResolvedValue({}),

  deleteProfessional: vi.fn().mockResolvedValue({}),

  createProfession: vi.fn().mockResolvedValue({ id: 'profession-created' }),
  updateProfession: vi.fn().mockResolvedValue({}),

  createUnitOfMeasure: vi.fn().mockResolvedValue({ id: 'unit-created' }),
  updateUnitOfMeasure: vi.fn().mockResolvedValue({}),

  activeIngredients: [
    {
      id: 'active-1',
      code: null,
      name: 'Dipirona',
      cas_number: null,
      therapeutic_class: null,
      description: null,
      active: true,
    },
  ],
  administrationRoutes: [
    {
      id: 'route-1',
      name: 'Via Oral',
      abbreviation: 'VO',
      description: null,
      prescription_order: 1,
      active: true,
    },
  ],
  clients: [
    {
      id: 'client-1',
      code: null,
      type: 'company',
      name: 'Cliente Base',
      document: null,
      email: null,
      phone: null,
      zip: null,
      street: null,
      number: null,
      complement: null,
      district: null,
      city: null,
      state: null,
      color: null,
      active: true,
    },
  ],
  equipment: [
    {
      id: 'equipment-1',
      code: null,
      name: 'CPAP Teste',
      serial_number: null,
      patrimony_code: null,
      description: null,
      status: 'available',
      assigned_patient_id: null,
      active: true,
    },
  ],
  manufacturers: [
    {
      id: 'manufacturer-1',
      code: null,
      name: 'Fabricante Base',
      trade_name: 'Fab Base',
      document: null,
      website: null,
      phone: null,
      email: null,
      zip: null,
      street: null,
      number: null,
      complement: null,
      district: null,
      city: null,
      state: null,
      notes: null,
      active: true,
    },
  ],
  suppliers: [
    {
      id: 'supplier-1',
      code: null,
      name: 'Fornecedor Base',
      trade_name: null,
      document: null,
      state_registration: null,
      municipal_registration: null,
      phone: null,
      email: null,
      website: null,
      zip: null,
      street: null,
      number: null,
      complement: null,
      district: null,
      city: null,
      state: null,
      contact_name: null,
      contact_phone: null,
      payment_terms: null,
      notes: null,
      active: true,
    },
  ],
  patients: [
    {
      id: 'patient-1',
      name: 'Paciente Base',
      cpf: null,
      birth_date: '1990-01-01',
      gender: 'male',
      active: true,
      updated_at: '2026-01-01T10:00:00.000Z',
      patient_payer: [{ is_primary: true, client: { name: 'Operadora A', color: '#0055AA' } }],
    },
  ],
  procedures: [
    {
      id: 'procedure-1',
      code: null,
      name: 'Curativo',
      category: 'care',
      unit_id: 'unit-1',
      description: null,
      active: true,
    },
  ],
  products: [
    {
      id: 'product-1',
      name: 'Produto Base',
      concentration: '500mg',
      item_type: 'medication',
      min_stock: 10,
      unit_stock: { id: 'unit-1', symbol: 'cx' },
      active_ingredient_rel: { id: 'active-1', name: 'Dipirona' },
      presentations: [{ id: 'presentation-1' }],
      active: true,
    },
  ],
  presentations: [
    {
      id: 'presentation-1',
      name: 'Caixa com 30 comprimidos',
      barcode: null,
      conversion_factor: 1,
      unit: 'unit-1',
      product_id: 'product-1',
      manufacturer_id: 'manufacturer-1',
      active: true,
      product: { id: 'product-1', name: 'Produto Base', concentration: '500mg' },
      manufacturer: { id: 'manufacturer-1', name: 'Fabricante Base', trade_name: 'Fab Base' },
      unit_rel: { id: 'unit-1', name: 'Caixa', symbol: 'cx' },
    },
  ],
  professionals: [
    {
      id: 'professional-1',
      name: 'Dra. Teste',
      profession: { name: 'Médica' },
      council_type: 'CRM',
      council_number: '12345',
      council_uf: 'SP',
      phone: '11999999999',
      email: 'teste@hospital.com',
      active: true,
    },
  ],
  professions: [
    {
      id: 'profession-1',
      code: 'NURSE',
      name: 'Enfermeiro',
      description: null,
      active: true,
    },
  ],
  unitsOfMeasure: [
    {
      id: 'unit-1',
      code: 'CX',
      name: 'Caixa',
      symbol: 'cx',
      description: null,
      allowed_scopes: [],
      active: true,
    },
  ],
  productGroups: [{ id: 'group-1', name: 'Grupo Base' }],
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
    useSearchParams: () => [mocks.searchParams, mocks.setSearchParams],
  };
});

vi.mock('@/hooks/useListPageState', () => ({
  useListPageState: () => [1, mocks.setListPage] as const,
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({ company: { id: 'company-1' } }),
}));

vi.mock('@/components/catalog/ImportActiveIngredientsFromCmedModal', () => ({
  ImportActiveIngredientsFromCmedModal: () => null,
}));

vi.mock('@/components/product/PresentationSearchModal', () => ({
  default: () => null,
}));

vi.mock('@/components/client/ClientContactForm', () => ({
  default: () => <div data-testid="client-contact-form" />,
}));

vi.mock('@/hooks/useActiveIngredients', () => ({
  useActiveIngredientsPaginated: () => ({
    data: {
      data: mocks.activeIngredients,
      totalCount: mocks.activeIngredients.length,
      totalPages: 1,
    },
    isLoading: false,
  }),
  useActiveIngredients: () => ({ data: mocks.activeIngredients, isLoading: false }),
  useCreateActiveIngredient: () => ({
    mutateAsync: mocks.createActiveIngredient,
    isPending: false,
  }),
  useUpdateActiveIngredient: () => ({
    mutateAsync: mocks.updateActiveIngredient,
    isPending: false,
  }),
}));

vi.mock('@/hooks/useAdministrationRoutes', () => ({
  useAdministrationRoutes: () => ({ data: mocks.administrationRoutes, isLoading: false }),
  useCreateAdministrationRoute: () => ({
    mutateAsync: mocks.createAdministrationRoute,
    isPending: false,
  }),
  useUpdateAdministrationRoute: () => ({
    mutateAsync: mocks.updateAdministrationRoute,
    isPending: false,
  }),
}));

vi.mock('@/hooks/useClients', () => ({
  useClients: () => ({ data: mocks.clients, isLoading: false }),
  useCreateClient: () => ({ mutateAsync: mocks.createClient, isPending: false }),
  useUpdateClient: () => ({ mutateAsync: mocks.updateClient, isPending: false }),
  useDeleteClient: () => ({ mutateAsync: mocks.deleteClient, isPending: false }),
}));

vi.mock('@/hooks/useClientContacts', () => ({
  useClientContacts: () => ({ data: [], isLoading: false }),
  useSaveClientContacts: () => ({ mutateAsync: mocks.saveClientContacts, isPending: false }),
}));

vi.mock('@/hooks/useEquipment', () => ({
  useEquipment: () => ({ data: mocks.equipment, isLoading: false }),
  useCreateEquipment: () => ({ mutateAsync: mocks.createEquipment, isPending: false }),
  useUpdateEquipment: () => ({ mutateAsync: mocks.updateEquipment, isPending: false }),
  useDeleteEquipment: () => ({ mutateAsync: mocks.deleteEquipment, isPending: false }),
  useAssignEquipment: () => ({ mutateAsync: mocks.assignEquipment, isPending: false }),
}));

vi.mock('@/hooks/useManufacturers', () => ({
  useManufacturersPaginated: () => ({
    data: { data: mocks.manufacturers, totalCount: mocks.manufacturers.length, totalPages: 1 },
    isLoading: false,
  }),
  useManufacturers: () => ({ data: mocks.manufacturers, isLoading: false }),
  useCreateManufacturer: () => ({ mutateAsync: mocks.createManufacturer, isPending: false }),
  useUpdateManufacturer: () => ({ mutateAsync: mocks.updateManufacturer, isPending: false }),
  useDeleteManufacturer: () => ({ mutateAsync: mocks.deleteManufacturer, isPending: false }),
  useReferenceTablesStatus: () => ({ data: { manufacturers_last_sync_at: null } }),
  useSyncManufacturersFromReference: () => ({
    mutateAsync: mocks.syncManufacturers,
    isPending: false,
  }),
}));

vi.mock('@/hooks/useSuppliers', () => ({
  useSuppliers: () => ({ data: mocks.suppliers, isLoading: false }),
  useCreateSupplier: () => ({ mutateAsync: mocks.createSupplier, isPending: false }),
  useUpdateSupplier: () => ({ mutateAsync: mocks.updateSupplier, isPending: false }),
  useDeleteSupplier: () => ({ mutateAsync: mocks.deleteSupplier, isPending: false }),
}));

vi.mock('@/hooks/usePatients', () => ({
  usePatients: () => ({ data: mocks.patients, isLoading: false }),
  usePatientsPaginated: () => ({
    data: { data: mocks.patients, totalCount: mocks.patients.length, totalPages: 1 },
    isLoading: false,
  }),
  useUpdatePatient: () => ({ mutateAsync: mocks.updatePatient, isPending: false }),
}));

vi.mock('@/hooks/useProcedures', () => ({
  useProceduresPaginated: () => ({
    data: { data: mocks.procedures, totalCount: mocks.procedures.length, totalPages: 1 },
    isLoading: false,
  }),
  useCreateProcedure: () => ({ mutateAsync: mocks.createProcedure, isPending: false }),
  useUpdateProcedure: () => ({ mutateAsync: mocks.updateProcedure, isPending: false }),
}));

vi.mock('@/hooks/useProducts', () => ({
  useProducts: () => ({ data: mocks.products, isLoading: false }),
  useProductsPaginated: () => ({
    data: { data: mocks.products, totalCount: mocks.products.length, totalPages: 1 },
    isLoading: false,
  }),
  useUpdateProduct: () => ({ mutateAsync: mocks.updateProduct, isPending: false }),
}));

vi.mock('@/hooks/usePresentations', () => ({
  usePresentationsPaginated: () => ({
    data: { data: mocks.presentations, totalCount: mocks.presentations.length, totalPages: 1 },
    isLoading: false,
  }),
  useCreatePresentation: () => ({ mutateAsync: mocks.createPresentation, isPending: false }),
  useUpdatePresentation: () => ({ mutateAsync: mocks.updatePresentation, isPending: false }),
  useDeletePresentation: () => ({ mutateAsync: mocks.deletePresentation, isPending: false }),
}));

vi.mock('@/hooks/useProfessionals', () => ({
  useProfessionals: () => ({ data: mocks.professionals, isLoading: false }),
  useDeleteProfessional: () => ({ mutateAsync: mocks.deleteProfessional, isPending: false }),
}));

vi.mock('@/hooks/useProfessions', () => ({
  useProfessions: () => ({ data: mocks.professions, isLoading: false }),
  useCreateProfession: () => ({ mutateAsync: mocks.createProfession, isPending: false }),
  useUpdateProfession: () => ({ mutateAsync: mocks.updateProfession, isPending: false }),
}));

vi.mock('@/hooks/useUnitsOfMeasure', () => ({
  useUnitsOfMeasure: () => ({ data: mocks.unitsOfMeasure, isLoading: false }),
  useUnitsOfMeasurePaginated: () => ({
    data: { data: mocks.unitsOfMeasure, totalCount: mocks.unitsOfMeasure.length, totalPages: 1 },
    isLoading: false,
  }),
  useCreateUnitOfMeasure: () => ({ mutateAsync: mocks.createUnitOfMeasure, isPending: false }),
  useUpdateUnitOfMeasure: () => ({ mutateAsync: mocks.updateUnitOfMeasure, isPending: false }),
}));

vi.mock('@/hooks/useProductGroups', () => ({
  useProductGroups: () => ({ data: mocks.productGroups, isLoading: false }),
}));

vi.mock('@/components/ui', () => {
  const Input = React.forwardRef<
    HTMLInputElement,
    React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }
  >(({ label, error: _error, required: _required, ...props }, ref) => (
    <label>
      {label}
      <input ref={ref} aria-label={label} {...props} />
    </label>
  ));
  Input.displayName = 'MockInput';

  const Textarea = React.forwardRef<
    HTMLTextAreaElement,
    React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; error?: string }
  >(({ label, error: _error, required: _required, ...props }, ref) => (
    <label>
      {label}
      <textarea ref={ref} aria-label={label} {...props} />
    </label>
  ));
  Textarea.displayName = 'MockTextarea';

  const Select = React.forwardRef<
    HTMLSelectElement,
    React.SelectHTMLAttributes<HTMLSelectElement> & {
      label?: string;
      options?: Array<{ value: string; label: string }>;
      error?: string;
    }
  >(({ label, options = [], error: _error, required: _required, ...props }, ref) => (
    <label>
      {label}
      <select ref={ref} aria-label={label} {...props}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  ));
  Select.displayName = 'MockSelect';

  const SearchableSelect = ({
    label,
    value,
    onChange,
  }: {
    label?: string;
    value?: string;
    onChange?: React.ChangeEventHandler<HTMLInputElement>;
  }) => (
    <label>
      {label}
      <input aria-label={label} value={value ?? ''} onChange={onChange} />
    </label>
  );

  const Button = ({
    label,
    children,
    type = 'button',
    isLoading = false,
    disabled = false,
    icon: _icon,
    showIcon: _showIcon,
    variant: _variant,
    active: _active,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    label?: string;
    isLoading?: boolean;
    showIcon?: boolean;
    icon?: React.ReactNode;
    variant?: string;
  }) => (
    <button type={type} disabled={disabled || isLoading} {...props}>
      {label ?? children ?? 'Botao'}
    </button>
  );

  const IconButton = ({
    title,
    children,
    variant: _variant,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { title?: string; variant?: string }) => (
    <button aria-label={title || 'acao'} title={title} type="button" {...props}>
      {children ?? 'o'}
    </button>
  );

  const SwitchNew = React.forwardRef<
    HTMLInputElement,
    {
      label?: string;
      checked?: boolean;
      name?: string;
      onBlur?: React.FocusEventHandler<HTMLInputElement>;
      onChange?: React.ChangeEventHandler<HTMLInputElement>;
      showStatus?: boolean;
    }
  >(({ label, checked, onChange, name, onBlur, showStatus: _showStatus }, ref) => (
    <label>
      {label}
      <input
        ref={ref}
        type="checkbox"
        aria-label={label}
        checked={!!checked}
        onChange={onChange}
        onBlur={onBlur}
        name={name}
      />
    </label>
  ));
  SwitchNew.displayName = 'MockSwitchNew';

  const Modal = ({
    isOpen,
    title,
    children,
  }: {
    isOpen: boolean;
    title?: string;
    children: React.ReactNode;
  }) => {
    if (!isOpen) return null;
    return (
      <section role="dialog" aria-label={title}>
        {title ? <h2>{title}</h2> : null}
        {children}
      </section>
    );
  };

  const DataTable = ({
    data = [],
    columns = [],
    onRowClick,
    emptyState,
    isLoading,
  }: {
    data?: Array<Record<string, any>>;
    columns?: Array<any>;
    onRowClick?: (row: any) => void;
    emptyState?: React.ReactNode;
    isLoading?: boolean;
  }) => {
    if (isLoading) return <div>carregando</div>;
    if (!data.length) return <div>{emptyState}</div>;

    return (
      <div data-testid="data-table">
        {data.map((row, rowIndex) => {
          const rowId = String(row.id ?? rowIndex);
          return (
            <div key={rowId} data-testid={`row-${rowId}`}>
              <button
                type="button"
                data-testid={`row-click-${rowId}`}
                disabled={!onRowClick}
                onClick={() => onRowClick?.(row)}
              >
                abrir
              </button>
              {columns.map((column, columnIndex) => {
                let content: React.ReactNode = null;
                if (typeof column.cell === 'function') {
                  content = column.cell({ row: { original: row } });
                } else if (typeof column.accessorKey === 'string') {
                  content = String(row[column.accessorKey] ?? '');
                }

                return (
                  <div key={`${rowId}-${column.id ?? column.accessorKey ?? columnIndex}`}>
                    {content}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  return {
    Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Button,
    DataTable,
    ListPagination: () => <div data-testid="list-pagination" />,
    Modal,
    ModalFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Input,
    Textarea,
    Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
    EmptyState: ({
      title,
      description,
      action,
    }: {
      title?: string;
      description?: string;
      action?: React.ReactNode;
    }) => (
      <div>
        <p>{title}</p>
        <p>{description}</p>
        {action}
      </div>
    ),
    SwitchNew,
    IconButton,
    StatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
    SearchableSelect,
    Select,
    TabButton: ({
      children,
      active: _active,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) => (
      <button type="button" {...props}>
        {children}
      </button>
    ),
    ColorPicker: ({
      label,
      value,
      onChange,
    }: {
      label?: string;
      value?: string;
      onChange?: React.ChangeEventHandler<HTMLInputElement>;
    }) => (
      <label>
        {label}
        <input aria-label={label} value={value ?? ''} onChange={onChange} />
      </label>
    ),
    ColorBadge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  };
});

type ModalPageCase = {
  name: string;
  heading: string;
  Component: React.ComponentType;
  createButton: RegExp;
  createDialogTitle: string;
  editDialogTitle: string;
  rowId: string;
  createSpy: ReturnType<typeof vi.fn>;
  updateSpy: ReturnType<typeof vi.fn>;
  fillCreate?: (user: ReturnType<typeof userEvent.setup>) => Promise<void>;
  openEdit?: (user: ReturnType<typeof userEvent.setup>) => Promise<void>;
};

type NavigationPageCase = {
  name: string;
  heading: string;
  Component: React.ComponentType;
  createButton: RegExp;
  rowId: string;
  createPath: string;
  editPath: string;
};

const renderPage = (Component: React.ComponentType) => {
  render(<Component />);
};

const submitModal = async (dialogTitle: string) => {
  const dialog = screen.getByRole('dialog', { name: dialogTitle });
  const submitButton = within(dialog).getByRole('button', {
    name: /cadastrar|salvar|criar/i,
  });
  await userEvent.click(submitButton);
};

const modalPages: ModalPageCase[] = [
  {
    name: 'clientes',
    heading: 'Clientes',
    Component: ClientsPage,
    createButton: /novo cliente/i,
    createDialogTitle: 'Novo Cliente',
    editDialogTitle: 'Editar Cliente',
    rowId: 'client-1',
    createSpy: mocks.createClient,
    updateSpy: mocks.updateClient,
    fillCreate: async (user) => {
      await user.type(screen.getByLabelText('Nome / Razão Social'), 'Cliente Teste');
    },
  },
  {
    name: 'equipamentos',
    heading: 'Equipamentos',
    Component: EquipmentPage,
    createButton: /novo equipamento/i,
    createDialogTitle: 'Novo Equipamento',
    editDialogTitle: 'Editar Equipamento',
    rowId: 'equipment-1',
    createSpy: mocks.createEquipment,
    updateSpy: mocks.updateEquipment,
    fillCreate: async (user) => {
      await user.type(screen.getByLabelText('Nome do Equipamento'), 'Equipamento Teste');
    },
    openEdit: async (user) => {
      const row = screen.getByTestId('row-equipment-1');
      const editButton = within(row).getAllByRole('button', { name: 'ação' })[0];
      await user.click(editButton);
    },
  },
  {
    name: 'fabricantes',
    heading: 'Fabricantes',
    Component: ManufacturersPage,
    createButton: /novo fabricante/i,
    createDialogTitle: 'Novo Fabricante',
    editDialogTitle: 'Editar Fabricante',
    rowId: 'manufacturer-1',
    createSpy: mocks.createManufacturer,
    updateSpy: mocks.updateManufacturer,
    fillCreate: async (user) => {
      await user.type(screen.getByLabelText('Razão Social'), 'Fabricante Teste');
    },
  },
  {
    name: 'fornecedores',
    heading: 'Fornecedores',
    Component: SuppliersPage,
    createButton: /novo fornecedor/i,
    createDialogTitle: 'Novo Fornecedor',
    editDialogTitle: 'Editar Fornecedor',
    rowId: 'supplier-1',
    createSpy: mocks.createSupplier,
    updateSpy: mocks.updateSupplier,
    fillCreate: async (user) => {
      await user.type(screen.getByLabelText('Razão Social'), 'Fornecedor Teste');
    },
  },
  {
    name: 'principios ativos',
    heading: 'Princípios Ativos',
    Component: ActiveIngredientsPage,
    createButton: /novo princ/i,
    createDialogTitle: 'Novo Princípio Ativo',
    editDialogTitle: 'Editar Princípio Ativo',
    rowId: 'active-1',
    createSpy: mocks.createActiveIngredient,
    updateSpy: mocks.updateActiveIngredient,
    fillCreate: async (user) => {
      await user.type(screen.getByLabelText('Nome'), 'Princípio Teste');
    },
  },
  {
    name: 'procedimentos',
    heading: 'Procedimentos',
    Component: ProceduresPage,
    createButton: /novo procedimento/i,
    createDialogTitle: 'Novo Procedimento',
    editDialogTitle: 'Editar Procedimento',
    rowId: 'procedure-1',
    createSpy: mocks.createProcedure,
    updateSpy: mocks.updateProcedure,
    fillCreate: async (user) => {
      await user.type(screen.getByLabelText('Nome'), 'Procedimento Teste');
      await user.selectOptions(screen.getByLabelText('Unidade de Medida'), 'unit-1');
    },
  },
  {
    name: 'produtos apresentacao',
    heading: 'Produtos Apresentação',
    Component: PresentationsPage,
    createButton: /^manual$/i,
    createDialogTitle: 'Nova Apresentação',
    editDialogTitle: 'Editar Apresentação',
    rowId: 'presentation-1',
    createSpy: mocks.createPresentation,
    updateSpy: mocks.updatePresentation,
    fillCreate: async (user) => {
      await user.type(screen.getByLabelText('Produto'), 'product-1');
      await user.type(screen.getByLabelText('Nome da Apresentação'), 'Apresentação Teste');
    },
  },
  {
    name: 'profissoes',
    heading: 'Profissões',
    Component: ProfessionsPage,
    createButton: /nova profiss/i,
    createDialogTitle: 'Nova Profissão',
    editDialogTitle: 'Editar Profissão',
    rowId: 'profession-1',
    createSpy: mocks.createProfession,
    updateSpy: mocks.updateProfession,
    fillCreate: async (user) => {
      await user.type(screen.getByLabelText('Nome'), 'Profissão Teste');
    },
  },
  {
    name: 'unidades de medida',
    heading: 'Unidades de Medida',
    Component: UnitsOfMeasurePage,
    createButton: /nova unidade/i,
    createDialogTitle: 'Nova Unidade de Medida',
    editDialogTitle: 'Editar Unidade de Medida',
    rowId: 'unit-1',
    createSpy: mocks.createUnitOfMeasure,
    updateSpy: mocks.updateUnitOfMeasure,
    fillCreate: async (user) => {
      await user.type(screen.getByLabelText('Código'), 'UN');
      await user.type(screen.getByLabelText('Nome'), 'Unidade Teste');
      await user.type(screen.getByLabelText('Símbolo'), 'un');
    },
  },
  {
    name: 'vias de administracao',
    heading: 'Vias de Administração',
    Component: AdministrationRoutesPage,
    createButton: /nova via/i,
    createDialogTitle: 'Nova Via de Administração',
    editDialogTitle: 'Editar Via de Administração',
    rowId: 'route-1',
    createSpy: mocks.createAdministrationRoute,
    updateSpy: mocks.updateAdministrationRoute,
    fillCreate: async (user) => {
      await user.type(screen.getByLabelText('Nome'), 'Via Teste');
    },
  },
];

const navigationPages: NavigationPageCase[] = [
  {
    name: 'pacientes',
    heading: 'Pacientes',
    Component: PatientsPage,
    createButton: /novo paciente/i,
    rowId: 'patient-1',
    createPath: '/pacientes/novo',
    editPath: '/pacientes/patient-1',
  },
  {
    name: 'produtos',
    heading: 'Produtos',
    Component: ProductsPage,
    createButton: /novo produto/i,
    rowId: 'product-1',
    createPath: '/produtos/novo',
    editPath: '/produtos/product-1',
  },
  {
    name: 'profissionais',
    heading: 'Profissionais',
    Component: ProfessionalsPage,
    createButton: /novo profissional/i,
    rowId: 'professional-1',
    createPath: '/profissionais/novo',
    editPath: '/profissionais/professional-1',
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Páginas de cadastros (lista lateral)', () => {
  modalPages.forEach((page) => {
    describe(page.name, () => {
      it('abre a página corretamente', () => {
        renderPage(page.Component);

        expect(screen.getByRole('heading', { name: page.heading })).toBeInTheDocument();
      });

      it('cria registro corretamente', async () => {
        const user = userEvent.setup();
        renderPage(page.Component);

        await user.click(screen.getByRole('button', { name: page.createButton }));

        expect(screen.getByRole('dialog', { name: page.createDialogTitle })).toBeInTheDocument();

        if (page.fillCreate) {
          await page.fillCreate(user);
        }

        await submitModal(page.createDialogTitle);

        await waitFor(() => {
          expect(page.createSpy).toHaveBeenCalledTimes(1);
        });
      });

      it('edita registro corretamente', async () => {
        const user = userEvent.setup();
        renderPage(page.Component);

        if (page.openEdit) {
          await page.openEdit(user);
        } else {
          await user.click(screen.getByTestId(`row-click-${page.rowId}`));
        }

        expect(screen.getByRole('dialog', { name: page.editDialogTitle })).toBeInTheDocument();

        await submitModal(page.editDialogTitle);

        await waitFor(() => {
          expect(page.updateSpy).toHaveBeenCalledWith(expect.objectContaining({ id: page.rowId }));
        });
      });
    });
  });

  navigationPages.forEach((page) => {
    describe(page.name, () => {
      it('abre a página corretamente', () => {
        renderPage(page.Component);

        expect(screen.getByRole('heading', { name: page.heading })).toBeInTheDocument();
      });

      it('aciona criação corretamente', async () => {
        const user = userEvent.setup();
        renderPage(page.Component);

        await user.click(screen.getByRole('button', { name: page.createButton }));

        expect(mocks.navigate).toHaveBeenCalledWith(page.createPath);
      });

      it('aciona edição corretamente', async () => {
        const user = userEvent.setup();
        renderPage(page.Component);

        await user.click(screen.getByTestId(`row-click-${page.rowId}`));

        expect(mocks.navigate).toHaveBeenCalledWith(page.editPath);
      });
    });
  });
});
