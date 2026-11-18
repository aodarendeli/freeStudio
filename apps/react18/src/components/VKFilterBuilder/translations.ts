/**
 * react-querybuilder Türkçe metinleri. Material paketinin ikonlu etiketleri (sil, kopyala) korunur, sadece
 * ipuçları (title) ve metin etiketleri çevrilir.
 */
import { materialTranslations } from '@react-querybuilder/material';
import type { Translations } from 'react-querybuilder';

const PLACEHOLDER = { placeholderName: '~', placeholderLabel: 'Seçiniz', placeholderGroupLabel: 'Seçiniz' };

export const trTranslations: Partial<Translations> = {
  fields: { title: 'Alan', ...PLACEHOLDER },
  operators: { title: 'Operatör', ...PLACEHOLDER },
  values: { title: 'Değerler', ...PLACEHOLDER },
  value: { title: 'Değer' },
  combinators: { title: 'Bağlaç' },
  addRule: { label: '+ Kural', title: 'Kural ekle' },
  addGroup: { label: '+ Grup', title: 'Grup ekle' },
  removeRule: { ...materialTranslations.removeRule, title: 'Kuralı sil' },
  removeGroup: { ...materialTranslations.removeGroup, title: 'Grubu sil' },
  cloneRule: { ...materialTranslations.cloneRule, title: 'Kuralı kopyala' },
  cloneRuleGroup: { ...materialTranslations.cloneRuleGroup, title: 'Grubu kopyala' },
  notToggle: { label: 'DEĞİL', title: 'Grubun sonucunu tersine çevir' },
};

export const COMBINATORS = [
  { name: 'and', value: 'and', label: 'VE' },
  { name: 'or', value: 'or', label: 'VEYA' },
];
