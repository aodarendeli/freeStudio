import { act, fireEvent, render, renderHook, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockTableLayout } from '../../../test/layout';
import { useGridRowDragging } from '../hooks/useGridRowDragging';
import { VKDataGrid } from '../VKDataGrid';
import { columns, getDataRows, page, ServerHarness } from './fixtures';

let restoreLayout: () => void;
beforeEach(() => {
  restoreLayout = mockTableLayout();
});
afterEach(() => restoreLayout());

const headerTexts = () =>
  Array.from(document.querySelectorAll('thead tr:first-child th')).map((th) => th.textContent?.trim());

/** Pointer ile sürükle: başla, birkaç adımda taşı, bırak */
const drag = async (element: Element, from: { x: number; y: number }, to: { x: number; y: number }) => {
  await act(async () => {
    fireEvent.pointerDown(element, { clientX: from.x, clientY: from.y, button: 0, isPrimary: true });
  });
  for (let step = 1; step <= 5; step += 1) {
    await act(async () => {
      fireEvent.pointerMove(document, {
        clientX: from.x + ((to.x - from.x) * step) / 5,
        clientY: from.y + ((to.y - from.y) * step) / 5,
      });
    });
  }
  await act(async () => {
    fireEvent.pointerUp(document, { clientX: to.x, clientY: to.y });
  });
};

describe('Sütun sürükleme (allowColumnReordering)', () => {
  it('başlık sürüklenince sütun sırası değişir ve sıralama tetiklenmez', async () => {
    const onRequest = vi.fn();
    render(<ServerHarness onRequest={onRequest} />);
    expect(headerTexts()).toEqual(['Ad', 'Fiyat', 'Kategori']);

    const th = within(document.querySelector('thead')!).getByText('Ad').closest('th')!;
    await drag(th, { x: 50, y: 20 }, { x: 250, y: 20 });
    await act(async () => {
      fireEvent.click(th);
    });

    expect(headerTexts()).toEqual(['Fiyat', 'Kategori', 'Ad']);
    expect(onRequest).not.toHaveBeenCalled();
    // Hücreler de yeni sırayla çizilir
    expect(getDataRows()[0].querySelectorAll('td')[2].textContent).toBe('Ürün 01');
  });

  it('allowColumnReordering: false ise sürükleme sırayı değiştirmez', async () => {
    render(<ServerHarness allowColumnReordering={false} />);
    const th = within(document.querySelector('thead')!).getByText('Ad').closest('th')!;
    await drag(th, { x: 50, y: 20 }, { x: 250, y: 20 });
    expect(headerTexts()).toEqual(['Ad', 'Fiyat', 'Kategori']);
  });
});

describe('Sütun genişliği (allowColumnResizing)', () => {
  const colWidth = (index: number) => (document.querySelectorAll('colgroup col')[index] as HTMLElement).style.width;

  it('tutamaç sürüklenince sütun ölçülen genişlikten itibaren genişler, istek atmaz', async () => {
    const onRequest = vi.fn();
    render(<ServerHarness onRequest={onRequest} columns={[{ dataField: 'name', caption: 'Ad', width: 150 }, ...columns.slice(1)]} />);
    expect(colWidth(0)).toBe('150px');
    const handle = screen.getByRole('separator', { name: 'Ad genişliğini değiştir' });
    await act(async () => {
      fireEvent.pointerDown(handle, { clientX: 150 });
      fireEvent.pointerMove(window, { clientX: 210 });
      fireEvent.pointerUp(window, { clientX: 210 });
    });
    // Sahte yerleşimde başlık 100px ölçülür: 100 + 60
    expect(colWidth(0)).toBe('160px');
    expect(onRequest).not.toHaveBeenCalled();
  });

  it('en küçük genişlik 40px', async () => {
    render(<ServerHarness columns={[{ dataField: 'name', caption: 'Ad', width: 150 }]} />);
    const handle = screen.getByRole('separator', { name: 'Ad genişliğini değiştir' });
    await act(async () => {
      fireEvent.pointerDown(handle, { clientX: 150 });
      fireEvent.pointerMove(window, { clientX: 0 });
      fireEvent.pointerUp(window, { clientX: 0 });
    });
    expect(colWidth(0)).toBe('40px');
  });

  it('allowColumnResizing: false ise tutamaç yoktur; columnWidth varsayılan genişliği verir', () => {
    render(<ServerHarness allowColumnResizing={false} columnWidth={120} />);
    expect(screen.queryByRole('separator', { name: /genişliğini değiştir/ })).not.toBeInTheDocument();
    expect(colWidth(0)).toBe('120px');
  });
});

describe('Satır sürükleme (rowDragging)', () => {
  const rows = () => page(0, 4).map((row) => ({ ...row }));
  const names = () => getDataRows().map((tr) => tr.textContent);

  it('satır sürüklenince yeni sıra gösterilir ve onReorder(from, to) çağrılır', async () => {
    const onReorder = vi.fn();
    render(
      <VKDataGrid
        dataSource={rows()}
        totalCount={4}
        rowKeyExpr="id"
        columns={[{ dataField: 'name', caption: 'Ad' }]}
        rowDragging={{ allowReordering: true, onReorder }}
      />
    );
    const handle = screen.getAllByLabelText('Satırı sürükle')[0];
    await drag(handle, { x: 10, y: 120 }, { x: 10, y: 220 });
    expect(onReorder).toHaveBeenCalledWith(0, 2);
    expect(names()).toEqual(['Ürün 02', 'Ürün 03', 'Ürün 01', 'Ürün 04']);
  });

  it('isDropAllowed false dönerse satır taşınmaz', async () => {
    const onReorder = vi.fn();
    const isDropAllowed = vi.fn(() => false);
    render(
      <VKDataGrid
        dataSource={rows()}
        totalCount={4}
        rowKeyExpr="id"
        columns={[{ dataField: 'name', caption: 'Ad' }]}
        rowDragging={{ allowReordering: true, onReorder, isDropAllowed }}
      />
    );
    await drag(screen.getAllByLabelText('Satırı sürükle')[0], { x: 10, y: 120 }, { x: 10, y: 220 });
    expect(isDropAllowed).toHaveBeenCalledWith(0, 2, expect.objectContaining({ id: 1 }), expect.any(Array));
    expect(onReorder).not.toHaveBeenCalled();
    expect(names()[0]).toBe('Ürün 01');
  });

  it('varsayılan kural: isNonDraggable satırın üzerine bırakılamaz (hook)', () => {
    const onReorder = vi.fn();
    const setInternalData = vi.fn();
    const visibleRows = rows().map((data, i) => ({ id: String(i), data: { ...data, isNonDraggable: i === 2 } }));
    const { result } = renderHook(() =>
      useGridRowDragging({ rowDragging: { allowReordering: true, onReorder }, rowKeyExpr: 'id', visibleRows, setInternalData })
    );
    act(() => result.current.onDragEnd({ active: { id: '0' }, over: { id: '2' } } as any));
    expect(onReorder).not.toHaveBeenCalled();
    expect(setInternalData).not.toHaveBeenCalled();

    act(() => result.current.onDragEnd({ active: { id: '0' }, over: { id: '3' } } as any));
    expect(onReorder).toHaveBeenCalledWith(0, 3);
    expect(result.current.isRowDraggable(visibleRows[2].data)).toBe(false);
  });

  it('isRowDraggable false dönen satır sürüklenemez', async () => {
    const onReorder = vi.fn();
    render(
      <VKDataGrid
        dataSource={rows()}
        totalCount={4}
        rowKeyExpr="id"
        columns={[{ dataField: 'name', caption: 'Ad' }]}
        rowDragging={{ allowReordering: true, onReorder, isRowDraggable: (item) => item.id !== 1 }}
      />
    );
    await drag(screen.getAllByLabelText('Satırı sürükle')[0], { x: 10, y: 120 }, { x: 10, y: 220 });
    expect(onReorder).not.toHaveBeenCalled();
  });
});
