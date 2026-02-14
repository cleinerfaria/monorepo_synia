import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import DynamicChart from '../DynamicChart';
import * as usePageChartsHook from '@/hooks/usePageCharts';

// Mock do hook usePageCharts
const mockGetChartData = vi.fn();
vi.spyOn(usePageChartsHook, 'usePageCharts').mockReturnValue({
  getChartData: mockGetChartData,
  createPageChart: vi.fn(),
  updatePageChart: vi.fn(),
  deletePageChart: vi.fn(),
  pageCharts: [],
  isLoading: false,
  error: null,
  isCreating: false,
  isUpdating: false,
  isDeleting: false,
  usePageChart: vi.fn(),
  useAllCompanyPageCharts: vi.fn(),
});

const mockChart = {
  id: '1',
  name: 'Test Chart',
  type: 'line',
  options_view: 'test_view',
  x_axis: 'date',
  y_axis: [{ field: 'value', label: 'Value', color: '#ff0000' }],
  colors: ['#ff0000'],
  height: 300,
  show_legend: true,
  show_grid: true,
  curve_type: 'smooth',
  created_at: '2023-01-01',
  updated_at: '2023-01-01',
  page_id: 'page1',
  order_index: 0,
  company_id: 'company1',
  stacked: false,
  active: true,
} as any;

describe('DynamicChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve mostrar loading inicialmente', () => {
    // Retorna uma promessa pendente para simular loading
    mockGetChartData.mockReturnValue(new Promise(() => {}));

    render(<DynamicChart chart={mockChart} />);

    // Verifica se o spinner ou container de loading está presente
    // O componente tem um spinner com classe animate-spin
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('deve renderizar dados corretamente', async () => {
    const mockData = [
      { date: '2023-01-01', value: 10 },
      { date: '2023-01-02', value: 20 },
    ];
    mockGetChartData.mockResolvedValue(mockData);

    render(<DynamicChart chart={mockChart} />);

    await waitFor(() => {
      expect(screen.queryByText(/sem dados disponíveis/i)).not.toBeInTheDocument();
    });

    // Verifica se o título (se houver) ou elementos do SVG estão presentes
    // Como é SVG, podemos verificar se o SVG foi renderizado
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('deve mostrar mensagem de erro quando falhar', async () => {
    mockGetChartData.mockRejectedValue(new Error('Falha na API'));

    render(<DynamicChart chart={mockChart} />);

    await waitFor(() => {
      expect(screen.getByText('Falha na API')).toBeInTheDocument();
    });
  });

  it('deve mostrar mensagem de "Sem dados disponíveis" quando array vazio', async () => {
    mockGetChartData.mockResolvedValue([]);

    render(<DynamicChart chart={mockChart} />);

    await waitFor(() => {
      expect(screen.getByText('Sem dados disponíveis')).toBeInTheDocument();
    });
  });
});
