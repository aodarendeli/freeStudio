import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { VKDataGrid } from '../VKDataGrid';
import { categories, getDataRows, page, products } from './fixtures';

const groupedColumns = [
  { dataField: 'name', caption: 'Ad' },
  { dataField: 'price', caption: 'Fiyat', dataType: 'number' },
  { dataField: 'categoryId', caption: 'Kategori', groupIndex: 0, lookup: { dataSource: categories, valueExpr: 'id', displayExpr: 'name' } },
];

describe('Gruplama', () => {
  it('groupIndex verilen sütuna göre gruplar, grup başlığında lookup metni yazar', () => {
    render(<VKDataGrid dataSource={page(0, 6)} totalCount={6} rowKeyExpr="id" columns={groupedColumns} grouping={{ autoExpandAll: true }} />);
    expect(screen.getByText('Kategori: Kırtasiye')).toBeInTheDocument();
    expect(screen.getByText('Kategori: Oyuncak')).toBeInTheDocument();
    expect(getDataRows()).toHaveLength(6);
  });

  it('grup daraltılıp genişletilebilir', async () => {
    const user = userEvent.setup();
    render(
      <VKDataGrid dataSource={page(0, 6)} totalCount={6} rowKeyExpr="id" columns={groupedColumns} grouping={{ allowCollapsing: true, autoExpandAll: true }} />
    );
    await user.click(screen.getAllByRole('button', { name: 'Grubu daralt' })[0]);
    expect(getDataRows()).toHaveLength(3);
    await user.click(screen.getByRole('button', { name: 'Grubu genişlet' }));
    expect(getDataRows()).toHaveLength(6);
  });

  it('allowCollapsing: false ise daraltma butonu yoktur', () => {
    render(<VKDataGrid dataSource={page(0, 4)} totalCount={4} rowKeyExpr="id" columns={groupedColumns} grouping={{ allowCollapsing: false, autoExpandAll: true }} />);
    expect(screen.queryByRole('button', { name: 'Grubu daralt' })).not.toBeInTheDocument();
  });
});

describe('Özet (summary)', () => {
  it('sütunun sayfadaki toplamını "{text}: {değer}" olarak yazar', () => {
    render(
      <VKDataGrid
        dataSource={page(0, 3)}
        totalCount={3}
        rowKeyExpr="id"
        columns={[{ dataField: 'name', caption: 'Ad' }, { dataField: 'price', caption: 'Fiyat', dataType: 'number' }]}
        summary={{ options: [{ column: 'price', text: 'Toplam' }], count: [] }}
      />
    );
    expect(screen.getByText('Toplam: 60')).toBeInTheDocument();
  });

  it('summary.count verilirse sunucudan gelen değeri yazar', () => {
    render(
      <VKDataGrid
        dataSource={page(0, 3)}
        totalCount={3}
        rowKeyExpr="id"
        columns={[{ dataField: 'price', caption: 'Fiyat', dataType: 'number' }]}
        summary={{ options: [{ column: 'price', text: 'Genel toplam' }], count: [780] }}
      />
    );
    expect(screen.getByText('Genel toplam: 780')).toBeInTheDocument();
  });
});

describe('Satır sürükleme', () => {
  it('sürükleme ikonları çizilir; isNonDraggable satırın tutamacı pasiftir', () => {
    const rows = page(0, 4).map((row, i) => ({ ...row, isNonDraggable: i === 0 }));
    render(
      <VKDataGrid
        dataSource={rows}
        totalCount={4}
        rowKeyExpr="id"
        columns={[{ dataField: 'name', caption: 'Ad' }]}
        rowDragging={{ allowReordering: true }}
      />
    );
    const handles = screen.getAllByLabelText('Satırı sürükle');
    expect(handles).toHaveLength(4);
    expect(handles[0]).toHaveStyle({ cursor: 'not-allowed' });
    expect(handles[1]).toHaveStyle({ cursor: 'grab' });
  });

  it('showDragIcons: false ise ikon sütunu yoktur', () => {
    render(
      <VKDataGrid
        dataSource={products.slice(0, 3)}
        totalCount={3}
        rowKeyExpr="id"
        columns={[{ dataField: 'name', caption: 'Ad' }]}
        rowDragging={{ allowReordering: true, showDragIcons: false }}
      />
    );
    expect(screen.queryByLabelText('Satırı sürükle')).not.toBeInTheDocument();
  });
});
