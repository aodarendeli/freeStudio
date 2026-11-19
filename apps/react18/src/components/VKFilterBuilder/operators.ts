/**
 * Operatör etiketleri, veri tipine göre varsayılan operatörler ve `VKFilterField` -> RQB `Field` dönüşümü.
 */
import type { Field, ValueEditorType } from 'react-querybuilder';
import type { FilterDataType, FilterOperator, VKFilterField } from './VKFilterBuilder.types';

export const OPERATOR_LABELS: Record<FilterOperator, string> = {
  '=': 'Eşittir',
  '!=': 'Eşit değildir',
  '<': 'Küçüktür',
  '>': 'Büyüktür',
  '<=': 'Küçük veya eşit',
  '>=': 'Büyük veya eşit',
  contains: 'İçerir',
  doesNotContain: 'İçermez',
  beginsWith: 'İle başlar',
  endsWith: 'İle biter',
  between: 'Arasında',
  in: 'Şunlardan biri',
  null: 'Boş',
  notNull: 'Boş değil',
};

const RANGE_OPERATORS: FilterOperator[] = ['=', '!=', '<', '>', '<=', '>=', 'between'];

/** `null` / `notNull` her backend'de olmayabileceği için varsayılanlarda yok, alan bazında açılır */
export const DEFAULT_OPERATORS: Record<FilterDataType, FilterOperator[]> = {
  string: ['contains', 'doesNotContain', 'beginsWith', 'endsWith', '=', '!=', 'in'],
  number: RANGE_OPERATORS,
  date: RANGE_OPERATORS,
  datetime: RANGE_OPERATORS,
  boolean: ['='],
};

/** Seçenek listesi olan alanlar (lookup) */
export const OPTION_OPERATORS: FilterOperator[] = ['=', '!=', 'in'];

/** Değer girişi olmayan operatörler */
export const VALUELESS_OPERATORS = new Set<string>(['null', 'notNull']);

export const getFieldOperators = (field: VKFilterField): FilterOperator[] =>
  field.operators ?? (field.options ? OPTION_OPERATORS : DEFAULT_OPERATORS[field.dataType ?? 'string']);

const INPUT_TYPES: Partial<Record<FilterDataType, string>> = {
  number: 'number',
  date: 'date',
  datetime: 'datetime-local',
};

/** `VKFilterField` -> react-querybuilder `Field` */
export const toQueryBuilderField = (field: VKFilterField): Field => {
  const dataType = field.dataType ?? 'string';
  const operators = getFieldOperators(field);
  const valueEditorType = (operator: string): ValueEditorType => {
    if (field.options) return operator === 'in' ? 'multiselect' : 'select';
    if (dataType === 'boolean') return 'checkbox';
    return 'text';
  };

  return {
    name: field.name,
    label: field.label,
    operators: operators.map((name) => ({ name, value: name, label: OPERATOR_LABELS[name] ?? name })),
    defaultOperator: field.defaultOperator ?? operators[0],
    valueEditorType,
    inputType: INPUT_TYPES[dataType],
    placeholder: field.placeholder,
    ...(field.options && {
      values: field.options.map((option) => ({ name: String(option.value), value: option.value, label: option.label })),
    }),
  } as Field;
};
