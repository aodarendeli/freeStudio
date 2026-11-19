/**
 * jsdom yerleşim hesaplamaz. Sürükleme testleri için başlık hücrelerine (yan yana)
 * ve satırlara (alt alta) sahte konum verir.
 */
export const mockTableLayout = () => {
  const original = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function (this: Element) {
    const rect = (x: number, y: number, width: number, height: number) =>
      ({ x, y, left: x, top: y, width, height, right: x + width, bottom: y + height, toJSON: () => ({}) }) as DOMRect;
    if (this instanceof HTMLTableCellElement && this.closest('thead')) {
      return rect(this.cellIndex * 100, 0, 100, 40);
    }
    if (this instanceof HTMLTableRowElement && this.closest('tbody')) {
      return rect(0, 100 + this.sectionRowIndex * 40, 800, 40);
    }
    return original.call(this);
  };
  return () => {
    Element.prototype.getBoundingClientRect = original;
  };
};
