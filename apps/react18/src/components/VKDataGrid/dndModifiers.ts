import type { Modifier } from '@dnd-kit/core';

export const restrictToHorizontalAxis: Modifier = ({ transform }) => ({ ...transform, y: 0 });

export const restrictToVerticalAxis: Modifier = ({ transform }) => ({ ...transform, x: 0 });

/**
 * dnd-kit ekran okuyucu metinlerini (div) `<table>` içine koyar, bu geçersiz DOM'dur.
 * Metinler body'ye taşınır.
 */
export const getDndAccessibility = () =>
  typeof document === 'undefined' ? undefined : { container: document.body };
