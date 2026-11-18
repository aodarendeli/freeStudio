/**
 * VKFilterBuilder: react-querybuilder + MUI v6 tabanlı genel filtre oluşturucu.
 * VE / VEYA grupları, iç içe gruplar, DEĞİL, kural / grup kopyalama. Çıktı sade bir filtre ağacıdır (bkz. README.md).
 *
 * - operators.ts     operatör etiketleri, veri tipine göre varsayılan operatörler, alan dönüşümü
 * - tree.ts          ağaç yardımcıları (RQB -> sade ağaç, yarım kuralları ayıklama)
 * - translations.ts  Türkçe metinler
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ThemeProvider, useTheme, type Theme } from '@mui/material/styles';
import { QueryBuilderMaterial } from '@react-querybuilder/material';
import { prepareRuleGroup, QueryBuilder, type RuleGroupType } from 'react-querybuilder';
import 'react-querybuilder/dist/query-builder.css';
import { toQueryBuilderField } from './operators';
import { cleanFilterTree, countRules, createEmptyFilter, fromQueryBuilder } from './tree';
import { COMBINATORS, trTranslations } from './translations';
import type { FilterGroup, VKFilterBuilderProps } from './VKFilterBuilder.types';

const toQuery = (tree: FilterGroup) => prepareRuleGroup(tree as unknown as RuleGroupType);

const isSameTree = (a: FilterGroup | undefined, b: FilterGroup | undefined) => JSON.stringify(a) === JSON.stringify(b);

/** Builder içindeki MUI alanları küçük boyutta; dış temaya dokunulmaz (tema yoksa MUI varsayılanı) */
const toCompactTheme = (outer: Theme): Theme => ({
  ...outer,
  components: {
    ...outer.components,
    MuiFormControl: { ...outer.components?.MuiFormControl, defaultProps: { size: 'small' } },
    MuiTextField: { ...outer.components?.MuiTextField, defaultProps: { size: 'small' } },
    MuiButton: { ...outer.components?.MuiButton, defaultProps: { size: 'small' } },
  },
});

export const VKFilterBuilder = ({
  fields,
  value,
  defaultValue,
  onChange,
  onApply,
  maxDepth = 3,
  showNotToggle = true,
  showCloneButtons = true,
  disabled = false,
  applyText = 'Uygula',
  clearText = 'Temizle',
}: VKFilterBuilderProps) => {
  const [query, setQuery] = useState<RuleGroupType>(() => toQuery(value ?? defaultValue ?? createEmptyFilter()));
  const [tree, setTree] = useState<FilterGroup>(() => fromQueryBuilder(query));
  // Son yayınlanan ağaç: kontrollü kullanımda aynı ağaç geri gelince builder yeniden kurulmaz (odak kaybolmaz)
  const lastTreeRef = useRef(tree);

  useEffect(() => {
    if (!value || isSameTree(value, lastTreeRef.current)) return;
    lastTreeRef.current = value;
    setQuery(toQuery(value));
    setTree(value);
  }, [value]);

  const outerTheme = useTheme();
  const compactTheme = useMemo(() => toCompactTheme(outerTheme), [outerTheme]);
  const queryBuilderFields = useMemo(() => fields.map(toQueryBuilderField), [fields]);

  const publish = (nextQuery: RuleGroupType) => {
    const nextTree = fromQueryBuilder(nextQuery);
    lastTreeRef.current = nextTree;
    setQuery(nextQuery);
    setTree(nextTree);
    onChange?.(nextTree);
  };

  const ruleCount = countRules(tree);
  const completeRuleCount = useMemo(() => countRules(cleanFilterTree(tree, fields)), [tree, fields]);

  return (
    <ThemeProvider theme={compactTheme}>
      <Box
        sx={(theme) => ({
          // RQB'nin yerleşim CSS'i korunur, renkler temadan gelir
          '& .ruleGroup': {
            backgroundColor: theme.palette.action.hover,
            borderColor: theme.palette.divider,
            borderRadius: `${theme.shape.borderRadius}px`,
            padding: theme.spacing(1.5),
            gap: theme.spacing(1),
          },
          '& .ruleGroup .ruleGroup': { backgroundColor: theme.palette.background.paper },
          '& .ruleGroup-header, & .rule': { alignItems: 'center', gap: theme.spacing(1), flexWrap: 'wrap' },
          '& .rule .MuiFormControl-root, & .rule .MuiTextField-root': { minWidth: 160 },
          '& .ruleGroup-combinators': { minWidth: 100 },
        })}
      >
        <QueryBuilderMaterial>
          <QueryBuilder
            fields={queryBuilderFields}
            query={query}
            onQueryChange={publish}
            combinators={COMBINATORS}
            translations={trTranslations}
            showNotToggle={showNotToggle}
            showCloneButtons={showCloneButtons}
            // RQB'nin maxLevels'ı kökün altındaki seviyeleri sayar; maxDepth kökü de sayar
            maxLevels={Math.max(maxDepth - 1, 1)}
            {...(maxDepth <= 1 && { controlElements: { addGroupAction: null } })}
            addRuleToNewGroups
            listsAsArrays
            parseNumbers="strict-limited"
            disabled={disabled}
            controlClassnames={{ queryBuilder: 'queryBuilder-branches' }}
          />
        </QueryBuilderMaterial>

        {onApply && (
          <Stack direction="row" sx={{ mt: 1.5, alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {ruleCount === 0
                ? 'Kural yok'
                : completeRuleCount === ruleCount
                  ? `${ruleCount} kural`
                  : `${ruleCount} kural, ${ruleCount - completeRuleCount} tanesi eksik (uygulanmaz)`}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                variant="text"
                disabled={disabled || ruleCount === 0}
                onClick={() => {
                  publish(toQuery(createEmptyFilter()));
                  onApply(createEmptyFilter());
                }}
              >
                {clearText}
              </Button>
              <Button variant="contained" disabled={disabled} onClick={() => onApply(cleanFilterTree(tree, fields))}>
                {applyText}
              </Button>
            </Stack>
          </Stack>
        )}
      </Box>
    </ThemeProvider>
  );
};
