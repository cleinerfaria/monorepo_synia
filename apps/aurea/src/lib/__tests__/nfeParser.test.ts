import { describe, it, expect } from 'vitest';
import { parseNfeXmlString, formatCnpj, formatAccessKey } from '../nfeParser';

// XML de NFe simplificado para testes
const createNfeXml = (
  overrides: Partial<{
    accessKey: string;
    number: string;
    series: string;
    issuedAt: string;
    issuerCnpj: string;
    issuerName: string;
    totalValue: string;
    items: Array<{
      nItem: string;
      cProd: string;
      xProd: string;
      qCom: string;
      vUnCom: string;
      vProd: string;
    }>;
  }> = {}
) => {
  const defaults = {
    accessKey: '35240112345678000195550010000001231234567890',
    number: '123',
    series: '1',
    issuedAt: '2024-12-18T13:53:55-03:00',
    issuerCnpj: '12345678000195',
    issuerName: 'Empresa Teste LTDA',
    totalValue: '1000.00',
    items: [
      {
        nItem: '1',
        cProd: 'PROD001',
        xProd: 'Produto Teste 1',
        qCom: '10',
        vUnCom: '50.00',
        vProd: '500.00',
      },
      {
        nItem: '2',
        cProd: 'PROD002',
        xProd: 'Produto Teste 2',
        qCom: '5',
        vUnCom: '100.00',
        vProd: '500.00',
      },
    ],
  };

  const config = { ...defaults, ...overrides };

  const itemsXml = config.items
    .map(
      (item) => `
    <det nItem="${item.nItem}">
      <prod>
        <cProd>${item.cProd}</cProd>
        <xProd>${item.xProd}</xProd>
        <qCom>${item.qCom}</qCom>
        <vUnCom>${item.vUnCom}</vUnCom>
        <vProd>${item.vProd}</vProd>
        <uCom>UN</uCom>
      </prod>
    </det>
  `
    )
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe>
    <infNFe Id="NFe${config.accessKey}">
      <ide>
        <nNF>${config.number}</nNF>
        <serie>${config.series}</serie>
        <dhEmi>${config.issuedAt}</dhEmi>
      </ide>
      <emit>
        <CNPJ>${config.issuerCnpj}</CNPJ>
        <xNome>${config.issuerName}</xNome>
      </emit>
      <total>
        <ICMSTot>
          <vNF>${config.totalValue}</vNF>
          <vProd>${config.totalValue}</vProd>
          <vDesc>0.00</vDesc>
        </ICMSTot>
      </total>
      ${itemsXml}
    </infNFe>
  </NFe>
</nfeProc>`;
};

describe('nfeParser', () => {
  describe('parseNfeXmlString', () => {
    it('should parse valid NFe XML', () => {
      const xml = createNfeXml();
      const result = parseNfeXmlString(xml);

      expect(result.number).toBe('123');
      expect(result.series).toBe('1');
      expect(result.issuerName).toBe('Empresa Teste LTDA');
      expect(result.totalValue).toBe(1000);
      expect(result.items).toHaveLength(2);
    });

    it('should extract access key from Id attribute', () => {
      const xml = createNfeXml({ accessKey: '35240112345678000195550010000001231234567890' });
      const result = parseNfeXmlString(xml);

      expect(result.accessKey).toBe('35240112345678000195550010000001231234567890');
    });

    it('should parse item details correctly', () => {
      const xml = createNfeXml();
      const result = parseNfeXmlString(xml);

      expect(result.items[0].itemNumber).toBe(1);
      expect(result.items[0].productCode).toBe('PROD001');
      expect(result.items[0].description).toBe('Produto Teste 1');
      expect(result.items[0].qty).toBe(10);
      expect(result.items[0].unitPrice).toBe(50);
      expect(result.items[0].totalPrice).toBe(500);
    });

    it('should extract date in ISO format', () => {
      const xml = createNfeXml({ issuedAt: '2024-12-18T13:53:55-03:00' });
      const result = parseNfeXmlString(xml);

      expect(result.issuedAt).toBe('2024-12-18');
    });

    it('should throw error for invalid XML', () => {
      expect(() => parseNfeXmlString('<invalid>')).toThrow();
    });

    it('should throw error for XML without NFe structure', () => {
      const xml = '<?xml version="1.0"?><root><data>test</data></root>';
      expect(() => parseNfeXmlString(xml)).toThrow('Formato de NFe não reconhecido');
    });

    it('should throw error for NFe without items', () => {
      const xml = createNfeXml({ items: [] });
      expect(() => parseNfeXmlString(xml)).toThrow('Nenhum item encontrado na NFe');
    });
  });

  describe('formatCnpj', () => {
    it('should format 14-digit CNPJ correctly', () => {
      expect(formatCnpj('12345678000195')).toBe('12.345.678/0001-95');
    });

    it('should return original string for invalid CNPJ length', () => {
      expect(formatCnpj('123456')).toBe('123456');
      expect(formatCnpj('123456780001950000')).toBe('123456780001950000');
    });

    it('should handle CNPJ with existing formatting', () => {
      expect(formatCnpj('12.345.678/0001-95')).toBe('12.345.678/0001-95');
    });

    it('should strip non-digits before formatting', () => {
      expect(formatCnpj('12.345.678/0001-95')).toBe('12.345.678/0001-95');
    });
  });

  describe('formatAccessKey', () => {
    it('should format 44-digit access key with spaces', () => {
      const key = '35240112345678000195550010000001231234567890';
      const formatted = formatAccessKey(key);

      expect(formatted).toBe('3524 0112 3456 7800 0195 5500 1000 0001 2312 3456 7890');
    });

    it('should return original string for invalid key length', () => {
      expect(formatAccessKey('12345')).toBe('12345');
    });

    it('should strip non-digits before formatting', () => {
      const key = '3524 0112 3456 7800 0195 5500 1000 0001 2312 3456 7890';
      const formatted = formatAccessKey(key);

      expect(formatted).toBe('3524 0112 3456 7800 0195 5500 1000 0001 2312 3456 7890');
    });
  });
});
