/**
 * Parser e importador para tabela SIMPRO
 * Processa arquivos CSV ou XML exportados do sistema SIMPRO
 *
 * O arquivo SIMPRO XML possui estrutura com elementos ITEM contendo atributos
 */

// Mapeamento dos campos SIMPRO para nosso modelo
export const SIMPRO_FIELD_MAPPING = {
  // Identificação do produto
  CD_BARRA: 'ean',
  DESCRICAO: 'descricao',
  CD_SIMPRO: 'codigo_simpro',
  FABRICA: 'fabricante',
  IDENTIF: 'categoria',

  // Preços
  PC_EM_FAB: 'preco_pf', // Factory Price = PF
  PC_EM_VEN: 'preco_pmc', // Sale Price = PMC
  PC_EM_USU: 'preco_usuario',
  PC_FR_FAB: 'preco_fracao_fab',
  PC_FR_VEN: 'preco_fracao_venda',
  PC_FR_USU: 'preco_fracao_usuario',

  // Embalagem e quantidade
  QTDE_EMBAL: 'quantidade_embalagem',
  TP_EMBAL: 'tipo_embalagem', // CX, FR, UN, PCT
  TP_FRACAO: 'unidade', // UN, CAPS, CPDS, ML, G, KG
  QTDE_FRAC: 'quantidade_fracao',
} as const

// Opções de colunas de preço disponíveis para seleção
export const SIMPRO_PRICE_OPTIONS = [
  { value: 'preco_pf', label: 'PC_EM_FAB' },
  { value: 'preco_pmc', label: 'PC_EM_VEN' },
  { value: 'preco_usuario', label: 'PC_EM_USU' },
  { value: 'preco_fracao_fab', label: 'PC_FR_FAB' },
  { value: 'preco_fracao_venda', label: 'PC_FR_VEN' },
] as const

export interface SimproParsedRow {
  // Identificação (mapeada dos atributos do XML)
  codigo: string // CD_SIMPRO (externa code)
  codigo_usuario?: string // CD_USUARIO
  descricao: string // DESCRICAO
  ean: string | null // CD_BARRA
  fabricante: string // FABRICA
  categoria: string // IDENTIF (A/V/F)

  // Unidade base
  unidade: string | null // TP_FRACAO (UN, CAPS, etc)

  // Preços (todos os valores numéricos)
  prices: Record<string, number | null>

  // Informações adicionais (para extra_data)
  extra: Record<string, unknown>
}

export interface SimproParseResult {
  success: boolean
  rows: SimproParsedRow[]
  referenceDate: string | null // Data extraída do arquivo
  errors: Array<{
    row: number
    message: string
    data?: Record<string, unknown>
  }>
  stats: {
    total: number
    parsed: number
    errors: number
  }
}

/**
 * Parse boolean values
 */
function _parseBoolean(value: string | undefined | null): boolean {
  if (!value) return false
  const v = value.trim().toLowerCase()
  return v === 'sim' || v === 's' || v === 'yes' || v === 'true' || v === '1'
}

/**
 * Clean EAN value
 */
function cleanEan(value: string | undefined | null): string | null {
  if (!value) return null
  const cleaned = value.trim().replace(/\s+/g, '').replace(/-/g, '')
  return cleaned && cleaned !== '-' ? cleaned : null
}

/**
 * Extract reference date from filename (format: dd-mm-yyyy)
 * Example: mat_17-04-2024.pfb.xml -> 2024-04-17
 */
function extractDateFromFilename(filename: string): string | null {
  // Pattern: dd-mm-yyyy anywhere in filename
  const dateMatch = filename.match(/(\d{2})-(\d{2})-(\d{4})/)
  if (dateMatch) {
    const [, day, month, year] = dateMatch
    const dayNum = parseInt(day, 10)
    const monthNum = parseInt(month, 10)
    const yearNum = parseInt(year, 10)
    if (
      dayNum >= 1 &&
      dayNum <= 31 &&
      monthNum >= 1 &&
      monthNum <= 12 &&
      yearNum >= 2020 &&
      yearNum <= 2100
    ) {
      return `${year}-${month}-${day}`
    }
  }
  return null
}

/**
 * Parse decimal number, handling Brazilian format (comma as decimal separator)
 */
function parseDecimal(value: string | undefined | null): number | null {
  if (!value) return null
  const cleaned = String(value).trim().replace(/\./g, '').replace(/,/g, '.')
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

/**
 * Parse SIMPRO XML file with ITEM elements containing attributes
 * Structure: <PRODUTOS><ITEM CD_SIMPRO="..." DESCRICAO="..." ... /></PRODUTOS>
 */
export function parseSimproXml(content: string, filename: string = ''): SimproParseResult {
  try {
    // Remove BOM if present
    const xmlContent = content.replace(/^\uFEFF/, '')

    // Parse XML using DOMParser
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml')

    // Check for parsing errors
    if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
      return {
        success: false,
        rows: [],
        referenceDate: null,
        errors: [{ row: 0, message: 'Erro ao parsear XML: Arquivo XML inválido' }],
        stats: { total: 0, parsed: 0, errors: 1 },
      }
    }

    // Find ITEM elements (case-insensitive)
    let itemNodes = xmlDoc.getElementsByTagName('ITEM')
    if (itemNodes.length === 0) {
      itemNodes = xmlDoc.getElementsByTagName('item')
    }
    if (itemNodes.length === 0) {
      itemNodes = xmlDoc.getElementsByTagName('Item')
    }

    if (itemNodes.length === 0) {
      return {
        success: false,
        rows: [],
        referenceDate: null,
        errors: [{ row: 0, message: 'Nenhum produto encontrado no arquivo XML (ITEM elements)' }],
        stats: { total: 0, parsed: 0, errors: 1 },
      }
    }

    const parsedRows: SimproParsedRow[] = []
    const errors: Array<{ row: number; message: string; data?: Record<string, unknown> }> = []

    // Get reference date from filename
    const referenceDate = extractDateFromFilename(filename)

    // Parse each ITEM element
    for (let i = 0; i < itemNodes.length; i++) {
      const itemNode = itemNodes[i] as Element

      try {
        // Get attributes (case-insensitive helper)
        const getAttr = (name: string): string | undefined => {
          // Try exact case
          const value = itemNode.getAttribute(name)
          if (value) return value

          // Try case-insensitive
          const attrs = itemNode.attributes
          for (let j = 0; j < attrs.length; j++) {
            if (attrs[j].name.toUpperCase() === name.toUpperCase()) {
              return attrs[j].value
            }
          }
          return undefined
        }

        // Get required code (CD_SIMPRO or CD_USUARIO)
        const codigo = getAttr('CD_SIMPRO') || getAttr('CD_USUARIO')

        if (!codigo) {
          errors.push({
            row: i + 1,
            message: 'Código do produto não encontrado (CD_SIMPRO ou CD_USUARIO)',
          })
          continue
        }

        // Get description (required)
        const descricao = getAttr('DESCRICAO') || ''
        if (!descricao) {
          errors.push({
            row: i + 1,
            message: 'Descrição não encontrada',
          })
          continue
        }

        // Extract all prices
        const prices: Record<string, number | null> = {
          preco_pf: parseDecimal(getAttr('PC_EM_FAB')),
          preco_pmc: parseDecimal(getAttr('PC_EM_VEN')),
          preco_usuario: parseDecimal(getAttr('PC_EM_USU')),
          preco_fracao_fab: parseDecimal(getAttr('PC_FR_FAB')),
          preco_fracao_venda: parseDecimal(getAttr('PC_FR_VEN')),
          preco_fracao_usuario: parseDecimal(getAttr('PC_FR_USU')),
        }

        // Build extra data with all additional fields
        const extra: Record<string, unknown> = {
          cd_usuario: getAttr('CD_USUARIO'),
          cd_fracao: getAttr('CD_FRACAO'),
          vigencia: getAttr('VIGENCIA'),
          identif: getAttr('IDENTIF'),
          perc_lucro: getAttr('PERC_LUCR'),
          tipo_alteracao: getAttr('TIP_ALT'),
          cd_mercado: getAttr('CD_MERCADO'),
          perc_desconto: getAttr('PERC_DESC'),
          ipi_produto: getAttr('IPI_PRODUTO'),
          registro_anvisa: getAttr('REGISTRO_ANVISA'),
          validade_anvisa: getAttr('VALIDADE_ANVISA'),
          lista: getAttr('LISTA'),
          hospitalar: getAttr('HOSPITALAR'),
          fracionar: getAttr('FRACIONAR'),
          cd_tuss: getAttr('CD_TUSS'),
          cd_classif: getAttr('CD_CLASSIF'),
          cd_ref_pro: getAttr('CD_REF_PRO'),
          generico: getAttr('GENERICO'),
          diversos: getAttr('DIVERSOS'),
          quantidade_fracao: parseDecimal(getAttr('QTDE_FRAC')),
        }

        const row: SimproParsedRow = {
          codigo,
          codigo_usuario: getAttr('CD_USUARIO'),
          descricao,
          ean: getAttr('CD_BARRA') || null,
          fabricante: getAttr('FABRICA') || '',
          categoria: getAttr('IDENTIF') || 'A',
          unidade: getAttr('TP_FRACAO') || null,
          prices,
          extra,
        }

        parsedRows.push(row)
      } catch (error: any) {
        errors.push({
          row: i + 1,
          message: error.message || 'Erro ao processar produto',
        })
      }
    }

    return {
      success: errors.length === 0,
      rows: parsedRows,
      referenceDate,
      errors,
      stats: {
        total: itemNodes.length,
        parsed: parsedRows.length,
        errors: errors.length,
      },
    }
  } catch (error: any) {
    return {
      success: false,
      rows: [],
      referenceDate: null,
      errors: [{ row: 0, message: `Erro ao ler arquivo XML: ${error.message}` }],
      stats: { total: 0, parsed: 0, errors: 1 },
    }
  }
}

/**
 * Extract reference date from CSV lines
 */
function extractReferenceDateFromCsvLines(lines: string[]): string | null {
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const lineText = lines[i]

    const dateMatch = lineText.match(/(\d{2})\/(\d{2})\/(\d{4})/)
    if (dateMatch) {
      const [, day, month, year] = dateMatch
      const dayNum = parseInt(day, 10)
      const monthNum = parseInt(month, 10)
      const yearNum = parseInt(year, 10)
      if (
        dayNum >= 1 &&
        dayNum <= 31 &&
        monthNum >= 1 &&
        monthNum <= 12 &&
        yearNum >= 2020 &&
        yearNum <= 2100
      ) {
        return `${year}-${month}-${day}`
      }
    }
  }

  return null
}

/**
 * Parse CSV content from SIMPRO file
 */
export function parseSimproCsv(content: string): SimproParseResult {
  const lines = content.split('\n')

  if (lines.length < 2) {
    return {
      success: false,
      rows: [],
      referenceDate: null,
      errors: [{ row: 0, message: 'Arquivo vazio ou sem dados' }],
      stats: { total: 0, parsed: 0, errors: 1 },
    }
  }

  // Find header row
  let headerRowIndex = 0
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const headerText = lines[i].toUpperCase()
    if (
      headerText.includes('CÓDIGO') ||
      headerText.includes('DESCRICAO') ||
      headerText.includes('DESCRIÇÃO')
    ) {
      headerRowIndex = i
      break
    }
  }

  // Extract reference date
  const referenceDate = extractReferenceDateFromCsvLines(lines.slice(0, headerRowIndex))

  // Parse headers
  const headerLine = lines[headerRowIndex]
  const headers = headerLine.split(';').map((h) => h.trim())

  // Create column index mapping
  const columnIndex: Record<string, number> = {}
  headers.forEach((header, index) => {
    columnIndex[header] = index
  })

  const parsedRows: SimproParsedRow[] = []
  const errors: Array<{ row: number; message: string; data?: Record<string, unknown> }> = []

  // Parse data rows
  for (let i = headerRowIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    try {
      const values = line.split(';').map((v) => v.trim())

      // Get value by column name
      const getValue = (columnName: string): string | undefined => {
        const index = columnIndex[columnName]
        if (index !== undefined && values[index]) {
          return values[index]
        }

        // Try case-insensitive
        const headerKey = headers.findIndex((h) => h.toUpperCase() === columnName.toUpperCase())
        if (headerKey !== -1 && values[headerKey]) {
          return values[headerKey]
        }

        return undefined
      }

      // Extract code
      const codigo = getValue('CÓDIGO') || getValue('CÓDIGO SIMPRO')
      if (!codigo) {
        errors.push({
          row: i + 1,
          message: 'Código do produto não encontrado',
        })
        continue
      }

      // Extract prices
      const prices: Record<string, number | null> = {
        preco_pf: parseDecimal(getValue('PC_EM_FAB') || getValue('PREÇO PF')),
        preco_pmc: parseDecimal(getValue('PC_EM_VEN') || getValue('PREÇO PMC')),
        preco_usuario: parseDecimal(getValue('PC_EM_USU')),
        preco_fracao_fab: parseDecimal(getValue('PC_FR_FAB')),
        preco_fracao_venda: parseDecimal(getValue('PC_FR_VEN')),
        preco_fracao_usuario: parseDecimal(getValue('PC_FR_USU')),
      }

      // Build extra data
      const extra: Record<string, unknown> = {
        cd_usuario: getValue('CD_USUARIO'),
        cd_fracao: getValue('CD_FRACAO'),
        vigencia: getValue('VIGENCIA'),
        identif: getValue('IDENTIF'),
        perc_lucro: parseDecimal(getValue('PERC_LUCR')),
        tipo_alteracao: getValue('TIP_ALT'),
        cd_mercado: getValue('CD_MERCADO'),
        perc_desconto: parseDecimal(getValue('PERC_DESC')),
        ipi_produto: parseDecimal(getValue('IPI_PRODUTO')),
        registro_anvisa: getValue('REGISTRO_ANVISA'),
        validade_anvisa: getValue('VALIDADE_ANVISA'),
        lista: getValue('LISTA'),
        hospitalar: getValue('HOSPITALAR'),
        fracionar: getValue('FRACIONAR'),
        cd_tuss: getValue('CD_TUSS'),
        cd_classif: getValue('CD_CLASSIF'),
        cd_ref_pro: getValue('CD_REF_PRO'),
        generico: getValue('GENERICO'),
        diversos: getValue('DIVERSOS'),
        quantidade_embalagem: parseDecimal(getValue('QTDE_EMBAL')),
        quantidade_fracao: parseDecimal(getValue('QTDE_FRAC')),
        tipo_embalagem: getValue('TP_EMBAL'),
      }

      const row: SimproParsedRow = {
        codigo,
        codigo_usuario: getValue('CD_USUARIO'),
        descricao: getValue('DESCRICAO') || getValue('DESCRIÇÃO') || '',
        ean: cleanEan(getValue('CD_BARRA') || getValue('EAN')),
        fabricante: getValue('FABRICA') || getValue('FABRICANTE') || '',
        categoria: getValue('IDENTIF') || 'A',
        unidade: getValue('TP_FRACAO') || getValue('UNIDADE') || null,
        prices,
        extra,
      }

      parsedRows.push(row)
    } catch (error: any) {
      errors.push({
        row: i + 1,
        message: error.message || 'Erro ao processar linha',
      })
    }
  }

  return {
    success: errors.length === 0,
    rows: parsedRows,
    referenceDate,
    errors,
    stats: {
      total: lines.length - headerRowIndex - 1,
      parsed: parsedRows.length,
      errors: errors.length,
    },
  }
}

/**
 * Parse SIMPRO file (detects format automatically)
 * Supports: .csv, .xml
 */
export async function parseSimproFile(file: File): Promise<SimproParseResult> {
  const isCsv = file.name.toLowerCase().endsWith('.csv')
  const isXml = file.name.toLowerCase().endsWith('.xml')

  if (isCsv) {
    const content = await file.text()
    return parseSimproCsv(content)
  } else if (isXml) {
    const content = await file.text()
    return parseSimproXml(content, file.name)
  } else {
    // Try to detect format
    const content = await file.text()

    // If contains XML tags, treat as XML
    if (
      content.includes('<?xml') ||
      content.includes('<ITEM') ||
      content.includes('<item') ||
      content.includes('<Item')
    ) {
      return parseSimproXml(content, file.name)
    }

    // Otherwise treat as CSV
    return parseSimproCsv(content)
  }
}

/**
 * Validate SIMPRO file and return info
 */
export async function validateSimproFile(file: File): Promise<{
  isValid: boolean
  rowCount: number
  errorCount: number
  fileSizeKb: number
  estimatedDurationSeconds: number
  message: string
}> {
  try {
    const fileSizeKb = Math.round(file.size / 1024)

    // Parse file to count rows
    const result = await parseSimproFile(file)
    const rowCount = result.stats.parsed
    const errorCount = result.stats.errors

    // Estimate: ~200 rows per second on average (includes DB operations)
    const estimatedDurationSeconds = Math.ceil(rowCount / 200)

    const isValid = result.success || result.stats.parsed > 0

    return {
      isValid,
      rowCount,
      errorCount,
      fileSizeKb,
      estimatedDurationSeconds,
      message: isValid
        ? `${rowCount.toLocaleString('pt-BR')} produtos, ~${estimatedDurationSeconds}s de processamento`
        : `${errorCount} erros encontrados`,
    }
  } catch (error: any) {
    return {
      isValid: false,
      rowCount: 0,
      errorCount: 1,
      fileSizeKb: Math.round(file.size / 1024),
      estimatedDurationSeconds: 0,
      message: error.message || 'Erro ao validar arquivo',
    }
  }
}

/**
 * Build description for ref_item from SIMPRO parsed row (legacy - concatenated)
 */
export function buildSimproItemDescription(row: SimproParsedRow): string {
  const parts = []
  if (row.descricao) parts.push(row.descricao)
  if (row.fabricante) parts.push(`Fab: ${row.fabricante}`)
  return parts.join(' • ') || row.codigo
}

/**
 * Extract concentration from SIMPRO description
 * Examples: "DIPIRONA 500MG" -> "500MG", "SORO FISIOLOGICO 0,9%" -> "0,9%"
 */
export function extractSimproConcentration(row: SimproParsedRow): string | null {
  const text = row.descricao || ''

  // Pattern: number + unit (MG, ML, G, MCG, UI, etc.) with optional fraction
  const patterns = [
    /(\d+(?:[,.]\d+)?\s*(?:MG|MCG|G|ML|UI|UG|%|L|KG)(?:\s*\/\s*(?:ML|L|G|KG|DOSE|GOTA|HORA|DIA))?)/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      return match[1].toUpperCase().replace(/\s+/g, '')
    }
  }

  return null
}

/**
 * Extract presentation from SIMPRO description
 * Tries to extract the presentation portion after the product name
 */
export function extractSimproPresentation(row: SimproParsedRow): string | null {
  const text = row.descricao || ''

  // Common presentation indicators
  const presentationPatterns = [
    /(?:COM|COMP|C\/)\s*(\d+\s*(?:COM|COMP|CAPS|CAP|CPR|DRG|AMP|FA|FR|ML|G|UNID).*)/i,
    /((?:CX|CAIXA|CT|BL|BLISTER|FR|FRASCO|AMP|AMPOLA)\s*(?:COM|C\/|X)?\s*\d+.*)/i,
    /(\d+\s*(?:UN|UNID|UND).*)/i,
  ]

  for (const pattern of presentationPatterns) {
    const match = text.match(pattern)
    if (match) {
      return match[1].trim()
    }
  }

  return null
}

/**
 * Extract entry_unit, base_unit and quantity from SIMPRO data
 * entry_unit: packaging unit (CX, FR, PCT) from TP_EMBAL
 * base_unit: base unit (UN, CAPS, ML, G) from TP_FRACAO
 */
export function extractSimproUnitAndQuantity(row: SimproParsedRow): {
  entry_unit: string | null
  base_unit: string | null
  quantity: number | null
} {
  // From extra data
  const tipoEmbalagem = row.extra?.tipo_embalagem as string | null | undefined
  const quantidadeEmbalagem = row.extra?.quantidade_embalagem as number | null | undefined
  const tipoFracao = row.unidade // This is TP_FRACAO mapped to 'unidade'
  const quantidadeFracao = row.extra?.quantidade_fracao as number | null | undefined

  // Use tp_embal (tipo_embalagem) for entry_unit and qtde_embal (quantidade_embalagem) for quantity
  const entry_unit: string | null = tipoEmbalagem?.toUpperCase() || null
  const base_unit: string | null = tipoFracao?.toUpperCase() || null
  const quantity: number | null = quantidadeEmbalagem || quantidadeFracao || null

  // If we have both, return them
  if (entry_unit || base_unit) {
    return { entry_unit, base_unit, quantity }
  }

  // Try to extract from description
  const text = row.descricao || ''

  const patterns = [
    /(?:C\/|COM|X)\s*(\d+)\s*(COM|COMP|CAPS|CAP|CPR|DRG|AMP|FA|FR|ML|G|UN|UNID)/i,
    /(\d+)\s*(COM|COMP|CAPS|CAP|CPR|DRG|AMP|FA|FR|ML|G|UN|UNID)/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      return {
        entry_unit: null, // Can't determine from description alone
        base_unit: match[2].toUpperCase(),
        quantity: parseInt(match[1]),
      }
    }
  }

  // Just return what we have
  return { entry_unit, base_unit, quantity }
}

/**
 * Build structured item data for ref_item from SIMPRO row
 */
export interface SimproRefItemData {
  product_name: string
  presentation: string | null
  concentration: string | null
  entry_unit: string | null
  base_unit: string | null
  quantity: number | null
  tiss: string | null
  tuss: string | null
  ean: string | null
  manufacturer_code: string | null
  manufacturer_name: string
  category: string | null
  subcategory: string | null
  extra_data: Record<string, unknown>
}

export function buildSimproRefItemData(row: SimproParsedRow): SimproRefItemData {
  const { entry_unit, base_unit, quantity } = extractSimproUnitAndQuantity(row)
  const tuss = row.extra?.cd_tuss as string | null | undefined

  return {
    product_name: row.descricao || row.codigo,
    presentation: extractSimproPresentation(row),
    concentration: extractSimproConcentration(row),
    entry_unit,
    base_unit,
    quantity,
    tiss: null, // SIMPRO não tem TISS por padrão
    tuss: tuss || null,
    ean: row.ean,
    manufacturer_code: null, // SIMPRO não tem código do fabricante
    manufacturer_name: row.fabricante || '',
    category: row.categoria || null,
    subcategory: null,
    extra_data: buildSimproExtraData(row),
  }
}

/**
 * Build extra_data JSON for ref_item from SIMPRO parsed row
 * Includes all the SIMPRO-specific fields
 */
export function buildSimproExtraData(row: SimproParsedRow): Record<string, unknown> {
  return {
    ...row.extra, // Include all extracted extra fields
    categoria: row.categoria,
  }
}

/**
 * Get primary EAN from SIMPRO parsed row
 */
export function getSimproPrimaryEan(row: SimproParsedRow): string | null {
  return row.ean
}
