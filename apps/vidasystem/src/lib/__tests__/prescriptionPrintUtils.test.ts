import { describe, expect, it } from 'vitest';
import {
  buildPrescriptionPrintGridSnapshot,
  buildPrescriptionPrintPatientSnapshot,
  buildPrescriptionWeekColumns,
  calculatePrescriptionWeekPeriod,
  filterPrescriptionItemsForWeek,
  formatPrescriptionItemDescriptionSnapshot,
  formatPrescriptionPrintFrequency,
  getPrescriptionGridValueForDate,
} from '@/lib/prescriptionPrintUtils';
import type { PrescriptionPrintSourceItem } from '@/types/prescriptionPrint';

describe('prescriptionPrintUtils', () => {
  it('calculates week period using sunday as start day', () => {
    const { periodStart, periodEnd } = calculatePrescriptionWeekPeriod('2026-02-08', 0);

    expect(periodStart.toISOString().slice(0, 10)).toBe('2026-02-08');
    expect(periodEnd.toISOString().slice(0, 10)).toBe('2026-02-14');
  });

  it('calculates week period for custom start day', () => {
    const { periodStart, periodEnd } = calculatePrescriptionWeekPeriod('2026-02-08', 3);

    expect(periodStart.toISOString().slice(0, 10)).toBe('2026-02-04');
    expect(periodEnd.toISOString().slice(0, 10)).toBe('2026-02-10');
  });

  it('generates day grid for every mode item', () => {
    const item: PrescriptionPrintSourceItem = {
      id: 'item-1',
      item_type: 'medication',
      frequency_mode: 'every',
      interval_minutes: 720,
      time_start: '08:00:00',
      is_active: true,
    };

    const value = getPrescriptionGridValueForDate(item, new Date(2026, 1, 8));
    expect(value).toBe('08 20');
  });

  it('formats shift checks in order', () => {
    const item: PrescriptionPrintSourceItem = {
      id: 'item-2',
      item_type: 'medication',
      frequency_mode: 'shift',
      time_checks: ['N', 'M'],
      is_active: true,
    };

    const value = getPrescriptionGridValueForDate(item, new Date(2026, 1, 9));
    expect(value).toBe('M N');
  });

  it('returns SN for PRN items', () => {
    const item: PrescriptionPrintSourceItem = {
      id: 'item-3',
      item_type: 'medication',
      is_prn: true,
      is_active: true,
    };

    const value = getPrescriptionGridValueForDate(item, new Date(2026, 1, 9));
    expect(value).toBe('SN');
  });

  it('formats frequency snapshot labels', () => {
    const everyItem: PrescriptionPrintSourceItem = {
      id: 'item-4',
      item_type: 'medication',
      frequency_mode: 'every',
      interval_minutes: 720,
      is_active: true,
    };

    const timesPerItem: PrescriptionPrintSourceItem = {
      id: 'item-5',
      item_type: 'medication',
      frequency_mode: 'times_per',
      times_value: 3,
      times_unit: 'day',
      is_active: true,
    };

    expect(formatPrescriptionPrintFrequency(everyItem)).toBe('12/12h');
    expect(formatPrescriptionPrintFrequency(timesPerItem)).toBe('3xDIA');
  });

  it('filters inactive and out-of-period items', () => {
    const items: PrescriptionPrintSourceItem[] = [
      { id: 'a', item_type: 'medication', is_active: true, start_date: '2026-02-01' },
      { id: 'b', item_type: 'medication', is_active: false },
      { id: 'c', item_type: 'medication', is_active: true, start_date: '2026-03-01' },
    ];

    const filtered = filterPrescriptionItemsForWeek(
      items,
      new Date(2026, 1, 8),
      new Date(2026, 1, 14)
    );

    expect(filtered.map((item) => item.id)).toEqual(['a']);
  });

  it('does not include active item when end_date is before prescription period start', () => {
    const items: PrescriptionPrintSourceItem[] = [
      {
        id: 'expired-item',
        item_type: 'medication',
        is_active: true,
        start_date: '2026-02-01',
        end_date: '2026-02-07',
      },
    ];

    const filtered = filterPrescriptionItemsForWeek(
      items,
      new Date(2026, 1, 8),
      new Date(2026, 1, 14)
    );

    expect(filtered).toHaveLength(0);
  });

  it('builds grid snapshot with range length', () => {
    const item: PrescriptionPrintSourceItem = {
      id: 'item-6',
      item_type: 'medication',
      frequency_mode: 'times_per',
      time_checks: ['08:00:00', '20:00:00'],
      is_active: true,
    };
    const columns = buildPrescriptionWeekColumns(new Date(2026, 1, 8), new Date(2026, 1, 10));
    const snapshot = buildPrescriptionPrintGridSnapshot(item, columns);

    expect(snapshot).toHaveLength(3);
    expect(snapshot[0]?.mark).toBe('08 20');
  });

  it('includes end date in item period range', () => {
    const item: PrescriptionPrintSourceItem = {
      id: 'item-6b',
      item_type: 'medication',
      frequency_mode: 'times_per',
      time_checks: ['08:00:00'],
      start_date: '2026-02-17',
      end_date: '2026-02-18',
      is_active: true,
    };

    expect(getPrescriptionGridValueForDate(item, new Date(2026, 1, 17))).toBe('08');
    expect(getPrescriptionGridValueForDate(item, new Date(2026, 1, 18))).toBe('08');
    expect(getPrescriptionGridValueForDate(item, new Date(2026, 1, 19))).toBe('###HATCHED###');
  });

  it('builds patient snapshot using primary payer', () => {
    const snapshot = buildPrescriptionPrintPatientSnapshot(
      {
        patient: {
          name: 'Maria da Silva',
          cpf: '123.456.789-00',
          birth_date: '1980-01-10',
          billing_client: { name: 'Plano Secundario' },
          patient_payer: [
            {
              is_primary: true,
              client: { name: 'Plano Principal' },
            },
          ],
        },
      },
      '2026-02-08'
    );

    expect(snapshot.name).toBe('Maria da Silva');
    expect(snapshot.operadora).toBe('Plano Principal');
    expect(snapshot.age_label).not.toBe('');
  });

  it('formats description with instructions and components without hyphen between product and concentration', () => {
    const description = formatPrescriptionItemDescriptionSnapshot({
      id: 'item-7',
      item_type: 'medication',
      quantity: 40,
      instructions_use: 'Administrar apos refeicao',
      product: {
        name: 'Bromoprida',
        concentration: '4mg/ml',
        unit_prescription: { symbol: 'gts' },
      },
      components: [
        {
          quantity: 10,
          product: {
            name: 'Componente A',
            concentration: '1mg',
            unit_prescription: { symbol: 'ml' },
          },
        },
      ],
    });

    expect(description).toContain('Bromoprida 4mg/ml 40 gts');
    expect(description).toContain('- Administrar apos refeicao');
    expect(description).toContain('* Componente A 1mg - 10 ml');
    expect(description).not.toContain('Bromoprida - 4mg/ml');
  });

  it('uses display_name override in description snapshot', () => {
    const description = formatPrescriptionItemDescriptionSnapshot({
      id: 'item-8',
      item_type: 'medication',
      display_name: 'Dipirona gotas 500mg/ml',
      quantity: 20,
      product: {
        name: 'Dipirona',
        concentration: '500mg/ml',
        unit_prescription: { symbol: 'gts' },
      },
    });

    expect(description).toContain('Dipirona gotas 500mg/ml 20 gts');
    expect(description).not.toContain('Dipirona gotas 500mg/ml 500mg/ml');
  });
});
