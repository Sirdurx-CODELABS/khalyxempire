export function toCsv(rows) {
  if (!rows.length) return '\uFEFF';
  const headers = Object.keys(rows[0]);
  const esc = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const lines = [headers.join(','), ...rows.map((row) => headers.map((h) => esc(row[h])).join(','))];
  return `\uFEFF${lines.join('\n')}`;
}

export function sendCsv(res, filename, rows) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(toCsv(rows));
}
