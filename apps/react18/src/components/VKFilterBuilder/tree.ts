/**
 * Filtre ağacı yardımcıları (saf fonksiyonlar).
 * - `fromQueryBuilder`: RQB'nin iç ağacından (`id`, `path` vb.) sade `FilterGroup` üretir
 * - `cleanFilterTree`: yarım kuralları ve boş grupları ayıklar, değerleri alan tipine çevirir
 */
import type { RuleGroupType, RuleType } from 'react-querybuilder';
import { VALUELESS_OPERATORS } from './operators';
import type { FilterGroup, FilterNode, FilterRule, VKFilterField } from './VKFilterBuilder.types';

export const createEmptyFilter = (): FilterGroup => ({ combinator: 'and', rules: [] });

export const isFilterGroup = (node: FilterNode): node is FilterGroup => 'rules' in node && Array.isArray(node.rules);

export const fromQueryBuilder = (group: RuleGroupType): FilterGroup => ({
  combinator: group.combinator === 'or' ? 'or' : 'and',
  ...(group.not && { not: true }),
  rules: group.rules
    .filter((node): node is RuleType | RuleGroupType => typeof node !== 'string')
    .map((node) =>
      'rules' in node ? fromQueryBuilder(node) : { field: node.field, operator: node.operator, value: node.value }
    ),
});

const isBlank = (value: unknown) =>
  value === undefined || value === null || (typeof value === 'string' && value.trim() === '');

/** "a, b" gibi metin listesi ya da dizi -> dolu elemanlardan oluşan dizi */
const toList = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return value.split(',').map((v) => v.trim());
  return isBlank(value) ? [] : [value];
};

/** Seçenekli alanlarda RQB değeri metin olarak tutar; seçeneğin asıl değeri (sayı, boolean) geri verilir */
const toFieldValue = (field: VKFilterField | undefined, value: unknown): unknown => {
  if (isBlank(value)) return value;
  if (field?.options) {
    return field.options.find((option) => String(option.value) === String(value))?.value ?? value;
  }
  if (field?.dataType === 'number') {
    const number = Number(String(value).replace(',', '.'));
    return Number.isFinite(number) ? number : undefined;
  }
  if (field?.dataType === 'boolean') return value === true || value === 'true';
  return typeof value === 'string' ? value.trim() : value;
};

/** Kuralın değeri gönderilmeye hazır hale getirilir; eksikse `null` döner */
const cleanRule = (rule: FilterRule, field: VKFilterField | undefined): FilterRule | null => {
  const { operator } = rule;
  if (VALUELESS_OPERATORS.has(operator)) return { field: rule.field, operator };

  if (operator === 'between') {
    const [from, to] = toList(rule.value).map((v) => toFieldValue(field, v));
    return isBlank(from) || isBlank(to) ? null : { field: rule.field, operator, value: [from, to] };
  }

  if (operator === 'in') {
    const values = toList(rule.value)
      .map((v) => toFieldValue(field, v))
      .filter((v) => !isBlank(v));
    return values.length ? { field: rule.field, operator, value: values } : null;
  }

  const value = toFieldValue(field, rule.value);
  return isBlank(value) ? null : { field: rule.field, operator, value };
};

/**
 * Gönderilecek ağaç: değeri eksik kurallar, tanımsız alanlar ve boş gruplar çıkarılır.
 * Kök grup boş kalsa da döner (`rules: []` = filtre yok).
 */
export const cleanFilterTree = (tree: FilterGroup, fields: VKFilterField[]): FilterGroup => {
  const fieldsByName = new Map(fields.map((field) => [field.name, field]));

  const cleanGroup = (group: FilterGroup): FilterGroup => ({
    combinator: group.combinator,
    ...(group.not && { not: true }),
    rules: group.rules.flatMap((node): FilterNode[] => {
      if (isFilterGroup(node)) {
        const child = cleanGroup(node);
        return child.rules.length ? [child] : [];
      }
      const field = fieldsByName.get(node.field);
      if (!field) return [];
      const rule = cleanRule(node, field);
      return rule ? [rule] : [];
    }),
  });

  return cleanGroup(tree);
};

export const countRules = (tree: FilterGroup): number =>
  tree.rules.reduce((total, node) => total + (isFilterGroup(node) ? countRules(node) : 1), 0);
