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

/** SpreadsheetML — opens as a real workbook in Excel / LibreOffice without extra deps. */
export function toExcelXml(rows, sheetName = 'Sheet1') {
  const headers = rows.length ? Object.keys(rows[0]) : ['empty'];
  const esc = (value) =>
    String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  const cell = (value) => {
    const raw = value ?? '';
    const num = typeof raw === 'number' || (raw !== '' && !Number.isNaN(Number(raw)) && String(raw).trim() !== '');
    if (num && typeof raw !== 'boolean') {
      return `<Cell><Data ss:Type="Number">${Number(raw)}</Data></Cell>`;
    }
    return `<Cell><Data ss:Type="String">${esc(raw)}</Data></Cell>`;
  };
  const headerRow = `<Row>${headers.map((h) => cell(h)).join('')}</Row>`;
  const dataRows = rows.map((row) => `<Row>${headers.map((h) => cell(row[h])).join('')}</Row>`).join('');
  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="${esc(sheetName)}">
  <Table>${headerRow}${dataRows}</Table>
 </Worksheet>
</Workbook>`;
}

export function sendExcel(res, filename, rows, sheetName = 'Sheet1') {
  const name = filename.endsWith('.xls') ? filename : `${filename.replace(/\.xlsx?$/i, '')}.xls`;
  res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
  res.send(toExcelXml(rows, sheetName));
}
