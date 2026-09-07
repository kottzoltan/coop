import { createHash } from 'node:crypto';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { getStore } from '@netlify/blobs';
import { db } from '../../../../../db/index.js';
import {
  adoSzamitasSnapshot,
  berAuditLog,
  berSzamfejtesFutas,
  berSzamfejtettSor,
  bevallasExportFajl,
  bevallasFutas,
  bevallasOsszesito,
  bevallasSzemelyiSor,
  bevallasValidaciosHiba,
  navUrlapVerzio,
  szovetkezetiTag,
} from '../../../../../db/schema.js';
import {
  m30HasBlockingErrors,
  validateM30,
  type M30PersonSummary,
} from '../../../../../shared/src/ber/m30.js';
import { envGet } from '../../netlify-env.js';

const BLOB_STORE = 'ice-bevallas-export';

function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

async function audit(entityType: string, entityId: number, action: string, actorId: string, payload?: unknown) {
  await db.insert(berAuditLog).values({
    entityType,
    entityId,
    action,
    actorId,
    payloadJson: payload ? (payload as Record<string, unknown>) : null,
  });
}

function cooperativeName(): string {
  return envGet('ICE_COOPERATIVE_NAME') ?? 'ICE Iskolaszövetkezet';
}

export async function aggregateM30ForTaxYear(taxYear: number, tagId?: number): Promise<M30PersonSummary[]> {
  const periodPrefix = `${taxYear}-`;

  const closedRuns = await db
    .select({ id: berSzamfejtesFutas.id })
    .from(berSzamfejtesFutas)
    .where(
      and(
        sql`${berSzamfejtesFutas.payrollPeriod} LIKE ${periodPrefix + '%'}`,
        inArray(berSzamfejtesFutas.status, ['CLOSED', 'DECLARED']),
      ),
    );

  if (!closedRuns.length) return [];

  const runIds = closedRuns.map((r) => r.id);

  let snapshots = await db
    .select()
    .from(adoSzamitasSnapshot)
    .where(inArray(adoSzamitasSnapshot.payrollRunId, runIds));

  if (tagId) {
    snapshots = snapshots.filter((s) => s.tagId === tagId);
  }

  const sorok = await db
    .select()
    .from(berSzamfejtettSor)
    .where(inArray(berSzamfejtettSor.payrollRunId, runIds));

  const tagIds = [...new Set(snapshots.map((s) => s.tagId))];
  const tagok = tagIds.length
    ? await db.select().from(szovetkezetiTag).where(inArray(szovetkezetiTag.id, tagIds))
    : [];
  const tagMap = new Map(tagok.map((t) => [t.id, t]));

  const byTag = new Map<number, typeof snapshots>();
  for (const snap of snapshots) {
    const list = byTag.get(snap.tagId) ?? [];
    list.push(snap);
    byTag.set(snap.tagId, list);
  }

  const summaries: M30PersonSummary[] = [];

  for (const [tid, snaps] of byTag) {
    const tag = tagMap.get(tid);
    if (!tag) continue;

    const tagSorok = sorok.filter((s) => s.tagId === tid);
    const categories = [...new Set(tagSorok.map((s) => s.wageCodeId))];
    const runsForTag = new Set(snaps.map((s) => s.payrollRunId));

    const totalGross = snaps.reduce((a, s) => a + s.grossAmount, 0);
    const totalSzjaBase = snaps.reduce((a, s) => a + s.finalSzjaBase, 0);
    const totalAllowances = snaps.reduce(
      (a, s) => a + (s.initialSzjaBase - s.finalSzjaBase),
      0,
    );

    summaries.push({
      tagId: tid,
      name: tag.nev,
      taxIdentificationNumber: tag.adoszam ?? '',
      birthDate: tag.szuldat ? String(tag.szuldat).slice(0, 10) : '',
      taxYear,
      totalGross,
      totalSzjaBase,
      totalAllowances,
      totalSzja: snaps.reduce((a, s) => a + s.calculatedSzja, 0),
      totalTb: snaps.reduce((a, s) => a + s.tbAmount, 0),
      totalSzocho: snaps.reduce((a, s) => a + s.szochoAmount, 0),
      paymentCategories: categories,
      monthCount: runsForTag.size,
    });
  }

  return summaries.sort((a, b) => a.name.localeCompare(b.name, 'hu'));
}

function buildM30Html(summary: M30PersonSummary): string {
  return `<!DOCTYPE html>
<html lang="hu"><head><meta charset="UTF-8"><title>M30 ${summary.taxYear} — ${summary.name}</title>
<style>
  body{font-family:system-ui,sans-serif;max-width:720px;margin:2rem auto;color:#1C2536;line-height:1.5}
  h1{font-size:1.25rem;border-bottom:2px solid #B8863F;padding-bottom:.5rem}
  table{width:100%;border-collapse:collapse;margin-top:1rem}
  td,th{border:1px solid #E4E0D6;padding:.5rem .75rem;text-align:left}
  th{background:#F6F4EF;font-size:.75rem;text-transform:uppercase}
  .foot{margin-top:2rem;font-size:.85rem;color:#666}
</style></head><body>
<h1>M30 igazolás — ${summary.taxYear}</h1>
<p><strong>${summary.name}</strong><br>Adóazonosító: ${summary.taxIdentificationNumber}<br>Születési dátum: ${summary.birthDate}</p>
<table>
  <tr><th>Tétel</th><th>Összeg (Ft)</th></tr>
  <tr><td>Bruttó jövedelem</td><td>${summary.totalGross.toLocaleString('hu-HU')}</td></tr>
  <tr><td>SZJA-alap</td><td>${summary.totalSzjaBase.toLocaleString('hu-HU')}</td></tr>
  <tr><td>Figyelembe vett kedvezmények</td><td>${summary.totalAllowances.toLocaleString('hu-HU')}</td></tr>
  <tr><td>Levont SZJA</td><td>${summary.totalSzja.toLocaleString('hu-HU')}</td></tr>
  <tr><td>TB-járulék</td><td>${summary.totalTb.toLocaleString('hu-HU')}</td></tr>
  <tr><td>Szocho</td><td>${summary.totalSzocho.toLocaleString('hu-HU')}</td></tr>
</table>
<p>Kifizetési jogcímek: ${summary.paymentCategories.join(', ') || '—'}<br>Hónapok száma: ${summary.monthCount}</p>
<p class="foot">${cooperativeName()} · Generálva: ${new Date().toLocaleString('hu-HU')}</p>
</body></html>`;
}

export async function generateM30(input: {
  taxYear: number;
  tagId?: number;
  generatedBy: string;
}) {
  const summaries = await aggregateM30ForTaxYear(input.taxYear, input.tagId);
  const issues = validateM30({ taxYear: input.taxYear, summaries });

  const [formVersion] = await db
    .select()
    .from(navUrlapVerzio)
    .where(
      and(
        eq(navUrlapVerzio.formCode, '26M30'),
        eq(navUrlapVerzio.taxYear, input.taxYear),
        eq(navUrlapVerzio.isActive, true),
      ),
    );

  const [bevallas] = await db
    .insert(bevallasFutas)
    .values({
      type: 'M30',
      taxYear: input.taxYear,
      period: null,
      payrollRunIds: [],
      status: m30HasBlockingErrors(issues) ? 'DRAFT' : 'VALIDATED',
      generatedAt: new Date(),
      generatedBy: input.generatedBy,
      formVersionId: formVersion?.id ?? null,
    })
    .returning();

  const totalGross = summaries.reduce((a, s) => a + s.totalGross, 0);
  const totalSzja = summaries.reduce((a, s) => a + s.totalSzja, 0);

  await db.insert(bevallasOsszesito).values({
    declarationRunId: bevallas.id,
    personCount: summaries.length,
    totalGross,
    totalSzjaBase: summaries.reduce((a, s) => a + s.totalSzjaBase, 0),
    totalSzja,
    totalTb: summaries.reduce((a, s) => a + s.totalTb, 0),
    totalSzocho: summaries.reduce((a, s) => a + s.totalSzocho, 0),
  });

  if (summaries.length) {
    await db.insert(bevallasSzemelyiSor).values(
      summaries.map((s) => ({
        declarationRunId: bevallas.id,
        tagId: s.tagId,
        taxIdentificationNumber: s.taxIdentificationNumber,
        name: s.name,
        birthDate: s.birthDate,
        relationType: 'M30',
        grossAmount: s.totalGross,
        finalSzjaBase: s.totalSzjaBase,
        calculatedSzja: s.totalSzja,
        tbAmount: s.totalTb,
        szochoAmount: s.totalSzocho,
        exemptionsJson: { paymentCategories: s.paymentCategories.join(',') },
      })),
    );
  }

  if (issues.length) {
    await db.insert(bevallasValidaciosHiba).values(
      issues.map((i) => ({
        declarationRunId: bevallas.id,
        severity: i.severity,
        code: i.code,
        message: i.message,
        tagId: i.tagId ?? null,
      })),
    );
  }

  await audit('BevallasFutas', bevallas.id, 'M30_GENERATED', input.generatedBy, {
    taxYear: input.taxYear,
    personCount: summaries.length,
    tagId: input.tagId,
  });

  return { bevallasId: bevallas.id, summaries, issues };
}

export async function exportM30Declaration(bevallasId: number, actorId: string) {
  const [bevallas] = await db.select().from(bevallasFutas).where(eq(bevallasFutas.id, bevallasId));
  if (!bevallas || bevallas.type !== 'M30') throw new Error('M30 bevallás nem található.');

  const szemelyiSorok = await db
    .select()
    .from(bevallasSzemelyiSor)
    .where(eq(bevallasSzemelyiSor.declarationRunId, bevallasId));

  const summaries: M30PersonSummary[] = szemelyiSorok.map((s) => ({
    tagId: s.tagId,
    name: s.name,
    taxIdentificationNumber: s.taxIdentificationNumber,
    birthDate: String(s.birthDate).slice(0, 10),
    taxYear: bevallas.taxYear,
    totalGross: s.grossAmount,
    totalSzjaBase: s.finalSzjaBase,
    totalAllowances: s.grossAmount - s.finalSzjaBase,
    totalSzja: s.calculatedSzja,
    totalTb: s.tbAmount,
    totalSzocho: s.szochoAmount,
    paymentCategories: String((s.exemptionsJson as Record<string, string>)?.paymentCategories ?? '').split(',').filter(Boolean),
    monthCount: 0,
  }));

  const store = getStore({ name: BLOB_STORE, consistency: 'strong' });
  const basePath = `m30/${bevallasId}`;

  for (const summary of summaries) {
    const html = buildM30Html(summary);
    const fileName = `M30_${bevallas.taxYear}_${summary.tagId}.html`;
    const path = `${basePath}/${fileName}`;
    const hash = sha256(html);
    await store.set(path, html, { metadata: { mime: 'text/html', hash } });
    await db.insert(bevallasExportFajl).values({
      declarationRunId: bevallasId,
      fileType: 'PDF',
      fileName,
      fileHash: hash,
      storagePath: path,
    });
  }

  const auditJson = JSON.stringify({ summaries, exportedAt: new Date().toISOString() }, null, 2);
  const auditPath = `${basePath}/M30_${bevallas.taxYear}_audit.json`;
  await store.set(auditPath, auditJson);
  await db.insert(bevallasExportFajl).values({
    declarationRunId: bevallasId,
    fileType: 'JSON_AUDIT',
    fileName: `M30_${bevallas.taxYear}_audit.json`,
    fileHash: sha256(auditJson),
    storagePath: auditPath,
  });

  await db.update(bevallasFutas).set({ status: 'EXPORTED' }).where(eq(bevallasFutas.id, bevallasId));
  await audit('BevallasFutas', bevallasId, 'M30_EXPORTED', actorId, { fileCount: summaries.length });

  return summaries.length;
}

export async function getM30ForDiakTag(tagId: number, taxYear: number) {
  const [bevallas] = await db
    .select()
    .from(bevallasFutas)
    .where(
      and(
        eq(bevallasFutas.type, 'M30'),
        eq(bevallasFutas.taxYear, taxYear),
        inArray(bevallasFutas.status, ['EXPORTED', 'VALIDATED']),
      ),
    )
    .orderBy(desc(bevallasFutas.generatedAt));

  if (!bevallas) return null;

  const [sor] = await db
    .select()
    .from(bevallasSzemelyiSor)
    .where(
      and(
        eq(bevallasSzemelyiSor.declarationRunId, bevallas.id),
        eq(bevallasSzemelyiSor.tagId, tagId),
      ),
    );

  if (!sor) return null;

  const [exportFile] = await db
    .select()
    .from(bevallasExportFajl)
    .where(
      and(
        eq(bevallasExportFajl.declarationRunId, bevallas.id),
        eq(bevallasExportFajl.fileType, 'PDF'),
      ),
    );

  return {
    bevallas_id: bevallas.id,
    export_id: exportFile?.id,
    tax_year: taxYear,
    gross: sor.grossAmount,
    szja: sor.calculatedSzja,
    file_name: exportFile?.fileName,
  };
}
