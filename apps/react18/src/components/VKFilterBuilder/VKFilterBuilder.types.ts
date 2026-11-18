/**
 * VKFilterBuilder public tipleri.
 * Filtre ağacı react-querybuilder'ın standart biçimindedir (`combinator`, `not`, `rules`, `field`, `operator`, `value`),
 * sadece RQB'nin iç `id` alanları çıkarılmıştır. Operatör adları da RQB'nin varsayılanlarıdır.
 */

export type FilterDataType = 'string' | 'number' | 'date' | 'datetime' | 'boolean';

/** RQB'nin varsayılan operatörlerinden bu component'in desteklediği alt küme */
export type FilterOperator =
  | '='
  | '!='
  | '<'
  | '>'
  | '<='
  | '>='
  | 'contains'
  | 'doesNotContain'
  | 'beginsWith'
  | 'endsWith'
  | 'between'
  | 'in'
  | 'null'
  | 'notNull';

export type FilterOption = { value: string | number | boolean; label: string };

/** Filtrelenebilen bir alan */
export type VKFilterField = {
  /** Backend'e giden alan adı */
  name: string;
  /** Ekranda görünen ad */
  label: string;
  /** Varsayılan `'string'`. Operatörleri ve değer girişini belirler */
  dataType?: FilterDataType;
  /** Seçenek listesi (lookup). Verilirse değer serbest metin yerine listeden seçilir */
  options?: FilterOption[];
  /** Verilmezse `dataType`'a göre varsayılan operatörler (bkz. `operators.ts`) */
  operators?: FilterOperator[];
  /** Yeni kuralda seçili gelen operatör. Verilmezse listedeki ilk operatör */
  defaultOperator?: FilterOperator;
  placeholder?: string;
};

export type FilterRule = {
  field: string;
  operator: FilterOperator | (string & {});
  /** Tek değer; `between` için `[başlangıç, bitiş]`; `in` için değer dizisi; `null` / `notNull` için kullanılmaz */
  value?: any;
};

export type FilterGroup = {
  combinator: 'and' | 'or';
  /** Grubun sonucunu tersine çevirir (DEĞİL) */
  not?: boolean;
  rules: FilterNode[];
};

export type FilterNode = FilterRule | FilterGroup;

export type VKFilterBuilderProps = {
  fields: VKFilterField[];
  /** Kontrollü kullanım. Ağaç dışarıdan değişince builder yeniden kurulur */
  value?: FilterGroup;
  /** Kontrolsüz kullanımda başlangıç ağacı */
  defaultValue?: FilterGroup;
  /** Her düzenlemede tam ağaç (yarım kurallar dahil). Göndermeden önce `cleanFilterTree` kullanın */
  onChange?: (tree: FilterGroup) => void;
  /**
   * Verilirse altta "Temizle" / "Uygula" butonları çıkar.
   * "Uygula" yarım kuralları ve boş grupları ayıklanmış ağaçla çağrılır.
   */
  onApply?: (tree: FilterGroup) => void;
  /** Kök dahil en fazla grup derinliği. Default = 3 */
  maxDepth?: number;
  /** Grup başında DEĞİL anahtarı. Default = true */
  showNotToggle?: boolean;
  /** Kural / grup kopyalama butonları. Default = true */
  showCloneButtons?: boolean;
  disabled?: boolean;
  applyText?: string;
  clearText?: string;
};
