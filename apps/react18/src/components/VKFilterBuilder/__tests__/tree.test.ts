import { describe, expect, it } from 'vitest';
import type { RuleGroupType } from 'react-querybuilder';
import { toQueryBuilderField } from '../operators';
import { cleanFilterTree, countRules, fromQueryBuilder } from '../tree';
import type { FilterGroup, VKFilterField } from '../VKFilterBuilder.types';

const fields: VKFilterField[] = [
  { name: 'name', label: 'Ad' },
  { name: 'price', label: 'Fiyat', dataType: 'number' },
  { name: 'createdAt', label: 'Tarih', dataType: 'date' },
  { name: 'active', label: 'Aktif', dataType: 'boolean' },
  {
    name: 'level',
    label: 'Seviye',
    options: [
      { value: 1, label: 'Düşük' },
      { value: 2, label: 'Yüksek' },
    ],
  },
];

describe('fromQueryBuilder', () => {
  it('RQB iç alanlarını (id, path) atar, iç içe grupları korur', () => {
    const query = {
      id: 'root',
      combinator: 'or',
      not: true,
      rules: [
        { id: 'r1', field: 'name', operator: 'contains', value: 'kalem' },
        { id: 'g1', combinator: 'and', rules: [{ id: 'r2', field: 'price', operator: '>', value: 10 }] },
      ],
    } as RuleGroupType;
    expect(fromQueryBuilder(query)).toEqual({
      combinator: 'or',
      not: true,
      rules: [
        { field: 'name', operator: 'contains', value: 'kalem' },
        { combinator: 'and', rules: [{ field: 'price', operator: '>', value: 10 }] },
      ],
    });
  });
});

describe('cleanFilterTree', () => {
  it('değeri eksik kuralları, tanımsız alanları ve boşalan grupları çıkarır', () => {
    const tree: FilterGroup = {
      combinator: 'and',
      rules: [
        { field: 'name', operator: 'contains', value: '  ' },
        { field: 'unknown', operator: '=', value: 'x' },
        { field: 'price', operator: 'between', value: [10, ''] },
        { combinator: 'or', rules: [{ field: 'name', operator: '=', value: '' }] },
        { field: 'name', operator: 'beginsWith', value: ' kal ' },
      ],
    };
    expect(cleanFilterTree(tree, fields)).toEqual({
      combinator: 'and',
      rules: [{ field: 'name', operator: 'beginsWith', value: 'kal' }],
    });
  });

  it('değerleri alan tipine çevirir: sayı, aralık, liste, seçenek, boolean', () => {
    const tree: FilterGroup = {
      combinator: 'and',
      rules: [
        { field: 'price', operator: '>', value: '12,5' },
        { field: 'price', operator: 'between', value: '10, 20' },
        { field: 'name', operator: 'in', value: 'kalem, silgi, ' },
        { field: 'level', operator: 'in', value: ['1', '2'] },
        { field: 'active', operator: '=', value: false },
        { field: 'createdAt', operator: '>=', value: '2026-11-01' },
      ],
    };
    expect(cleanFilterTree(tree, fields).rules).toEqual([
      { field: 'price', operator: '>', value: 12.5 },
      { field: 'price', operator: 'between', value: [10, 20] },
      { field: 'name', operator: 'in', value: ['kalem', 'silgi'] },
      { field: 'level', operator: 'in', value: [1, 2] },
      { field: 'active', operator: '=', value: false },
      { field: 'createdAt', operator: '>=', value: '2026-11-01' },
    ]);
  });

  it('null / notNull değer istemez', () => {
    const tree: FilterGroup = { combinator: 'and', rules: [{ field: 'name', operator: 'null', value: '' }] };
    expect(cleanFilterTree(tree, fields).rules).toEqual([{ field: 'name', operator: 'null' }]);
  });
});

describe('countRules', () => {
  it('iç içe gruplardaki kuralları sayar', () => {
    expect(
      countRules({
        combinator: 'and',
        rules: [
          { field: 'a', operator: '=', value: 1 },
          { combinator: 'or', rules: [{ field: 'b', operator: '=', value: 1 }, { field: 'c', operator: '=', value: 1 }] },
        ],
      })
    ).toBe(3);
  });
});

describe('toQueryBuilderField', () => {
  it('veri tipine göre operatör, input tipi ve değer editörü seçer', () => {
    const price = toQueryBuilderField(fields[1]);
    expect(price.inputType).toBe('number');
    expect((price.operators as { name: string }[]).map((o) => o.name)).toEqual(['=', '!=', '<', '>', '<=', '>=', 'between']);

    const level = toQueryBuilderField(fields[4]);
    expect((level.operators as { name: string }[]).map((o) => o.name)).toEqual(['=', '!=', 'in']);
    const editor = level.valueEditorType as (operator: string) => string;
    expect(editor('=')).toBe('select');
    expect(editor('in')).toBe('multiselect');
    expect(toQueryBuilderField(fields[2]).inputType).toBe('date');
  });

  it('alan operatör listesi verirse varsayılanların yerine geçer', () => {
    const field = toQueryBuilderField({ name: 'name', label: 'Ad', operators: ['=', 'null'], defaultOperator: 'null' });
    expect((field.operators as { label: string }[]).map((o) => o.label)).toEqual(['Eşittir', 'Boş']);
    expect(field.defaultOperator).toBe('null');
  });
});
