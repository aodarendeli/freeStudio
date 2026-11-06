/**
 * Prop'lardan türeyen ayar nesnelerinin varsayılanları.
 * DevExtreme sürümündeki `memo*` nesneleriyle aynı varsayılanlar; her render'da yeni nesne
 * oluşmasın diye `useMemo` ile sabit tutulur.
 */
import { useEffect, useMemo } from 'react';
import type { SelectionTypes, VKDataGridProps } from '../VKDataGrid.types';

/** DevExtreme `allowedPageSizes: 'auto'` davranışı */
export const resolvePageSizes = (sizes: unknown, pageSize: number): number[] => {
  if (Array.isArray(sizes) && sizes.length) return sizes.map(Number).filter((n) => Number.isFinite(n) && n > 0);
  return [Math.max(1, Math.floor(pageSize / 2)), pageSize, pageSize * 2];
};

type OptionProps = Pick<
  VKDataGridProps,
  | 'exportOptions'
  | 'scrollingOption'
  | 'searchPanel'
  | 'selection'
  | 'pager'
  | 'filterRow'
  | 'columnChooserOption'
  | 'sorting'
> & {
  multipleSelection: boolean;
  allowedPageSizes: unknown;
};

export const useGridOptions = ({
  exportOptions,
  scrollingOption,
  searchPanel,
  selection,
  multipleSelection,
  pager,
  allowedPageSizes,
  filterRow,
  columnChooserOption,
  sorting,
}: OptionProps) => {
  const exportConfig = useMemo(() => exportOptions ?? { enabled: true, allowExportSelectedData: true }, [exportOptions]);

  const scrolling = useMemo(
    () => scrollingOption ?? { mode: 'standard', columnRenderingMode: 'standard', scrollByContent: false },
    [scrollingOption]
  );

  const searchConfig = useMemo(
    () => searchPanel ?? { highlightSearchText: true, highlightCaseSensitive: true, visible: true },
    [searchPanel]
  );

  /** `selection` verilmezse `multipleSelection`'a göre DevExtreme varsayılanı */
  const selectionConfig = useMemo(
    (): SelectionTypes =>
      selection ??
      ({
        mode: multipleSelection ? 'multiple' : 'single',
        selectAllMode: multipleSelection ? 'page' : 'none',
        showCheckBoxesMode: multipleSelection ? 'always' : 'none',
      } as SelectionTypes),
    [selection, multipleSelection]
  );

  const pagerConfig = useMemo(
    () =>
      pager ?? {
        showPageSizeSelector: true,
        showInfo: true,
        showNavigationButtons: true,
        visible: true,
        allowedPageSizes: allowedPageSizes as any,
        displayMode: 'full',
      },
    [pager, allowedPageSizes]
  );

  const filterRowConfig = useMemo(() => ({ visible: true, ...filterRow }), [filterRow]);

  const columnChooserConfig = useMemo(
    // title verilmezse araç çubuğu dil dosyasındaki `dataGrid.columnChooserTitle` metnini kullanır
    () => columnChooserOption ?? { enabled: true, allowSearch: true },
    [columnChooserOption]
  );

  const sortingConfig = useMemo(() => sorting ?? {}, [sorting]);

  // Sanal kaydırma kapsam dışı: standart kaydırma kullanılır
  useEffect(() => {
    if (scrolling.mode === 'virtual' || scrolling.mode === 'infinite') {
      console.warn(`VKDataGrid: scrolling.mode="${scrolling.mode}" desteklenmiyor, standart kaydırma kullanılıyor.`);
    }
  }, [scrolling.mode]);

  return {
    exportConfig,
    searchConfig,
    selectionConfig,
    pagerConfig,
    filterRowConfig,
    columnChooserConfig,
    sortingConfig,
  };
};
