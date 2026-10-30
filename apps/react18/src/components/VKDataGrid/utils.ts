/**
 * Satır anahtarı / satır nesnesi karşılaştırması için derin eşitlik.
 * `deep-equal` paketinin bu grid'de kullanılan kısmını karşılar (düz nesne, dizi, Date, primitive).
 */
export const isDeepEqual = (a: unknown, b: unknown): boolean => {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (a instanceof Date || b instanceof Date) {
    return a instanceof Date && b instanceof Date && a.getTime() === b.getTime();
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, i) => isDeepEqual(item, b[i]));
  }
  const aKeys = Object.keys(a as object);
  const bKeys = Object.keys(b as object);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every(
    (key) =>
      Object.prototype.hasOwnProperty.call(b, key) &&
      isDeepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])
  );
};

/** DevExtreme `dataField` değerleri "a.b.c" şeklinde iç içe alan gösterebilir */
export const getByPath = (obj: any, path?: string) => {
  if (!obj || !path) return undefined;
  if (path in obj) return obj[path];
  return path.split('.').reduce((acc, part) => (acc == null ? undefined : acc[part]), obj);
};

export const isNil = (value: unknown): value is null | undefined =>
  value === null || value === undefined;

export const toDate = (value: unknown): Date | null => {
  if (isNil(value) || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
};

export const parseNumber = (text: string): number | null => {
  const normalized = text.trim().replace(',', '.');
  if (normalized === '' || normalized === '-') return null;
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
};

/** CSS genişlik değerini sayıya çevirir. "120" / "120px" -> 120, "20%" / "auto" -> undefined */
export const toPixelWidth = (width: unknown): number | undefined => {
  if (typeof width === 'number' && Number.isFinite(width)) return width;
  if (typeof width === 'string' && /^\d+(\.\d+)?(px)?$/.test(width.trim())) {
    return parseFloat(width);
  }
  return undefined;
};
