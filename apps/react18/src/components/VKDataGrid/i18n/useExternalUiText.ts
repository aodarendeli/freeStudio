/**
 * Grid metinlerinin tek giriş noktası. Grid içindeki bütün çeviriler bu dosyadaki
 * `useExternalUiText("dataGrid.xxx")` üzerinden okunur (eski DataGrid ile aynı kullanım).
 *
 * BU REPODA: `@vakif/ui-language-adaptor` kurulu olmadığı için aşağıda aynı imzayla basit bir
 * yedek uygulama var (dil: <html lang>, yoksa tr; metin `externalUiResources` içinden).
 *
 * PAKETTE: bu dosyanın içeriği şu iki satırla değiştirilir, grid'in geri kalanına dokunulmaz:
 *   export { useExternalUiText } from '@vakif/ui-language-adaptor';
 *   export type { LocaleResources } from '@vakif/ui-language-adaptor';
 * (externalUiResources'ın adaptöre nasıl kaydedildiği eski DataGrid'deki gibi yapılır.)
 */
import { externalUiResources } from './externalUiResources';

export type LocaleResources = Record<string, Record<string, unknown>>;

const FALLBACK_LANGUAGE = 'tr';

const lookup = (language: string, key: string): string | undefined => {
  const value = key
    .split('.')
    .reduce<unknown>((node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined), externalUiResources[language]);
  return typeof value === 'string' ? value : undefined;
};

const currentLanguage = () => {
  const lang = typeof document !== 'undefined' ? document.documentElement.lang : '';
  return (lang || FALLBACK_LANGUAGE).split('-')[0].toLowerCase();
};

export const useExternalUiText = (key: string): string =>
  lookup(currentLanguage(), key) ?? lookup(FALLBACK_LANGUAGE, key) ?? key;
