# VKFilterBuilder

[react-querybuilder](https://react-querybuilder.js.org) (RQB) + MUI v6 tabanlı genel filtre oluşturucu.
VE / VEYA, iç içe gruplar, DEĞİL, kural ve grup kopyalama. Grid'den bağımsızdır; her ekranda kullanılabilir.

```tsx
import { VKFilterBuilder, type VKFilterField } from '@/components/VKFilterBuilder';

const fields: VKFilterField[] = [
  { name: 'name', label: 'Ürün Adı' },
  { name: 'categoryId', label: 'Kategori', options: categories.map((c) => ({ value: c.id, label: c.name })) },
  { name: 'price', label: 'Fiyat', dataType: 'number' },
  { name: 'createdAt', label: 'Oluşturulma', dataType: 'date' },
];

<VKFilterBuilder fields={fields} onApply={(tree) => load(tree)} />
```

Testler: `pnpm --filter react18 test VKFilterBuilder`. Demo: "Dinamik filtre" sekmesi.

## Props

| Prop | Açıklama |
|---|---|
| `fields` | Filtrelenebilen alanlar (bkz. aşağı) |
| `value` / `onChange` | Kontrollü kullanım. `onChange` her düzenlemede tam ağacı verir (yarım kurallar dahil) |
| `defaultValue` | Kontrolsüz kullanımda başlangıç ağacı |
| `onApply` | Verilirse altta "Temizle" / "Uygula" çıkar. "Uygula" temizlenmiş ağaçla çağrılır |
| `maxDepth` | Kök dahil en fazla grup derinliği. Default `3`; `1` iken grup eklenemez |
| `showNotToggle`, `showCloneButtons` | DEĞİL anahtarı ve kopyalama butonları. Default `true` |
| `disabled`, `applyText`, `clearText` | |

## Alan tanımı (`VKFilterField`)

| Alan | Açıklama |
|---|---|
| `name`, `label` | Backend'e giden ad ve ekranda görünen ad |
| `dataType` | `string` (default), `number`, `date`, `datetime`, `boolean`. Operatörleri ve değer girişini belirler |
| `options` | Seçenek listesi. Verilirse değer listeden seçilir (`in` için çoklu seçim) |
| `operators`, `defaultOperator` | Varsayılan operatörlerin yerine geçer |

Varsayılan operatörler (`operators.ts`):

| Tip | Operatörler |
|---|---|
| `string` | `contains`, `doesNotContain`, `beginsWith`, `endsWith`, `=`, `!=`, `in` |
| `number`, `date`, `datetime` | `=`, `!=`, `<`, `>`, `<=`, `>=`, `between` |
| `boolean` | `=` |
| `options` olan alan | `=`, `!=`, `in` |

`null` / `notNull` desteklenir ama her backend'de olmayabileceği için varsayılanlarda yoktur; `operators` ile açılır.

## Filtre ağacı

RQB'nin standart biçimi, iç `id` alanları olmadan. Operatör adları RQB varsayılanlarıdır.

```json
{
  "combinator": "and",
  "rules": [
    { "field": "price", "operator": "between", "value": [100, 500] },
    { "combinator": "or", "not": true, "rules": [
      { "field": "categoryId", "operator": "in", "value": ["c1", "c2"] },
      { "field": "name", "operator": "beginsWith", "value": "kal" }
    ] }
  ]
}
```

`cleanFilterTree(tree, fields)` (ve "Uygula") gönderilecek ağacı hazırlar:
- Değeri eksik kurallar, tanımsız alanlar ve boşalan gruplar çıkarılır (`between` için iki uç da dolu olmalı).
- Değerler alan tipine çevrilir: sayı (`"12,5"` -> `12.5`), seçeneğin asıl değeri, boolean, `"a, b"` -> `["a", "b"]`.
- Tarih, input'tan geldiği gibi yerel metin kalır: `date` -> `"2026-11-11"`, `datetime` -> `"2026-11-11T14:30"`.

## Backend'e gönderim

Ağaç olduğu gibi gönderilir. VKDataGrid'in `onFilterChange` payload'undaki `filter` ile aynı biçimdir
(grid'in "Gelişmiş filtre" butonu da bu component'i kullanır). Grid demo backend'i (`POST /api/products`)
`filter` alanında bu ağacı katı doğrulamayla bekler: geçersiz kural yok sayılmaz, 400 döner.

## Notlar

- MUI alanları builder içinde `small` boyuttadır; dış tema değişmez. ThemeProvider olmadan da çalışır.
- Kontrollü kullanımda builder kendi iç ağacını tutar; aynı ağaç `value` olarak geri gelince yeniden kurulmaz
  (yazarken odak kaybolmaz). Farklı bir ağaç gelince builder ona göre yenilenir.
- Testlerde `@react-querybuilder/material` Vite ile dönüştürülmeli (`vitest.config.ts > server.deps.inline`).
