import { describe, it, expect } from 'vitest';
import {
  toBRL,
  toNumber,
  toAxisBRL,
  toCompactBRL,
  toPercent,
  sum,
  average,
  percentChange,
  getRegion,
  groupAndSum,
  topN,
} from './metrics';

describe('Metrics Utils', () => {
  describe('Formatação', () => {
    it('toBRL deve formatar moeda corretamente', () => {
      // Nota: o espaço pode ser nbsp, então verificamos partes flexíveis ou usamos replace
      const formatted = toBRL(1234.56);
      expect(formatted).toContain('R$');
      expect(formatted).toContain('1.234,56');
    });

    it('toNumber deve formatar números com separadores', () => {
      expect(toNumber(1234.56, 2)).toBe('1.234,56');
      expect(toNumber(1000, 0)).toBe('1.000');
    });

    it('toAxisBRL deve formatar para eixo Y', () => {
      expect(toAxisBRL(500)).toContain('500');
      expect(toAxisBRL(1500)).toBe('R$ 2k'); // Math.round(1.5) = 2
      expect(toAxisBRL(1200)).toBe('R$ 1k'); // Math.round(1.2) = 1
      expect(toAxisBRL(23456)).toBe('R$ 23k');
    });

    it('toCompactBRL deve formatar compactado', () => {
      expect(toCompactBRL(500)).toContain('500'); // Abaixo de 1000 usa toBRL
      expect(toCompactBRL(1500)).toBe('1,5k');
      expect(toCompactBRL(2000)).toBe('2k');
    });

    it('toPercent deve formatar porcentagem', () => {
      expect(toPercent(10.5)).toBe('10,5%');
      expect(toPercent(100)).toBe('100,0%');
    });
  });

  describe('Cálculos Matemáticos', () => {
    it('sum deve somar arrays de números', () => {
      expect(sum([1, 2, 3])).toBe(6);
      expect(sum([])).toBe(0);
    });

    it('sum deve somar arrays de objetos por chave', () => {
      const data = [{ val: 10 }, { val: 20 }, { val: 30 }];
      expect(sum(data, 'val')).toBe(60);
    });

    it('average deve calcular média', () => {
      expect(average([10, 20, 30])).toBe(20);
      expect(average([])).toBe(0);
    });

    it('percentChange deve calcular variação', () => {
      expect(percentChange(110, 100)).toBe(10); // 10% aumento
      expect(percentChange(90, 100)).toBe(-10); // 10% queda
      expect(percentChange(100, 0)).toBe(100); // Evita divisão por zero retornando 100 ou 0
      expect(percentChange(0, 0)).toBe(0);
    });
  });

  describe('Manipulação de Dados', () => {
    it('topN deve retornar os maiores valores', () => {
      const data = [
        { id: 1, val: 10 },
        { id: 2, val: 30 },
        { id: 3, val: 20 },
      ];
      const top = topN(data, 'val', 2);
      expect(top).toHaveLength(2);
      expect(top[0].id).toBe(2); // 30
      expect(top[1].id).toBe(3); // 20
    });

    it('groupAndSum deve agrupar e somar', () => {
      const data = [
        { cat: 'A', val: 10 },
        { cat: 'B', val: 20 },
        { cat: 'A', val: 5 },
      ];
      const result = groupAndSum(data, 'cat', 'val');

      expect(result).toHaveLength(2);
      const groupA = result.find((r) => r.key === 'A');
      const groupB = result.find((r) => r.key === 'B');

      expect(groupA?.value).toBe(15);
      expect(groupB?.value).toBe(20);
    });
  });

  describe('Geografia', () => {
    it('getRegion deve retornar região correta para UF', () => {
      expect(getRegion('SP')).toBe('SE');
      expect(getRegion('AM')).toBe('N');
      expect(getRegion('BA')).toBe('NE');
      expect(getRegion('GO')).toBe('CO');
      expect(getRegion('RS')).toBe('S');
      expect(getRegion('XX')).toBe('Outros');
    });
  });
});
