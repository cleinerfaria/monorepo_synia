/**
 * Parser e importador para tabela CMED (ANVISA)
 * Processa arquivos XLSX ou CSV baixados do site da ANVISA
 *
 * O arquivo CMED possui linhas de introdução/notas antes dos dados reais.
 * O parser detecta automaticamente a linha de cabeçalho buscando "SUBSTÂNCIA"
 */

import ExcelJS from 'exceljs';

// Mapeamento das colunas do CSV CMED para nosso modelo
export const CMED_COLUMN_MAPPING = {
  // Identificação do produto
  SUBSTÂNCIA: 'substancia',
  CNPJ: 'cnpj',
  LABORATÓRIO: 'laboratorio',
  'CÓDIGO GGREM': 'codigo_ggrem',
  REGISTRO: 'registro',
  'EAN 1': 'ean_1',
  'EAN 2': 'ean_2',
  'EAN 3': 'ean_3',
  PRODUTO: 'produto',
  APRESENTAÇÃO: 'apresentacao',
  'CLASSE TERAPÊUTICA': 'classe_terapeutica',
  'TIPO DE PRODUTO (STATUS DO PRODUTO)': 'tipo_produto',
  'REGIME DE PREÇO': 'regime_preco',

  // Preços PF (Preço Fábrica)
  'PF Sem Impostos': 'pf_sem_impostos',
  'PF 0%': 'pf_0',
  'PF 12 %': 'pf_12',
  'PF 12 %  ALC': 'pf_12_alc',
  'PF 17 %': 'pf_17',
  'PF 17 %  ALC': 'pf_17_alc',
  'PF 17,5 %': 'pf_17_5',
  'PF 17,5 %  ALC': 'pf_17_5_alc',
  'PF 18 %': 'pf_18',
  'PF 18 %  ALC': 'pf_18_alc',
  'PF 19 %': 'pf_19',
  'PF 19 %  ALC': 'pf_19_alc',
  'PF 19,5 %': 'pf_19_5',
  'PF 19,5 %  ALC': 'pf_19_5_alc',
  'PF 20 %': 'pf_20',
  'PF 20 %  ALC': 'pf_20_alc',
  'PF 20,5 %': 'pf_20_5',
  'PF 20,5 %  ALC': 'pf_20_5_alc',
  'PF 21 %': 'pf_21',
  'PF 21 %  ALC': 'pf_21_alc',
  'PF 22 %': 'pf_22',
  'PF 22 %  ALC': 'pf_22_alc',
  'PF 22,5 %': 'pf_22_5',
  'PF 22,5 %  ALC': 'pf_22_5_alc',
  'PF 23 %': 'pf_23',
  'PF 23 %  ALC': 'pf_23_alc',

  // Preços PMC (Preço Máximo ao Consumidor)
  'PMC Sem Impostos': 'pmc_sem_impostos',
  'PMC 0 %': 'pmc_0',
  'PMC 12 %': 'pmc_12',
  'PMC 12 %  ALC': 'pmc_12_alc',
  'PMC 17 %': 'pmc_17',
  'PMC 17 %  ALC': 'pmc_17_alc',
  'PMC 17,5 %': 'pmc_17_5',
  'PMC 17,5 %  ALC': 'pmc_17_5_alc',
  'PMC 18 %': 'pmc_18',
  'PMC 18 %  ALC': 'pmc_18_alc',
  'PMC 19 %': 'pmc_19',
  'PMC 19 %  ALC': 'pmc_19_alc',
  'PMC 19,5 %': 'pmc_19_5',
  'PMC 19,5 %  ALC': 'pmc_19_5_alc',
  'PMC 20 %': 'pmc_20',
  'PMC 20 %  ALC': 'pmc_20_alc',
  'PMC 20,5 %': 'pmc_20_5',
  'PMC 20,5 %  ALC': 'pmc_20_5_alc',
  'PMC 21 %': 'pmc_21',
  'PMC 21 %  ALC': 'pmc_21_alc',
  'PMC 22 %': 'pmc_22',
  'PMC 22 %  ALLC': 'pmc_22_alc', // Note: typo in original file
  'PMC 22,5 %': 'pmc_22_5',
  'PMC 22,5 %  ALC': 'pmc_22_5_alc',
  'PMC 23 %': 'pmc_23',
  'PMC 23 %  ALC': 'pmc_23_alc',

  // Informações regulatórias
  'RESTRIÇÃO HOSPITALAR': 'restricao_hospitalar',
  CAP: 'cap',
  'CONFAZ 87': 'confaz_87',
  'ICMS 0%': 'icms_0',
  'ANÁLISE RECURSAL': 'analise_recursal',
  'LISTA DE CONCESSÃO DE CRÉDITO TRIBUTÁRIO (PIS/COFINS)': 'lista_concessao_credito_tributario',
  'COMERCIALIZAÇÃO 2024': 'comercializacao_2024',
  TARJA: 'tarja',
  'DESTINAÇÃO COMERCIAL': 'destinacao_comercial',
} as const;

// Tipos de preço que salvamos no histórico
export const CMED_PRICE_TYPES = [
  { type: 'pf_sem_impostos', label: 'PF Sem Impostos' },
  { type: 'pf_18', label: 'PF 18%' },
  { type: 'pmc_sem_impostos', label: 'PMC Sem Impostos' },
  { type: 'pmc_18', label: 'PMC 18%' },
] as const;

// Opções de colunas PF disponíveis para seleção
export const CMED_PF_OPTIONS = [
  { value: 'pf_sem_impostos', label: 'PF Sem Impostos' },
  { value: 'pf_0', label: 'PF 0%' },
  { value: 'pf_12', label: 'PF 12%' },
  { value: 'pf_12_alc', label: 'PF 12% ALC' },
  { value: 'pf_17', label: 'PF 17%' },
  { value: 'pf_17_alc', label: 'PF 17% ALC' },
  { value: 'pf_17_5', label: 'PF 17,5%' },
  { value: 'pf_17_5_alc', label: 'PF 17,5% ALC' },
  { value: 'pf_18', label: 'PF 18%' },
  { value: 'pf_18_alc', label: 'PF 18% ALC' },
  { value: 'pf_19', label: 'PF 19%' },
  { value: 'pf_19_alc', label: 'PF 19% ALC' },
  { value: 'pf_19_5', label: 'PF 19,5%' },
  { value: 'pf_19_5_alc', label: 'PF 19,5% ALC' },
  { value: 'pf_20', label: 'PF 20%' },
  { value: 'pf_20_alc', label: 'PF 20% ALC' },
  { value: 'pf_20_5', label: 'PF 20,5%' },
  { value: 'pf_20_5_alc', label: 'PF 20,5% ALC' },
  { value: 'pf_21', label: 'PF 21%' },
  { value: 'pf_21_alc', label: 'PF 21% ALC' },
  { value: 'pf_22', label: 'PF 22%' },
  { value: 'pf_22_alc', label: 'PF 22% ALC' },
  { value: 'pf_22_5', label: 'PF 22,5%' },
  { value: 'pf_22_5_alc', label: 'PF 22,5% ALC' },
  { value: 'pf_23', label: 'PF 23%' },
  { value: 'pf_23_alc', label: 'PF 23% ALC' },
] as const;

// Opções de colunas PMC disponíveis para seleção
export const CMED_PMC_OPTIONS = [
  { value: 'pmc_sem_impostos', label: 'PMC Sem Impostos' },
  { value: 'pmc_0', label: 'PMC 0%' },
  { value: 'pmc_12', label: 'PMC 12%' },
  { value: 'pmc_12_alc', label: 'PMC 12% ALC' },
  { value: 'pmc_17', label: 'PMC 17%' },
  { value: 'pmc_17_alc', label: 'PMC 17% ALC' },
  { value: 'pmc_17_5', label: 'PMC 17,5%' },
  { value: 'pmc_17_5_alc', label: 'PMC 17,5% ALC' },
  { value: 'pmc_18', label: 'PMC 18%' },
  { value: 'pmc_18_alc', label: 'PMC 18% ALC' },
  { value: 'pmc_19', label: 'PMC 19%' },
  { value: 'pmc_19_alc', label: 'PMC 19% ALC' },
  { value: 'pmc_19_5', label: 'PMC 19,5%' },
  { value: 'pmc_19_5_alc', label: 'PMC 19,5% ALC' },
  { value: 'pmc_20', label: 'PMC 20%' },
  { value: 'pmc_20_alc', label: 'PMC 20% ALC' },
  { value: 'pmc_20_5', label: 'PMC 20,5%' },
  { value: 'pmc_20_5_alc', label: 'PMC 20,5% ALC' },
  { value: 'pmc_21', label: 'PMC 21%' },
  { value: 'pmc_21_alc', label: 'PMC 21% ALC' },
  { value: 'pmc_22', label: 'PMC 22%' },
  { value: 'pmc_22_alc', label: 'PMC 22% ALC' },
  { value: 'pmc_22_5', label: 'PMC 22,5%' },
  { value: 'pmc_22_5_alc', label: 'PMC 22,5% ALC' },
  { value: 'pmc_23', label: 'PMC 23%' },
  { value: 'pmc_23_alc', label: 'PMC 23% ALC' },
] as const;

// Mapeamento de alíquota por UF
export const UF_ICMS_MAPPING: Record<string, string> = {
  AC: '17',
  AL: '18',
  AP: '18',
  AM: '18',
  BA: '19',
  CE: '18',
  DF: '18',
  ES: '17',
  GO: '17',
  MA: '18',
  MT: '17',
  MS: '17',
  MG: '18',
  PA: '17',
  PB: '18',
  PR: '18',
  PE: '18',
  PI: '18',
  RJ: '20',
  RN: '18',
  RS: '18',
  RO: '17.5',
  RR: '17',
  SC: '17',
  SP: '18',
  SE: '18',
  TO: '18',
};

export interface CmedParsedRow {
  // Identificação
  substancia: string;
  cnpj: string;
  laboratorio: string;
  codigo_ggrem: string;
  registro: string;
  ean_1: string | null;
  ean_2: string | null;
  ean_3: string | null;
  produto: string;
  apresentacao: string;
  classe_terapeutica: string;
  tipo_produto: string;
  regime_preco: string;

  // Preços (todos os valores numéricos)
  prices: Record<string, number | null>;

  // Regulatório
  restricao_hospitalar: boolean;
  cap: boolean;
  confaz_87: boolean;
  icms_0: boolean;
  analise_recursal: string | null;
  lista_concessao_credito_tributario: string | null;
  comercializacao_2024: boolean;
  tarja: string | null;
  destinacao_comercial: string | null;
}

export interface CmedParseResult {
  success: boolean;
  rows: CmedParsedRow[];
  referenceDate: string | null; // Date in yyyy-MM-dd format extracted from file
  errors: Array<{
    row: number;
    message: string;
    data?: Record<string, unknown>;
  }>;
  stats: {
    total: number;
    parsed: number;
    errors: number;
  };
}

/**
 * Extract reference date from CMED file header rows
 * CMED files have date information in the first few rows before data
 * Common patterns:
 * - "Período de Publicação: 01/01/2026"
 * - "Data de Publicação: 01/01/2026"
 * - "Vigência: 01/01/2026"
 * - "LISTA DE PREÇOS DE MEDICAMENTOS - 01/01/2026"
 */
function extractReferenceDateFromRows(rows: string[][]): string | null {
  // Check first 10 rows for date patterns
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const rowText = rows[i].join(' ').trim();

    // Pattern 1: "dd/mm/yyyy" standalone date format
    const dateMatch = rowText.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (dateMatch) {
      const [, day, month, year] = dateMatch;
      // Validate reasonable date
      const dayNum = parseInt(day, 10);
      const monthNum = parseInt(month, 10);
      const yearNum = parseInt(year, 10);
      if (
        dayNum >= 1 &&
        dayNum <= 31 &&
        monthNum >= 1 &&
        monthNum <= 12 &&
        yearNum >= 2020 &&
        yearNum <= 2100
      ) {
        return `${year}-${month}-${day}`;
      }
    }

    // Pattern 2: Month name in Portuguese - "Janeiro de 2026", "JANEIRO/2026", etc.
    const monthNames = [
      'janeiro',
      'fevereiro',
      'março',
      'marco',
      'abril',
      'maio',
      'junho',
      'julho',
      'agosto',
      'setembro',
      'outubro',
      'novembro',
      'dezembro',
    ];
    const monthPattern = new RegExp(`(${monthNames.join('|')})[\\s/de]*(\\d{4})`, 'i');
    const monthMatch = rowText.match(monthPattern);
    if (monthMatch) {
      const monthName = monthMatch[1].toLowerCase().replace('marco', 'março');
      const year = monthMatch[2];
      const monthIndex = monthNames.findIndex(
        (m) => m === monthName || (monthName === 'março' && m === 'marco')
      );
      if (monthIndex !== -1) {
        const month = String(monthIndex + 1).padStart(2, '0');
        return `${year}-${month}-01`;
      }
    }
  }

  return null;
}

/**
 * Extract reference date from CSV header lines
 */
function extractReferenceDateFromCsvLines(lines: string[]): string | null {
  // Check first 10 lines for date patterns
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const lineText = lines[i];

    // Pattern 1: "dd/mm/yyyy" standalone date format
    const dateMatch = lineText.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (dateMatch) {
      const [, day, month, year] = dateMatch;
      const dayNum = parseInt(day, 10);
      const monthNum = parseInt(month, 10);
      const yearNum = parseInt(year, 10);
      if (
        dayNum >= 1 &&
        dayNum <= 31 &&
        monthNum >= 1 &&
        monthNum <= 12 &&
        yearNum >= 2020 &&
        yearNum <= 2100
      ) {
        return `${year}-${month}-${day}`;
      }
    }

    // Pattern 2: Month name in Portuguese
    const monthNames = [
      'janeiro',
      'fevereiro',
      'março',
      'marco',
      'abril',
      'maio',
      'junho',
      'julho',
      'agosto',
      'setembro',
      'outubro',
      'novembro',
      'dezembro',
    ];
    const monthPattern = new RegExp(`(${monthNames.join('|')})[\\s/de]*(\\d{4})`, 'i');
    const monthMatch = lineText.match(monthPattern);
    if (monthMatch) {
      const monthName = monthMatch[1].toLowerCase().replace('marco', 'março');
      const year = monthMatch[2];
      const monthIndex = monthNames.findIndex(
        (m) => m === monthName || (monthName === 'março' && m === 'marco')
      );
      if (monthIndex !== -1) {
        const month = String(monthIndex + 1).padStart(2, '0');
        return `${year}-${month}-01`;
      }
    }
  }

  return null;
}

/**
 * Parse a decimal value from Brazilian format (comma as decimal separator)
 */
function parseDecimal(value: string | undefined | null): number | null {
  if (!value || value.trim() === '' || value.trim() === '-') {
    return null;
  }

  // Remove spaces and convert comma to dot
  const cleaned = value.trim().replace(/\s/g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);

  return isNaN(parsed) ? null : parsed;
}

/**
 * Parse boolean from Portuguese text
 */
function parseBoolean(value: string | undefined | null): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return v === 'sim' || v === 's' || v === 'yes' || v === 'true' || v === '1';
}

/**
 * Clean EAN value
 */
function cleanEan(value: string | undefined | null): string | null {
  if (!value) return null;
  const cleaned = value.trim().replace(/\s+/g, '').replace(/-/g, '');
  return cleaned && cleaned !== '-' ? cleaned : null;
}

/**
 * Find the header row index by looking for "SUBSTÂNCIA" in the first column
 * CMED files have intro text and notes before actual data
 */
function findHeaderRowIndex(rows: string[][]): number {
  for (let i = 0; i < rows.length; i++) {
    const firstCell = rows[i][0]?.trim().toUpperCase();
    if (firstCell === 'SUBSTÂNCIA') {
      return i;
    }
  }
  return -1;
}

/**
 * Parse XLSX file content from CMED
 */
export async function parseCmedXlsx(buffer: ArrayBuffer): Promise<CmedParseResult> {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
      return {
        success: false,
        rows: [],
        referenceDate: null,
        errors: [{ row: 0, message: 'Planilha não encontrada no arquivo' }],
        stats: { total: 0, parsed: 0, errors: 1 },
      };
    }

    // Convert to array of arrays
    const rows: string[][] = [];
    worksheet.eachRow({ includeEmpty: false }, (row) => {
      const rowValues: string[] = [];
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        // Pad array if there are gaps
        while (rowValues.length < colNumber - 1) {
          rowValues.push('');
        }
        rowValues.push(cell.text ?? '');
      });
      rows.push(rowValues);
    });

    if (rows.length < 2) {
      return {
        success: false,
        rows: [],
        referenceDate: null,
        errors: [{ row: 0, message: 'Arquivo vazio ou sem dados' }],
        stats: { total: 0, parsed: 0, errors: 1 },
      };
    }

    // Find header row (skip intro text)
    const headerRowIndex = findHeaderRowIndex(rows);
    if (headerRowIndex === -1) {
      return {
        success: false,
        rows: [],
        referenceDate: null,
        errors: [
          { row: 0, message: 'Cabeçalho não encontrado. Procurando por coluna "SUBSTÂNCIA".' },
        ],
        stats: { total: 0, parsed: 0, errors: 1 },
      };
    }

    // Extract reference date from header rows (before data starts)
    const referenceDate = extractReferenceDateFromRows(rows.slice(0, headerRowIndex));

    const headers = rows[headerRowIndex].map((h) => String(h).trim());

    // Create column index mapping
    const columnIndex: Record<string, number> = {};
    headers.forEach((header, index) => {
      columnIndex[header] = index;
    });

    const parsedRows: CmedParsedRow[] = [];
    const errors: Array<{ row: number; message: string; data?: Record<string, unknown> }> = [];

    // Parse data rows (starting after header)
    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      const values = rows[i];
      if (!values || values.length === 0 || !values.some((v) => v && String(v).trim())) continue;

      try {
        // Get value by column name
        const getValue = (columnName: string): string | undefined => {
          const index = columnIndex[columnName];
          return index !== undefined ? String(values[index] ?? '').trim() : undefined;
        };

        // Extract all price columns
        const prices: Record<string, number | null> = {};
        Object.entries(CMED_COLUMN_MAPPING).forEach(([csvCol, dbCol]) => {
          if (dbCol.startsWith('pf_') || dbCol.startsWith('pmc_')) {
            prices[dbCol] = parseDecimal(getValue(csvCol));
          }
        });

        const row: CmedParsedRow = {
          substancia: (getValue('SUBSTÂNCIA') || '').replace(/;/g, ' + '),
          cnpj: getValue('CNPJ') || '',
          laboratorio: getValue('LABORATÓRIO') || '',
          codigo_ggrem: getValue('CÓDIGO GGREM') || '',
          registro: getValue('REGISTRO') || '',
          ean_1: cleanEan(getValue('EAN 1')),
          ean_2: cleanEan(getValue('EAN 2')),
          ean_3: cleanEan(getValue('EAN 3')),
          produto: getValue('PRODUTO') || '',
          apresentacao: getValue('APRESENTAÇÃO') || '',
          classe_terapeutica: getValue('CLASSE TERAPÊUTICA') || '',
          tipo_produto: getValue('TIPO DE PRODUTO (STATUS DO PRODUTO)') || '',
          regime_preco: getValue('REGIME DE PREÇO') || '',
          prices,
          restricao_hospitalar: parseBoolean(getValue('RESTRIÇÃO HOSPITALAR')),
          cap: parseBoolean(getValue('CAP')),
          confaz_87: parseBoolean(getValue('CONFAZ 87')),
          icms_0: parseBoolean(getValue('ICMS 0%')),
          analise_recursal: getValue('ANÁLISE RECURSAL') || null,
          lista_concessao_credito_tributario:
            getValue('LISTA DE CONCESSÃO DE CRÉDITO TRIBUTÁRIO (PIS/COFINS)') || null,
          comercializacao_2024: parseBoolean(getValue('COMERCIALIZAÇÃO 2024')),
          tarja: getValue('TARJA')?.trim() || null,
          destinacao_comercial: getValue('DESTINAÇÃO COMERCIAL')?.trim() || null,
        };

        // Validate required fields
        if (!row.codigo_ggrem) {
          errors.push({
            row: i + 1,
            message: 'Código GGREM ausente',
            data: { produto: row.produto },
          });
          continue;
        }

        parsedRows.push(row);
      } catch (error: any) {
        errors.push({
          row: i + 1,
          message: error.message || 'Erro ao processar linha',
        });
      }
    }

    return {
      success: errors.length === 0,
      rows: parsedRows,
      referenceDate,
      errors,
      stats: {
        total: rows.length - headerRowIndex - 1,
        parsed: parsedRows.length,
        errors: errors.length,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      rows: [],
      referenceDate: null,
      errors: [{ row: 0, message: `Erro ao ler arquivo XLSX: ${error.message}` }],
      stats: { total: 0, parsed: 0, errors: 1 },
    };
  }
}

/**
 * Parse CSV content from CMED file
 * Detects header row automatically by looking for "SUBSTÂNCIA"
 */
export function parseCmedCsv(content: string): CmedParseResult {
  const lines = content.split('\n');

  if (lines.length < 2) {
    return {
      success: false,
      rows: [],
      referenceDate: null,
      errors: [{ row: 0, message: 'Arquivo vazio ou sem dados' }],
      stats: { total: 0, parsed: 0, errors: 1 },
    };
  }

  // Find header row by looking for "SUBSTÂNCIA"
  let headerRowIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const firstCol = lines[i].split(';')[0]?.trim().toUpperCase();
    if (firstCol === 'SUBSTÂNCIA') {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) {
    return {
      success: false,
      rows: [],
      referenceDate: null,
      errors: [
        { row: 0, message: 'Cabeçalho não encontrado. Procurando por coluna "SUBSTÂNCIA".' },
      ],
      stats: { total: 0, parsed: 0, errors: 1 },
    };
  }

  // Extract reference date from header lines (before data starts)
  const referenceDate = extractReferenceDateFromCsvLines(lines.slice(0, headerRowIndex));

  // Parse header
  const headerLine = lines[headerRowIndex];
  const headers = headerLine.split(';').map((h) => h.trim());

  // Create column index mapping
  const columnIndex: Record<string, number> = {};
  headers.forEach((header, index) => {
    columnIndex[header] = index;
  });

  const rows: CmedParsedRow[] = [];
  const errors: Array<{ row: number; message: string; data?: Record<string, unknown> }> = [];

  // Parse data rows (starting after header)
  for (let i = headerRowIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    try {
      const values = line.split(';');

      // Get value by column name
      const getValue = (columnName: string): string | undefined => {
        const index = columnIndex[columnName];
        return index !== undefined ? values[index]?.trim() : undefined;
      };

      // Extract all price columns
      const prices: Record<string, number | null> = {};
      Object.entries(CMED_COLUMN_MAPPING).forEach(([csvCol, dbCol]) => {
        if (dbCol.startsWith('pf_') || dbCol.startsWith('pmc_')) {
          prices[dbCol] = parseDecimal(getValue(csvCol));
        }
      });

      const row: CmedParsedRow = {
        substancia: (getValue('SUBSTÂNCIA') || '').replace(/;/g, ' + '),
        cnpj: getValue('CNPJ') || '',
        laboratorio: getValue('LABORATÓRIO') || '',
        codigo_ggrem: getValue('CÓDIGO GGREM') || '',
        registro: getValue('REGISTRO') || '',
        ean_1: cleanEan(getValue('EAN 1')),
        ean_2: cleanEan(getValue('EAN 2')),
        ean_3: cleanEan(getValue('EAN 3')),
        produto: getValue('PRODUTO') || '',
        apresentacao: getValue('APRESENTAÇÃO') || '',
        classe_terapeutica: getValue('CLASSE TERAPÊUTICA') || '',
        tipo_produto: getValue('TIPO DE PRODUTO (STATUS DO PRODUTO)') || '',
        regime_preco: getValue('REGIME DE PREÇO') || '',
        prices,
        restricao_hospitalar: parseBoolean(getValue('RESTRIÇÃO HOSPITALAR')),
        cap: parseBoolean(getValue('CAP')),
        confaz_87: parseBoolean(getValue('CONFAZ 87')),
        icms_0: parseBoolean(getValue('ICMS 0%')),
        analise_recursal: getValue('ANÁLISE RECURSAL') || null,
        lista_concessao_credito_tributario:
          getValue('LISTA DE CONCESSÃO DE CRÉDITO TRIBUTÁRIO (PIS/COFINS)') || null,
        comercializacao_2024: parseBoolean(getValue('COMERCIALIZAÇÃO 2024')),
        tarja: getValue('TARJA')?.trim() || null,
        destinacao_comercial: getValue('DESTINAÇÃO COMERCIAL')?.trim() || null,
      };

      // Validate required fields
      if (!row.codigo_ggrem) {
        errors.push({
          row: i + 1,
          message: 'Código GGREM ausente',
          data: { produto: row.produto },
        });
        continue;
      }

      rows.push(row);
    } catch (error: any) {
      errors.push({
        row: i + 1,
        message: error.message || 'Erro ao processar linha',
      });
    }
  }

  return {
    success: errors.length === 0,
    rows,
    referenceDate,
    errors,
    stats: {
      total: lines.length - headerRowIndex - 1,
      parsed: rows.length,
      errors: errors.length,
    },
  };
}

/**
 * Get the price field name for a given UF and type
 */
export function getPriceFieldForUF(uf: string, type: 'pf' | 'pmc', alc: boolean = false): string {
  const icms = UF_ICMS_MAPPING[uf] || '18';
  const suffix = alc ? '_alc' : '';
  const icmsNormalized = icms.replace('.', '_');
  return `${type}_${icmsNormalized}${suffix}`;
}

/**
 * Get primary EAN from parsed row (first non-null)
 */
export function getPrimaryEan(row: CmedParsedRow): string | null {
  return row.ean_1 || row.ean_2 || row.ean_3;
}

/**
 * Build description for ref_item from CMED row (legacy - concatenated)
 */
export function buildItemDescription(row: CmedParsedRow): string {
  const parts = [row.produto];
  if (row.apresentacao) {
    parts.push(row.apresentacao);
  }
  return parts.join(' - ');
}

/**
 * Extract concentration from presentation field
 *
 * IMPORTANT: In CMED, concentration (if present) is ALWAYS at the START of the APRESENTAÇÃO column.
 * Concentration is never just a number + ML (like "5ML" or "500ML").
 *
 * Examples:
 * - "(50000 + 10000) UI/ML SOL OR CT FR GOT PLAS AMB X 10 ML" -> "(50000 + 10000) UI/ML"
 * - "(2 + 0,03) MG COM REV CT BL AL PLAS PVC/PVDC OPC X 84" -> "(2 + 0,03) MG"
 * - "2 MEQ/ML SOL INJ IV CX 10 FA VD TRANS X 50 ML" -> "2 MEQ/ML"
 * - "SUSP INJ IM CT 20 FA VD TRANS X 5 ML" -> null (no concentration at start)
 * - "KIT 2 FA VD INC PÓ LIOF + 2 FA DIL X 5 ML" -> null (no concentration at start)
 */
export function extractConcentration(row: CmedParsedRow): string | null {
  const apresentacao = row.apresentacao?.trim();
  if (!apresentacao) return null;

  // Pattern for concentrations like "(2 + 0,03) MG" or "(50000 + 10000) UI/ML"
  // These are expressions in parentheses followed by a unit
  const parenPattern =
    /^(\([^)]+\)\s*(?:MG|MCG|G|ML|UI|UG|MEQ|%|L|KG)(?:\s*\/\s*(?:ML|L|G|KG|DOSE|GOTA|HORA|DIA|H))?)/i;
  const parenMatch = apresentacao.match(parenPattern);
  if (parenMatch) {
    return parenMatch[1].trim().toUpperCase();
  }

  // Pattern for simple concentrations at the start like "2 MEQ/ML", "500 MG/ML", "10 MG"
  // Must include a unit indicator that's NOT just ML (to avoid "5 ML" being matched)
  // Concentration must have a divisor (like /ML) or be a non-ML unit
  const simplePattern =
    /^(\d+(?:[,.]\d+)?\s*(?:MG|MCG|G|UI|UG|MEQ|%|KG)(?:\s*\/\s*(?:ML|L|G|KG|DOSE|GOTA|HORA|DIA|H))?)/i;
  const simpleMatch = apresentacao.match(simplePattern);
  if (simpleMatch) {
    return simpleMatch[1].trim().toUpperCase().replace(/\s+/g, '');
  }

  // Pattern for concentrations with divisor like "X MG/ML" or "X UI/ML" at start
  // This catches patterns where there's a number followed by unit/divisor
  const divisorPattern =
    /^(\d+(?:[,.]\d+)?\s*(?:MG|MCG|G|ML|UI|UG|MEQ|%|L|KG)\s*\/\s*(?:ML|L|G|KG|DOSE|GOTA|HORA|DIA|H))/i;
  const divisorMatch = apresentacao.match(divisorPattern);
  if (divisorMatch) {
    return divisorMatch[1].trim().toUpperCase().replace(/\s+/g, '');
  }

  return null;
}

/**
 * Extract unit and quantity from presentation
 * Examples: "CX C/ 30 COM" -> { unit: "COM", quantity: 30 }
 */
export function extractUnitAndQuantity(row: CmedParsedRow): {
  unit: string | null;
  quantity: number | null;
} {
  const text = row.apresentacao || '';

  // Common units in CMED
  const units = [
    'COM',
    'COMP',
    'CAPS',
    'CAP',
    'CPR',
    'DRG',
    'AMP',
    'FA',
    'FR',
    'FAMP',
    'ML',
    'MG',
    'G',
    'SER',
    'BLIST',
    'BL',
    'ENV',
    'SAC',
    'TB',
    'TUBO',
    'BISNAGA',
    'POT',
    'POTE',
    'UN',
    'UNID',
  ];

  // Pattern: quantity + unit (e.g., "30 COM", "X 30", "C/ 30")
  const patterns = [
    /(?:C\/|COM|X|C)\s*(\d+)\s*(COM|COMP|CAPS|CAP|CPR|DRG|AMP|FA|FR|FAMP|ML|G|SER|BLIST|BL|ENV|SAC|TB|UN|UNID)/i,
    /(\d+)\s*(COM|COMP|CAPS|CAP|CPR|DRG|AMP|FA|FR|FAMP|ML|G|SER|BLIST|BL|ENV|SAC|TB|UN|UNID)/i,
    /(COM|COMP|CAPS|CAP|CPR|DRG|AMP|FA|FR|FAMP|SER|BLIST|BL|ENV|SAC|TB|UN|UNID)\s*(?:C\/|X|COM)?\s*(\d+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const isReversed = isNaN(parseInt(match[1]));
      if (isReversed) {
        return {
          unit: match[1].toUpperCase(),
          quantity: parseInt(match[2]),
        };
      }
      return {
        unit: match[2].toUpperCase(),
        quantity: parseInt(match[1]),
      };
    }
  }

  // Try to find just the unit
  for (const unit of units) {
    if (text.toUpperCase().includes(unit)) {
      return { unit: unit, quantity: null };
    }
  }

  return { unit: null, quantity: null };
}

/**
 * Build structured item data for ref_item from CMED row
 */
export interface CmedRefItemData {
  product_name: string;
  presentation: string | null;
  concentration: string | null;
  entry_unit: string | null;
  base_unit: string | null;
  quantity: number | null;
  tiss: string | null;
  tuss: string | null;
  ean: string | null;
  manufacturer_code: string | null;
  manufacturer_name: string;
  category: string | null;
  subcategory: string | null;
  extra_data: Record<string, unknown>;
}

export function buildCmedRefItemData(row: CmedParsedRow): CmedRefItemData {
  // CMED não possui dados de unidade e quantidade, mantemos null
  // const { unit, quantity } = extractUnitAndQuantity(row);

  return {
    product_name: row.produto,
    presentation: row.apresentacao || null,
    concentration: extractConcentration(row),
    entry_unit: null, // CMED não possui esse dado
    base_unit: null, // CMED não possui esse dado
    quantity: null, // CMED não possui esse dado,
    tiss: null, // CMED não tem TISS
    tuss: null, // CMED não tem TUSS
    ean: getPrimaryEan(row),
    manufacturer_code: row.cnpj || null,
    manufacturer_name: row.laboratorio,
    category: row.classe_terapeutica || null,
    subcategory: null,
    extra_data: buildExtraData(row),
  };
}

/**
 * Build extra_data JSON for ref_item from CMED row
 */
export function buildExtraData(row: CmedParsedRow): Record<string, unknown> {
  return {
    substancia: row.substancia,
    cnpj: row.cnpj,
    registro: row.registro,
    classe_terapeutica: row.classe_terapeutica,
    tipo_produto: row.tipo_produto,
    regime_preco: row.regime_preco,
    restricao_hospitalar: row.restricao_hospitalar,
    cap: row.cap,
    confaz_87: row.confaz_87,
    icms_0: row.icms_0,
    tarja: row.tarja,
    lista_concessao_credito_tributario: row.lista_concessao_credito_tributario,
    comercializacao_2024: row.comercializacao_2024,
    destinacao_comercial: row.destinacao_comercial,
    ean_2: row.ean_2,
    ean_3: row.ean_3,
  };
}

/**
 * Parse CMED file (auto-detect format by file extension or content)
 * Supports: .xlsx, .xls, .csv
 */
export async function parseCmedFile(file: File): Promise<CmedParseResult> {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    const buffer = await file.arrayBuffer();
    return parseCmedXlsx(buffer);
  } else if (fileName.endsWith('.csv')) {
    const content = await file.text();
    return parseCmedCsv(content);
  } else {
    // Try to detect by content - read first bytes
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer.slice(0, 4));

    // XLSX/ZIP magic number: 50 4B 03 04 (PK..)
    if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
      return parseCmedXlsx(buffer);
    }

    // Otherwise treat as CSV
    const decoder = new TextDecoder('utf-8');
    const content = decoder.decode(buffer);
    return parseCmedCsv(content);
  }
}

export async function validateCmedFile(file: File): Promise<{
  isValid: boolean;
  rowCount: number;
  errorCount: number;
  fileSizeKb: number;
  estimatedDurationSeconds: number;
  message: string;
}> {
  try {
    const fileSizeKb = Math.round(file.size / 1024);

    // Parse file to count rows
    const result = await parseCmedFile(file);
    const rowCount = result.stats.parsed;
    const errorCount = result.stats.errors;

    // Estimate: ~200 rows per second on average (includes DB operations)
    const estimatedDurationSeconds = Math.ceil(rowCount / 200);

    const isValid = result.success || result.stats.parsed > 0;

    return {
      isValid,
      rowCount,
      errorCount,
      fileSizeKb,
      estimatedDurationSeconds,
      message: isValid
        ? `${rowCount.toLocaleString('pt-BR')} produtos, ~${estimatedDurationSeconds}s de processamento`
        : `${errorCount} erros encontrados`,
    };
  } catch (error: any) {
    return {
      isValid: false,
      rowCount: 0,
      errorCount: 1,
      fileSizeKb: Math.round(file.size / 1024),
      estimatedDurationSeconds: 0,
      message: `Erro ao validar arquivo: ${error.message || 'Formato inválido'}`,
    };
  }
}
