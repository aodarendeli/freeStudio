# VKDataGrid

TanStack Table v9 + MUI v6 tabanlı veri tablosu. DevExtreme `DataGrid` tabanlı önceki sürümün yerine geçer.
Props (`VKDataGridProps`) ve ref (`VKDataGridRef`) arayüzü aynıdır; kullanan projelerde kod değişikliği gerekmez.
Bilerek değiştirilen davranışlar aşağıda [Eskisinden farklı olanlar](#eskisinden-farklı-olanlar) bölümündedir.

```tsx
<VKDataGrid
  ref={gridRef}
  dataSource={rows}
  totalCount={total}
  columns={columns}
  rowKeyExpr="id"
  onFilterChange={(options) => load(options)} // server mod
/>
```

Testler: `pnpm --filter react18 test`

## Klasör yapısı

| Yer | Görev |
|---|---|
| `VKDataGrid.tsx` | Ana bileşen: parçaları birbirine bağlar (forwardRef, context, render) |
| `VKDataGrid.types.ts` | Public tipler (props, ref, filtre / sıralama tipleri) |
| `columns.ts`, `filtering.ts`, `format.ts`, `utils.ts` | Saf mantık: sütun modeli, filtre kuralları, biçimleme |
| `table.ts`, `context.ts` | TanStack feature seti, sistem sütunları, ortak context ve stiller |
| `hooks/` | Durum: seçenekler, sayfa / filtre, seçim, satır tıklama, sütun yerleşimi, sürükleme, dışa aktarma |
| `parts/` | Görünüm: araç çubuğu, başlık, filtre satırı, gövde, özet, sayfalayıcı, sütun seçici |
| `export/` | Excel üretimi |
| `__tests__/` | Testler |

## Özellik → kod → test eşlemesi

| DevExtreme özelliği / prop | Bu grid'de | Test |
|---|---|---|
| `onFilterChange` (server mod) | `hooks/useGridState.ts`, `filtering.ts > buildActiveFilters` | `serverMode.test.tsx` |
| `handlePagingChanged`, `paging` (basit mod) | `hooks/useGridState.ts`, `filtering.ts > applyLocal*` | `simpleMode.test.tsx` |
| Ref: `getFilters`, `resetFilters`, `applyFilters` | `hooks/useGridState.ts` | `refApi.test.tsx` |
| `<FilterRow>`, `filterOperations`, `showAllText`, `resetOperationText` | `parts/GridFilterRow.tsx` | `serverMode`, `filtersAdvanced.test.tsx` |
| `<HeaderFilter>`, `headerFilterData` | `parts/HeaderFilterMenu.tsx` (**şu an kapalı**, bkz. aşağı) | `filtersAdvanced`, `columns` (atlanıyor) |
| `<SearchPanel>`, vurgulama | `parts/GridToolbar.tsx`, `parts/CellContent.tsx` | `serverMode`, `simpleMode.test.tsx` |
| `<Sorting>` (tıklama, Ctrl, Shift, sağ tık menüsü) | `parts/GridHeader.tsx` | `serverMode`, `filtersAdvanced.test.tsx` |
| `<Selection>`, `multipleSelection`, `selectedRowKeys`, `rowSelectionChange` | `hooks/useGridSelection.ts` | `selection.test.tsx` |
| Satır tıklama, `singleRowRadioSelection` | `hooks/useRowClickSelection.ts` | `selection`, `appearanceAndMisc.test.tsx` |
| `<Paging>`, `<Pager>`, `allowedPageSizes`, `totalCount` | `parts/GridPager.tsx`, `hooks/useGridOptions.ts` | `toolbarPager.test.tsx` |
| `<Column>` alanları: `caption`, `lookup`, `format`, `calculateCellValue`, `cellRender`, `visible`, `alignment` | `columns.ts`, `format.ts`, `parts/CellContent.tsx` | `columns.test.tsx` |
| `allowFiltering`, `allowSorting`, `allowHiding` (sütun bazında) | `columns.ts`, ilgili parts | `columns`, `toolbarPager.test.tsx` |
| `fixed`, `fixedPosition` (`<ColumnFixing>`) | `hooks/useColumnLayout.ts > buildColumnPinning` | `columns.test.tsx` |
| `allowColumnResizing`, `columnWidth` | `hooks/useColumnLayout.ts` | `dragAndResize.test.tsx` |
| `allowColumnReordering` | `parts/GridHeader.tsx` | `dragAndResize.test.tsx` |
| `<ColumnChooser>` | `parts/ColumnChooser.tsx` | `toolbarPager`, `appearanceAndMisc.test.tsx` |
| `<Grouping>`, `groupIndex` | `parts/GridBody.tsx` (GroupRow), `VKDataGrid.tsx` | `groupingSummaryDragging`, `appearanceAndMisc` |
| `<Summary>` | `parts/GridFooter.tsx` | `groupingSummaryDragging`, `appearanceAndMisc` |
| `<RowDragging>` | `hooks/useGridRowDragging.ts`, `parts/GridBody.tsx` | `dragAndResize`, `groupingSummaryDragging` |
| `<Export>`, `onExporting`, seçilileri / tümünü dışa aktar, `isSelected` uyarısı | `hooks/useGridExport.ts`, `export/exportExcel.ts` | `toolbarPager`, `appearanceAndMisc.test.tsx` |
| `isPrintButtonVisible`, `handlePrint` | `parts/GridToolbar.tsx` | `toolbarPager.test.tsx` |
| `actionMenuRender` | `table.ts` (actions sütunu), `parts/GridBody.tsx` | — |
| `showBorders`, `showRowLines`, `showColumnLines`, `rowAlternationEnabled`, `isHeaderBold`, `height`, `noDataText` | `VKDataGrid.tsx`, `context.ts > getCellSx` | `appearanceAndMisc`, `columns.test.tsx` |
| `scrollingOption` | `hooks/useGridOptions.ts` (sadece standart; `virtual` uyarı verir) | `appearanceAndMisc.test.tsx` |
| `isCrud`, `onCreate`, `onUpdate`, `onDelete` | Etkisiz (`@deprecated`). Ekle / düzenle / sil kullanan projede yapılır | — |

## Server mod kuralları (`onFilterChange`)

1. Filtre, arama, sıralama ya da sayfa boyutu değişince sayfa 0'a döner ve `onFilterChange` çağrılır.
2. Sadece sayfa değişince filtreler korunur, yeni `pageIndex` ile çağrılır.
3. Sütun genişliği değişimi, operatör seçimi ve boş filtre değeri istek **atmaz**.
4. `between` için iki uçtan biri boşsa istek atılmaz.
5. Operatör seçilmediyse: `number` / `boolean` için `=`, diğerleri için `contains`.
6. Sıralama kaldırılınca `sort: null` gider.
7. Arama ve metin filtresi 400 ms beklenip tek istek olarak gönderilir.
8. Tarih filtresi yerel saatle metin olarak gider: `date` → `"2026-11-11"`, `datetime` → `"2026-11-11T14:30:00"` (DevExtreme ile aynı; UTC'ye çevrilmez).

## Eskisinden farklı olanlar

Kullanan projelerde fark edilebilecek bilinçli değişiklikler:

| Konu | Eski (DevExtreme) | Yeni |
|---|---|---|
| `multipleSelection` varsayılanı | `true` | `false`. Checkbox'lı çoklu seçim için `multipleSelection` verilmeli |
| Basit modda sayfa boyutu değişimi | Sayfa numarası DevExtreme'den okunuyordu | Server mod gibi her zaman 1. sayfaya dönülür |
| `height` | Sabit yükseklik | Üst sınır: az satırda grid küçülür, aşınca gövde kayar, başlık sabit kalır |
| `actionMenuRender` sütunu | 60px, veri sütunlarından önce | 88px, satırın en sonunda; sabitlenmez |
| `resetFilters` | `??` hatası yüzünden hiçbir şey temizlenmiyordu; `resetSort` / `resetSearch` ters bağlıydı | Seçenekler doğru çalışır |
| `exportDataAllMethod` | `() => void` | `(options) => void \| Promise` (geriye uyumlu). Güncel filtreler parametre gelir; Promise dönerse buton bitene kadar kilitlenir, hata olursa uyarı çıkar |
| `isCrud` / `onCreate` / `onUpdate` / `onDelete` | Satır içi ekle / düzenle / sil | Etkisiz. Grid sadece seçimi bildirir; işlemler projede (modal + API) yapılır |
| Excel dışa aktarma | DevExtreme `exportDataGrid` | `exceljs`; görünür sütunlar, lookup metni, biçimli değerler |

Düzeltilen hatalar: header filter ve sıralama menüsü içindeki tıklamaların sütunu yeniden sıralaması.

## Dil metinleri

Metinler eski DataGrid'deki gibi `useExternalUiText("dataGrid.xxx")` ile okunur. İçerik `i18n/externalUiResources.ts`
(tr / en) dosyasında. Prop verilirse (`noDataText`, `columnChooserOption.title`) prop kazanır.

`i18n/useExternalUiText.ts` bu repoda `@vakif/ui-language-adaptor` olmadığı için aynı imzalı bir yedek uygulamadır.
Pakette bu dosyanın içeriği şununla değiştirilir:

```ts
export { useExternalUiText } from '@vakif/ui-language-adaptor';
export type { LocaleResources } from '@vakif/ui-language-adaptor';
```

## Şu an kapalı olan: header filter

`headerFilter` prop'u tipte duruyor (projeler derlenmeye devam eder) ama başlıktaki değer filtresi ikonu
**yorum satırında**. Açmak için:

1. `parts/GridHeader.tsx` içinde `HEADER FILTER` notlu satırların yorumunu kaldırın.
2. `__tests__` içindeki `HEADER FILTER` notlu `it.skip` testlerini `it` yapın.

`applyFilters` ile gelen `filterValues` bu sürede de çalışmaya devam eder.
