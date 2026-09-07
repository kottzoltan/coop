import { createHash } from 'node:crypto';
import { and, desc, eq, inArray, notInArray } from 'drizzle-orm';
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
  nav08HasBlockingErrors,
  summarizePersonLines,
  validateNav08,
  type Nav08ExportMeta,
  type Nav08PersonLine,
} from '../../../../../shared/src/ber/nav-08.js';
import { buildNav08AnykXml, buildNav08ControlCsv } from './nav-xml-builder.js';
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

function defaultCooperativeMeta(taxYear: number, period: string): Omit<Nav08ExportMeta, 'formCode'> & { formCode: string } {
  return {
    formCode: '2608',
    taxYear,
    period,
    cooperativeTaxId: envGet('ICE_COOPERATIVE_TAX_ID') ?? '0000000000',
    cooperativeName: envGet('ICE_COOPERATIVE_NAME') ?? 'ICE Iskolaszövetkezet',
  };
}

async function getActiveFormVersion(taxYear: number) {
  const [row] = await db
    .select()
    .from(navUrlapVerzio)
    .where(and(eq(navUrlapVerzio.taxYear, taxYear), eq(navUrlapVerzio.formCode, '2608'), eq(navUrlapVerzio.isActive, true)));
  return row ?? null;
}

function buildExemptionsFromSnapshots(
  snapshots: Array<typeof adoSzamitasSnapshot.$inferSelect>,
): Record<string, string> {
  const ex: Record<string, string> = {};
  const totalSzja = snapshots.reduce((s, x) => s + x.calculatedSzja, 0);
  const totalTb = snapshots.reduce((s, x) => s + x.tbAmount, 0);
  const totalSzocho = snapshots.reduce((s, x) => s + x.szochoAmount, 0);

  if (totalSzja === 0) {
    const allowances = snapshots.flatMap((s) => s.appliedAllowancesJson ?? []);
    if (allowances.length) {
      ex.szja = allowances.map((a) => a.type).join(',');
    } else {
      ex.szja = 'NINCS_SZJA_KOTELEZETTSEG';
    }
  }
  if (totalTb === 0 && snapshots[0]?.tbExemptReason) {
    ex.tb = snapshots[0].tbExemptReason;
  }
  if (totalSzocho === 0 && snapshots[0]?.szochoExemptReason) {
    ex.szocho = snapshots[0].szochoExemptReason;
  }
  return ex;
}

export async function generateNav08Declaration(input: {
  period: string;
  payrollRunIds: number[];
  generatedBy: string;
  korrekcioSzuloId?: number;
}) {
  const taxYear = Number(input.period.split('-')[0]);

  const futasok = await db
    .select()
    .from(berSzamfejtesFutas)
    .where(inArray(berSzamfejtesFutas.id, input.payrollRunIds));

  if (futasok.length !== input.payrollRunIds.length) {
    throw new Error('Egy vagy több bérszámfejtési futás nem található.');
  }

  for (const f of futasok) {
    if (f.status !== 'CLOSED' && f.status !== 'DECLARED') {
      throw new Error(`A #${f.id} futás nincs lezárva — csak CLOSED futásból készíthető NAV 08.`);
    }
    if (f.payrollPeriod !== input.period) {
      throw new Error(`A #${f.id} futás időszaka (${f.payrollPeriod}) nem egyezik.`);
    }
  }

  const existing = await db
    .select()
    .from(bevallasFutas)
    .where(
      and(
        eq(bevallasFutas.type, 'NAV_08'),
        eq(bevallasFutas.period, input.period),
        notInArray(bevallasFutas.status, ['CORRECTED', 'REJECTED']),
      ),
    );

  if (existing.length > 0 && !input.korrekcioSzuloId) {
    throw new Error(
      `Már létezik NAV 08 bevallás erre az időszakra (#${existing[0].id}). Korrekcióként indítsd.`,
    );
  }

  const formVersion = await getActiveFormVersion(taxYear);
  if (!formVersion) {
    throw new Error(`Nincs aktív NAV 08 űrlap verzió (${taxYear}).`);
  }

  const snapshots = await db
    .select()
    .from(adoSzamitasSnapshot)
    .where(inArray(adoSzamitasSnapshot.payrollRunId, input.payrollRunIds));

  if (!snapshots.length) {
    throw new Error('Nincs adószámítás snapshot — zárd le a bérszámfejtési futást.');
  }

  const sorok = await db
    .select()
    .from(berSzamfejtettSor)
    .where(inArray(berSzamfejtettSor.payrollRunId, input.payrollRunIds));

  const tagIds = [...new Set(snapshots.map((s) => s.tagId))];
  const tagok = await db.select().from(szovetkezetiTag).where(inArray(szovetkezetiTag.id, tagIds));
  const tagMap = new Map(tagok.map((t) => [t.id, t]));

  const personMap = new Map<string, { tagId: number; snapshots: typeof snapshots; relationType: string }>();

  for (const snap of snapshots) {
    const line = sorok.find((s) => s.id === snap.payrollLineId);
    const relationType = line?.jogviszonyTipus ?? 'SCHOOL_COOP_MEMBER_WORK';
    const key = `${snap.tagId}:${relationType}`;
    const prev = personMap.get(key) ?? { tagId: snap.tagId, snapshots: [], relationType };
    prev.snapshots.push(snap);
    personMap.set(key, prev);
  }

  const personLines: Nav08PersonLine[] = [];

  for (const [, agg] of personMap) {
    const tag = tagMap.get(agg.tagId);
    if (!tag) continue;

    const gross = agg.snapshots.reduce((s, x) => s + x.grossAmount, 0);
    const finalSzjaBase = agg.snapshots.reduce((s, x) => s + x.finalSzjaBase, 0);
    const calculatedSzja = agg.snapshots.reduce((s, x) => s + x.calculatedSzja, 0);
    const tbAmount = agg.snapshots.reduce((s, x) => s + x.tbAmount, 0);
    const szochoAmount = agg.snapshots.reduce((s, x) => s + x.szochoAmount, 0);

    personLines.push({
      tagId: agg.tagId,
      taxIdentificationNumber: tag.adoszam ?? '',
      name: tag.nev,
      birthDate: tag.szuldat ? String(tag.szuldat).slice(0, 10) : '',
      relationType: agg.relationType,
      grossAmount: gross,
      finalSzjaBase,
      calculatedSzja,
      tbAmount,
      szochoAmount,
      exemptionsJson: buildExemptionsFromSnapshots(agg.snapshots),
    });
  }

  const summary = summarizePersonLines(personLines);
  const issues = validateNav08({ period: input.period, personLines, summary });

  const [bevallas] = await db
    .insert(bevallasFutas)
    .values({
      type: 'NAV_08',
      taxYear,
      period: input.period,
      payrollRunIds: input.payrollRunIds,
      status: nav08HasBlockingErrors(issues) ? 'DRAFT' : 'VALIDATED',
      generatedAt: new Date(),
      generatedBy: input.generatedBy,
      formVersionId: formVersion.id,
      korrekcioSzuloId: input.korrekcioSzuloId ?? null,
    })
    .returning();

  await db.insert(bevallasOsszesito).values({
    declarationRunId: bevallas.id,
    personCount: summary.personCount,
    totalGross: summary.totalGross,
    totalSzjaBase: summary.totalSzjaBase,
    totalSzja: summary.totalSzja,
    totalTb: summary.totalTb,
    totalSzocho: summary.totalSzocho,
  });

  if (personLines.length) {
    await db.insert(bevallasSzemelyiSor).values(
      personLines.map((p) => ({
        declarationRunId: bevallas.id,
        tagId: p.tagId,
        taxIdentificationNumber: p.taxIdentificationNumber,
        name: p.name,
        birthDate: p.birthDate,
        relationType: p.relationType,
        grossAmount: p.grossAmount,
        finalSzjaBase: p.finalSzjaBase,
        calculatedSzja: p.calculatedSzja,
        tbAmount: p.tbAmount,
        szochoAmount: p.szochoAmount,
        exemptionsJson: p.exemptionsJson ?? null,
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

  await audit('BevallasFutas', bevallas.id, 'GENERATED', input.generatedBy, {
    period: input.period,
    payrollRunIds: input.payrollRunIds,
    personCount: summary.personCount,
  });

  return getBevallasDetail(bevallas.id);
}

export async function listBevallasok(period?: string, type = 'NAV_08', taxYear?: number) {
  const sorok = await db
    .select()
    .from(bevallasFutas)
    .where(
      and(
        eq(bevallasFutas.type, type),
        period ? eq(bevallasFutas.period, period) : undefined,
        taxYear ? eq(bevallasFutas.taxYear, taxYear) : undefined,
      ),
    )
    .orderBy(desc(bevallasFutas.createdAt));

  return sorok.map((b) => ({
    id: b.id,
    type: b.type,
    tax_year: b.taxYear,
    period: b.period,
    status: b.status,
    payroll_run_ids: b.payrollRunIds,
    generated_at: b.generatedAt?.toISOString() ?? null,
    generated_by: b.generatedBy,
    created_at: b.createdAt.toISOString(),
  }));
}

export async function getBevallasDetail(id: number) {
  const [bevallas] = await db.select().from(bevallasFutas).where(eq(bevallasFutas.id, id));
  if (!bevallas) return null;

  const [osszesito] = await db
    .select()
    .from(bevallasOsszesito)
    .where(eq(bevallasOsszesito.declarationRunId, id));

  const szemelyiSorok = await db
    .select()
    .from(bevallasSzemelyiSor)
    .where(eq(bevallasSzemelyiSor.declarationRunId, id));

  const hibak = await db
    .select()
    .from(bevallasValidaciosHiba)
    .where(eq(bevallasValidaciosHiba.declarationRunId, id));

  const exportok = await db
    .select()
    .from(bevallasExportFajl)
    .where(eq(bevallasExportFajl.declarationRunId, id));

  const auditSorok = await db
    .select()
    .from(berAuditLog)
    .where(and(eq(berAuditLog.entityType, 'BevallasFutas'), eq(berAuditLog.entityId, id)))
    .orderBy(desc(berAuditLog.createdAt));

  return {
    bevallas: {
      id: bevallas.id,
      type: bevallas.type,
      tax_year: bevallas.taxYear,
      period: bevallas.period,
      status: bevallas.status,
      payroll_run_ids: bevallas.payrollRunIds,
      generated_at: bevallas.generatedAt?.toISOString() ?? null,
      generated_by: bevallas.generatedBy,
      form_version_id: bevallas.formVersionId,
      created_at: bevallas.createdAt.toISOString(),
    },
    osszesito: osszesito
      ? {
          person_count: osszesito.personCount,
          total_gross: osszesito.totalGross,
          total_szja_base: osszesito.totalSzjaBase,
          total_szja: osszesito.totalSzja,
          total_tb: osszesito.totalTb,
          total_szocho: osszesito.totalSzocho,
        }
      : null,
    szemelyi_sorok: szemelyiSorok.map((s) => ({
      id: s.id,
      tag_id: s.tagId,
      tax_identification_number: s.taxIdentificationNumber,
      name: s.name,
      birth_date: String(s.birthDate).slice(0, 10),
      relation_type: s.relationType,
      gross_amount: s.grossAmount,
      final_szja_base: s.finalSzjaBase,
      calculated_szja: s.calculatedSzja,
      tb_amount: s.tbAmount,
      szocho_amount: s.szochoAmount,
      exemptions_json: s.exemptionsJson,
    })),
    validacios_hibak: hibak.map((h) => ({
      id: h.id,
      severity: h.severity,
      code: h.code,
      message: h.message,
      tag_id: h.tagId,
    })),
    export_fajlok: exportok.map((e) => ({
      id: e.id,
      file_type: e.fileType,
      file_name: e.fileName,
      file_hash: e.fileHash,
      generated_at: e.generatedAt.toISOString(),
    })),
    audit: auditSorok.map((a) => ({
      id: a.id,
      action: a.action,
      actor_id: a.actorId,
      created_at: a.createdAt.toISOString(),
      payload: a.payloadJson,
    })),
  };
}

export async function exportNav08Declaration(id: number, actorId: string) {
  const detail = await getBevallasDetail(id);
  if (!detail) throw new Error('Bevallás nem található.');
  if (detail.bevallas.status !== 'VALIDATED' && detail.bevallas.status !== 'EXPORTED') {
    throw new Error('Csak validált bevallás exportálható.');
  }

  const [formVersion] = detail.bevallas.form_version_id
    ? await db.select().from(navUrlapVerzio).where(eq(navUrlapVerzio.id, detail.bevallas.form_version_id))
    : [];

  const mappings = formVersion?.fieldMappingJson ?? [];

  const meta: Nav08ExportMeta = defaultCooperativeMeta(
    detail.bevallas.tax_year,
    detail.bevallas.period ?? '',
  );

  const personLines: Nav08PersonLine[] = detail.szemelyi_sorok.map((s) => ({
    tagId: s.tag_id,
    taxIdentificationNumber: s.tax_identification_number,
    name: s.name,
    birthDate: s.birth_date,
    relationType: s.relation_type ?? 'SCHOOL_COOP_MEMBER_WORK',
    grossAmount: s.gross_amount,
    finalSzjaBase: s.final_szja_base,
    calculatedSzja: s.calculated_szja,
    tbAmount: s.tb_amount,
    szochoAmount: s.szocho_amount,
    exemptionsJson: (s.exemptions_json as Record<string, string>) ?? undefined,
  }));

  const summary = {
    personCount: detail.osszesito?.person_count ?? 0,
    totalGross: detail.osszesito?.total_gross ?? 0,
    totalSzjaBase: detail.osszesito?.total_szja_base ?? 0,
    totalSzja: detail.osszesito?.total_szja ?? 0,
    totalTb: detail.osszesito?.total_tb ?? 0,
    totalSzocho: detail.osszesito?.total_szocho ?? 0,
  };

  const xml = buildNav08AnykXml({ meta, summary, personLines, mappings });
  const csv = buildNav08ControlCsv(personLines);
  const auditJson = JSON.stringify({ meta, summary, personLines, exportedAt: new Date().toISOString() }, null, 2);

  const store = getStore({ name: BLOB_STORE, consistency: 'strong' });
  const basePath = `nav08/${id}`;

  const files: Array<{ type: string; name: string; content: string; mime: string }> = [
    { type: 'ANYK_XML', name: `NAV08_${detail.bevallas.period}.xml`, content: xml, mime: 'application/xml' },
    { type: 'XLSX_CONTROL', name: `NAV08_${detail.bevallas.period}_kontroll.csv`, content: csv, mime: 'text/csv' },
    { type: 'JSON_AUDIT', name: `NAV08_${detail.bevallas.period}_audit.json`, content: auditJson, mime: 'application/json' },
  ];

  for (const f of files) {
    const path = `${basePath}/${f.name}`;
    const hash = sha256(f.content);
    await store.set(path, f.content, { metadata: { mime: f.mime, hash } });
    await db.insert(bevallasExportFajl).values({
      declarationRunId: id,
      fileType: f.type,
      fileName: f.name,
      fileHash: hash,
      storagePath: path,
    });
  }

  await db
    .update(bevallasFutas)
    .set({ status: 'EXPORTED' })
    .where(eq(bevallasFutas.id, id));

  await audit('BevallasFutas', id, 'EXPORTED', actorId, {
    files: files.map((f) => ({ type: f.type, name: f.name, hash: sha256(f.content) })),
  });

  return getBevallasDetail(id);
}

export async function downloadBevallasExport(declarationId: number, exportId: number): Promise<{ body: string; mime: string; fileName: string } | null> {
  const [file] = await db
    .select()
    .from(bevallasExportFajl)
    .where(and(eq(bevallasExportFajl.id, exportId), eq(bevallasExportFajl.declarationRunId, declarationId)));

  if (!file) return null;

  const store = getStore({ name: BLOB_STORE });
  const blob = await store.get(file.storagePath, { type: 'text' });
  if (!blob) return null;

  const mime =
    file.fileType === 'ANYK_XML'
      ? 'application/xml'
      : file.fileType === 'JSON_AUDIT'
        ? 'application/json'
        : 'text/csv';

  return { body: blob, mime, fileName: file.fileName };
}

export async function startNav08Correction(parentId: number, generatedBy: string) {
  const detail = await getBevallasDetail(parentId);
  if (!detail) throw new Error('Bevallás nem található.');

  await db
    .update(bevallasFutas)
    .set({ status: 'CORRECTED' })
    .where(eq(bevallasFutas.id, parentId));

  return generateNav08Declaration({
    period: detail.bevallas.period ?? '',
    payrollRunIds: detail.bevallas.payroll_run_ids,
    generatedBy,
    korrekcioSzuloId: parentId,
  });
}
