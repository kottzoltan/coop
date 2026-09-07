export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",;\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function buildCsv(sorok: unknown[][]): string {
  const bom = '\uFEFF';
  return bom + sorok.map((row) => row.map(csvCell).join(';')).join('\r\n');
}

export function csvResponse(csv: string, fajlnev: string): Response {
  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fajlnev}"`,
      'Cache-Control': 'no-store',
    },
  });
}
