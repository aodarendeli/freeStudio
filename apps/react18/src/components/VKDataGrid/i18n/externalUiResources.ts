import type { LocaleResources } from './useExternalUiText';

// Paketin kendi gömülü dil dosyaları — host hiçbir şey sağlamasa bile çalışır.
// Motor (context/hook/tipler) @vakif/ui-language-adaptor'da; burada yalnız içerik.
export const externalUiResources: LocaleResources = {
  tr: {
    dataGrid: {
      noDataText: 'Veri Bulunamadı',
      columnChooserTitle: 'Sütun Seçici',
      printHint: 'Yazdır',
      exportAllHint: 'Tüm Veriyi Dışa Aktar',
      exportSelectedHint: 'Seçili Satırları Dışa Aktar',
      selectAtLeastOneRow: 'Lütfen önce en az 1 satır seçin.',
      pageInfo: 'Sayfa {0}/{1} ({2} öğeler)',
      searchPlaceholder: 'Ara...',
    },
  },
  en: {
    dataGrid: {
      noDataText: 'No data',
      columnChooserTitle: 'Column Chooser',
      printHint: 'Print',
      exportAllHint: 'Export All Data',
      exportSelectedHint: 'Export Selected Rows',
      selectAtLeastOneRow: 'Please select at least one row first.',
      pageInfo: 'Page {0}/{1} ({2} items)',
      searchPlaceholder: 'Search...',
    },
  },
};
