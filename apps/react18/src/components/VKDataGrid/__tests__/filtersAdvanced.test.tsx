import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { categories, getDataRows, products, ServerHarness, SimpleHarness } from './fixtures';

const lastCall = (fn: ReturnType<typeof vi.fn>) => fn.mock.calls.at(-1)?.[0];
const thead = () => within(document.querySelector('thead')!);

/** MUI Select: aria-label gizli input'ta, açılır liste combobox'ta */
const openSelect = (label: string) => {
  const input = screen.getByLabelText(label);
  fireEvent.mouseDown(input.parentElement!.querySelector('[role="combobox"]')!);
};

describe('Filtre satırı: seçim kutuları', () => {
  it('lookup sütununda liste çıkar, seçilen kaydın id değeri = ile gider', async () => {
    const user = userEvent.setup();
    const onRequest = vi.fn();
    render(<ServerHarness onRequest={onRequest} />);
    openSelect('Kategori filtresi');
    await user.click(await screen.findByRole('option', { name: 'Oyuncak' }));
    expect(lastCall(onRequest).filter).toEqual([
      expect.objectContaining({ dataField: 'categoryId', filterOperator: 'contains', filterValue: 'c2' }),
    ]);
  });

  it('basit modda lookup filtresi id ile eşleşir; "(Tümü)" filtreyi kaldırır', async () => {
    const user = userEvent.setup();
    render(<SimpleHarness />);
    openSelect('Kategori filtresi');
    await user.click(await screen.findByRole('option', { name: 'Oyuncak' }));
    expect(getDataRows().map((tr) => tr.querySelector('td')?.textContent)).toEqual(['Ürün 02', 'Ürün 04']);
    openSelect('Kategori filtresi');
    await user.click(await screen.findByRole('option', { name: '(Tümü)' }));
    expect(getDataRows()).toHaveLength(5);
  });

  it('boolean sütunda Evet / Hayır listesi çıkar, = true gider; showAllText metni kullanılır', async () => {
    const user = userEvent.setup();
    const onRequest = vi.fn();
    render(
      <ServerHarness
        onRequest={onRequest}
        filterRow={{ visible: true, showAllText: 'Hepsi' }}
        columns={[{ dataField: 'active', caption: 'Aktif', dataType: 'boolean' }]}
      />
    );
    openSelect('Aktif filtresi');
    const listbox = await screen.findByRole('listbox');
    expect(within(listbox).getByRole('option', { name: 'Hepsi' })).toBeInTheDocument();
    await user.click(within(listbox).getAllByRole('option')[1]);
    expect(lastCall(onRequest).filter).toEqual([
      expect.objectContaining({ dataField: 'active', dataType: 'boolean', filterOperator: '=', filterValue: true }),
    ]);
  });
});

describe('Filtre satırı: tarih', () => {
  const originalMatchMedia = window.matchMedia;
  beforeEach(() => {
    // Masaüstü tarih seçici (popover) kullanılsın
    window.matchMedia = ((query: string) => ({
      ...originalMatchMedia(query),
      matches: query.includes('pointer: fine'),
    })) as typeof window.matchMedia;
  });
  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('takvimden gün seçilince o günün başlangıcı Date olarak gider', async () => {
    const user = userEvent.setup();
    const onRequest = vi.fn();
    render(
      <ServerHarness
        onRequest={onRequest}
        columns={[{ dataField: 'createdAt', caption: 'Tarih', dataType: 'date' }]}
        dataSource={[{ id: 1, createdAt: '2024-03-05T10:00:00' }]}
        totalCount={1}
      />
    );
    await user.click(screen.getByRole('button', { name: /choose date|tarih seç/i }));
    const calendar = await screen.findByRole('grid');
    await user.click(within(calendar).getByRole('gridcell', { name: '15' }));

    await waitFor(() => expect(onRequest).toHaveBeenCalled());
    const [filter] = lastCall(onRequest).filter;
    expect(filter).toMatchObject({ dataField: 'createdAt', dataType: 'date', filterOperator: 'contains' });
    expect(filter.filterValue).toBeInstanceOf(Date);
    expect((filter.filterValue as Date).getDate()).toBe(15);
    expect((filter.filterValue as Date).getHours()).toBe(0);
  });
});

describe('Filtre operatörü menüsü', () => {
  const priceColumn = [{ dataField: 'price', caption: 'Fiyat', dataType: 'number', filterOperations: ['=', '>', '<'] }];

  it('sadece filterOperations içindekiler listelenir', async () => {
    const user = userEvent.setup();
    render(<ServerHarness columns={priceColumn} />);
    await user.click(screen.getByRole('button', { name: 'Filtre operatörü' }));
    const items = (await screen.findAllByRole('menuitem')).map((item) => item.textContent);
    expect(items).toEqual(['Eşittir', 'Büyüktür', 'Küçüktür', 'Sıfırla']);
  });

  it('filterOperations verilmeyen sütunda operatör menüsü yoktur', () => {
    render(<ServerHarness />);
    expect(screen.queryByRole('button', { name: 'Filtre operatörü' })).not.toBeInTheDocument();
  });

  it('resetOperationText: değer varken sıfırlamak filtreyi kaldırıp istek atar', async () => {
    const user = userEvent.setup();
    const onRequest = vi.fn();
    render(<ServerHarness onRequest={onRequest} columns={priceColumn} resetOperationText="Temizle" />);
    await user.click(screen.getByRole('button', { name: 'Filtre operatörü' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Büyüktür' }));
    await user.type(screen.getByRole('textbox', { name: 'Fiyat filtresi' }), '50');
    await waitFor(() => expect(lastCall(onRequest)?.filter).toHaveLength(1));

    await user.click(screen.getByRole('button', { name: 'Filtre operatörü' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Temizle' }));
    expect(lastCall(onRequest).filter).toEqual([]);
    expect(screen.getByRole('textbox', { name: 'Fiyat filtresi' })).toHaveValue('');
  });
});

describe('Header filter', () => {
// HEADER FILTER: özellik yorum satırında olduğu için atlanıyor; açılınca .skip kaldırılmalı
  it.skip('menüde arama yapılır; İptal uygulamaz, Tamam uygular; basit modda yerel filtreler', async () => {
    const user = userEvent.setup();
    render(<SimpleHarness headerFilter />);
    await user.click(screen.getByRole('button', { name: 'Ad değer filtresi' }));
    const popup = await screen.findByRole('presentation');
    await user.type(within(popup).getByPlaceholderText('Ara...'), '03');
    expect(within(popup).getAllByRole('checkbox')).toHaveLength(1);
    await user.click(within(popup).getByRole('checkbox', { name: 'Ürün 03' }));
    await user.click(within(popup).getByRole('button', { name: 'İptal' }));
    expect(getDataRows()).toHaveLength(5);

    await user.click(screen.getByRole('button', { name: 'Ad değer filtresi' }));
    const popup2 = await screen.findByRole('presentation');
    await user.click(within(popup2).getByRole('checkbox', { name: 'Ürün 03' }));
    await user.click(within(popup2).getByRole('checkbox', { name: 'Ürün 05' }));
    await user.click(within(popup2).getByRole('button', { name: 'Tamam' }));
    expect(getDataRows().map((tr) => tr.querySelector('td')?.textContent)).toEqual(['Ürün 03', 'Ürün 05']);
  });

// HEADER FILTER: özellik yorum satırında olduğu için atlanıyor; açılınca .skip kaldırılmalı
  it.skip('headerFilterData: sütun bazında ve global liste kullanılır', async () => {
    const user = userEvent.setup();
    render(
      <ServerHarness
        headerFilter
        headerFilterData={[{ value: 'g', text: 'Global değer' }]}
        columns={[
          { dataField: 'name', caption: 'Ad', headerFilterData: [{ value: 'x', text: 'Özel değer' }] },
          { dataField: 'price', caption: 'Fiyat', dataType: 'number' },
        ]}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Ad değer filtresi' }));
    expect(await screen.findByRole('checkbox', { name: 'Özel değer' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'İptal' }));
    await waitFor(() => expect(screen.queryByRole('presentation')).not.toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Fiyat değer filtresi' }));
    expect(await screen.findByRole('checkbox', { name: 'Global değer' })).toBeInTheDocument();
  });

// HEADER FILTER: özellik yorum satırında olduğu için atlanıyor; açılınca .skip kaldırılmalı
  it.skip('arama + filtre + header filter birlikte tek payload içinde gider', async () => {
    const user = userEvent.setup();
    const onRequest = vi.fn();
    render(<ServerHarness headerFilter onRequest={onRequest} />);
    await user.type(screen.getByRole('textbox', { name: 'Ara' }), 'ür');
    await user.type(screen.getByRole('textbox', { name: 'Fiyat filtresi' }), '40');
    await waitFor(() => expect(lastCall(onRequest).filter).toHaveLength(1));
    await user.click(screen.getByRole('button', { name: 'Kategori değer filtresi' }));
    await user.click(await screen.findByRole('checkbox', { name: 'Oyuncak' }));
    await user.click(screen.getByRole('button', { name: 'Tamam' }));
    expect(lastCall(onRequest)).toMatchObject({
      sort: null,
      searchText: 'ür',
      pageIndex: 0,
      filter: [
        expect.objectContaining({ dataField: 'price', filterValue: 40 }),
        expect.objectContaining({ dataField: 'categoryId', filterValues: ['c2'] }),
      ],
    });
  });
});

describe('Hata düzeltmesi: başlıktaki menüler sıralamayı tetiklememeli', () => {
// HEADER FILTER: özellik yorum satırında olduğu için atlanıyor; açılınca .skip kaldırılmalı
  it.skip('header filter açıp Tamam / İptal / checkbox tıklamak sıralama isteği atmaz', async () => {
    const user = userEvent.setup();
    const onRequest = vi.fn();
    render(<ServerHarness headerFilter onRequest={onRequest} />);
    await user.click(screen.getByRole('button', { name: 'Kategori değer filtresi' }));
    await user.click(await screen.findByRole('checkbox', { name: 'Oyuncak' }));
    await user.click(screen.getByRole('button', { name: 'İptal' }));
    expect(onRequest).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Kategori değer filtresi' }));
    await user.click(await screen.findByRole('checkbox', { name: 'Oyuncak' }));
    await user.click(screen.getByRole('button', { name: 'Tamam' }));
    expect(onRequest).toHaveBeenCalledTimes(1);
    expect(lastCall(onRequest).sort).toBeNull();
    expect(thead().getByText('Kategori').closest('th')).toHaveAttribute('aria-sort', 'none');
  });

  it('sağ tık menüsünden "Azalan" seçmek tek istek atar ve azalan kalır', async () => {
    const user = userEvent.setup();
    const onRequest = vi.fn();
    render(<ServerHarness onRequest={onRequest} />);
    fireEvent.contextMenu(thead().getByText('Fiyat'));
    await user.click(await screen.findByRole('menuitem', { name: 'Azalan Sırala' }));
    expect(onRequest).toHaveBeenCalledTimes(1);
    expect(thead().getByText('Fiyat').closest('th')).toHaveAttribute('aria-sort', 'descending');
  });
});

describe('Sıralama: bağlam menüsü ve çoklu sıralama', () => {
  it('sağ tık menüsü: artan / azalan / temizle; özel metinler kullanılır', async () => {
    const user = userEvent.setup();
    const onRequest = vi.fn();
    render(
      <ServerHarness
        onRequest={onRequest}
        sorting={{ mode: 'single', ascendingText: 'A-Z', descendingText: 'Z-A', clearText: 'Kaldır' }}
      />
    );
    fireEvent.contextMenu(thead().getByText('Ad'));
    expect(await screen.findByRole('menuitem', { name: 'Kaldır' })).toHaveAttribute('aria-disabled', 'true');
    await user.click(screen.getByRole('menuitem', { name: 'Z-A' }));
    expect(lastCall(onRequest).sort).toMatchObject({ dataField: 'name', sortOrder: 'desc' });

    fireEvent.contextMenu(thead().getByText('Ad'));
    await user.click(await screen.findByRole('menuitem', { name: 'Kaldır' }));
    expect(lastCall(onRequest).sort).toBeNull();
  });

  it('sorting.mode multiple: Shift+tıklama ikinci sıralama ekler (basit modda yerel)', async () => {
    const user = userEvent.setup();
    render(<SimpleHarness sorting={{ mode: 'multiple' }} />);
    await user.click(thead().getByText('Kategori'));
    await user.keyboard('{Shift>}');
    await user.click(thead().getByText('Fiyat'));
    await user.click(thead().getByText('Fiyat'));
    await user.keyboard('{/Shift}');
    expect(getDataRows().map((tr) => tr.querySelector('td')?.textContent)).toEqual([
      'Ürün 05',
      'Ürün 03',
      'Ürün 01',
      'Ürün 04',
      'Ürün 02',
    ]);
    expect(thead().getByText('Kategori').closest('th')).toHaveAttribute('aria-sort', 'ascending');
    expect(thead().getByText('Fiyat').closest('th')).toHaveAttribute('aria-sort', 'descending');
  });

  it('single modda Shift+tıklama önceki sıralamanın yerini alır', async () => {
    const user = userEvent.setup();
    render(<SimpleHarness />);
    await user.click(thead().getByText('Kategori'));
    await user.keyboard('{Shift>}');
    await user.click(thead().getByText('Fiyat'));
    await user.keyboard('{/Shift}');
    expect(thead().getByText('Kategori').closest('th')).toHaveAttribute('aria-sort', 'none');
  });
});

// Kullanılmayan import uyarısı olmasın diye fixture verileri burada da doğrulanır
it('fixture: 12 ürün, 2 kategori', () => {
  expect(products).toHaveLength(12);
  expect(categories).toHaveLength(2);
});

describe('Header filter kapalıyken', () => {
  it('headerFilter verilse de başlıkta değer filtresi ikonu çıkmaz', () => {
    render(<ServerHarness headerFilter />);
    expect(screen.queryByRole('button', { name: /değer filtresi/ })).not.toBeInTheDocument();
  });

  it('applyFilters ile gelen filterValues hâlâ payload içinde gider', async () => {
    const { createRef } = await import('react');
    const { act } = await import('@testing-library/react');
    const ref = createRef<any>();
    const onRequest = vi.fn();
    render(<ServerHarness ref={ref} onRequest={onRequest} />);
    const filters = [{ dataField: 'categoryId', dataType: 'string', filterValues: ['c2'] }];
    act(() => ref.current.applyFilters(filters));
    expect(lastCall(onRequest).filter).toEqual(filters);
  });
});
