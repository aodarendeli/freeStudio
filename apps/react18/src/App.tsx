import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CssBaseline from '@mui/material/CssBaseline';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { trTR } from '@mui/material/locale';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { VKDataGrid } from './components/VKDataGrid/VKDataGrid';
import type { FiltersChangesTypes, VKDataGridRef } from './components/VKDataGrid/VKDataGrid.types';
import {
  CITIES,
  createEmployee,
  deleteEmployee,
  fetchEmployees,
  getAllEmployees,
  updateEmployee,
  type Employee,
} from './demo/mockServer';

const theme = createTheme({}, trTR);

const baseColumns = [
  { dataField: 'id', caption: 'No', width: 70, dataType: 'number', fixed: true, allowEditing: false },
  { dataField: 'name', caption: 'Ad Soyad', width: 180, filterOperations: ['contains', 'startswith', 'endswith', '='] },
  { dataField: 'department', caption: 'Departman', width: 140 },
  {
    dataField: 'cityId',
    caption: 'Şehir',
    width: 130,
    lookup: { dataSource: CITIES, valueExpr: 'id', displayExpr: 'name' },
  },
  {
    dataField: 'salary',
    caption: 'Maaş',
    width: 140,
    dataType: 'number',
    format: { type: 'currency', precision: 2 },
    filterOperations: ['=', '<>', '<', '>', '<=', '>=', 'between'],
  },
  {
    dataField: 'birthDate',
    caption: 'Doğum Tarihi',
    width: 170,
    dataType: 'date',
    format: 'dd.MM.yyyy',
    filterOperations: ['=', '<', '>', 'between'],
  },
  { dataField: 'isActive', caption: 'Aktif', width: 90, dataType: 'boolean' },
];

const INITIAL_OPTIONS: FiltersChangesTypes = { filter: [], searchText: '', sort: null, pageIndex: 0, pageSize: 10 };

/** Server-side mod: onFilterChange ile sayfalama / filtre / sıralama / arama */
const ServerModeDemo = ({ log }: { log: (title: string, payload: unknown) => void }) => {
  const gridRef = useRef<VKDataGridRef>(null);
  const [rows, setRows] = useState<Employee[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [salaryTotal, setSalaryTotal] = useState(0);

  const load = useCallback(
    async (options: FiltersChangesTypes) => {
      log('onFilterChange', options);
      const result = await fetchEmployees(options);
      setRows(result.data);
      setTotalCount(result.totalCount);
      setSalaryTotal(result.salaryTotal);
    },
    [log]
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchEmployees(INITIAL_OPTIONS).then((result) => {
      setRows(result.data);
      setTotalCount(result.totalCount);
      setSalaryTotal(result.salaryTotal);
    });
  }, []);

  const columns = useMemo(() => baseColumns, []);
  const summary = useMemo(
    () => ({ options: [{ column: 'salary', text: 'Toplam' }], count: [salaryTotal] }),
    [salaryTotal]
  );

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
        <Button size="small" variant="outlined" onClick={() => log('getFilters()', gridRef.current?.getFilters())}>
          getFilters()
        </Button>
        <Button
          size="small"
          variant="outlined"
          onClick={() => (gridRef.current?.resetFilters as any)({ triggerOnFilterChange: true })}
        >
          resetFilters({'{'} triggerOnFilterChange: true {'}'})
        </Button>
        <Button
          size="small"
          variant="outlined"
          onClick={() =>
            (gridRef.current?.applyFilters as any)(
              [{ dataField: 'department', dataType: 'string', filterOperator: 'contains', filterValue: 'Yaz' }],
              { dataField: 'salary', dataType: 'number', sortOrder: 'desc' }
            )
          }
        >
          applyFilters(Departman = Yaz, Maaş azalan)
        </Button>
      </Stack>
      <VKDataGrid
        ref={gridRef}
        dataSource={rows}
        totalCount={totalCount}
        columns={columns}
        rowKeyExpr="id"
        onFilterChange={load}
        headerFilter
        isSelected
        isPrintButtonVisible
        handlePrint={() => window.print()}
        isExportAllButtonVisible
        exportDataAllMethod={() => log('exportDataAllMethod', 'Tüm veri sunucudan istenecek')}
        rowSelectionChange={(selected) => log('rowSelectionChange', selected.selectedRowKeys)}
        summary={summary}
        height={520}
        actionMenuRender={(row) => (
          <IconButton size="small" aria-label="İşlemler" onClick={() => log('actionMenu', row)}>
            <MoreVertIcon fontSize="small" />
          </IconButton>
        )}
      />
    </Stack>
  );
};

/** Basit mod: handlePagingChanged + yerel filtre/sıralama, CRUD ve gruplama */
const SimpleModeDemo = ({ log }: { log: (title: string, payload: unknown) => void }) => {
  const [paging, setPaging] = useState({ pageIndex: 0, pageSize: 20 });
  const [version, setVersion] = useState(0);
  const all = useMemo(() => getAllEmployees(), [version]); // eslint-disable-line react-hooks/exhaustive-deps
  const rows = useMemo(
    () => all.slice(paging.pageIndex * paging.pageSize, (paging.pageIndex + 1) * paging.pageSize),
    [all, paging]
  );
  const columns = useMemo(
    () => baseColumns.map((col) => (col.dataField === 'department' ? { ...col, groupIndex: 0 } : col)),
    []
  );
  const refresh = () => setVersion((v) => v + 1);

  return (
    <VKDataGrid
      dataSource={rows}
      totalCount={all.length}
      columns={columns}
      rowKeyExpr="id"
      paging={paging}
      allowedPageSizes={[10, 20, 50]}
      handlePagingChanged={({ size, page }) => {
        log('handlePagingChanged', { size, page });
        setPaging({ pageIndex: page, pageSize: size });
      }}
      multipleSelection={false}
      singleRowRadioSelection
      rowSelectionChange={(selected) => log('rowSelectionChange', selected.selectedRowKeys)}
      grouping={{ allowCollapsing: true, autoExpandAll: true, expandMode: 'rowClick' }}
      isCrud
      onCreate={async (values) => {
        log('onCreate', values);
        await createEmployee(values);
        refresh();
      }}
      onUpdate={async (key, values) => {
        log('onUpdate', { key, values });
        await updateEmployee(key, values);
        refresh();
      }}
      onDelete={async (key) => {
        log('onDelete', key);
        await deleteEmployee(key);
        refresh();
      }}
    />
  );
};

/** Satır sürükleme: isNonDraggable olan satırlar sürüklenemez / üzerine bırakılamaz */
const RowDraggingDemo = ({ log }: { log: (title: string, payload: unknown) => void }) => {
  const rows = useMemo(
    () => getAllEmployees().slice(0, 8).map((row, i) => ({ ...row, isNonDraggable: i === 0 })),
    []
  );
  return (
    <VKDataGrid
      dataSource={rows}
      totalCount={rows.length}
      columns={baseColumns.slice(0, 4)}
      rowKeyExpr="id"
      filterRow={{ visible: false }}
      pager={{ visible: false }}
      exportOptions={{ enabled: false, allowExportSelectedData: false }}
      rowDragging={{
        allowReordering: true,
        onReorder: (from, to) => log('onReorder', { from, to }),
      }}
    />
  );
};

type LogEntry = { id: number; title: string; payload: string };

function App() {
  const [tab, setTab] = useState(0);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const idRef = useRef(0);
  const log = useCallback((title: string, payload: unknown) => {
    idRef.current += 1;
    const id = idRef.current;
    setEntries((prev) => [{ id, title, payload: JSON.stringify(payload, null, 2) }, ...prev].slice(0, 30));
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
        <Typography variant="h5" component="h1" gutterBottom>
          VKDataGrid (TanStack Table v9 + MUI v6)
        </Typography>
        <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 2 }} variant="scrollable">
          <Tab label="Server mod" />
          <Tab label="Basit mod + CRUD + gruplama" />
          <Tab label="Satır sürükleme" />
        </Tabs>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 320px' }, gap: 2 }}>
          <Box sx={{ minWidth: 0 }}>
            {tab === 0 && <ServerModeDemo log={log} />}
            {tab === 1 && <SimpleModeDemo log={log} />}
            {tab === 2 && <RowDraggingDemo log={log} />}
          </Box>
          <Paper variant="outlined" sx={{ p: 1.5, maxHeight: 640, overflow: 'auto' }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2">Olay günlüğü</Typography>
              <Button size="small" onClick={() => setEntries([])}>
                Temizle
              </Button>
            </Stack>
            {entries.map((entry) => (
              <Box key={entry.id} sx={{ mb: 1.5 }}>
                <Chip size="small" label={entry.title} sx={{ mb: 0.5 }} />
                <Box component="pre" sx={{ m: 0, fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {entry.payload}
                </Box>
              </Box>
            ))}
          </Paper>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
