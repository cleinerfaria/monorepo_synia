/**
 * Parser e importador para tabela BRASÍNDICE
 * Processa arquivos TXT exportados do sistema BRASÍNDICE
 *
 * O arquivo BRASÍNDICE TXT possui 23 colunas fixas, separadas por vírgula,
 * com campos entre aspas. NÃO possui linha de cabeçalho.
 */

// Número esperado de colunas no arquivo Brasíndice
export const BRASINDICE_EXPECTED_COLUMNS = 23

// Mapeamento das posições das colunas no arquivo TXT
export const BRASINDICE_COLUMNS = {
  FABRICANTE_ID: 0,
  FABRICANTE_NOME: 1,
  BRASINDICE_ID: 2,
  DESCRICAO: 3,
  BRASINDICE_CODE: 4,
  APRESENTACAO: 5,
  PMC: 6,
  PF: 7,
  QUANTIDADE: 8,
  COL_PMC_LABEL: 9,
  UNIT_PMC: 10,
  COL_PFB_LABEL: 11,
  UNIT_PFB: 12,
  ULT_REAJUSTE: 13,
  IPI: 14,
  DISPENSAVEL: 15,
  EAN: 16,
  TISS: 17,
  COL_6: 18,
  TUSS: 19,
  GGREM: 20,
  ANVISA: 21,
  HIERARQUIA: 22,
} as const

export interface BrasindiceParsedRow {
  // Identificação
  external_code: string // fabricante_id + "_" + brasindice_id + "_" + brasindice_code
  product_name: string // descricao
  presentation: string | null // apresentacao
  concentration: string | null // extraído da apresentacao

  // Unidades (vazios conforme especificação)
  entry_unit: string | null
  base_unit: string | null

  // Quantidade
  quantity: number | null

  // Códigos
  tiss: string | null
  tuss: string | null
  ean: string | null

  // Fabricante
  manufacturer_code: string | null
  manufacturer_name: string

  // Categoria
  category: string | null

  // Preços
  pf: number | null
  pmc: number | null
  unit_pf: number | null
  unit_pmc: number | null

  // Dados extras (para extra_data)
  extra: {
    ggrem: string | null
    anvisa: string | null
    ipi: number | null
    dispensavel: boolean
    ult_reajuste: string | null
    hierarquia: string | null
  }
}

export interface BrasindiceParseResult {
  success: boolean
  rows: BrasindiceParsedRow[]
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
 * Parse a numeric value from a string
 */
function parseNumber(value: string | undefined | null): number | null {
  if (!value) return null
  const cleaned = value.trim().replace(',', '.')
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

/**
 * Clean string value (remove quotes and trim)
 */
function cleanString(value: string | undefined | null): string | null {
  if (!value) return null
  const cleaned = value.trim().replace(/^"|"$/g, '')
  return cleaned.length > 0 ? cleaned : null
}

/**
 * Clean EAN value
 */
function cleanEan(value: string | undefined | null): string | null {
  if (!value) return null
  const cleaned = value.trim().replace(/^"|"$/g, '').replace(/\s+/g, '').replace(/-/g, '')
  // Remove scientific notation if present (shouldn't happen in TXT, but just in case)
  if (cleaned.includes('E') || cleaned.includes('e')) {
    try {
      const num = parseFloat(cleaned)
      if (!isNaN(num)) {
        return Math.round(num).toString()
      }
    } catch {
      // Ignore
    }
  }
  return cleaned && cleaned !== '-' && cleaned.length > 0 ? cleaned : null
}

/**
 * Extract concentration from presentation string
 * Returns in uppercase without spaces (e.g., "50MG", "10MG/ML")
 * Keeps comma as decimal separator (Brazilian format)
 *
 * Supported patterns:
 * - Simple: "50 mg", "10 mg/ml", "0,5 mg/ml", "100 mg/g"
 * - Combined: "(0,15 + 0,03) mg", "(5 + 2) mg/ml"
 * - With addition: "100 mg + 20 mg", "875 mg + 125 mg"
 * - With slash: "80 + 12,5 mg", "10 + 20 mg"
 * - Ratio format: "6 / 200 mcg", "8 mg/12,5 mg"
 * - Percentage: "10%", "2%"
 * - UI format: "7.000 UI", "1500 UI"
 * - mcg/dose: "50 mcg/ml", "6,67 mg/ml"
 */
function extractConcentration(presentation: string | null): string | null {
  if (!presentation) return null

  const text = presentation.trim()

  // Unit pattern - IMPORTANT: compound units (mg/ml, mg/g) must come BEFORE simple units
  const unitPattern = '(?:mg\\/ml|mcg\\/ml|mg\\/g|mcg\\/g|ui\\/ml|mcg\\/dose|mg|mcg|ui|g|ml|%)'

  // 1. Combined in parentheses: "(0,15 + 0,03) mg" or "(5 + 2) mg/ml"
  const combinedParenPattern = new RegExp(`^\\(([\\d.,\\s+]+)\\)\\s*(${unitPattern})`, 'i')
  const combinedMatch = text.match(combinedParenPattern)
  if (combinedMatch) {
    const values = combinedMatch[1].replace(/\s+/g, '')
    const unit = combinedMatch[2]
    return `(${values})${unit}`.toUpperCase()
  }

  // 2. Addition format with compound units: "6,67 mg/ml + 333,4 mg/ml"
  const additionCompoundPattern = new RegExp(
    `^(\\d+(?:[.,]\\d+)?)\\s*(mg\\/ml|mcg\\/ml|mg\\/g|mcg\\/g|ui\\/ml)\\s*\\+\\s*(\\d+(?:[.,]\\d+)?)\\s*(mg\\/ml|mcg\\/ml|mg\\/g|mcg\\/g|ui\\/ml)`,
    'i'
  )
  const additionCompoundMatch = text.match(additionCompoundPattern)
  if (additionCompoundMatch) {
    const val1 = additionCompoundMatch[1]
    const unit1 = additionCompoundMatch[2]
    const val2 = additionCompoundMatch[3]
    const unit2 = additionCompoundMatch[4]
    return `${val1}${unit1}+${val2}${unit2}`.toUpperCase()
  }

  // 3. Addition format simple: "100 mg + 20 mg" or "875 mg + 125 mg"
  const additionFullPattern = new RegExp(
    `^(\\d+(?:[.,]\\d+)?)\\s*(${unitPattern})\\s*\\+\\s*(\\d+(?:[.,]\\d+)?)\\s*(${unitPattern})`,
    'i'
  )
  const additionFullMatch = text.match(additionFullPattern)
  if (additionFullMatch) {
    const val1 = additionFullMatch[1]
    const unit1 = additionFullMatch[2]
    const val2 = additionFullMatch[3]
    const unit2 = additionFullMatch[4]
    return `${val1}${unit1}+${val2}${unit2}`.toUpperCase()
  }

  // 4. Compact addition: "80 + 12,5 mg" or "10 + 20 mg"
  const additionCompactPattern = new RegExp(
    `^(\\d+(?:[.,]\\d+)?)\\s*\\+\\s*(\\d+(?:[.,]\\d+)?)\\s*(${unitPattern})`,
    'i'
  )
  const additionCompactMatch = text.match(additionCompactPattern)
  if (additionCompactMatch) {
    const val1 = additionCompactMatch[1]
    const val2 = additionCompactMatch[2]
    const unit = additionCompactMatch[3]
    return `${val1}+${val2}${unit}`.toUpperCase()
  }

  // 5. Ratio format with slash: "6 / 200 mcg" or "8 mg/12,5 mg"
  const ratioPattern = new RegExp(
    `^(\\d+(?:[.,]\\d+)?)\\s*(mg|mcg|ui|g)?\\s*\\/\\s*(\\d+(?:[.,]\\d+)?)\\s*(mg|mcg|ui|g|ml)`,
    'i'
  )
  const ratioMatch = text.match(ratioPattern)
  if (ratioMatch) {
    const val1 = ratioMatch[1]
    const unit1 = ratioMatch[2] || ''
    const val2 = ratioMatch[3]
    const unit2 = ratioMatch[4]
    if (unit1) {
      return `${val1}${unit1}/${val2}${unit2}`.toUpperCase()
    }
    return `${val1}/${val2}${unit2}`.toUpperCase()
  }

  // 6. Simple concentration at start: "50 mg", "10 mg/ml", "0,5 mg/ml", "100 mg/g"
  const simplePattern = new RegExp(`^(\\d+(?:[.,]\\d+)?)\\s*(${unitPattern})`, 'i')
  const simpleMatch = text.match(simplePattern)
  if (simpleMatch) {
    const value = simpleMatch[1]
    const unit = simpleMatch[2]
    return `${value}${unit}`.toUpperCase()
  }

  // 7. Percentage only at start: "10%" or embedded "Fr. 100 ml 2%"
  const percentPattern = /(\d+(?:[.,]\d+)?)\s*%/
  const percentMatch = text.match(percentPattern)
  if (percentMatch) {
    const value = percentMatch[1]
    return `${value}%`
  }

  // 8. Try to find concentration anywhere in the text (fallback)
  // Look for patterns like "250 mg/5 ml" (suspension concentration)
  const suspensionPattern = new RegExp(
    `(\\d+(?:[.,]\\d+)?)\\s*(mg|mcg|g)\\s*\\/\\s*(\\d+(?:[.,]\\d+)?)\\s*(ml)`,
    'i'
  )
  const suspensionMatch = text.match(suspensionPattern)
  if (suspensionMatch) {
    const val1 = suspensionMatch[1]
    const unit1 = suspensionMatch[2]
    const val2 = suspensionMatch[3]
    const unit2 = suspensionMatch[4]
    return `${val1}${unit1}/${val2}${unit2}`.toUpperCase()
  }

  return null
}

/**
 * Parse a single line from the Brasíndice TXT file
 * Lines are CSV-like with fields in quotes, separated by commas
 */
function parseLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"'
        i++
      } else {
        // Toggle quote state
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      fields.push(current)
      current = ''
    } else {
      current += char
    }
  }

  // Add last field
  fields.push(current)

  return fields
}

/**
 * Parse Brasíndice TXT file content
 */
export function parseBrasindiceFile(content: string): BrasindiceParseResult {
  const result: BrasindiceParseResult = {
    success: true,
    rows: [],
    errors: [],
    stats: {
      total: 0,
      parsed: 0,
      errors: 0,
    },
  }

  // Split into lines and filter empty ones
  const lines = content.split('\n').filter((line) => line.trim().length > 0)

  result.stats.total = lines.length

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineNumber = i + 1 // 1-indexed for user-friendly error messages

    try {
      const fields = parseLine(line)

      // Validate column count
      if (fields.length !== BRASINDICE_EXPECTED_COLUMNS) {
        result.errors.push({
          row: lineNumber,
          message: `Número de colunas inválido: esperado ${BRASINDICE_EXPECTED_COLUMNS}, encontrado ${fields.length}`,
          data: { line: line.substring(0, 100) },
        })
        result.stats.errors++
        continue
      }

      // Extract fields
      const fabricanteId = cleanString(fields[BRASINDICE_COLUMNS.FABRICANTE_ID])
      const fabricanteNome = cleanString(fields[BRASINDICE_COLUMNS.FABRICANTE_NOME]) || ''
      const brasindiceId = cleanString(fields[BRASINDICE_COLUMNS.BRASINDICE_ID])
      const descricao = cleanString(fields[BRASINDICE_COLUMNS.DESCRICAO]) || ''
      const brasindiceCode = cleanString(fields[BRASINDICE_COLUMNS.BRASINDICE_CODE])
      const apresentacao = cleanString(fields[BRASINDICE_COLUMNS.APRESENTACAO])
      const pmc = parseNumber(fields[BRASINDICE_COLUMNS.PMC])
      const pf = parseNumber(fields[BRASINDICE_COLUMNS.PF])
      const quantidade = parseNumber(fields[BRASINDICE_COLUMNS.QUANTIDADE])
      const unitPmc = parseNumber(fields[BRASINDICE_COLUMNS.UNIT_PMC])
      const unitPfb = parseNumber(fields[BRASINDICE_COLUMNS.UNIT_PFB])
      const ultReajuste = cleanString(fields[BRASINDICE_COLUMNS.ULT_REAJUSTE])
      const ipi = parseNumber(fields[BRASINDICE_COLUMNS.IPI])
      const dispensavel = cleanString(fields[BRASINDICE_COLUMNS.DISPENSAVEL])?.toUpperCase() === 'S'
      const ean = cleanEan(fields[BRASINDICE_COLUMNS.EAN])
      const tiss = cleanString(fields[BRASINDICE_COLUMNS.TISS])
      const tuss = cleanString(fields[BRASINDICE_COLUMNS.TUSS])
      const ggrem = cleanString(fields[BRASINDICE_COLUMNS.GGREM])
      const anvisa = cleanString(fields[BRASINDICE_COLUMNS.ANVISA])
      const hierarquia = cleanString(fields[BRASINDICE_COLUMNS.HIERARQUIA])

      // Build external code: fabricante_id + "_" + brasindice_id + "_" + brasindice_code
      // Including fabricante_id ensures uniqueness (same product from different manufacturers)
      if (!fabricanteId || !brasindiceId || !brasindiceCode) {
        result.errors.push({
          row: lineNumber,
          message: 'Código Brasíndice (Fabricante ID, ID ou CODE) ausente',
          data: { fabricanteId, brasindiceId, brasindiceCode },
        })
        result.stats.errors++
        continue
      }

      const externalCode = `${fabricanteId}_${brasindiceId}_${brasindiceCode}`

      // Extract concentration from presentation
      const concentration = extractConcentration(apresentacao)

      const row: BrasindiceParsedRow = {
        external_code: externalCode,
        product_name: descricao,
        presentation: apresentacao,
        concentration,
        entry_unit: null, // Empty as per spec
        base_unit: null, // Empty as per spec
        quantity: quantidade,
        tiss,
        tuss,
        ean,
        manufacturer_code: fabricanteId,
        manufacturer_name: fabricanteNome,
        category: hierarquia,
        pf,
        pmc,
        unit_pf: unitPfb,
        unit_pmc: unitPmc,
        extra: {
          ggrem,
          anvisa,
          ipi,
          dispensavel,
          ult_reajuste: ultReajuste,
          hierarquia,
        },
      }

      result.rows.push(row)
      result.stats.parsed++
    } catch (error) {
      result.errors.push({
        row: lineNumber,
        message: error instanceof Error ? error.message : 'Erro desconhecido ao processar linha',
        data: { line: line.substring(0, 100) },
      })
      result.stats.errors++
    }
  }

  result.success = result.stats.errors === 0

  return result
}

/**
 * Parse Brasíndice file (reads file and parses content)
 */
export async function parseBrasindiceFileFromFile(file: File): Promise<BrasindiceParseResult> {
  const content = await file.text()
  return parseBrasindiceFile(content)
}

/**
 * Validate a Brasíndice file (quick check without full parsing)
 */
export async function validateBrasindiceFile(file: File): Promise<{
  isValid: boolean
  rowCount: number
  errorCount: number
  fileSizeKb: number
  estimatedDurationSeconds: number
  message: string
}> {
  try {
    const content = await file.text()
    const lines = content.split('\n').filter((line) => line.trim().length > 0)

    // Quick validation: check first few lines for correct column count
    let errorCount = 0
    const samplesToCheck = Math.min(10, lines.length)

    for (let i = 0; i < samplesToCheck; i++) {
      const fields = parseLine(lines[i])
      if (fields.length !== BRASINDICE_EXPECTED_COLUMNS) {
        errorCount++
      }
    }

    const rowCount = lines.length
    const estimatedDurationSeconds = Math.ceil(rowCount / 200)

    return {
      isValid: errorCount === 0 && rowCount > 0,
      rowCount,
      errorCount,
      fileSizeKb: Math.round(file.size / 1024),
      estimatedDurationSeconds,
      message:
        errorCount > 0
          ? `${errorCount} linha(s) com formato inválido nas primeiras ${samplesToCheck} linhas`
          : `${rowCount.toLocaleString('pt-BR')} produtos encontrados`,
    }
  } catch (error) {
    return {
      isValid: false,
      rowCount: 0,
      errorCount: 1,
      fileSizeKb: Math.round(file.size / 1024),
      estimatedDurationSeconds: 0,
      message: error instanceof Error ? error.message : 'Erro ao validar arquivo',
    }
  }
}

/**
 * Build ref_item data from a parsed Brasíndice row
 */
export function buildBrasindiceRefItemData(row: BrasindiceParsedRow): {
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
} {
  return {
    product_name: row.product_name,
    presentation: row.presentation,
    concentration: row.concentration,
    entry_unit: row.entry_unit,
    base_unit: row.base_unit,
    quantity: row.quantity,
    tiss: row.tiss,
    tuss: row.tuss,
    ean: row.ean,
    manufacturer_code: row.manufacturer_code,
    manufacturer_name: row.manufacturer_name,
    category: row.category,
    subcategory: null,
    extra_data: {
      ggrem: row.extra.ggrem,
      anvisa: row.extra.anvisa,
      ipi: row.extra.ipi,
      dispensavel: row.extra.dispensavel,
      ult_reajuste: row.extra.ult_reajuste,
      hierarquia: row.extra.hierarquia,
      unit_pf: row.unit_pf,
      unit_pmc: row.unit_pmc,
    },
  }
}
