/**
 * Parser de XML de Nota Fiscal Eletrônica (NFe)
 * Extrai dados do XML no formato padrão brasileiro
 */

export interface NfeData {
  // Identificação da NFe
  accessKey: string
  number: string
  series: string
  issuedAt: string

  // Emitente
  issuerName: string
  issuerTradeName: string | null
  issuerDocument: string

  // Valores
  totalValue: number
  totalProducts: number
  totalDiscount: number

  // Itens
  items: NfeItemData[]
}

export interface NfeItemData {
  itemNumber: number
  productCode: string
  ean: string | null
  description: string
  ncm: string | null
  unit: string
  qty: number
  unitPrice: number
  totalPrice: number
  // Rastreamento (lote, fabricação, validade)
  batches: NfeBatchData[]
  // Dados de medicamento
  anvisaCode: string | null
  pmcPrice: number | null
}

export interface NfeBatchData {
  batchNumber: string
  batchQty: number
  manufactureDate: string | null
  expirationDate: string | null
}

/**
 * Faz o parsing de um arquivo XML de NFe e retorna os dados estruturados
 */
export async function parseNfeXml(file: File): Promise<NfeData> {
  const xmlText = await file.text()
  return parseNfeXmlString(xmlText)
}

/**
 * Faz o parsing de uma string XML de NFe e retorna os dados estruturados
 */
export function parseNfeXmlString(xmlText: string): NfeData {
  const parser = new DOMParser()
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml')

  // Verifica se houve erro no parsing
  const parseError = xmlDoc.querySelector('parsererror')
  if (parseError) {
    throw new Error('Arquivo XML inválido')
  }

  // Namespace da NFe
  const ns = 'http://www.portalfiscal.inf.br/nfe'

  // Helper para buscar elementos considerando namespace
  const getElement = (parent: Element | Document, tagName: string): Element | null => {
    // Tenta primeiro com namespace
    let element = parent.getElementsByTagNameNS(ns, tagName)[0]
    if (!element) {
      // Fallback sem namespace
      element = parent.getElementsByTagName(tagName)[0]
    }
    return element || null
  }

  const getElementText = (parent: Element | Document, tagName: string): string => {
    const element = getElement(parent, tagName)
    return element?.textContent?.trim() || ''
  }

  // Encontra o elemento NFe (pode estar em diferentes níveis)
  const nfeProc = getElement(xmlDoc, 'nfeProc')
  let nfe = nfeProc ? getElement(nfeProc, 'NFe') : getElement(xmlDoc, 'NFe')

  if (!nfe) {
    // Tenta encontrar infNFe diretamente
    const infNFe = getElement(xmlDoc, 'infNFe')
    if (!infNFe) {
      throw new Error(
        'Formato de NFe não reconhecido. Certifique-se de que é um arquivo XML de NFe válido.'
      )
    }
    nfe = xmlDoc.documentElement
  }

  const infNFe = getElement(nfe, 'infNFe')
  if (!infNFe) {
    throw new Error('Elemento infNFe não encontrado no XML')
  }

  // Chave de acesso (44 dígitos) - extraída do atributo Id
  const accessKeyAttr = (infNFe as Element).getAttribute('Id') || ''
  const accessKey = accessKeyAttr.replace(/^NFe/, '')

  // Identificação da NFe
  const ide = getElement(infNFe, 'ide')
  if (!ide) {
    throw new Error('Elemento ide não encontrado no XML')
  }

  const number = getElementText(ide, 'nNF')
  const series = getElementText(ide, 'serie')
  const issuedAtRaw = getElementText(ide, 'dhEmi') || getElementText(ide, 'dEmi')

  // Converte data para formato ISO (YYYY-MM-DD)
  let issuedAt = ''
  if (issuedAtRaw) {
    // dhEmi pode vir como "2024-12-18T13:53:55-03:00" ou dEmi como "2024-01-15"
    const dateMatch = issuedAtRaw.match(/^(\d{4}-\d{2}-\d{2})/)
    if (dateMatch) {
      issuedAt = dateMatch[1]
    }
  }

  // Emitente
  const emit = getElement(infNFe, 'emit')
  if (!emit) {
    throw new Error('Elemento emit (emitente) não encontrado no XML')
  }

  const issuerDocument = getElementText(emit, 'CNPJ') || getElementText(emit, 'CPF')
  const issuerName = getElementText(emit, 'xNome')
  const issuerTradeName = getElementText(emit, 'xFant') || null

  // Valores totais
  const total = getElement(infNFe, 'total')
  const icmsTot = total ? getElement(total, 'ICMSTot') : null

  let totalValue = 0
  let totalProducts = 0
  let totalDiscount = 0

  if (icmsTot) {
    totalValue = parseFloat(getElementText(icmsTot, 'vNF') || '0')
    totalProducts = parseFloat(getElementText(icmsTot, 'vProd') || '0')
    totalDiscount = parseFloat(getElementText(icmsTot, 'vDesc') || '0')
  }

  // Itens/Produtos
  const items: NfeItemData[] = []

  // Buscar elementos det (detalhes dos itens)
  const detElements = infNFe.getElementsByTagNameNS(ns, 'det')
  const detList = detElements.length > 0 ? detElements : infNFe.getElementsByTagName('det')

  for (let i = 0; i < detList.length; i++) {
    const det = detList[i]
    const prod = getElement(det, 'prod')

    if (prod) {
      // Número do item (atributo nItem do elemento det)
      const itemNumber = parseInt(det.getAttribute('nItem') || String(i + 1), 10)

      const productCode = getElementText(prod, 'cProd')
      const ean = getElementText(prod, 'cEAN') || null
      const description = getElementText(prod, 'xProd')
      const ncm = getElementText(prod, 'NCM') || null
      const unit = getElementText(prod, 'uCom') || getElementText(prod, 'uTrib') || 'UN'
      const qty = parseFloat(getElementText(prod, 'qCom') || getElementText(prod, 'qTrib') || '0')
      const unitPrice = parseFloat(
        getElementText(prod, 'vUnCom') || getElementText(prod, 'vUnTrib') || '0'
      )
      const totalPrice = parseFloat(getElementText(prod, 'vProd') || '0')

      // Extrai dados de rastreamento/lotes (rastro)
      const batches: NfeBatchData[] = []
      const rastroElements = prod.getElementsByTagNameNS(ns, 'rastro')
      const rastroList =
        rastroElements.length > 0 ? rastroElements : prod.getElementsByTagName('rastro')

      for (let j = 0; j < rastroList.length; j++) {
        const rastro = rastroList[j]
        const batchNumber = getElementText(rastro, 'nLote')
        const batchQty = parseFloat(getElementText(rastro, 'qLote') || '0')
        const manufactureDate = getElementText(rastro, 'dFab') || null
        const expirationDate = getElementText(rastro, 'dVal') || null

        if (batchNumber) {
          batches.push({
            batchNumber,
            batchQty,
            manufactureDate,
            expirationDate,
          })
        }
      }

      // Extrai dados de medicamento (med)
      const med = getElement(prod, 'med')
      let anvisaCode: string | null = null
      let pmcPrice: number | null = null

      if (med) {
        anvisaCode = getElementText(med, 'cProdANVISA') || null
        const pmcStr = getElementText(med, 'vPMC')
        pmcPrice = pmcStr ? parseFloat(pmcStr) : null
      }

      items.push({
        itemNumber,
        productCode,
        ean,
        description,
        ncm,
        unit,
        qty,
        unitPrice,
        totalPrice,
        batches,
        anvisaCode,
        pmcPrice,
      })
    }
  }

  if (items.length === 0) {
    throw new Error('Nenhum item encontrado na NFe')
  }

  return {
    accessKey,
    number,
    series,
    issuedAt,
    issuerName,
    issuerTradeName,
    issuerDocument,
    totalValue,
    totalProducts,
    totalDiscount,
    items,
  }
}

/**
 * Formata CNPJ para exibição (00.000.000/0000-00)
 */
export function formatCnpj(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, '')
  if (digits.length !== 14) return cnpj
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}

/**
 * Formata chave de acesso para exibição
 */
export function formatAccessKey(key: string): string {
  const digits = key.replace(/\D/g, '')
  if (digits.length !== 44) return key
  return digits.replace(/(.{4})/g, '$1 ').trim()
}
