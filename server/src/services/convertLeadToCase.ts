import path from "path";
import fs from "fs";
import { prisma } from "../lib/prisma.js";
import { getCaseUploadDir, getIntakeUploadDir, getUploadDir } from "../lib/upload.js";
import type { DocType } from "../lib/prisma.js";

const DOC_TYPE_TO_CASE_FILE_TYPE: Record<DocType, string> = {
  ID_FRONT: "op-predni",
  ID_BACK: "op-zadni",
  TAX_RETURN: "danove",
  BANK_STATEMENT: "vypisy",
  INCOME_CONFIRMATION: "vypisy",
  OTHER: "vypisy",
};

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
    if (existing) return { caseId: existing.id };
  }

  const slotsWithFile = session.uploadSlots.filter((s) => s.status === "UPLOADED" && s.storageKey);
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
