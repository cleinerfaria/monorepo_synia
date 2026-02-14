/**
 * Tipos para o módulo de vendas/dashboard
 */

// Estrutura de movimento de venda (linha do banco)
export interface SalesMovement {
  dt_mov: string;
  cod_cliente: string;
  nome_cliente: string;
  cod_produto: string;
  nome_produto: string;
  vr_venda: number;
  qtd_itens_venda: number;
  cod_filial: string;
  nome_filial: string;
  nome_vendedor: string;
  qtd_litros?: number | null;
  uf?: string; // Para simular região
}

// Opções de período
export interface PeriodOption {
  value: string;
  label: string;
}

// Filtros globais do dashboard
export interface SalesFilters {
  period: string;
  startDate?: Date;
  endDate?: Date;
  filial?: string[];
  cliente?: string[];
  produto?: string[];
}

// KPI Card data
export interface KpiData {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ComponentType<{ className?: string }>;
  color?: 'default' | 'success' | 'warning' | 'danger' | 'teal';
}

// Dados para gráficos
export interface ChartDataPoint {
  name: string;
  value: number;
  value2?: number;
}

// Dados agregados por cliente
export interface ClientAggregate {
  cod_cliente: string;
  nome_cliente: string;
  faturamento: number;
  volume: number;
  compras: number;
  ultima_compra: string;
  uf?: string;
}

// Dados agregados por produto
export interface ProductAggregate {
  cod_produto: string;
  nome_produto: string;
  faturamento: number;
  volume: number;
  percentual: number;
}

// Dados por região
export interface RegionData {
  region: string;
  regionName: string;
  faturamento: number;
  clientes: number;
}

// Dados para ranking (Top 10)
export interface RankingItem {
  name: string;
  value: number;
}
