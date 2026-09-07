export type RiportTipus =
  | 'projekt-lista'
  | 'teljesites-osszesito'
  | 'erdeklodok'
  | 'jelentkezesek'
  | 'partner-regisztraciok'
  | 'tagok'
  | 'partnerek'
  | 'munkalapok'
  | 'tag-hianyossag';

export async function letoltRiport(tipus: RiportTipus, params: Record<string, string> = {}) {
  const qs = new URLSearchParams({ tipus, ...params });
  const res = await fetch(`/api/riportok?${qs}`);
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    const body = json as { hiba?: string; reszlet?: string };
    throw new Error(body.reszlet ? `${body.hiba ?? 'Riport hiba'} (${body.reszlet})` : body.hiba ?? 'Riport letöltése sikertelen');
  }

  const blob = await res.blob();
  const dispo = res.headers.get('Content-Disposition') ?? '';
  const match = /filename="([^"]+)"/.exec(dispo);
  const fajlnev = match?.[1] ?? `ice-${tipus}.csv`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fajlnev;
  a.click();
  URL.revokeObjectURL(url);
}
