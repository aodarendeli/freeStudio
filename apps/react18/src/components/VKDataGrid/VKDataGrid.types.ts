import type { JSX, ReactNode } from 'react';

/**
 * DevExtreme `ExportingEvent` yerine geçen yerel tip.
 * Eski kullanımla uyum için alanlar aynı isimlerle tutuldu.
 */
type ExportingEvent = {
  /** Grid'in dışa açılan küçük API'si (seçili satırlar, görünür sütunlar vb.) */
  component: any;
  element?: HTMLElement | null;
  fileName: string;
  format: 'xlsx';
  /** Sadece seçili satırlar mı aktarılıyor */
  selectedRowsOnly: boolean;
  /** `true` yapılırsa varsayılan Excel aktarımı yapılmaz */
  cancel: boolean;
};

type VKDataGridProps = {
  /** Specifies whether a user can reorder columns. Default = false */
  allowColumnReordering?: boolean;
  /** Specifies whether a user can resize columns. Default = false */
  allowColumnResizing?: boolean;
  /** Binds the UI component to data. Default = null */
  columns?: any[];

  /** Group title text style */
  /*  groupHeaderStyleByColumn?: Record<string, React.CSSProperties>; */

  rowDragging?: {
    /** DevExtreme RowDragging.allowReordering proxy */
    allowReordering?: boolean;
    /** Show drag icon */
    showDragIcons?: boolean;
    /** Trigger reorder */
    onReorder?: (fromIndex: number, toIndex: number) => void;
    /** Is row dragable?  Default: item.isDefault === false */
    isRowDraggable?: (itemData: any) => boolean;

    isDropAllowed?: (fromIndex: number, toIndex: number, itemData: any, fullData: any[]) => boolean;
  };

  cellRender?: (data: any) => JSX.Element; // Hücreyi özelleştirmek için render fonksiyonu

  onSearch?: any;
  dataSource: any[];
  noDataText?: string;

  height?: number | string;

  /** Configures the filter row. */
  filterRow?: FilterRowTypes;
  /** Configures the header filter feature. */
  headerFilter?: boolean;
  /** Configures paging. */
  paging?: PagingTypes;
  /** Enables and configures grouping feature. */
  grouping?: GroupingTypes;
  /** Configures the group panel UI. */
  /*  groupPanel?: GroupPanelTypes; */

  alignment?: 'left' | 'center' | 'right';

  selectedRowKeys?: any[]; // number yada obje

  pager?: PagerTypes;
  /** Specifies whether rows should be shaded differently. */
  rowAlternationEnabled?: boolean;
  /** Configures client-side exporting. */
  exportOptions?: ExportTypes;

  scrollingOption?: ScrollingType;

  handlePrint?: () => void;

  onExporting?: (e: ExportingEvent) => void;
  /** Configures the search panel. */
  searchPanel?: SearchPanelTypes;
  /** Configures runtime selection. */
  selection?: SelectionTypes;
  /** Specifies whether the outer borders of the UI component are visible. Default = false */
  showBorders?: boolean;
  /** Specifies whether horizontal lines that separate one row from another are visible. */
  showRowLines?: boolean;
  /** Specifies whether vertical lines that separate one column from another are visible. */
  showColumnLines?: boolean;
  rowSelectionChange?: RowSelectionChangeCallback | undefined;

  onFilterChange?: (filters: FiltersChangesTypes) => void;

  headerFilterData?: any;

  columnChooserOption?: ColumnChooserType;

  resetOperationText?: string | null;

  rowKeyExpr?: string;

  multipleSelection?: boolean;

  singleRowRadioSelection?: boolean;

  isPrintButtonVisible?: boolean;

  isHeaderBold?: boolean;

  /** Specifies the available page sizes in the page size selector. Default = 'auto' */
  allowedPageSizes?: any;

  /** Specifies pagination control as function. */
  handlePagingChanged?: (data: { size: number; page: number }) => void;
  /** Gives total pageIndex number */
  totalCount?: number;

  columnWidth?: number | 'auto';

  sorting?: VKGridSorting;

  summary?: Summary;

  /** Enables CRUD support with Create, Update, Delete buttons */
  isCrud?: boolean;
  /** Called when a new row is created */
  onCreate?: (values: any) => Promise<any>;
  /** Called when a row is updated */
  onUpdate?: (key: any, values: any) => Promise<any>;
  /** Called when a row is deleted */
  onDelete?: (key: any) => Promise<any>;

  actionMenuRender?: (rowData: any) => ReactNode;

  isExportAllButtonVisible?: boolean;

  isSelected?: boolean;

  exportDataAllMethod?: () => void;

  /** Seçim yapılması gereksiz ise kullanılabilir. Default false */
  /* disableSelection?: boolean; */
};

type VKDataGridRef = {
  resetFilters: () => void;
  getFilters: () => FiltersChangesTypes;
  applyFilters: (filters: FilterTypes[]) => void;
};

type Summary = {
  options: SummaryOption[];
  count: number[] | string[];
};

type SummaryOption = {
  column: string;
  text?: string;
};

type VKGridSorting = {
  mode?: 'single' | 'multiple' | 'none';
  ascendingText?: string;
  descendingText?: string;
  clearText?: string;
};

type FiltersChangesTypes = {
  filter: FilterTypes[];
  searchText: string;
  sort: SortingTypes | null;
  pageIndex: number;
  pageSize: number;
};

type SortingTypes = {
  dataType?: string;
  dataField: string;
  sortOrder: 'asc' | 'desc';
  name?: string;
};

type FilterTypes = {
  dataField: string;
  dataType: string;
  name?: string;
  filterOperator?:
    | '='
    | '<>'
    | '>'
    | '<'
    | '<='
    | '>='
    | 'between'
    | 'contains'
    | 'startWith'
    | 'endWith'
    | 'equals'
    | 'notEquals'
    | 'in'
    | null;
  filterValue?: string | number | string[] | number[];
  filterValues?: string[] | number[];
};

type ScrollingType = {
  mode?: 'standard' | 'virtual' | 'infinite';
  columnRenderingMode?: 'standard' | 'virtual';
  scrollByContent?: boolean;
};

type ColumnChooserType = {
  enabled?: boolean;
  title?: string;
  allowSearch?: boolean;
};

type OptionColumnTypes = {
  dataField?: string;
  dataType?: 'string' | 'number' | 'date' | 'time' | 'boolean' | 'datetime' | null;
  selectedFilterOperation?: '=' | '<>' | '>' | '<' | '<=' | '>=' | 'between' | null;
  filterType?: 'exclude' | 'include' | null;
  filterValue?: string | number;
  filterValues?: string[] | number[];
  sortIndex?: number;
  sortOrder?: 'asc' | 'desc' | null;
  allowGrouping?: boolean;
  groupIndex?: number;
  fixed?: boolean;
  fixedPosition?: 'left' | 'right';
  allowEditing?: boolean;
};

type PagingTypes = {
  /** Enables paging. Default = true */
  enabled?: boolean;
  /** Specifies the page to be displayed using a zero-based index. Default = 0 */
  pageIndex?: number;
  /** Specifies the page size. Default = 20 */
  pageSize?: number;
};

type RowSelectionChangeCallback = (selected: {
  selectedRowsData: any[];
  selectedRowKeys: any[];
}) => void;

type ExportTypes = {
  /** Allows users to export selected rows only. Default = false */
  allowExportSelectedData?: boolean;
  /** Adds the Export button to the DataGrid's toolbar. Default = false */
  enabled?: boolean;
};

type InternalSelectedDataType = Record<string, any>;

type RowsKeysType = string | number | object | null;

type SearchPanelTypes = {
  /** Notifies the UI component whether search is case-sensitive to ensure that search results are highlighted correctly. Applies only if highlightSearchText is true. Default = false*/
  highlightCaseSensitive?: boolean;
  /** Specifies whether found substrings should be highlighted. Default = true */
  highlightSearchText?: boolean;
  /** Specifies whether the search panel is visible or not. Default = false */
  visible?: boolean;
};

type SelectionTypes = {
  /** Specifies the selection mode. */
  mode: 'single' | 'multiple';
  /** Specifies the mode in which all the records are selected. Applies only if selection.allowSelectAll is true. Default = 'allPages' */
  selectAllMode: 'page' | 'allPages';
  /** Specifies when to display the selection column and row selection checkboxes. Applies only if selection.mode is "multiple". */
  showCheckBoxesMode: 'always' | 'none' | 'onClick' | 'onLongTap';
};
type allowedPageSizes = [10, 50, 100];

type PagerTypes = {
  visible?: boolean;
  showPageSizeSelector?: boolean;
  showInfo?: boolean;
  showNavigationButtons?: boolean;
  allowedPageSizes?: allowedPageSizes;
  displayMode?: string;
};

type FilterRowTypes = {
  visible: boolean;
  showAllText?: string;
};

type GroupingTypes = {
  allowCollapsing?: boolean;
  autoExpandAll?: boolean;
  expandMode?: 'rowClick' | 'buttonClick';
};

type ResetFilterOptions = {
  triggerOnFilterChange?: boolean;
  resetSort?: boolean;
  resetFilter?: boolean;
  resetSearch?: boolean;
};

/* type GroupPanelTypes = {
  visible?: boolean;
  emptyPanelText?: string
} */

export type {
  VKDataGridProps,
  SearchPanelTypes,
  ExportTypes,
  ExportingEvent,
  RowSelectionChangeCallback,
  PagingTypes,
  OptionColumnTypes,
  FiltersChangesTypes,
  SelectionTypes,
  FilterRowTypes,
  VKGridSorting,
  PagerTypes,
  GroupingTypes,
  ResetFilterOptions,
  InternalSelectedDataType,
  RowsKeysType,
  VKDataGridRef,
  FilterTypes,
  SortingTypes,
  Summary,
  SummaryOption,
};
