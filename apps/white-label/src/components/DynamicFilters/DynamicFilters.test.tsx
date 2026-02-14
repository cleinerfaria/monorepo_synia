import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DynamicFilters from '../DynamicFilters';
import * as usePageFiltersHook from '@/hooks/usePageFilters';

// Mocks
const mockGetViewOptions = vi.fn();
const mockUsePage = vi.fn();

vi.spyOn(usePageFiltersHook, 'default').mockReturnValue({
  getViewOptions: mockGetViewOptions,
  usePage: mockUsePage,
  pageFilters: [],
  createPageFilter: vi.fn(),
  updatePageFilter: vi.fn(),
  deletePageFilter: vi.fn(),
  isLoading: false,
  error: null,
  isCreating: false,
  isUpdating: false,
  isDeleting: false,
  usePageFilter: vi.fn(),
  useAllCompanyPageFilters: vi.fn(),
});

const mockFilters = [
  {
    id: '1',
    name: 'search',
    label: 'Buscar',
    type: 'input',
    order_index: 0,
    page_id: 'page1',
    created_at: '2023-01-01',
    updated_at: '2023-01-01',
    company_id: 'company1',
    active: true,
    has_search: false,
    page_size: 20,
  } as any,
  {
    id: '2',
    name: 'status',
    label: 'Status',
    type: 'select',
    options_view: 'status_view', // Requer carregamento de opções
    order_index: 1,
    page_id: 'page1',
    created_at: '2023-01-01',
    updated_at: '2023-01-01',
    company_id: 'company1',
    active: true,
    has_search: false,
    page_size: 20,
  } as any,
];

describe('DynamicFilters', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePage.mockReturnValue({ data: {}, isLoading: false });
    mockGetViewOptions.mockResolvedValue({
      data: [
        { value: 'active', label: 'Ativo' },
        { value: 'inactive', label: 'Inativo' },
      ],
      hasMore: false,
    });
  });

  it('deve renderizar inputs de texto', () => {
    render(<DynamicFilters filters={[mockFilters[0]]} values={{}} onChange={mockOnChange} />);

    expect(screen.getByText('Buscar')).toBeInTheDocument();
    const input = screen.getByRole('textbox'); // Input padrão pode não ter role textbox se type="text", mas geralmente tem ou placeholder
    expect(input).toBeInTheDocument();
  });

  it('deve chamar onChange ao digitar no input', () => {
    render(<DynamicFilters filters={[mockFilters[0]]} values={{}} onChange={mockOnChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'teste' } });

    expect(mockOnChange).toHaveBeenCalledWith('search', 'teste');
  });

  it('deve carregar e renderizar opções de select', async () => {
    render(<DynamicFilters filters={[mockFilters[1]]} values={{}} onChange={mockOnChange} />);

    // Aguarda carregamento das opções
    await waitFor(() => {
      expect(mockGetViewOptions).toHaveBeenCalled();
    });

    // Verifica se o select foi renderizado (depende da implementação do componente Select,
    // mas geralmente procuramos pelo label ou placeholder)
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('deve mostrar loading global quando prop isLoading for true', () => {
    render(
      <DynamicFilters filters={mockFilters} values={{}} onChange={mockOnChange} isLoading={true} />
    );

    // Verifica componente de Loading (geralmente um spinner ou texto)
    // Assumindo que o componente Loading renderiza algo identificável
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });
});
