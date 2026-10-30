# VKDataGrid: DevExtreme'den TanStack Table v9 + MUI v6'ya Geçiş

Bu dosya Claude Code için hazırlanmış görev tanımıdır. Amaç, mevcut `VKDataGrid.tsx` (DevExtreme `DataGrid` tabanlı) bileşenini **aynı props ve ref arayüzüyle** TanStack Table v9 + MUI v6 üzerinde yeniden yazmaktır. Bileşeni kullanan projelerde hiçbir değişiklik yapılmayacak.

---

## 1. Hedef ve kısıtlar

| Konu | Karar |
|---|---|
| Mantık katmanı | `@tanstack/react-table` **v9 (stable, en son sürüm)** |
| UI katmanı | `@mui/material` **v6** bileşenleri (başka UI kütüphanesi eklenmeyecek) |
| React | Şu an **18**, yakında **19**. Her ikisinde de çalışmalı |
| Lisans | Sadece MIT/ücretsiz paketler. Lisans anahtarı gerektiren paket yok |
| Veri modeli | **Server-side öncelikli.** Sayfalama, filtre, sıralama, arama sunucuda yapılır |
| Public API | `VKDataGridProps`, `VKDataGridRef` ve `VKDataGrid.types` **değişmeyecek**. Kullanan projeler aynen kalacak |
| DevExtreme | `devextreme`, `devextreme-react` ve `dx.material.blue.light.css` import'ları tamamen kaldırılacak |
| Export adı | `export { VKDataGrid }` aynen kalacak |
| Hata yakalama | `VKErrorBoundry` (`../../error/vkerror`) ile sarmalama aynen kalacak |

### Kapsam dışı
- Sanallaştırma (`@tanstack/react-virtual`) şimdilik **eklenmeyecek**. Grid sayfa başına 5-20 satırla çalışıyor. İleride ihtiyaç olursa eklenir.
- Material React Table (MRT) **kullanılmayacak**. Upstream bakımsız görünüyor ve resmi v9 desteği yok. UI doğrudan MUI bileşenleriyle kurulacak.

---

## 2. TanStack Table v9 hakkında kritik notlar

v9, v8'den farklı bir API'ye sahip. **Kod yazmadan önce resmi dokümanı oku:**
- Migration: https://tanstack.com/table/latest/docs/framework/react/guide/migrating
- Kurulum: https://tanstack.com/table/latest/docs/installation

Bilinen farklar (doğrula, hafızadan yazma):
- `useReactTable` yerine **`useTable`**.
- Feature'lar açıkça tanımlanır: `tableFeatures(...)` veya hazır `stockFeatures`. Feature nesnesi **component dışında** tanımlanmalı (stabil referans).
- `getCoreRowModel`, `getSortedRowModel` gibi fonksiyonlar yerine `rowModels: { ... }` yapısı.
- `table.getState()` yerine **`table.state`**.
- `sortingFn` yerine `sortFn`, `columnSizingInfo` yerine `columnResizing`.
- State TanStack Store üzerine kurulu. Gerekirse `table.Subscribe` / atom ile ince taneli okuma yapılabilir.
- **Paket ESM-only.** CJS build yok. Jest kullanılıyorsa (Node modu) `transformIgnorePatterns` / ESM ayarı gerekebilir. Bunu kurulumdan sonra test et.
- `@tanstack/react-table/legacy` (`useLegacyTable`) **kullanma**. Deprecated, geçici köprü.
- Paket sürümünü `~` ile sabitle (v9 hızlı sürüm alıyor).

Server-side için `manualPagination`, `manualFiltering`, `manualSorting` karşılıklarını v9 dokümanından doğrula. `rowCount` / `pageCount` ile `totalCount` bağlanacak.

---

## 3. Dosya yapısı önerisi

Mevcut klasör düzeni korunacak. Tek dosya şişmesin diye alt parçalara bölünecek:

```
VKDataGrid/
  VKDataGrid.tsx              // Ana bileşen (public API, forwardRef, orkestrasyon)
  VKDataGrid.types.ts         // MEVCUT, değişmez
  VKDataGrid.module.css       // MEVCUT stil dosyası, MUI'ya göre sadeleştirilebilir
  utils.ts                    // MEVCUT isDeepEqual
  hooks/
    useGridState.ts           // pageIndex/pageSize/filters/sort/search state + latestOptionsRef
    useGridSelection.ts       // sayfalar arası seçim (internalSelectedData)
    useGridRowDragging.ts     // satır sürükleme
  parts/
    GridToolbar.tsx           // arama + print + export + column chooser
    GridHeader.tsx            // başlık, sort, resize, header filter
    GridFilterRow.tsx         // filtre satırı (operatör seçici + input)
    GridBody.tsx              // satırlar, hücreler, group header, zebra
    GridFooter.tsx            // summary (TotalItem)
    GridPager.tsx             // TablePagination sarmalayıcı
    ColumnChooser.tsx         // Popover + checkbox listesi
    HeaderFilterMenu.tsx      // header filter popover
  export/
    exportExcel.ts            // seçili satırları Excel'e aktar
```

Alt klasörler zorunlu değil, ama ana dosya tek parça olmayacak.

---

## 4. Props eşleme tablosu (birebir korunacak)

Her prop mevcut koddaki varsayılan değeriyle birlikte desteklenecek.

### Görünüm
| Prop | Varsayılan | MUI/TanStack karşılığı |
|---|---|---|
| `showBorders` | `true` | `TableContainer` dış border |
| `showRowLines` | `true` | `TableCell` alt border |
| `showColumnLines` | `true` | `TableCell` sağ border |
| `rowAlternationEnabled` | `true` | Zebra: `nth-of-type(even)` arkaplan |
| `isHeaderBold` | `false` | Başlık `fontWeight: 700` (eski `styles.boldHeader`) |
| `height` | `'auto'` | `TableContainer` `maxHeight` / `height`, sticky header |
| `noDataText` | `'Veri Bulunamadı'` | Boş durumda tek hücreli satır |
| `columnWidth` | - | Sütun varsayılan genişlik |
| `allowColumnResizing` | `true` | TanStack column resizing (mode `onChange`/`onEnd`) |
| `allowColumnReordering` | `true` | TanStack column ordering + sürükle (dnd-kit) |

### Sayfalama (iki mod var, ikisi de korunacak)
| Mod | Koşul | Davranış |
|---|---|---|
| **Server-side mod** | `onFilterChange` verilmiş | `pageIndex`/`pageSize` bileşen içinde state, her değişimde `onFilterChange(options)` çağrılır. `defaultPageSize = paging?.pageSize \|\| 10` |
| **Basit mod** | `onFilterChange` yok | Sayfa durumu `paging` prop'undan gelir (`paging.pageIndex`, `paging.pageSize`). Değişimde `handlePagingChanged({ size, page })` çağrılır |

- `totalCount` toplam satır sayısıdır, `manualPagination` ile bağlanacak.
- `pager` prop'u yoksa varsayılan: `{ showPageSizeSelector: true, showInfo: true, showNavigationButtons: true, visible: true, allowedPageSizes, displayMode: 'full' }`
- `allowedPageSizes` varsayılan `[5, 10, 20]`.
- Pager bilgi metni: `"Sayfa {0}/{1} ({2} öğeler)"` (sayfa, toplam sayfa, toplam öğe). `TablePagination` `labelDisplayedRows` ile Türkçeleştirilecek.

### Arama, filtre, sıralama
| Prop | Davranış |
|---|---|
| `searchPanel` | Varsayılan `{ highlightSearchText: true, highlightCaseSensitive: true, visible: true }`. Placeholder: `"Ara..."`. Vurgulama (highlight) hücre içinde yapılacak |
| `filterRow` | Varsayılan `{ visible: true, ...filterRow }`. `resetOperationText`, `showAllText` desteklenecek |
| `headerFilter` | `boolean`, varsayılan `false`. `headerFilterData` global, `col.headerFilterData` sütun bazında |
| `sorting` | DevExtreme `sorting` prop'u olduğu gibi geçirilecek (mod: `single`/`multiple`/`none` eşlemesi) |
| `resetOperationText` | Filtre satırı operatör menüsündeki "sıfırla" metni |

### Seçim
| Prop | Davranış |
|---|---|
| `selection` | Varsayılan: `multipleSelection` true ise `{ mode:'multiple', selectAllMode:'page', showCheckBoxesMode:'always' }`, değilse `{ mode:'single', selectAllMode:'none', showCheckBoxesMode:'none' }` |
| `multipleSelection` | Varsayılan `true` |
| `selectedRowKeys` | Başlangıç seçimi. Eleman nesne ise olduğu gibi, string/number ise `{ [rowKeyExpr]: item }` olarak alınır |
| `rowKeyExpr` | Satır anahtarı alanı. Veride yoksa key `undefined` kalır (mevcut `isKeyExistsInData` mantığı korunacak) |
| `singleRowRadioSelection` | `true` ise ilk sütuna 50px'lik seçim hücresi eklenir, satıra tıklayınca seçilir, `rowSelectionChange` ile bildirilir. Mevcut kodda `checkbox` render ediliyor, **radio olarak mı kalacak onayla** |
| `rowSelectionChange` | Payload: `{ selectedRowKeys, selectedRowsData }` |
| `isSelected` | Seçili satır yokken export'a basılırsa uyarı gösterilir |

### Araç çubuğu
| Prop | Buton | İkon | İpucu (tooltip) |
|---|---|---|---|
| `isPrintButtonVisible` | Yazdır | print | `Yazdır` → `handlePrint` |
| `isExportAllButtonVisible` | Tümünü dışa aktar | export | `Tüm Veriyi Dışa Aktar` → `exportDataAllMethod` |
| `exportOptions.allowExportSelectedData` | Seçilileri dışa aktar | exportselected | `Seçili Satırları Dışa Aktar` |
| `exportOptions.enabled` | Varsayılan export | - | `onExporting` olayı korunacak |
| `columnChooserOption` | Sütun seçici | - | Varsayılan `{ enabled: true, allowSearch: true, title: 'Sütun Seçici' }` |

- Seçili satır yokken ve `isSelected` true ise: `"Lütfen önce en az 1 satır seçin."` uyarısı (2500 ms, warning). DevExtreme `notify` yerine **MUI `Snackbar` + `Alert`**.
- Sütun seçici dışına tıklayınca kapanmalı (mevcut `pointerdown` listener davranışı).
- Sütun seçici arama destekler (`allowSearch`), `col.allowHiding` false olan sütunlar listede çıkmaz.

### Kaydırma
`scrollingOption` varsayılan `{ mode:'standard', columnRenderingMode:'standard', scrollByContent:false }`. `virtual` modu şimdilik desteklenmez, gelirse standart davranış uygulanır ve konsola uyarı yazılır.

### Gruplama ve özet
- `grouping`: `{ allowCollapsing, autoExpandAll, expandMode }` → TanStack grouping + expanding. `col.groupIndex` ile başlangıç gruplaması.
- `summary`: `{ count: [...], options: [{ column, text }] }`. Alt satırda her `column` için **sum** toplamı, format `"{text}: {0}"` ya da yoksa `"{0}"`. `summary.count` sunucudan gelen özet verisi (`load` sonucundaki `summary` alanı) olarak geçilir.

### CRUD
`isCrud` true ise satır içi düzenleme (`mode: 'row'`, ekle/güncelle/sil, ikonlu):
- Ekle → `onCreate(values)`
- Güncelle → `onUpdate(key, values)`
- Sil → `onDelete(key)`
- Hepsi async olabilir, bitene kadar satır "bekleniyor" durumunda.
- `col.allowEditing` varsayılan `true`.

### Aksiyon menüsü
`actionMenuRender(data)` verilmişse, ilk sütunlardan biri olarak (`dataField="actions"`, boş caption, **60px**, sort/filter kapalı) hücre olarak `actionMenuRender(rowData)` render edilir.

### Satır sürükleme (`rowDragging`)
```
rowDragging: {
  allowReordering: boolean,
  showDragIcons?: boolean,                 // varsayılan true
  isRowDraggable?: (item) => boolean,      // yoksa item.isNonDraggable !== true
  isDropAllowed?: (fromIndex, toIndex, item, visibleRowsData) => boolean,
  onReorder?: (fromIndex, toIndex) => void
}
```
- Sürükleme açıkken veri kaynağı olarak **iç state (`internalData`)** kullanılır, kapalıyken doğrudan `dataSource`.
- Varsayılan drop kuralı: hem kaynak hem hedef satırın `isNonDraggable !== true` olması.
- Kütüphane önerisi: **`@dnd-kit/core` + `@dnd-kit/sortable`** (MIT).

---

## 5. Sütun tanımı (`columns`) eşlemesi

Her sütun nesnesinin desteklenmesi gereken alanları:

`dataField`, `caption`, `name`, `width`, `dataType`, `alignment`, `format`, `cellRender`, `calculateCellValue`, `lookup`, `headerFilterData`, `allowHeaderFiltering`, `allowFiltering`, `allowSorting`, `allowGrouping`, `allowEditing` (varsayılan `true`), `allowHiding` (varsayılan `true`), `fixed`, `fixedPosition`, `filterOperations`, `groupIndex`, `visible` (varsayılan `true`).

Kurallar:
- `columns` verilmezse `dataSource[0]` anahtarlarından otomatik üretilir (`{ dataField: key, caption: key }`).
- `caption` yoksa `dataField` gösterilir.
- `cellRender` imzası mevcut kullanımla aynı kalacak: `cellRender({ data, ... })`. **Eski DevExtreme imzasını kullanan projeler kırılmasın**, hücre bilgisi nesnesinde en az `data`, `value`, `rowIndex`, `column` bulunmalı.
- `calculateCellValue(rowData)` TanStack `accessorFn` olarak bağlanacak.
- `fixed` + `fixedPosition` → TanStack **column pinning** (`left`/`right`). `fixed` sütun varsa pinning aktif olur. Sticky offset'leri doğru hesaplanmalı, `box-shadow` ile ayrım gösterilmeli.
- `lookup` → hücrede `lookup.dataSource` içinden `valueExpr`/`displayExpr` ile gösterim, filtrede seçenek listesi.
- `format` → sayı/tarih formatlama (`Intl.NumberFormat` / `Intl.DateTimeFormat`, `tr-TR`).
- `dataType`: `string | number | boolean | date | datetime | object` için uygun filtre input'u ve hizalama.

---

## 6. Server-side akış (en kritik kısım)

### Seçenekler nesnesi (`onFilterChange` payload'u)
```
{
  filter: FilterTypes[],     // aktif filtreler
  searchText: string,
  sort: SortingTypes | null,
  pageIndex: number,
  pageSize: number
}
```

`FilterTypes`: `{ dataField, dataType, name?, filterOperator, filterValue, filterValues? }`
`SortingTypes`: `{ dataField, dataType, sortOrder, name? }`

### Kurallar (mevcut `handleOptionChange` davranışı)
1. **Filtre / arama / sıralama / sayfa boyutu değişince** sayfa **0'a döner** ve `onFilterChange` çağrılır.
2. **Sadece sayfa değişince** yeni `pageIndex` ile çağrılır, filtreler korunur.
3. **Sütun genişliği değişimi, operatör seçimi değişimi, değeri boş bırakılmış filtre** → `onFilterChange` **çağrılmaz**.
4. `between` operatöründe iki değerden biri boşsa (null/undefined) **çağrılmaz** (yarım aralık).
5. Aktif filtre = `filterValue` null/undefined olmayan veya `filterValues` dolu olan sütunlar.
6. Varsayılan `filterOperator`: sütun `selectedFilterOperation` verdiyse o, yoksa `dataType` `boolean` veya `number` ise `'='`, değilse `'contains'`.
7. Sıralama kaldırılınca `sort: null` gönderilir.
8. Programatik değişikliklerde (resetFilters / applyFilters) olay döngüsü oluşmaması için `isClearingRef` benzeri bir **bastırma bayrağı** kullanılacak.
9. Son seçenekler `latestOptionsRef` içinde tutulur (render bağımsız, `getFilters()` bunu okur).

Filtre operatörleri (DevExtreme ile uyumlu isimler): `contains`, `notcontains`, `startswith`, `endswith`, `=`, `<>`, `<`, `>`, `<=`, `>=`, `between`. Sütunda `filterOperations` verilmişse sadece onlar menüde çıkar.

Debounce: metin filtresi ve arama için ~400 ms debounce ekle (isteğe bağlı, props'a yeni alan eklemeden iç davranış).

### Veri kaynağı
- `dataSource` doğrudan satır dizisidir. `totalCount` ayrı prop.
- DevExtreme `CustomStore` **kaldırılacak**. Veri doğrudan `data` olarak TanStack'e verilir.
- Satır anahtarı: `getRowId` → `rowKeyExpr` varsa `row[rowKeyExpr]`, yoksa index.
- Referans stabilitesi için `useMemo` kullan (mevcut `memo*` desenleri korunsun). Her render'da yeni nesne oluşturup grid'i yeniden başlatma.

---

## 7. Sayfalar arası seçim (mevcut davranış korunacak)

Seçim, sunucu tarafı sayfalama yüzünden sayfa değişince kaybolmamalı. Bu yüzden satır **nesneleri** tutulur:

- `internalSelectedData`: seçilen satır nesneleri dizisi (anahtar değil, tam nesne).
- Sayfada seçim değişince:
  1. O sayfada görünen satırlardan artık seçili olmayanlar dizi içinden çıkarılır.
  2. Yeni seçilenler eklenir. Aynı anahtar varsa mevcut kaydın üzerine birleştirilir (güncel veri).
  3. `rowSelectionChange({ selectedRowKeys, selectedRowsData })` çağrılır.
     `selectedRowKeys`: `rowKeyExpr` varsa anahtarlar, yoksa nesneler.
- Sayfa yüklenince (içerik hazır olunca) grid'in seçili anahtarları, **yalnızca o sayfada görünen ve `internalSelectedData` içinde olan** satırlara göre senkronize edilir.
- `multipleSelection === false` iken ve `rowKeyExpr` varsa: veride artık bulunmayan seçimler temizlenir.
- Anahtar karşılaştırmaları `isDeepEqual` ile (nesne anahtarlar için).
- TanStack karşılığı: `rowSelection` state'i `getRowId` ile **anahtar bazlı** tutulur. Ek olarak nesneleri tutmak için `internalSelectedData` yine gerekir.

---

## 8. Ref (imperative) API: `VKDataGridRef`

`forwardRef` + `useImperativeHandle` ile üç metot **aynı imzayla** korunacak:

### `getFilters()`
Döner: `{ filter, searchText, sort, pageIndex, pageSize }` (`latestOptionsRef` değerleri + güncel `pageIndex`).

### `resetFilters(options?: ResetFilterOptions)`
Seçenekler ve varsayılanları: `resetSort = true`, `resetFilter = true`, `resetSearch = true`, `triggerOnFilterChange = false`.
- Sayfa 0'a alınır.
- İlgili state'ler sıfırlanır (filtreler, sıralama, arama metni).
- `triggerOnFilterChange` true ise `onFilterChange({...latestOptions, pageIndex: 0})` çağrılır.
- İşlem sırasında olay bastırma bayrağı açık olmalı.

### `applyFilters(filters: FilterTypes[], sort: SortingTypes | null = null)`
- Her filtre için: operatör (`filterOperator ?? 'contains'`), değer, varsa `name` sütuna uygulanır.
- `sort` varsa ilgili sütunun sıralaması ayarlanır.
- `latestOptionsRef` güncellenir, sayfa 0'a alınır.
- **Her zaman** `onFilterChange({ filter: filters, searchText, sort, pageIndex: 0, pageSize })` çağrılır.

> ### ⚠️ Mevcut kodda tespit edilen hatalar (birebir kopyalama, düzelt ve bana bildir)
> `resetFilters` içinde şu hatalar var, niyet edilen davranışı uygula:
> 1. `resetFilter ?? instance.clearFilter()` ifadesi `??` kullanıyor. Varsayılanlar `true` olduğu için **hiç çalışmıyor**. Niyet: `if (resetFilter) clearFilter()`. Aynısı `resetSort` ve `resetSearch` için de geçerli.
> 2. `latestOptionsRef` sıfırlanırken alanlar **yanlış bayraklara bağlı**:
>    `...(resetSort && { searchText: '' })` ve `...(resetSearch && { sort: null })`.
>    Niyet: `resetSearch → searchText: ''`, `resetSort → sort: null`.
> 3. `getFilters` içindeki `pageIndex` state'ten okunuyor, `latestOptionsRef` ile tutarlı olduğundan emin ol.
>
> Bu düzeltmeleri yapınca davranış değişiklikleri **PR açıklamasında** listelenmeli. Düzeltme, kullanan projelerde fark yaratabilir.

---

## 9. Türkçe metinler (aynen kalacak)

| Yer | Metin |
|---|---|
| Boş veri | `Veri Bulunamadı` |
| Sütun seçici başlığı | `Sütun Seçici` |
| Arama placeholder | `Ara...` |
| Yazdır ipucu | `Yazdır` |
| Tümünü aktar ipucu | `Tüm Veriyi Dışa Aktar` |
| Seçilileri aktar ipucu | `Seçili Satırları Dışa Aktar` |
| Uyarı | `Lütfen önce en az 1 satır seçin.` |
| Pager bilgisi | `Sayfa {0}/{1} ({2} öğeler)` |

MUI tarafında `trTR` locale'i (`@mui/material/locale`) tema üzerinden kullanılabilir. `TablePagination` etiketleri (`labelRowsPerPage`: "Sayfa başına satır") ayrıca verilebilir.

---

## 10. Dışa aktarma

- Kütüphane: **`exceljs`** (MIT) önerilir. `xlsx` (SheetJS) community sürümüne dikkat, `exceljs` daha güvenli seçim.
- **Seçili satırlar**: `internalSelectedData` kaynak alınır (sayfalar arası seçili tüm satırlar).
- **Tümü**: Sunucudan çekilir, `exportDataAllMethod` prop'u çağrılır (grid kendisi veri çekmez).
- `onExporting` prop'u verilmişse export öncesi çağrılır, `e.cancel = true` ile iptal edilebilmeli (DevExtreme uyumu).
- Görünür sütunlar, `caption` başlıkları ve `format` ile biçimlenmiş değerler yazılır.
- `Export.allowExportSelectedData={false}` mevcut koddaki DevExtreme'in kendi butonunu kapatıyor, özel buton kullanılıyor. Aynı mantık: yeni grid'de tek bir export butonu seti olacak.

---

## 11. MUI v6 uygulama kuralları

- Tüm görsel bileşenler `@mui/material` (v6) ile. Tema renkleri `theme.palette` üzerinden okunacak, **sabit hex yok**.
- Stil için `sx` veya `styled`. Eski `VKDataGrid.module.css` yalnızca gerçekten gerekliyse korunacak. DevExtreme CSS import'u **silinecek**.
- Erişilebilirlik: sıralama başlıkları `aria-sort`, seçim checkbox'ları `aria-label`, ikon butonlarında `aria-label` ve `Tooltip`.
- Yükleniyor durumu: DevExtreme'de `LoadPanel enabled={false}` idi, yani yükleme göstergesi **kapalı**. Yeni grid'de `loading` prop'u yoksa yükleme göstergesi **ekleme**.
- `hoverStateEnabled={false}`, `focusedRowEnabled={false}`, `wordWrapEnabled={false}` → hover vurgusu yok, odak vurgusu yok, hücre metni tek satır (`noWrap`, ellipsis).
- `repaintChangesOnly` → React key'leri stabil (`getRowId`), gereksiz yeniden render yok.

---

## 12. Bağımlılıklar

Eklenecek:
```
@tanstack/react-table   (v9, ~ ile sabit)
exceljs
@dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```
Zaten var olduğu varsayılan: `@mui/material` v6, `@mui/icons-material`, `@emotion/react`, `@emotion/styled`.

Kaldırılacak (grid'e özel kullanımsa, başka yerde kullanılıp kullanılmadığını **önce kontrol et**):
```
devextreme
devextreme-react
```

Tarih filtresi gerekiyorsa `@mui/x-date-pickers` (Community, MIT) eklenir. **Gerekli mi, kullanıcıya sor.**

---

## 13. Uygulama planı (aşamalar)

Her aşama sonunda derlenebilir ve çalışabilir durumda olmalı.

**Aşama 0: Hazırlık**
- Mevcut `VKDataGrid.tsx` ve `VKDataGrid.types.ts` oku.
- v9 migration dokümanını oku.
- Paketleri kur, sürümleri sabitle. ESM-only konusunu (Jest/test altyapısı) kontrol et.
- Mevcut grid'in kullanıldığı yerleri tara (hangi props'lar gerçekten kullanılıyor?).

**Aşama 1: Çekirdek tablo**
- `useTable` kurulumu, `columns` → TanStack column def dönüşümü, `getRowId`.
- MUI `Table` ile başlık + gövde, zebra, border bayrakları, `noDataText`, `height`.

**Aşama 2: Server-side sayfalama / sıralama / arama / filtre**
- Basit mod (`handlePagingChanged`) ve server mod (`onFilterChange`) ayrımı.
- Filtre satırı, operatör menüsü, `between` desteği, `latestOptionsRef`, olay bastırma bayrağı.
- Bölüm 6'daki kuralların hepsi.

**Aşama 3: Seçim**
- Çoklu / tekli / radio. Sayfalar arası `internalSelectedData`. `rowSelectionChange`.

**Aşama 4: Ref API**
- `getFilters`, `resetFilters` (düzeltilmiş), `applyFilters`.

**Aşama 5: Araç çubuğu ve sütun özellikleri**
- Arama paneli + highlight, sütun seçici, print/export butonları, Snackbar uyarısı.
- Column resizing, reordering, pinning (`fixed`), header filter, `lookup`, `format`.

**Aşama 6: Gelişmiş**
- Gruplama, summary footer, CRUD (satır içi), `actionMenuRender`, `rowDragging`.
- Excel export.

**Aşama 7: Temizlik ve doğrulama**
- DevExtreme import'larını ve CSS'ini sil.
- Tip kontrolü (`tsc --noEmit`), lint, mevcut testler.
- React 18 ve React 19 ile smoke test.

---

## 14. Kabul kriterleri (Definition of Done)

- [ ] `VKDataGridProps` / `VKDataGridRef` / `VKDataGrid.types` **değişmedi**. Kullanan projelerde derleme hatası yok.
- [ ] `devextreme` ve `devextreme-react` import'u kalmadı.
- [ ] Server-side: filtre / sıralama / arama / sayfa değişimi `onFilterChange` ile doğru payload gönderiyor, filtre değişince sayfa 0'a dönüyor.
- [ ] Sütun genişliği değişimi ve boş filtre `onFilterChange` tetiklemiyor.
- [ ] Sayfa değişince seçili satırlar kaybolmuyor, `rowSelectionChange` doğru payload veriyor.
- [ ] `resetFilters`, `applyFilters`, `getFilters` çalışıyor (bölüm 8'deki hatalar giderilmiş).
- [ ] `fixed` sütunlar yatay kaydırmada sabit kalıyor.
- [ ] Export (seçili / tümü), print, sütun seçici çalışıyor. Türkçe metinler birebir.
- [ ] React 18 altında çalışıyor, React 19 ile de denendi.
- [ ] Gereksiz yeniden render yok (props'tan türeyen nesneler `useMemo` ile stabil).

---

## 15. Açık sorular (başlamadan önce kullanıcıya sor)

1. Testlerde **Jest** (Node modu) kullanılıyor mu? (v9 ESM-only olduğu için ayar gerekebilir.)
2. `singleRowRadioSelection` modunda hücre **radio** mu olacak, mevcut kodda olduğu gibi **checkbox** mı kalacak?
3. Tarih filtresi gerekiyor mu? (`@mui/x-date-pickers` eklenir mi?)
4. Export kütüphanesi olarak `exceljs` uygun mu?
5. Bölüm 8'deki `resetFilters` hatalarının düzeltilmesi onaylanıyor mu?
6. `cellRender` imzasında kullanan projelerin hangi alanlara (`value`, `rowIndex`, `column`...) bağımlı olduğu biliniyor mu?

---

## 16. Çalışma kuralları (Claude Code için)

- **Dokümanı doğrula:** TanStack v9 API'si yeni. Hafızana güvenme, `tanstack.com/table/latest` dokümanını ve örneklerini oku.
- **Public API'yi bozma.** Emin değilsen sor.
- Küçük, derlenebilir adımlarla ilerle. Her aşama sonunda `tsc --noEmit` çalıştır.
- Kodda mevcut Türkçe/İngilizce yorum stilini koru, gereksiz yorum ekleme.
- Beklenmeyen bir davranış farkı bulursan **PR açıklamasında listele**, sessizce değiştirme.
- Yeni prop **ekleme**. Gerekirse iç davranış olarak çöz.