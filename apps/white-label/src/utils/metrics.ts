/**
 * Utilitários para cálculos de métricas do dashboard de vendas
 */

// Formata um número como moeda brasileira
export function toBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

// Formata um número com separadores brasileiros
export function toNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

// Formata valores monetários para eixo Y de gráficos (com K para milhares, sem decimais)
export function toAxisBRL(value: number): string {
  // Se o valor for >= 1000, formatamos em "k"
  if (Math.abs(value) >= 1000) {
    const valueInK = Math.round(value / 1000); // Sem casas decimais
    // Adiciona ponto para valores acima de 999k (ex: 23.456k)
    const formattedK = new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(valueInK);
    return `R$ ${formattedK}k`;
  }

  // Para valores menores que 1000, formatamos normalmente sem decimais
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

// Formata valores monetários de forma compacta (ex: 60063k para valores >= 1000)
export function toCompactBRL(value: number): string {
  // Se o valor for >= 1000, formatamos em "k" sem decimais
  if (Math.abs(value) >= 1000) {
    const valueInK = value / 1000;
    const formattedK = new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(valueInK);
    return `${formattedK}k`;
  }

  // Para valores menores que 1000, retorna a moeda normal
  return toBRL(value);
}

// Formata uma porcentagem
export function toPercent(value: number, decimals = 1): string {
  return `${toNumber(value, decimals)}%`;
}

// Soma um array de números ou de objetos com uma key específica
export function sum<T>(arr: T[], key?: keyof T): number {
  if (!arr || arr.length === 0) return 0;

  if (key) {
    return arr.reduce((acc, item) => {
      const value = item[key];
      const num = typeof value === 'number' ? value : parseFloat(String(value));
      return acc + (isNaN(num) ? 0 : num);
    }, 0);
  }

  return (arr as unknown as number[]).reduce((acc, val) => {
    const num = typeof val === 'number' ? val : parseFloat(String(val));
    return acc + (isNaN(num) ? 0 : num);
  }, 0);
}

// Conta valores distintos de uma key
export function distinctCount<T>(arr: T[], key: keyof T): number {
  if (!arr || arr.length === 0) return 0;

  const unique = new Set(arr.map((item) => item[key]));
  return unique.size;
}

// Agrupa por data (retorna objeto com data como chave)
export function groupByDate<T>(
  arr: T[],
  dateKey: keyof T,
  valueKey: keyof T
): Record<string, number> {
  if (!arr || arr.length === 0) return {};

  return arr.reduce(
    (acc, item) => {
      const date = String(item[dateKey]);
      const value = item[valueKey];
      const numValue = typeof value === 'number' ? value : 0;

      if (!acc[date]) {
        acc[date] = 0;
      }
      acc[date] += numValue;

      return acc;
    },
    {} as Record<string, number>
  );
}

// Agrupa por mês (YYYY-MM)
export function groupByMonth<T>(
  arr: T[],
  dateKey: keyof T,
  valueKey: keyof T
): Record<string, number> {
  if (!arr || arr.length === 0) return {};

  return arr.reduce(
    (acc, item) => {
      const dateStr = String(item[dateKey]);
      const date = new Date(dateStr);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const value = item[valueKey];
      const num = typeof value === 'number' ? value : parseFloat(String(value));
      const numValue = isNaN(num) ? 0 : num;

      if (!acc[month]) {
        acc[month] = 0;
      }
      acc[month] += numValue;

      return acc;
    },
    {} as Record<string, number>
  );
}

// Agrupa por semana (retorna YYYY-WXX)
export function groupByWeek<T>(
  arr: T[],
  dateKey: keyof T,
  valueKey: keyof T
): Record<string, number> {
  if (!arr || arr.length === 0) return {};

  return arr.reduce(
    (acc, item) => {
      const dateStr = String(item[dateKey]);
      const date = new Date(dateStr);
      const week = getWeekNumber(date);
      const weekKey = `${date.getFullYear()}-W${String(week).padStart(2, '0')}`;
      const value = item[valueKey];
      const num = typeof value === 'number' ? value : parseFloat(String(value));
      const numValue = isNaN(num) ? 0 : num;

      if (!acc[weekKey]) {
        acc[weekKey] = 0;
      }
      acc[weekKey] += numValue;

      return acc;
    },
    {} as Record<string, number>
  );
}

// Retorna o número da semana do ano
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

// Calcula a variação percentual entre dois valores
export function percentChange(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / previous) * 100;
}

// Retorna os top N itens de um array ordenado por uma key numérica
export function topN<T>(arr: T[], key: keyof T, n: number): T[] {
  if (!arr || arr.length === 0) return [];

  return [...arr]
    .sort((a, b) => {
      const valA = a[key];
      const valB = b[key];
      return (typeof valB === 'number' ? valB : 0) - (typeof valA === 'number' ? valA : 0);
    })
    .slice(0, n);
}

// Agrupa e soma por uma key específica
export function groupAndSum<T>(
  arr: T[],
  groupKey: keyof T,
  sumKey: keyof T,
  labelKey?: keyof T
): Array<{ key: string; label: string; value: number }> {
  if (!arr || arr.length === 0) return [];

  const grouped = arr.reduce(
    (acc, item) => {
      const key = String(item[groupKey]);
      const value = item[sumKey];
      const num = typeof value === 'number' ? value : parseFloat(String(value));
      const numValue = isNaN(num) ? 0 : num;
      const label = labelKey ? String(item[labelKey]) : key;

      if (!acc[key]) {
        acc[key] = { key, label, value: 0 };
      }
      acc[key].value += numValue;
      acc[key].label = label; // Usa o último label encontrado

      return acc;
    },
    {} as Record<string, { key: string; label: string; value: number }>
  );

  return Object.values(grouped).sort((a, b) => b.value - a.value);
}

// Calcula média
export function average<T>(arr: T[], key?: keyof T): number {
  if (!arr || arr.length === 0) return 0;
  return sum(arr, key) / arr.length;
}

// Filtra dados por período
export function filterByDateRange<T>(
  arr: T[],
  dateKey: keyof T,
  startDate: Date,
  endDate: Date
): T[] {
  if (!arr || arr.length === 0) return [];

  return arr.filter((item) => {
    const dateStr = String(item[dateKey]);
    const date = new Date(dateStr);
    return date >= startDate && date <= endDate;
  });
}

// Calcula datas para períodos predefinidos
export function getDateRange(period: string): { startDate: Date; endDate: Date } {
  console.log('🗓️ [getDateRange] Calculando período:', period);

  // Check if it's a monthly period (YYYY-MM format)
  const monthlyMatch = period.match(/^(\d{4})-(\d{2})$/);
  if (monthlyMatch) {
    const year = parseInt(monthlyMatch[1], 10);
    const month = parseInt(monthlyMatch[2], 10) - 1; // JavaScript months are 0-indexed

    // Usar UTC para evitar problemas de fuso horário
    const startDate = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999)); // Last day of the month

    console.log('🗓️ [getDateRange] Período mensal detectado (UTC):', {
      period,
      year,
      month: month + 1,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      startDateLocal: startDate.toISOString().split('T')[0],
      endDateLocal: endDate.toISOString().split('T')[0],
      timezone: 'UTC (sem conversão de fuso horário)',
    });

    return { startDate, endDate };
  }

  // Fallback para o mês atual se o formato não for reconhecido
  console.warn(
    '⚠️ [getDateRange] Formato de período não reconhecido:',
    period,
    'usando fevereiro 2026 como padrão'
  );
  const startDate = new Date(Date.UTC(2026, 1, 1, 0, 0, 0, 0)); // Fevereiro de 2026 UTC
  const endDate = new Date(Date.UTC(2026, 2, 0, 23, 59, 59, 999)); // Último dia de fevereiro UTC

  return { startDate, endDate };
}

// Mapeia UF para região do Brasil
export function getRegion(uf: string): string {
  const regions: Record<string, string> = {
    // Norte
    AC: 'N',
    AM: 'N',
    AP: 'N',
    PA: 'N',
    RO: 'N',
    RR: 'N',
    TO: 'N',
    // Nordeste
    AL: 'NE',
    BA: 'NE',
    CE: 'NE',
    MA: 'NE',
    PB: 'NE',
    PE: 'NE',
    PI: 'NE',
    RN: 'NE',
    SE: 'NE',
    // Centro-Oeste
    DF: 'CO',
    GO: 'CO',
    MS: 'CO',
    MT: 'CO',
    // Sudeste
    ES: 'SE',
    MG: 'SE',
    RJ: 'SE',
    SP: 'SE',
    // Sul
    PR: 'S',
    RS: 'S',
    SC: 'S',
  };

  return regions[uf?.toUpperCase()] || 'Outros';
}

// Nomes das regiões
export const regionNames: Record<string, string> = {
  N: 'Norte',
  NE: 'Nordeste',
  CO: 'Centro-Oeste',
  SE: 'Sudeste',
  S: 'Sul',
  Outros: 'Outros',
};

// Formata data para exibição
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR');
}

// Formata nome do mês
export function formatMonth(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const months = [
    'Jan',
    'Fev',
    'Mar',
    'Abr',
    'Mai',
    'Jun',
    'Jul',
    'Ago',
    'Set',
    'Out',
    'Nov',
    'Dez',
  ];
  return `${months[parseInt(month) - 1]}/${year.slice(2)}`;
}
