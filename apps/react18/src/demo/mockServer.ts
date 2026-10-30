import type { FiltersChangesTypes, FilterTypes } from '../components/VKDataGrid/VKDataGrid.types';

export type Employee = {
  id: number;
  name: string;
  department: string;
  cityId: number;
  salary: number;
  birthDate: Date;
  isActive: boolean;
  isNonDraggable?: boolean;
};

export const CITIES = [
  { id: 1, name: 'İstanbul' },
  { id: 2, name: 'Ankara' },
  { id: 3, name: 'İzmir' },
  { id: 4, name: 'Bursa' },
  { id: 5, name: 'Antalya' },
];

const FIRST_NAMES = ['Ahmet', 'Ayşe', 'Mehmet', 'Zeynep', 'Can', 'Elif', 'Burak', 'Selin', 'Emre', 'Deniz'];
const LAST_NAMES = ['Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Aydın', 'Öztürk', 'Arslan'];
const DEPARTMENTS = ['Yazılım', 'Satış', 'İK', 'Finans', 'Pazarlama'];

let database: Employee[] = Array.from({ length: 137 }, (_, i) => ({
  id: i + 1,
  name: `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[(i * 7) % LAST_NAMES.length]}`,
  department: DEPARTMENTS[(i * 3) % DEPARTMENTS.length],
  cityId: CITIES[(i * 3 + Math.floor(i / 5)) % CITIES.length].id,
  salary: 25000 + ((i * 7919) % 90000),
  birthDate: new Date(1975 + (i % 30), (i * 5) % 12, 1 + ((i * 11) % 28)),
  isActive: i % 4 !== 0,
}));

const matches = (row: Employee, filter: FilterTypes) => {
  const value = (row as any)[filter.dataField];
  if (filter.filterValues?.length) {
    const keys = (filter.filterValues as any[]).map((v) => (v instanceof Date ? v.toISOString() : String(v)));
    if (!keys.includes(value instanceof Date ? value.toISOString() : String(value))) return false;
  }
  if (filter.filterValue === undefined || filter.filterValue === null) return true;
  const target: any = filter.filterValue;
  const op = filter.filterOperator as string;
  if (value instanceof Date) {
    const day = (d: any) => new Date(d).setHours(0, 0, 0, 0);
    if (op === 'between' && Array.isArray(target)) return day(value) >= day(target[0]) && day(value) <= day(target[1]);
    const a = day(value);
    const b = day(target);
    return op === '<' ? a < b : op === '>' ? a > b : op === '<=' ? a <= b : op === '>=' ? a >= b : op === '<>' ? a !== b : a === b;
  }
  if (typeof value === 'number' && op !== 'contains') {
    if (op === 'between' && Array.isArray(target)) return value >= Number(target[0]) && value <= Number(target[1]);
    const b = Number(target);
    return op === '<' ? value < b : op === '>' ? value > b : op === '<=' ? value <= b : op === '>=' ? value >= b : op === '<>' ? value !== b : value === b;
  }
  if (typeof value === 'boolean') return value === target;
  const text = String(value).toLocaleLowerCase('tr');
  const search = String(target).toLocaleLowerCase('tr');
  switch (op) {
    case 'notcontains':
      return !text.includes(search);
    case 'startswith':
      return text.startsWith(search);
    case 'endswith':
      return text.endsWith(search);
    case '=':
      return text === search;
    case '<>':
      return text !== search;
    default:
      return text.includes(search);
  }
};

/** Sunucu tarafı sayfalama/filtre/sıralama/arama simülasyonu */
export const fetchEmployees = async (options: FiltersChangesTypes) => {
  await new Promise((resolve) => setTimeout(resolve, 250));
  let rows = database.filter((row) => (options.filter ?? []).every((f) => matches(row, f)));
  const search = options.searchText?.trim().toLocaleLowerCase('tr');
  if (search) {
    rows = rows.filter((row) =>
      [row.name, row.department, CITIES.find((c) => c.id === row.cityId)?.name, String(row.salary)]
        .join(' ')
        .toLocaleLowerCase('tr')
        .includes(search)
    );
  }
  if (options.sort) {
    const { dataField, sortOrder } = options.sort;
    rows = [...rows].sort((a: any, b: any) => {
      const x = a[dataField];
      const y = b[dataField];
      const result = x instanceof Date ? x.getTime() - y.getTime() : typeof x === 'number' ? x - y : String(x).localeCompare(String(y), 'tr');
      return sortOrder === 'desc' ? -result : result;
    });
  }
  const start = options.pageIndex * options.pageSize;
  return {
    data: rows.slice(start, start + options.pageSize),
    totalCount: rows.length,
    salaryTotal: rows.reduce((sum, row) => sum + row.salary, 0),
  };
};

export const getAllEmployees = () => database;

export const createEmployee = async (values: Partial<Employee>) => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const id = Math.max(...database.map((r) => r.id)) + 1;
  database = [{ id, name: '', department: '', cityId: 1, salary: 0, birthDate: new Date(), isActive: true, ...values }, ...database];
};

export const updateEmployee = async (id: number, values: Partial<Employee>) => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  database = database.map((row) => (row.id === id ? { ...row, ...values } : row));
};

export const deleteEmployee = async (id: number) => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  database = database.filter((row) => row.id !== id);
};
