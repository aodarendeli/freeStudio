import dayjs from 'dayjs';
import 'dayjs/locale/tr';
import { isNil, toDate } from './utils';

const LOCALE = 'tr-TR';
const DEFAULT_CURRENCY = 'TRY';

type FormatObject = {
  type?: string;
  precision?: number;
  currency?: string;
  formatter?: (value: any) => string;
};

export type GridFormat = string | FormatObject | ((value: any) => string) | undefined | null;

const DATE_FORMATS: Record<string, Intl.DateTimeFormatOptions> = {
  shortDate: { day: '2-digit', month: '2-digit', year: 'numeric' },
  longDate: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
  shortTime: { hour: '2-digit', minute: '2-digit' },
  longTime: { hour: '2-digit', minute: '2-digit', second: '2-digit' },
  shortDateShortTime: {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  },
  longDateLongTime: {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  },
  monthAndDay: { day: 'numeric', month: 'long' },
  monthAndYear: { month: 'long', year: 'numeric' },
  year: { year: 'numeric' },
  month: { month: 'long' },
  day: { day: 'numeric' },
  dayOfWeek: { weekday: 'long' },
  hour: { hour: '2-digit' },
  minute: { minute: '2-digit' },
  second: { second: '2-digit' },
};

const LARGE_NUMBER_DIVIDERS: Record<string, number> = {
  thousands: 1e3,
  millions: 1e6,
  billions: 1e9,
  trillions: 1e12,
};

const formatNumberType = (value: number, type: string, precision?: number, currency?: string) => {
  const digits =
    precision === undefined ? {} : { minimumFractionDigits: precision, maximumFractionDigits: precision };
  switch (type) {
    case 'fixedPoint':
      return new Intl.NumberFormat(LOCALE, {
        useGrouping: true,
        ...(precision === undefined ? { maximumFractionDigits: 0 } : digits),
      }).format(value);
    case 'decimal':
      return new Intl.NumberFormat(LOCALE, { useGrouping: false, ...digits }).format(value);
    case 'percent':
      return new Intl.NumberFormat(LOCALE, { style: 'percent', ...digits }).format(value);
    case 'currency':
      return new Intl.NumberFormat(LOCALE, {
        style: 'currency',
        currency: currency ?? DEFAULT_CURRENCY,
        ...digits,
      }).format(value);
    case 'exponential':
      return value.toExponential(precision ?? 1);
    case 'largeNumber':
      return new Intl.NumberFormat(LOCALE, { notation: 'compact', ...digits }).format(value);
    default:
      if (LARGE_NUMBER_DIVIDERS[type]) {
        return new Intl.NumberFormat(LOCALE, digits).format(value / LARGE_NUMBER_DIVIDERS[type]);
      }
      return null;
  }
};

/** LDML tarih kalıbını ("dd.MM.yyyy HH:mm") dayjs kalıbına çevirir */
const ldmlToDayjs = (pattern: string) =>
  pattern.replace(/'([^']*)'|yyyy|yy|dd|d|EEEE|EEE|a|SSS/g, (token, literal) => {
    if (literal !== undefined) return `[${literal}]`;
    switch (token) {
      case 'yyyy':
        return 'YYYY';
      case 'yy':
        return 'YY';
      case 'dd':
        return 'DD';
      case 'd':
        return 'D';
      case 'EEEE':
        return 'dddd';
      case 'EEE':
        return 'ddd';
      case 'a':
        return 'A';
      default:
        return token;
    }
  });

/** "#,##0.00", "0.0%", "#0.## TL" gibi sayı kalıplarını uygular */
const formatNumberPattern = (value: number, pattern: string) => {
  const match = pattern.match(/[#0,.]+/);
  if (!match) return null;
  const numberPart = match[0];
  const [, fraction = ''] = numberPart.split('.');
  const isPercent = pattern.includes('%');
  const formatted = new Intl.NumberFormat(LOCALE, {
    useGrouping: numberPart.includes(','),
    minimumFractionDigits: (fraction.match(/0/g) ?? []).length,
    maximumFractionDigits: fraction.length,
  }).format(isPercent ? value * 100 : value);
  return pattern.replace(numberPart, formatted);
};

const isDateLike = (dataType?: string | null) => dataType === 'date' || dataType === 'datetime';

/**
 * DevExtreme `format` değerini uygular. Desteklenenler:
 * hazır tip adları, `{ type, precision, currency }`, fonksiyon ve LDML kalıpları.
 */
export const formatValue = (value: any, format: GridFormat, dataType?: string | null): string => {
  if (isNil(value) || value === '') return '';

  if (typeof format === 'function') return String(format(value) ?? '');
  if (format && typeof format === 'object' && typeof format.formatter === 'function') {
    return String(format.formatter(value) ?? '');
  }

  const type = typeof format === 'string' ? format : format?.type;
  const precision = typeof format === 'object' && format ? format.precision : undefined;
  const currency = typeof format === 'object' && format ? format.currency : undefined;

  if (type) {
    if (DATE_FORMATS[type]) {
      const date = toDate(value);
      if (date) return new Intl.DateTimeFormat(LOCALE, DATE_FORMATS[type]).format(date);
    }
    if (typeof value === 'number') {
      const formatted = formatNumberType(value, type, precision, currency);
      if (formatted !== null) return formatted;
      const byPattern = formatNumberPattern(value, type);
      if (byPattern !== null) return byPattern;
    }
    if (isDateLike(dataType) || value instanceof Date) {
      const date = toDate(value);
      if (date) return dayjs(date).locale('tr').format(ldmlToDayjs(type));
    }
  }

  if (isDateLike(dataType) || value instanceof Date) {
    const date = toDate(value);
    if (date) {
      return new Intl.DateTimeFormat(
        LOCALE,
        DATE_FORMATS[dataType === 'datetime' ? 'shortDateShortTime' : 'shortDate']
      ).format(date);
    }
  }

  return String(value);
};
