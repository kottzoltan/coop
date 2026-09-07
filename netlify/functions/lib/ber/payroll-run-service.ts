import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../../../../db/index.js';
import {
  adoSzamitasSnapshot,
  berSzamfejtesFutas,
  berSzamfejtesFutasMunkalap,
  berSzamfejtettSor,
  berSzamfejtesValidaciosHiba,
  munkalap,
  projekt,
  szovetkezetiTag,
} from '../../../../db/schema.js';
import { calculatePayrollTaxes } from '../../../../shared/src/ber/calculate-payroll-taxes.js';
import { getActiveTaxYearConfig } from './adoev-konfig.js';
import { listActiveAllowancesForPayroll } from './szja-kedvezmeny-service.js';
import { hasBlockingErrors, validatePayrollRun } from './payroll-run-validator.js';
import { mergeProjektMeta } from '../projekt-meta.js';
import { szamfejtesiBerekBerKodLista } from '../../../../shared/src/projekt-demo-meta.js';

const JOVAHAGYOTT_STATUSZOK = ['Jóváhagyott', 'Korrekció Jóváhagyott'];

function taxYearFromPeriod(period: string): number {
  return Number(period.split('-')[0]);
}

function berKodokFromProjekt(p: typeof projekt.$inferSelect): BerKod[] {
  const meta = mergeProjektMeta(p);
  return szamfejtesiBerekBerKodLista(meta);
}

export async function listPayrollRuns(payrollPeriod?: string) {
  const sorok = await db
    .select()
    .from(berSzamfejtesFutas)
    .where(payrollPeriod ? eq(berSzamfejtesFutas.payrollPeriod, payrollPeriod) : undefined)
    .orderBy(desc(berSzamfejtesFutas.createdAt));

  const counts = await Promise.all(
    sorok.map(async (f) => {
      const [mlCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(berSzamfejtesFutasMunkalap)
        .where(eq(berSzamfejtesFutasMunkalap.futasId, f.id));
      const sorCount = await db
        .select({ id: berSzamfejtettSor.id })
        .from(berSzamfejtettSor)
        .where(eq(berSzamfejtettSor.payrollRunId, f.id));
      const hibak = await db
        .select({ severity: berSzamfejtesValidaciosHiba.severity })
        .from(berSzamfejtesValidaciosHiba)
        .where(eq(berSzamfejtesValidaciosHiba.payrollRunId, f.id));
      return {
        munkalap_count: mlCount?.count ?? 0,
        sor_count: sorCount.length,
        error_count: hibak.filter((h) => h.severity === 'ERROR').length,
        warn_count: hibak.filter((h) => h.severity === 'WARN').length,
      };
    }),
  );

  return sorok.map((f, i) => ({
    ...futasValasz(f),
    ...counts[i],
  }));
}

function futasValasz(f: typeof berSzamfejtesFutas.$inferSelect) {
  return {
    id: f.id,
    cooperative_id: f.cooperativeId,
    payroll_period: f.payrollPeriod,
    performance_period: f.performancePeriod,
    status: f.status,
    created_by: f.createdBy,
    closed_at: f.closedAt?.toISOString() ?? null,
    korrekcio_szulo_id: f.korrekcioSzuloId,
    created_at: f.createdAt.toISOString(),
  };
}

export async function getPayrollRunDetail(id: number) {
  const [futas] = await db.select().from(berSzamfejtesFutas).where(eq(berSzamfejtesFutas.id, id));
  if (!futas) return null;

  const mlKapcsolatok = await db
    .select({ munkalapId: berSzamfejtesFutasMunkalap.munkalapId })
    .from(berSzamfejtesFutasMunkalap)
    .where(eq(berSzamfejtesFutasMunkalap.futasId, id));

  const munkalapIds = mlKapcsolatok.map((k) => k.munkalapId);
  const munkalapok = munkalapIds.length
    ? await db.select().from(munkalap).where(inArray(munkalap.id, munkalapIds))
    : [];

  const sorok = await db
    .select()
    .from(berSzamfejtettSor)
    .where(eq(berSzamfejtettSor.payrollRunId, id));

  const tagIds = [...new Set(sorok.map((s) => s.tagId))];
  const tagok = tagIds.length
    ? await db.select().from(szovetkezetiTag).where(inArray(szovetkezetiTag.id, tagIds))
    : [];
  const tagNevMap = new Map(tagok.map((t) => [t.id, t.nev]));

  const snapshots = await db
    .select()
    .from(adoSzamitasSnapshot)
    .where(eq(adoSzamitasSnapshot.payrollRunId, id));

  const snapshotByLine = new Map(snapshots.map((s) => [s.payrollLineId, s]));

  const hibak = await db
    .select()
    .from(berSzamfejtesValidaciosHiba)
    .where(eq(berSzamfejtesValidaciosHiba.payrollRunId, id));

  const osszesito = snapshots.length
    ? {
        bruttó: snapshots.reduce((s, x) => s + x.grossAmount, 0),
        szja: snapshots.reduce((s, x) => s + x.calculatedSzja, 0),
        tb: snapshots.reduce((s, x) => s + x.tbAmount, 0),
        szocho: snapshots.reduce((s, x) => s + x.szochoAmount, 0),
        nettó: snapshots.reduce((s, x) => s + x.netAmount, 0),
        tag_szám: new Set(snapshots.map((s) => s.tagId)).size,
      }
    : null;

  return {
    futas: futasValasz(futas),
    munkalapok: munkalapok.map((ml) => ({
      id: ml.id,
      azonosito: ml.azonosito,
      nev: ml.nev,
      statusz: ml.statusz,
      szf_idoszak: ml.szfIdoszak,
      projekt_id: ml.projektId,
    })),
    sorok: sorok.map((s) => {
      const snap = snapshotByLine.get(s.id);
      return {
        id: s.id,
        tag_id: s.tagId,
        tag_nev: tagNevMap.get(s.tagId) ?? '—',
        projekt_id: s.projektId,
        wage_code_id: s.wageCodeId,
        gross_amount: s.grossAmount,
        work_hours: s.workHours != null ? Number(s.workHours) : null,
        jogviszony_tipus: s.jogviszonyTipus,
        source_munkalap_id: s.sourceMunkalapId,
        snapshot: snap
          ? {
              calculated_szja: snap.calculatedSzja,
              final_szja_base: snap.finalSzjaBase,
              tb_amount: snap.tbAmount,
              szocho_amount: snap.szochoAmount,
              net_amount: snap.netAmount,
              applied_allowances: snap.appliedAllowancesJson,
            }
          : null,
      };
    }),
    validacios_hibak: hibak.map((h) => ({
      id: h.id,
      severity: h.severity,
      code: h.code,
      message: h.message,
      tag_id: h.tagId,
      munkalap_id: h.munkalapId,
      payroll_line_id: h.payrollLineId,
    })),
    osszesito,
  };
}

export async function createPayrollRun(input: {
  payrollPeriod: string;
  performancePeriod?: string;
  munkalapIds?: number[];
  createdBy: string;
}) {
  const existing = await db
    .select()
    .from(berSzamfejtesFutas)
    .where(
      and(
        eq(berSzamfejtesFutas.payrollPeriod, input.payrollPeriod),
        eq(berSzamfejtesFutas.status, 'DRAFT'),
      ),
    );

  if (existing.length > 0) {
    throw new Error(
      `Már van piszkozat futás erre az időszakra (#${existing[0].id}). Nyisd meg azt, vagy zárd le.`,
    );
  }

  let munkalapSorok = await db
    .select()
    .from(munkalap)
    .where(
      and(
        eq(munkalap.szfIdoszak, input.payrollPeriod),
        inArray(munkalap.statusz, JOVAHAGYOTT_STATUSZOK),
      ),
    );

  if (input.munkalapIds?.length) {
    const idSet = new Set(input.munkalapIds);
    munkalapSorok = munkalapSorok.filter((ml) => idSet.has(ml.id));
  }

  const [futas] = await db
    .insert(berSzamfejtesFutas)
    .values({
      payrollPeriod: input.payrollPeriod,
      performancePeriod: input.performancePeriod ?? input.payrollPeriod,
      status: 'DRAFT',
      createdBy: input.createdBy,
    })
    .returning();

  if (munkalapSorok.length) {
    await db.insert(berSzamfejtesFutasMunkalap).values(
      munkalapSorok.map((ml) => ({ futasId: futas.id, munkalapId: ml.id })),
    );
  }

  await syncPayrollLines(futas.id);
  return getPayrollRunDetail(futas.id);
}

export async function syncPayrollLines(futasId: number) {
  const [futas] = await db.select().from(berSzamfejtesFutas).where(eq(berSzamfejtesFutas.id, futasId));
  if (!futas) throw new Error('Futás nem található.');
  if (futas.status !== 'DRAFT' && futas.status !== 'VALIDATED') {
    throw new Error('Csak piszkozat vagy validált futás szinkronizálható.');
  }

  await db.delete(berSzamfejtettSor).where(eq(berSzamfejtettSor.payrollRunId, futasId));

  const mlKapcsolatok = await db
    .select({ munkalapId: berSzamfejtesFutasMunkalap.munkalapId })
    .from(berSzamfejtesFutasMunkalap)
    .where(eq(berSzamfejtesFutasMunkalap.futasId, futasId));

  if (!mlKapcsolatok.length) return;

  const munkalapok = await db
    .select()
    .from(munkalap)
    .where(inArray(munkalap.id, mlKapcsolatok.map((k) => k.munkalapId)));

  const projektIds = [...new Set(munkalapok.map((ml) => ml.projektId))];
  const projektek = await db.select().from(projekt).where(inArray(projekt.id, projektIds));
  const projektMap = new Map(projektek.map((p) => [p.id, p]));

  const allTagIds = new Set<number>();
  for (const ml of munkalapok) {
    const diakok = Array.isArray(ml.diakok) ? ml.diakok : [];
    for (const d of diakok) {
      const id = Number((d as { student_id?: number }).student_id);
      if (id) allTagIds.add(id);
    }
  }

  const tagok = allTagIds.size
    ? await db.select().from(szovetkezetiTag).where(inArray(szovetkezetiTag.id, [...allTagIds]))
    : [];
  const tagJogviszony = new Map(tagok.map((t) => [t.id, inferJogviszonyFromTag(t)]));

  const insertValues = [];
  for (const ml of munkalapok) {
    const p = projektMap.get(ml.projektId);
    const berKodok = p ? berKodokFromProjekt(p) : [];
    const lines = buildLinesFromMunkalap(ml, berKodok, tagJogviszony);
    for (const line of lines) {
      insertValues.push({
        payrollRunId: futasId,
        tagId: line.tagId,
        projektId: line.projektId,
        wageCodeId: line.wageCodeId,
        grossAmount: line.grossAmount,
        workHours: String(line.workHours),
        workDateFrom: line.workDateFrom,
        workDateTo: line.workDateTo,
        jogviszonyTipus: line.jogviszonyTipus,
        sourceMunkalapId: line.sourceMunkalapId,
      });
    }
  }

  if (insertValues.length) {
    await db.insert(berSzamfejtettSor).values(insertValues);
  }
}

export async function validatePayrollRunById(futasId: number) {
  const detail = await getPayrollRunDetail(futasId);
  if (!detail) throw new Error('Futás nem található.');

  const [futas] = await db.select().from(berSzamfejtesFutas).where(eq(berSzamfejtesFutas.id, futasId));
  if (!futas || (futas.status !== 'DRAFT' && futas.status !== 'VALIDATED')) {
    throw new Error('Csak piszkozat vagy validált futás validálható.');
  }

  await syncPayrollLines(futasId);

  const mlIds = detail.munkalapok.map((m) => m.id);
  const munkalapok = mlIds.length
    ? await db.select().from(munkalap).where(inArray(munkalap.id, mlIds))
    : [];

  const sorok = await db
    .select()
    .from(berSzamfejtettSor)
    .where(eq(berSzamfejtettSor.payrollRunId, futasId));

  const tagIds = [...new Set(sorok.map((s) => s.tagId))];
  const tagok = tagIds.length
    ? await db.select().from(szovetkezetiTag).where(inArray(szovetkezetiTag.id, tagIds))
    : [];

  const issues = validatePayrollRun({
    futas: { payrollPeriod: futas.payrollPeriod, status: futas.status },
    munkalapok: munkalapok.map((ml) => ({
      id: ml.id,
      azonosito: ml.azonosito,
      statusz: ml.statusz,
      szfIdoszak: ml.szfIdoszak,
    })),
    sorok,
    tagok: tagok.map((t) => ({
      id: t.id,
      nev: t.nev,
      adoszam: t.adoszam,
      szuldat: t.szuldat ? String(t.szuldat).slice(0, 10) : null,
      tagsagStatusz: t.tagsagStatusz,
      diakigErvenyes: t.diakigErvenyes ? String(t.diakigErvenyes).slice(0, 10) : null,
    })),
  });

  await db
    .delete(berSzamfejtesValidaciosHiba)
    .where(eq(berSzamfejtesValidaciosHiba.payrollRunId, futasId));

  if (issues.length) {
    await db.insert(berSzamfejtesValidaciosHiba).values(
      issues.map((i) => ({
        payrollRunId: futasId,
        severity: i.severity,
        code: i.code,
        message: i.message,
        tagId: i.tagId ?? null,
        munkalapId: i.munkalapId ?? null,
        payrollLineId: i.payrollLineId ?? null,
      })),
    );
  }

  const newStatus = hasBlockingErrors(issues) ? 'DRAFT' : 'VALIDATED';
  await db
    .update(berSzamfejtesFutas)
    .set({ status: newStatus })
    .where(eq(berSzamfejtesFutas.id, futasId));

  return getPayrollRunDetail(futasId);
}

export async function closePayrollRun(futasId: number, actorId: string) {
  const [futas] = await db.select().from(berSzamfejtesFutas).where(eq(berSzamfejtesFutas.id, futasId));
  if (!futas) throw new Error('Futás nem található.');
  if (futas.status !== 'VALIDATED') {
    throw new Error('Csak validált futás zárható le. Futtasd előbb a validálást.');
  }

  const taxYear = taxYearFromPeriod(futas.payrollPeriod);
  const taxConfig = await getActiveTaxYearConfig(taxYear);
  if (!taxConfig) {
    throw new Error(`Nincs aktív adóévi konfiguráció (${taxYear}).`);
  }

  const sorok = await db
    .select()
    .from(berSzamfejtettSor)
    .where(eq(berSzamfejtettSor.payrollRunId, futasId));

  const tagIds = [...new Set(sorok.map((s) => s.tagId))];
  const tagok = tagIds.length
    ? await db.select().from(szovetkezetiTag).where(inArray(szovetkezetiTag.id, tagIds))
    : [];
  const tagMap = new Map(tagok.map((t) => [t.id, t]));

  await db
    .delete(adoSzamitasSnapshot)
    .where(eq(adoSzamitasSnapshot.payrollRunId, futasId));

  for (const sor of sorok) {
    const tag = tagMap.get(sor.tagId);
    if (!tag) continue;

    const result = calculatePayrollTaxes({
      payrollLine: { grossAmount: sor.grossAmount, wageCodeId: sor.wageCodeId },
      member: {
        id: tag.id,
        name: tag.nev,
        birthDate: tag.szuldat ? String(tag.szuldat).slice(0, 10) : null,
        taxIdentificationNumber: tag.adoszam,
      },
      membership: {
        status: tag.tagsagStatusz,
        startDate: tag.belepes ? String(tag.belepes).slice(0, 10) : null,
        endDate: tag.kilepes ? String(tag.kilepes).slice(0, 10) : null,
      },
      studentStatus: { isFullTime: isFullTimeStudent(tag) },
      taxProfile: {},
      taxYearConfig: taxConfig,
      activeAllowances: await listActiveAllowancesForPayroll(sor.tagId, futas.payrollPeriod),
      employmentRelation: {
        relationType: (sor.jogviszonyTipus as 'SCHOOL_COOP_MEMBER_WORK') ?? 'SCHOOL_COOP_MEMBER_WORK',
        isInsured: false,
      },
      payrollPeriod: futas.payrollPeriod,
      calculationVersion: CALCULATION_VERSION,
    });

    await db.insert(adoSzamitasSnapshot).values({
      payrollRunId: futasId,
      payrollLineId: sor.id,
      tagId: sor.tagId,
      taxYear,
      grossAmount: sor.grossAmount,
      incomeCategory: result.incomeCategory,
      initialSzjaBase: result.initialSzjaBase,
      appliedAllowancesJson: result.appliedAllowances,
      finalSzjaBase: result.finalSzjaBase,
      calculatedSzja: result.calculatedSzja,
      tbBase: result.tbBase,
      tbAmount: result.tbAmount,
      szochoBase: result.szochoBase,
      szochoAmount: result.szochoAmount,
      netAmount: result.netAmount,
      tbExemptReason: result.tbExemptReason,
      szochoExemptReason: result.szochoExemptReason,
      calculationVersion: CALCULATION_VERSION,
      isImmutable: true,
    });
  }

  await db
    .update(berSzamfejtesFutas)
    .set({ status: 'CLOSED', closedAt: new Date() })
    .where(eq(berSzamfejtesFutas.id, futasId));

  const mlKapcsolatok = await db
    .select({ munkalapId: berSzamfejtesFutasMunkalap.munkalapId })
    .from(berSzamfejtesFutasMunkalap)
    .where(eq(berSzamfejtesFutasMunkalap.futasId, futasId));

  if (mlKapcsolatok.length) {
    await db
      .update(munkalap)
      .set({ statusz: 'Számfejtett' })
      .where(inArray(munkalap.id, mlKapcsolatok.map((k) => k.munkalapId)));
  }

  return getPayrollRunDetail(futasId);
}

export async function startPayrollCorrection(futasId: number, createdBy: string) {
  const [futas] = await db.select().from(berSzamfejtesFutas).where(eq(berSzamfejtesFutas.id, futasId));
  if (!futas) throw new Error('Futás nem található.');
  if (futas.status !== 'CLOSED' && futas.status !== 'DECLARED') {
    throw new Error('Csak lezárt vagy bevallt futásból indítható korrekció.');
  }

  const [uj] = await db
    .insert(berSzamfejtesFutas)
    .values({
      payrollPeriod: futas.payrollPeriod,
      performancePeriod: futas.performancePeriod,
      status: 'DRAFT',
      createdBy,
      korrekcioSzuloId: futasId,
    })
    .returning();

  const mlKapcsolatok = await db
    .select()
    .from(berSzamfejtesFutasMunkalap)
    .where(eq(berSzamfejtesFutasMunkalap.futasId, futasId));

  if (mlKapcsolatok.length) {
    await db.insert(berSzamfejtesFutasMunkalap).values(
      mlKapcsolatok.map((k) => ({ futasId: uj.id, munkalapId: k.munkalapId })),
    );
  }

  await db
    .update(berSzamfejtesFutas)
    .set({ status: 'CORRECTED' })
    .where(eq(berSzamfejtesFutas.id, futasId));

  await syncPayrollLines(uj.id);
  return getPayrollRunDetail(uj.id);
}
