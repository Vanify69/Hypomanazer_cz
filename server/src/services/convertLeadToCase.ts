import path from "path";
import fs from "fs";
import { prisma } from "../lib/prisma.js";
import { getCaseUploadDir, getIntakeUploadDir, getUploadDir } from "../lib/upload.js";
import type { DocType, PersonRole } from "../lib/prisma.js";

const DOC_TYPE_TO_CASE_FILE_TYPE: Record<DocType, string> = {
  ID_FRONT: "op-predni",
  ID_BACK: "op-zadni",
  TAX_RETURN: "danove",
  BANK_STATEMENT: "vypisy",
  INCOME_CONFIRMATION: "vypisy",
  OTHER: "vypisy",
};

const DOC_TYPE_COPY_ORDER: DocType[] = [
  "ID_FRONT",
  "ID_BACK",
  "TAX_RETURN",
  "BANK_STATEMENT",
  "INCOME_CONFIRMATION",
  "OTHER",
];

type SlotWithFile = {
  id: string;
  docType: DocType;
  personRole: PersonRole;
  status: string;
  storageKey: string | null;
  period: string | null;
};

function sortSlotsForCopy(slots: SlotWithFile[]): SlotWithFile[] {
  const docRank = (d: DocType) => {
    const i = DOC_TYPE_COPY_ORDER.indexOf(d);
    return i === -1 ? 999 : i;
  };
  const roleRank = (r: PersonRole) => (r === "CO_APPLICANT" ? 1 : 0);
  return [...slots].sort((a, b) => {
    const rr = roleRank(a.personRole) - roleRank(b.personRole);
    if (rr !== 0) return rr;
    const dr = docRank(a.docType) - docRank(b.docType);
    if (dr !== 0) return dr;
    return a.id.localeCompare(b.id);
  });
}

function roleStr(role: unknown): string {
  return typeof role === "string" ? role : String(role ?? "");
}

/** Spolužadatel: CO_APPLICANT sloty (wizard je vytvořil), nahrané soubory, nebo metadata submitu. */
function wantsCoApplicantPerson(session: {
  uploadSlots: { personRole: unknown; status: string; storageKey: string | null }[];
  intakeMetadata: string | null;
}): boolean {
  const hasCoSlots = session.uploadSlots.some((s) => roleStr(s.personRole) === "CO_APPLICANT");
  if (hasCoSlots) return true;
  const uploadedCo = session.uploadSlots.some(
    (s) =>
      roleStr(s.personRole) === "CO_APPLICANT" &&
      s.status === "UPLOADED" &&
      Boolean(s.storageKey)
  );
  if (uploadedCo) return true;
  if (!session.intakeMetadata?.trim()) return false;
  try {
    const m = JSON.parse(session.intakeMetadata) as Record<string, unknown>;
    if (m.hasCoApplicant === true) return true;
    const rel = m.coApplicantRelation;
    if (rel != null && String(rel).trim() !== "") return true;
  } catch {
    /* ignore */
  }
  return false;
}

async function ensureCoApplicantPersonIfNeeded(
  session: {
    uploadSlots: { personRole: unknown; status: string; storageKey: string | null }[];
    intakeMetadata: string | null;
  },
  caseId: string
): Promise<void> {
  if (!wantsCoApplicantPerson(session)) return;
  const existing = await prisma.person.findFirst({
    where: { caseId, role: "CO_APPLICANT" },
  });
  if (existing) return;
  await prisma.person.create({
    data: { caseId, role: "CO_APPLICANT" },
  });
}

/** Druhá karta v UI (migrateCase) – řádek ExtractedData pro personIndex 1. */
async function ensureCoApplicantExtractedStub(caseId: string): Promise<void> {
  const co = await prisma.person.findFirst({ where: { caseId, role: "CO_APPLICANT" } });
  if (!co) return;
  await prisma.extractedData.upsert({
    where: { caseId_personIndex: { caseId, personIndex: 1 } },
    create: {
      caseId,
      personIndex: 1,
      jmeno: "",
      prijmeni: "",
      rc: "",
      adresa: "",
      prijmy: 0,
      vydaje: 0,
    },
    update: {},
  });
}

/**
 * Zkonvertuje lead na případ: vytvoří Case, Person(s), zkopíruje soubory do CaseFile a Document.
 * Extrakci (OP/DP/výpisy) lze spustit z UI případu nebo později přes job.
 */
export async function convertLeadToCase(intakeSessionId: string): Promise<{ caseId: string }> {
  const session = await prisma.intakeSession.findUnique({
    where: { id: intakeSessionId },
    include: {
      lead: true,
      uploadSlots: true,
    },
  });
  if (!session?.lead) {
    throw new Error("Intake session nebo lead nenalezen.");
  }
  const lead = session.lead;
  if (lead.status === "CONVERTED") {
    const existing = await prisma.case.findFirst({ where: { leadId: lead.id } });
    if (existing) {
      await ensureCoApplicantPersonIfNeeded(session, existing.id);
      await ensureCoApplicantExtractedStub(existing.id);
      return { caseId: existing.id };
    }
  }

  const slotsWithFile = sortSlotsForCopy(
    session.uploadSlots.filter((s) => s.status === "UPLOADED" && s.storageKey) as SlotWithFile[]
  );
  const datum = new Date().toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
  const jmeno = [lead.firstName, lead.lastName].filter(Boolean).join(" ").trim() || "Klient";

  const c = await prisma.case.create({
    data: {
      userId: lead.ownerUserId,
      leadId: lead.id,
      loanType: lead.loanType as string,
      jmeno,
      datum,
      status: "novy",
      dealStatus: "NEW",
      isActive: false,
    },
  });
  const caseId = c.id;
  const caseDir = getCaseUploadDir(caseId);
  const intakeDir = getIntakeUploadDir(session.id);
  const baseUploadDir = getUploadDir();

  await prisma.person.create({
    data: {
      caseId,
      role: "APPLICANT",
      firstName: lead.firstName,
      lastName: lead.lastName,
    },
  });

  if (wantsCoApplicantPerson(session)) {
    await prisma.person.create({
      data: {
        caseId,
        role: "CO_APPLICANT",
      },
    });
  }

  const leadFirst = (lead.firstName ?? "").trim();
  const leadLast = (lead.lastName ?? "").trim();
  await prisma.extractedData.upsert({
    where: { caseId_personIndex: { caseId, personIndex: 0 } },
    create: {
      caseId,
      personIndex: 0,
      jmeno: leadFirst,
      prijmeni: leadLast,
      rc: "",
      adresa: "",
      prijmy: 0,
      vydaje: 0,
    },
    update: {
      jmeno: leadFirst,
      prijmeni: leadLast,
    },
  });
  if (wantsCoApplicantPerson(session)) {
    await prisma.extractedData.upsert({
      where: { caseId_personIndex: { caseId, personIndex: 1 } },
      create: {
        caseId,
        personIndex: 1,
        jmeno: "",
        prijmeni: "",
        rc: "",
        adresa: "",
        prijmy: 0,
        vydaje: 0,
      },
      update: {},
    });
  }

  for (const slot of slotsWithFile) {
    const storageKey = slot.storageKey!;
    const srcPath = path.join(baseUploadDir, "intake", session.id, storageKey);
    const srcPathAlt = path.join(intakeDir, storageKey);
    const resolvedPath = fs.existsSync(srcPath) ? srcPath : srcPathAlt;
    if (!fs.existsSync(resolvedPath)) continue;

    const ext = path.extname(storageKey) || "";
    const filename = `${slot.docType}-${slot.personRole}-${slot.id}${ext}`;
    const destPath = path.join(caseDir, filename);
    fs.copyFileSync(resolvedPath, destPath);
    const relPath = `${caseId}/${filename}`;

    const caseFileType = DOC_TYPE_TO_CASE_FILE_TYPE[slot.docType];
    await prisma.caseFile.create({
      data: {
        caseId,
        type: caseFileType,
        name: storageKey,
        path: relPath,
      },
    });
    await prisma.document.create({
      data: {
        caseId,
        personRole: slot.personRole,
        docType: slot.docType,
        period: slot.period ?? undefined,
        storageKey: relPath,
        originalName: storageKey,
        uploadedBy: "CLIENT",
      },
    });
  }

  await prisma.lead.update({
    where: { id: lead.id },
    data: { status: "CONVERTED" },
  });
  await prisma.intakeSession.update({
    where: { id: session.id },
    data: { state: "CONVERTED" },
  });
  await prisma.leadEvent.create({
    data: {
      leadId: lead.id,
      type: "CONVERTED",
      payload: JSON.stringify({ caseId }),
    },
  });

  return { caseId };
}
