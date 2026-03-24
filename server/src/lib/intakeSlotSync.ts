import { prisma } from "./prisma.js";
import type { PersonRole } from "./prisma.js";

/** Sjednocený typ příjmu pro intake (API + wizard). */
export type IntakeIncomeKind = "EMPLOYED" | "SELF_EMPLOYED" | "BOTH" | "COMPANY";

export function normalizeIntakeIncome(v: unknown): IntakeIncomeKind {
  if (v === "SELF_EMPLOYED") return "SELF_EMPLOYED";
  if (v === "BOTH") return "BOTH";
  if (v === "COMPANY") return "COMPANY";
  return "EMPLOYED";
}

/**
 * Smaže / doplní sloty TAX_RETURN a BANK_STATEMENT pro danou roli podle typu příjmu.
 * OP sloty řeší volající.
 */
export async function syncIncomeDocumentSlots(
  intakeSessionId: string,
  personRole: PersonRole,
  income: IntakeIncomeKind
): Promise<void> {
  const wantTax = income === "SELF_EMPLOYED" || income === "BOTH" || income === "COMPANY";
  const wantBank = income === "EMPLOYED" || income === "BOTH";

  if (!wantTax) {
    await prisma.uploadSlot.deleteMany({
      where: { intakeSessionId, personRole, docType: "TAX_RETURN" },
    });
  }
  if (!wantBank) {
    await prisma.uploadSlot.deleteMany({
      where: { intakeSessionId, personRole, docType: "BANK_STATEMENT" },
    });
  }

  const rs = await prisma.uploadSlot.findMany({
    where: { intakeSessionId, personRole },
  });

  if (wantTax) {
    const hasTax = rs.some((s) => s.docType === "TAX_RETURN");
    if (!hasTax) {
      await prisma.uploadSlot.create({
        data: {
          intakeSessionId,
          personRole,
          docType: "TAX_RETURN",
          required: true,
          period: String(new Date().getFullYear()),
        },
      });
    }
  }

  if (wantBank) {
    const refreshed = await prisma.uploadSlot.findMany({
      where: { intakeSessionId, personRole, docType: "BANK_STATEMENT" },
    });
    for (let i = refreshed.length; i < 6; i++) {
      await prisma.uploadSlot.create({
        data: { intakeSessionId, personRole, docType: "BANK_STATEMENT", required: true },
      });
    }
  }
}
