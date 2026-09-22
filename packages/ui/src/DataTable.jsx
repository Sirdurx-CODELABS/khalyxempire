import { useMemo, useState } from 'react';

function valueOf(row, col) {
  if (typeof col.accessor === 'function') return col.accessor(row);
  if (col.accessor) return row[col.accessor];
  return row[col.id];
}

function compare(a, b, col) {
  const av = valueOf(a, col);
  const bv = valueOf(b, col);
  if (av == null && bv == null) return 0;
  if (av == null) return 1;
  if (bv == null) return -1;
  if (typeof av === 'number' && typeof bv === 'number') return av - bv;
  return String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' });
}

export default function DataTable({
  rows = [],
  columns = [],
  rowKey = (row) => row._id || row.id,
  searchKeys,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search',
  searchLabel = 'Search',
  pageSizeOptions = [10, 25, 50, 100],
  defaultPageSize = 10,
  empty = 'No records yet.',
  filters,
  toolbar,
  rowClassName
}) {
  const [internalQ, setInternalQ] = useState('');
  const [sort, setSort] = useState({ id: '', dir: 'asc' });
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const q = onSearchChange ? searchValue ?? '' : internalQ;
  const setQ = (value) => {
    setPage(0);
    if (onSearchChange) onSearchChange(value);
    else setInternalQ(value);
  };

  const filtered = useMemo(() => {
    const term = String(q || '').trim().toLowerCase();
    if (!term || onSearchChange) return rows;
    const keys = searchKeys || columns.filter((c) => c.accessor || c.id).map((c) => c);
    return rows.filter((row) =>
      keys.some((key) => {
        const col = typeof key === 'string' ? { accessor: key } : key;
        return String(valueOf(row, col) ?? '')
          .toLowerCase()
          .includes(term);
      })
    );
  }, [rows, q, onSearchChange, searchKeys, columns]);

  const sorted = useMemo(() => {
    if (!sort.id) return filtered;
    const col = columns.find((c) => c.id === sort.id);
    if (!col) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => compare(a, b, col) * (sort.dir === 'desc' ? -1 : 1));
    return copy;
  }, [filtered, sort, columns]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pages - 1);
  const slice = sorted.slice(safePage * pageSize, safePage * pageSize + pageSize);

  const toggleSort = (col) => {
    if (col.sortable === false) return;
    setSort((s) => (s.id === col.id ? { id: col.id, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { id: col.id, dir: 'asc' }));
  };

  return (
    <div className="dt">
      <div className="toolbar dt-toolbar">
        <div className="field">
          <span className="field-label">{searchLabel}</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={searchPlaceholder} />
        </div>
        {filters}
        {toolbar}
      </div>
      <div className="table-wrap dt-table">
        <table className="data">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.id} className={col.sortable === false ? '' : 'is-sort'} onClick={() => toggleSort(col)}>
                  {col.header}
                  {sort.id === col.id ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.map((row) => (
              <tr key={rowKey(row)} className={typeof rowClassName === 'function' ? rowClassName(row) : rowClassName || ''}>
                {columns.map((col) => (
                  <td key={col.id} data-label={col.header}>
                    {col.cell ? col.cell(row) : valueOf(row, col)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!slice.length ? <p className="muted dt-empty">{empty}</p> : null}
      <div className="dt-foot">
        <div className="field dt-pagesize">
          <span className="field-label">Rows per page</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(0);
            }}
          >
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <p className="muted">
          {sorted.length ? `${safePage * pageSize + 1}–${Math.min(sorted.length, (safePage + 1) * pageSize)} of ${sorted.length}` : '0'}
        </p>
        <div className="dt-pager">
          <button className="btn ghost small" type="button" disabled={safePage <= 0} onClick={() => setPage(0)}>
            First
          </button>
          <button className="btn ghost small" type="button" disabled={safePage <= 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            Prev
          </button>
          <button className="btn ghost small" type="button" disabled={safePage >= pages - 1} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
          <button className="btn ghost small" type="button" disabled={safePage >= pages - 1} onClick={() => setPage(pages - 1)}>
            Last
          </button>
        </div>
      </div>
    </div>
  );
}
