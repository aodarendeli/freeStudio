import { useState } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { VKFilterBuilder } from '../VKFilterBuilder';
import type { FilterGroup, VKFilterField } from '../VKFilterBuilder.types';

const fields: VKFilterField[] = [
  { name: 'name', label: 'Ad' },
  { name: 'price', label: 'Fiyat', dataType: 'number' },
  {
    name: 'categoryId',
    label: 'Kategori',
    options: [
      { value: 'c1', label: 'Kırtasiye' },
      { value: 'c2', label: 'Oyuncak' },
    ],
  },
];

/** RQB kontrolleri `title` taşıyan bir sarmalayıcı içinde: "Alan", "Operatör", "Değer", "Bağlaç" (aralıkta iki input) */
const controls = (title: string) =>
  Array.from(document.querySelectorAll(`[title="${title}"]`)).flatMap((wrapper) =>
    Array.from(wrapper.querySelectorAll<HTMLElement>('[role="combobox"], input:not([aria-hidden="true"])'))
  );

const selectOption = async (combobox: HTMLElement, label: string) => {
  fireEvent.mouseDown(combobox);
  fireEvent.click(await screen.findByRole('option', { name: label }));
};

const lastCall = (fn: ReturnType<typeof vi.fn>) => fn.mock.calls.at(-1)?.[0];

describe('VKFilterBuilder', () => {
  it('başlangıç ağacını Türkçe kontrollerle gösterir', () => {
    render(
      <VKFilterBuilder
        fields={fields}
        defaultValue={{ combinator: 'and', rules: [{ field: 'price', operator: 'between', value: [10, 20] }] }}
      />
    );
    expect(controls('Bağlaç')[0]).toHaveTextContent('VE');
    expect(controls('Alan')[0]).toHaveTextContent('Fiyat');
    expect(controls('Operatör')[0]).toHaveTextContent('Arasında');
    expect(controls('Değer').map((input) => (input as HTMLInputElement).value)).toEqual(['10', '20']);
    expect(screen.getByRole('button', { name: '+ Kural' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'DEĞİL' })).toBeInTheDocument();
  });

  it('"+ Kural" ilk alan ve varsayılan operatörle kural ekler; eksik kural sayıda belirtilir', async () => {
    const user = userEvent.setup();
    render(<VKFilterBuilder fields={fields} onApply={() => {}} />);
    expect(screen.getByText('Kural yok')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '+ Kural' }));
    expect(controls('Alan')[0]).toHaveTextContent('Ad');
    expect(controls('Operatör')[0]).toHaveTextContent('İçerir');
    expect(screen.getByText('1 kural, 1 tanesi eksik (uygulanmaz)')).toBeInTheDocument();
  });

  it('"Uygula" yarım kuralları ayıklanmış, değerleri tipine çevrilmiş ağaçla çağrılır', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    render(
      <VKFilterBuilder
        fields={fields}
        onApply={onApply}
        defaultValue={{
          combinator: 'and',
          rules: [
            { field: 'name', operator: 'contains', value: '' },
            { field: 'price', operator: '>', value: '' },
          ],
        }}
      />
    );
    await user.type(controls('Değer')[1], '150');
    await user.click(screen.getByRole('button', { name: 'Uygula' }));
    expect(lastCall(onApply)).toEqual({ combinator: 'and', rules: [{ field: 'price', operator: '>', value: 150 }] });
  });

  it('alan değişince operatör ve değer o alana göre sıfırlanır; seçenekli alan listeden seçilir', async () => {
    const onChange = vi.fn();
    render(
      <VKFilterBuilder
        fields={fields}
        onChange={onChange}
        defaultValue={{ combinator: 'and', rules: [{ field: 'name', operator: 'contains', value: 'kalem' }] }}
      />
    );
    await selectOption(controls('Alan')[0], 'Kategori');
    expect(controls('Operatör')[0]).toHaveTextContent('Eşittir');

    await selectOption(controls('Değer')[0], 'Oyuncak');
    expect(lastCall(onChange).rules).toEqual([{ field: 'categoryId', operator: '=', value: 'c2' }]);
  });

  it('VEYA, alt grup ve DEĞİL ağaca yansır', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<VKFilterBuilder fields={fields} onChange={onChange} />);

    await selectOption(controls('Bağlaç')[0], 'VEYA');
    await user.click(screen.getByRole('checkbox', { name: 'DEĞİL' }));
    await user.click(screen.getByRole('button', { name: '+ Grup' }));

    const tree = lastCall(onChange) as FilterGroup;
    expect(tree).toMatchObject({ combinator: 'or', not: true });
    expect(tree.rules).toEqual([{ combinator: 'and', rules: [{ field: 'name', operator: 'contains', value: '' }] }]);
  });

  it('maxDepth dolunca alt grup eklenemez; maxDepth = 1 iken hiç grup eklenemez', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<VKFilterBuilder fields={fields} maxDepth={1} />);
    expect(screen.queryByRole('button', { name: '+ Grup' })).not.toBeInTheDocument();
    unmount();

    render(<VKFilterBuilder fields={fields} maxDepth={2} />);
    await user.click(screen.getByRole('button', { name: '+ Grup' }));
    // Kök + 1 alt grup = 2 seviye: alt grubun içinde "+ Grup" yok
    const groups = document.querySelectorAll('.ruleGroup .ruleGroup');
    expect(groups).toHaveLength(1);
    expect(within(groups[0] as HTMLElement).queryByRole('button', { name: '+ Grup' })).not.toBeInTheDocument();
  });

  it('"Temizle" tüm kuralları siler ve boş ağaçla uygular', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    render(
      <VKFilterBuilder
        fields={fields}
        onApply={onApply}
        defaultValue={{ combinator: 'and', rules: [{ field: 'name', operator: 'contains', value: 'a' }] }}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Temizle' }));
    expect(lastCall(onApply)).toEqual({ combinator: 'and', rules: [] });
    expect(controls('Alan')).toHaveLength(0);
  });

  it('kontrollü kullanım: yazarken odak kaybolmaz, ağaç dışarıdan değişince builder güncellenir', async () => {
    const user = userEvent.setup();
    let setFromOutside: (tree: FilterGroup) => void = () => {};
    const Controlled = () => {
      const [tree, setTree] = useState<FilterGroup>({
        combinator: 'and',
        rules: [{ field: 'name', operator: 'contains', value: '' }],
      });
      setFromOutside = setTree;
      return <VKFilterBuilder fields={fields} value={tree} onChange={setTree} />;
    };
    render(<Controlled />);

    const input = controls('Değer')[0];
    await user.type(input, 'kalem');
    expect(input).toHaveFocus();
    expect(input).toHaveValue('kalem');

    act(() => setFromOutside({ combinator: 'or', rules: [{ field: 'price', operator: '<', value: 5 }] }));
    expect(controls('Alan')[0]).toHaveTextContent('Fiyat');
    expect(controls('Bağlaç')[0]).toHaveTextContent('VEYA');
    expect(controls('Değer')[0]).toHaveValue(5);
  });
});
