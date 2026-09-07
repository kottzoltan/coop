import type { Nav08ExportMeta, Nav08PersonLine, Nav08Summary, NavFieldMapping } from '../../../../../shared/src/ber/nav-08.js';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getByPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

export function transformNavValue(
  value: unknown,
  transform?: NavFieldMapping['transform'],
): string {
  if (value == null) return '';
  switch (transform) {
    case 'HUF':
    case 'INT':
    case 'YEAR':
      return String(Math.round(Number(value)));
    case 'DATE_ISO':
      return String(value).slice(0, 10);
    case 'TAX_ID':
      return String(value).replace(/\D/g, '').slice(0, 10);
    case 'NAME_UPPER':
      return String(value).toUpperCase();
    default:
      return String(value);
  }
}

function resolveIceField(
  iceField: string,
  ctx: {
    meta: Nav08ExportMeta;
    summary: Nav08Summary;
    person?: Nav08PersonLine;
  },
): unknown {
  if (iceField.startsWith('meta.')) {
    return getByPath(ctx.meta as unknown as Record<string, unknown>, iceField.replace(/^meta\./, ''));
  }
  if (iceField.startsWith('summary.')) {
    return getByPath(ctx.summary as unknown as Record<string, unknown>, iceField.replace(/^summary\./, ''));
  }
  if (iceField.startsWith('person.') && ctx.person) {
    return getByPath(ctx.person as unknown as Record<string, unknown>, iceField.replace(/^person\./, ''));
  }
  return undefined;
}

/** Mapping-alapú ÁNYK-kompatibilis XML váz (mezőkódok a NavFormVersion-ből) */
export function buildNav08AnykXml(input: {
  meta: Nav08ExportMeta;
  summary: Nav08Summary;
  personLines: Nav08PersonLine[];
  mappings: NavFieldMapping[];
}): string {
  const { meta, summary, personLines, mappings } = input;

  const rootAttrs = new Map<string, string>();
  for (const m of mappings) {
    if (!m.xmlPath?.startsWith('/bevallas/@')) continue;
    const attr = m.xmlPath.replace('/bevallas/@', '');
    const val = transformNavValue(resolveIceField(m.iceField, { meta, summary }), m.transform);
    if (val || m.required) rootAttrs.set(attr, val);
  }

  const attrStr = [...rootAttrs.entries()]
    .map(([k, v]) => `${k}="${escapeXml(v)}"`)
    .join(' ');

  const osszesitoParts: string[] = [];
  for (const m of mappings) {
    if (!m.xmlPath?.startsWith('/bevallas/osszesito/')) continue;
    const tag = m.xmlPath.split('/').pop()!;
    const val = transformNavValue(resolveIceField(m.iceField, { meta, summary }), m.transform);
    if (m.required && !val) throw new Error(`Hiányzó kötelező mező: ${m.iceField}`);
    osszesitoParts.push(`    <${tag} navMezo="${escapeXml(m.navFieldCode)}">${escapeXml(val)}</${tag}>`);
  }

  const personMappings = mappings.filter((m) => m.iceField.startsWith('person.'));

  const szemelyXml = personLines
    .map((person) => {
      const fields = personMappings
        .map((m) => {
          const tag = m.xmlPath?.split('/').pop() ?? m.navFieldCode;
          const val = transformNavValue(
            resolveIceField(m.iceField, { meta, summary, person }),
            m.transform,
          );
          if (m.required && !val) {
            throw new Error(`Hiányzó kötelező mező: ${m.iceField} (${person.name})`);
          }
          if (!val) return '';
          return `      <${tag} navMezo="${escapeXml(m.navFieldCode)}">${escapeXml(val)}</${tag}>`;
        })
        .filter(Boolean)
        .join('\n');
      return `    <szemely>\n${fields}\n    </szemely>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<bevallas ${attrStr} xmlns="http://ice.local/nav/anyk">
  <fejlec>
    <bevadoNev>${escapeXml(meta.cooperativeName)}</bevadoNev>
    <bevadoAdoszam>${escapeXml(meta.cooperativeTaxId)}</bevadoAdoszam>
  </fejlec>
  <osszesito>
${osszesitoParts.join('\n')}
  </osszesito>
  <szemelyek>
${szemelyXml}
  </szemelyek>
</bevallas>`;
}

export function buildNav08ControlCsv(personLines: Nav08PersonLine[]): string {
  const header = [
    'adoazonosito',
    'nev',
    'szuletesi_datum',
    'brutto',
    'szja_alap',
    'kedvezmeny',
    'levont_szja',
    'tb',
    'szocho',
    'validacios_statusz',
  ];
  const rows = personLines.map((p) => {
    const kedvezmeny = p.grossAmount - p.finalSzjaBase;
    const status = p.taxIdentificationNumber && p.birthDate ? 'OK' : 'HIBA';
    return [
      p.taxIdentificationNumber,
      p.name,
      p.birthDate,
      p.grossAmount,
      p.finalSzjaBase,
      kedvezmeny,
      p.calculatedSzja,
      p.tbAmount,
      p.szochoAmount,
      status,
    ].join(';');
  });
  return [header.join(';'), ...rows].join('\n');
}
