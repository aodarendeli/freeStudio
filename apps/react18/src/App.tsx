import { useCallback, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CssBaseline from '@mui/material/CssBaseline';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { trTR } from '@mui/material/locale';
import { PagingPage } from './demo/pages/PagingPage';
import { RowDraggingPage } from './demo/pages/RowDraggingPage';
import { ServerModePage } from './demo/pages/ServerModePage';
import { SimpleModePage } from './demo/pages/SimpleModePage';
import { ProductCrudProvider } from './demo/useProductCrud';

const theme = createTheme(
  {
    shape: { borderRadius: 8 },
    typography: { button: { textTransform: 'none', fontWeight: 600 } },
  },
  trTR
);

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
          <Tab label="Basit mod + gruplama" />
          <Tab label="Satır sürükleme" />
          <Tab label="Sadece sayfalama" />
        </Tabs>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 320px' }, gap: 2 }}>
          <Box sx={{ minWidth: 0 }}>
            <ProductCrudProvider log={log}>
              {tab === 0 && <ServerModePage log={log} />}
              {tab === 1 && <SimpleModePage log={log} />}
              {tab === 2 && <RowDraggingPage log={log} />}
              {tab === 3 && <PagingPage log={log} />}
            </ProductCrudProvider>
          </Box>
          <Paper variant="outlined" sx={{ p: 1.5, maxHeight: 680, overflow: 'auto' }}>
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
