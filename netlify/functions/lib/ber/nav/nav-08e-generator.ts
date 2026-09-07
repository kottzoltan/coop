import { createHash } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { getStore } from '@netlify/blobs';
import { db } from '../../../../../db/index.js';
import {
  berAuditLog,
  bevallasExportFajl,
  bevallasFutas,
  bevallasSzemelyiSor,
  bevallasValidaciosHiba,
  jogviszony,
  navUrlapVerzio,
  szovetkezetiTag,
  tagsag,
} from '../../../../../db/schema.js';
import {
  nav08eHasBlockingErrors,
  nav08eStatusFromStartDate,
  validateNav08e,
} from '../../../../../shared/src/ber/nav-08e.js';
import { buildNav08AnykXml } from './nav-xml-builder.js';
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

function tagsagiSzerzodesAlairva(
  tagsagRow: typeof tagsag.$inferSelect | undefined,
  dokumentumok: unknown,
): boolean {
  if (tagsagRow?.membershipAgreementSignedAt) return true;
  if (!Array.isArray(dokumentumok)) return false;
  return dokumentumok.some(
    (d) =>
      d &&
      typeof d === 'object' &&
      ((d as { tipus?: string }).tipus === 'tagsagi_szerzodes' ||
        (d as { tipus?: string }).tipus === 'tagsági_szerződés' ||
        String((d as { nev?: string }).nev ?? '')
          .toLowerCase()
          .includes('tagsági')),
  );
}

export async function generateEmploymentRegistrationExport(input: {
  tagId: number;
  jogviszonyId: number;
  generatedBy: string;
}) {
  const [tag] = await db.select().from(szovetkezetiTag).where(eq(szovetkezetiTag.id, input.tagId));
  if (!tag) throw new Error('Tag nem található.');

  const [jv] = await db.select().from(jogviszony).where(eq(jogviszony.id, input.jogviszonyId));
  if (!jv || jv.tagId !== input.tagId) throw new Error('Jogviszony nem található.');

  const [tagsagRow] = await db.select().from(tagsag).where(eq(tagsag.tagId, input.tagId));

  const startDate = String(jv.startDate).slice(0, 10);
  const membershipSigned = tagsagiSzerzodesAlairva(tagsagRow, tag.dokumentumok);

  const exportInput = {
    tagId: tag.id,
    name: tag.nev,
    taxIdentificationNumber: tag.adoszam ?? '',
    birthDate: tag.szuldat ? String(tag.szuldat).slice(0, 10) : '',
    taj: tag.taj,
    relationType: jv.relationType,
    startDate,
    endDate: jv.endDate ? String(jv.endDate).slice(0, 10) : null,
    navDeclarationRequired: jv.navDeclarationRequired,
    membershipAgreementSigned: membershipSigned,
    status: nav08eStatusFromStartDate(startDate) as 'SCHEDULED' | 'READY',
  };

  const issues = validateNav08e(exportInput);
  const taxYear = Number(startDate.slice(0, 4));

  const [formVersion] = await db
    .select()
    .from(navUrlapVerzio)
    .where(
      and(eq(navUrlapVerzio.formCode, '08E'), eq(navUrlapVerzio.taxYear, taxYear), eq(navUrlapVerzio.isActive, true)),
    );

  const runStatus = nav08eHasBlockingErrors(issues)
    ? 'DRAFT'
    : exportInput.status === 'SCHEDULED'
      ? 'DRAFT'
      : 'VALIDATED';

  const [bevallas] = await db
    .insert(bevallasFutas)
    .values({
      type: 'NAV_08E',
      taxYear,
      period: startDate.slice(0, 7),
      payrollRunIds: [],
      status: runStatus,
      generatedAt: new Date(),
      generatedBy: input.generatedBy,
      formVersionId: formVersion?.id ?? null,
    })
    .returning();

  await db.insert(bevallasSzemelyiSor).values({
    declarationRunId: bevallas.id,
    tagId: tag.id,
    taxIdentificationNumber: tag.adoszam ?? '',
    name: tag.nev,
    birthDate: tag.szuldat ? String(tag.szuldat).slice(0, 10) : startDate,
    relationType: jv.relationType,
    grossAmount: 0,
    finalSzjaBase: 0,
    calculatedSzja: 0,
    tbAmount: 0,
    szochoAmount: 0,
    exemptionsJson: {
      taj: tag.taj ?? '',
      startDate,
      endDate: exportInput.endDate ?? '',
      scheduled: exportInput.status === 'SCHEDULED' ? 'true' : 'false',
    },
  });

  if (issues.length) {
    await db.insert(bevallasValidaciosHiba).values(
      issues.map((i) => ({
        declarationRunId: bevallas.id,
        severity: i.severity,
        code: i.code,
        message: i.message,
        tagId: tag.id,
      })),
    );
  }

  await audit('BevallasFutas', bevallas.id, 'NAV08E_GENERATED', input.generatedBy, {
    jogviszonyId: input.jogviszonyId,
    status: exportInput.status,
  });

  return {
    bevallas_id: bevallas.id,
    status: runStatus,
    scheduled: exportInput.status === 'SCHEDULED',
    issues,
    tag_nev: tag.nev,
    relation_type: jv.relationType,
  };
}

export async function exportNav08eDeclaration(bevallasId: number, actorId: string) {
  const [bevallas] = await db.select().from(bevallasFutas).where(eq(bevallasFutas.id, bevallasId));
  if (!bevallas || bevallas.type !== 'NAV_08E') throw new Error('08E bejelentés nem található.');
  if (bevallas.status !== 'VALIDATED' && bevallas.status !== 'EXPORTED') {
    throw new Error('Csak validált 08E exportálható.');
  }

  const hibak = await db
    .select()
    .from(bevallasValidaciosHiba)
    .where(
      and(
        eq(bevallasValidaciosHiba.declarationRunId, bevallasId),
        eq(bevallasValidaciosHiba.severity, 'ERROR'),
      ),
    );
  if (hibak.length) throw new Error('Validációs hibák miatt nem exportálható.');

  const [sor] = await db
    .select()
    .from(bevallasSzemelyiSor)
    .where(eq(bevallasSzemelyiSor.declarationRunId, bevallasId));

  if (!sor) throw new Error('Személyi sor hiányzik.');

  const ex = (sor.exemptionsJson ?? {}) as Record<string, string>;
  const [formVersion] = bevallas.formVersionId
    ? await db.select().from(navUrlapVerzio).where(eq(navUrlapVerzio.id, bevallas.formVersionId))
    : [];

  const mappings = formVersion?.fieldMappingJson ?? [];

  const xml = buildNav08AnykXml({
    meta: {
      formCode: '08E',
      taxYear: bevallas.taxYear,
      period: bevallas.period ?? '',
      cooperativeTaxId: envGet('ICE_COOPERATIVE_TAX_ID') ?? '0000000000',
      cooperativeName: envGet('ICE_COOPERATIVE_NAME') ?? 'ICE Iskolaszövetkezet',
    },
    summary: {
      personCount: 1,
      totalGross: 0,
      totalSzjaBase: 0,
      totalSzja: 0,
      totalTb: 0,
      totalSzocho: 0,
    },
    personLines: [
      {
        tagId: sor.tagId,
        taxIdentificationNumber: sor.taxIdentificationNumber,
        name: sor.name,
        birthDate: String(sor.birthDate).slice(0, 10),
        relationType: sor.relationType ?? 'EMPLOYMENT',
        grossAmount: 0,
        finalSzjaBase: 0,
        calculatedSzja: 0,
        tbAmount: 0,
        szochoAmount: 0,
        exemptionsJson: ex,
      },
    ],
    mappings,
  });

  const store = getStore({ name: BLOB_STORE, consistency: 'strong' });
  const fileName = `08E_${sor.tagId}_${ex.startDate ?? bevallas.period}.xml`;
  const path = `nav08e/${bevallasId}/${fileName}`;
  const hash = sha256(xml);
  await store.set(path, xml, { metadata: { mime: 'application/xml', hash } });

  await db.insert(bevallasExportFajl).values({
    declarationRunId: bevallasId,
    fileType: 'ANYK_XML',
    fileName,
    fileHash: hash,
    storagePath: path,
  });

  await db.update(bevallasFutas).set({ status: 'EXPORTED' }).where(eq(bevallasFutas.id, bevallasId));
  await audit('BevallasFutas', bevallasId, 'NAV08E_EXPORTED', actorId, { fileName, hash });

  return { fileName, hash };
}

export async function listJogviszonyok(tagId: number) {
  const sorok = await db.select().from(jogviszony).where(eq(jogviszony.tagId, tagId));
  return sorok.map((j) => ({
    id: j.id,
    tag_id: j.tagId,
    relation_type: j.relationType,
    is_insured: j.isInsured,
    nav_declaration_required: j.navDeclarationRequired,
    start_date: String(j.startDate).slice(0, 10),
    end_date: j.endDate ? String(j.endDate).slice(0, 10) : null,
    status: j.status,
    project_id: j.projectId,
  }));
}

export async function createJogviszony(input: {
  tagId: number;
  relationType: string;
  isInsured?: boolean;
  navDeclarationRequired?: boolean;
  startDate: string;
  endDate?: string | null;
  projectId?: number | null;
}) {
  const defaults: Record<string, Partial<typeof jogviszony.$inferInsert>> = {
    SCHOOL_COOP_MEMBER_WORK: {
      isInsured: false,
      tbExemptReason: 'ISKOLASZOVETKEZETI_TAG_NAPPALI',
      szochoExemptReason: 'ISKOLASZOVETKEZETI_JOGVISZONY',
      navDeclarationRequired: false,
    },
    EMPLOYMENT: {
      isInsured: true,
      navDeclarationRequired: true,
    },
    ASSIGNMENT: {
      isInsured: true,
      navDeclarationRequired: true,
    },
  };

  const d = defaults[input.relationType] ?? {};

  const [row] = await db
    .insert(jogviszony)
    .values({
      tagId: input.tagId,
      relationType: input.relationType,
      isInsured: input.isInsured ?? d.isInsured ?? false,
      tbExemptReason: d.tbExemptReason ?? null,
      szochoExemptReason: d.szochoExemptReason ?? null,
      navDeclarationRequired: input.navDeclarationRequired ?? d.navDeclarationRequired ?? false,
      startDate: input.startDate,
      endDate: input.endDate ?? null,
      projectId: input.projectId ?? null,
      status: 'AKTIV',
    })
    .returning();

  return {
    id: row.id,
    relation_type: row.relationType,
    nav_declaration_required: row.navDeclarationRequired,
    start_date: String(row.startDate).slice(0, 10),
  };
}
