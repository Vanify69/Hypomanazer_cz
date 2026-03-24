import path from "node:path";
import {
  prisma,
  BankCalculatorCode,
  BankCalculationStatus,
} from "../../lib/prisma.js";
import { bankOutputRelativePath, writeBufferToStorageKey, readBufferFromStorageKey } from "../../lib/bankStoragePaths.js";
import { bankAdapterRegistry } from "./registry.js";
import { MockCalculationEngine } from "./calculationEngine.js";
import { isComExcelWorkerConfigured, runComExcelWorker } from "./comExcelWorkerClient.js";
import type { BankCalculationResultDTO, MortgageCaseData } from "./types.js";

export async function assertCaseOwned(caseId: string, userId: string) {
  const c = await prisma.case.findFirst({
    where: { id: caseId, userId },
    include: {
      extractedData: { orderBy: { personIndex: "asc" } },
    },
  });
  if (!c) throw new Error("Případ nenalezen.");
  return c;
}

export function caseRowToMortgageData(row: Awaited<ReturnType<typeof assertCaseOwned>>): MortgageCaseData {
  const applicants: MortgageCaseData["applicants"] = (row.extractedData ?? []).map((p, i) => ({
    role: i === 0 ? "primary" : "co",
    firstName: p.jmeno || undefined,
    lastName: p.prijmeni || undefined,
    birthNumber: p.rc || undefined,
    monthlyIncome: p.prijmy > 0 ? p.prijmy : undefined,
    declaredExpenses: p.vydaje > 0 ? p.vydaje : undefined,
  }));
  if (applicants.length === 0) {
    applicants.push({ role: "primary" });
  }
  return {
    caseId: row.id,
    requestedLoanAmount: row.vyseUveru ?? undefined,
    purpose: row.ucel ?? undefined,
    applicants,
  };
}

function runToDto(run: {
  id: string;
  bankCode: BankCalculatorCode;
  status: BankCalculationStatus;
  maxLoanAmount: number | null;
  monthlyPayment: number | null;
  dsti: number | null;
  dti: number | null;
  pdsti: number | null;
  minRequiredIncome: number | null;
  passFail: string | null;
  outcomeLabel: string | null;
  errorMessage: string | null;
  generatedFileStorageKey: string | null;
}): BankCalculationResultDTO {
  return {
    runId: run.id,
    bankCode: run.bankCode,
    status: run.status,
    maxLoanAmount: run.maxLoanAmount ?? undefined,
    monthlyPayment: run.monthlyPayment ?? undefined,
    dsti: run.dsti ?? undefined,
    dti: run.dti ?? undefined,
    pdsti: run.pdsti ?? undefined,
    minRequiredIncome: run.minRequiredIncome ?? undefined,
    passFail: (run.passFail as BankCalculationResultDTO["passFail"]) ?? undefined,
    outcomeLabel: run.outcomeLabel ?? undefined,
    errorMessage: run.errorMessage ?? undefined,
  };
}

export async function runCalculation(
  userId: string,
  caseId: string,
  bankCode: BankCalculatorCode
): Promise<BankCalculationResultDTO> {
  const row = await assertCaseOwned(caseId, userId);
  const mortgageData = caseRowToMortgageData(row);

  const template = await prisma.bankTemplate.findUnique({
    where: { userId_bankCode: { userId, bankCode } },
  });

  if (!template) {
    const run = await prisma.bankCalculationRun.create({
      data: {
        userId,
        caseId,
        bankCode,
        templateId: null,
        status: BankCalculationStatus.MISSING_TEMPLATE,
        errorMessage: "Chybí nahraná šablona v Nastavení.",
        finishedAt: new Date(),
      },
    });
    return runToDto(run);
  }

  const adapter = bankAdapterRegistry.get(bankCode);
  if (!adapter) {
    const run = await prisma.bankCalculationRun.create({
      data: {
        userId,
        caseId,
        bankCode,
        templateId: template.id,
        status: BankCalculationStatus.FAILED,
        errorMessage: "Adaptér pro banku není k dispozici.",
        finishedAt: new Date(),
      },
    });
    return runToDto(run);
  }

  const run = await prisma.bankCalculationRun.create({
    data: {
      userId,
      caseId,
      bankCode,
      templateId: template.id,
      status: BankCalculationStatus.RUNNING,
    },
  });

  try {
    const fileBuffer = readBufferFromStorageKey(template.storageKey);
    const loaded = await adapter.loadTemplate({ template, fileBuffer });

    let engineLabel = "exceljs-mock";
    if (isComExcelWorkerConfigured()) {
      const preferredExt = path.extname(template.originalFileName || "").toLowerCase() || ".xlsm";
      const { fileBuffer: outBuf, outputs } = await runComExcelWorker({
        fileBuffer: loaded.handle.buffer,
        mapping: loaded.mapping,
        mortgageCaseData: mortgageData,
        preferredExt,
      });
      loaded.handle.buffer = outBuf;
      loaded.handle.comOutputs = outputs;
      engineLabel = "com-worker";
    } else {
      await adapter.mapInputs(loaded, mortgageData);
      const engine = new MockCalculationEngine();
      await adapter.calculate(loaded, engine);
    }

    const partial = await adapter.extractOutputs(loaded, mortgageData);
    const { buffer, fileName } = await adapter.saveGeneratedFile(loaded);
    const outKey = bankOutputRelativePath(userId, caseId, run.id, fileName.replace(/[^\w.\-]+/g, "_"));
    writeBufferToStorageKey(outKey, buffer);

    const status = partial.status ?? BankCalculationStatus.MOCK;
    const updated = await prisma.bankCalculationRun.update({
      where: { id: run.id },
      data: {
        status,
        finishedAt: new Date(),
        generatedFileStorageKey: outKey,
        maxLoanAmount: partial.maxLoanAmount ?? null,
        monthlyPayment: partial.monthlyPayment ?? null,
        dsti: partial.dsti ?? null,
        dti: partial.dti ?? null,
        pdsti: partial.pdsti ?? null,
        minRequiredIncome: partial.minRequiredIncome ?? null,
        passFail: partial.passFail ?? null,
        outcomeLabel: partial.outcomeLabel ?? null,
        errorMessage: partial.errorMessage ?? null,
        metaJson: JSON.stringify({
          engine: engineLabel,
          templateVersion: template.mappingVersion,
          mappingVersion: loaded.mapping.version,
        }),
      },
    });
    return runToDto(updated);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Výpočet selhal.";
    const updated = await prisma.bankCalculationRun.update({
      where: { id: run.id },
      data: {
        status: BankCalculationStatus.FAILED,
        finishedAt: new Date(),
        errorMessage: msg,
      },
    });
    return runToDto(updated);
  }
}

export async function runAllBanks(userId: string, caseId: string): Promise<BankCalculationResultDTO[]> {
  await assertCaseOwned(caseId, userId);
  const codes = bankAdapterRegistry.supportedBanks();
  const out: BankCalculationResultDTO[] = [];
  for (const code of codes) {
    out.push(await runCalculation(userId, caseId, code));
  }
  return out;
}

export type BankSummaryRow = {
  bankCode: BankCalculatorCode;
  bankLabel: string;
  hasTemplate: boolean;
  templateFileName?: string;
  templateUploadedAt?: string;
  mappingStatus?: string;
  lastRun?: BankCalculationResultDTO | null;
  missingTemplateMessage: string | null;
};

const BANK_LABELS: Record<BankCalculatorCode, string> = {
  [BankCalculatorCode.RB]: "Raiffeisenbank",
  [BankCalculatorCode.UCB]: "UniCredit Bank",
};

export async function getCaseBankSummary(userId: string, caseId: string): Promise<BankSummaryRow[]> {
  await assertCaseOwned(caseId, userId);
  const templates = await prisma.bankTemplate.findMany({ where: { userId } });
  const runs = await prisma.bankCalculationRun.findMany({
    where: { caseId, userId },
    orderBy: { startedAt: "desc" },
  });
  const latest = new Map<BankCalculatorCode, (typeof runs)[0]>();
  for (const r of runs) {
    if (!latest.has(r.bankCode)) latest.set(r.bankCode, r);
  }

  return bankAdapterRegistry.supportedBanks().map((code) => {
    const t = templates.find((x) => x.bankCode === code);
    const run = latest.get(code);
    return {
      bankCode: code,
      bankLabel: BANK_LABELS[code] ?? code,
      hasTemplate: !!t,
      templateFileName: t?.originalFileName,
      templateUploadedAt: t?.createdAt.toISOString(),
      mappingStatus: t?.mappingStatus,
      lastRun: run ? runToDto(run) : null,
      missingTemplateMessage: t ? null : "Chybí nahraná šablona v Nastavení",
    };
  });
}

export async function getRunForDownload(runId: string, userId: string): Promise<{
  buffer: Buffer;
  fileName: string;
  mimeType: string;
}> {
  const run = await prisma.bankCalculationRun.findFirst({
    where: { id: runId, userId },
    include: { template: true },
  });
  if (!run?.generatedFileStorageKey) throw new Error("Soubor k této akci neexistuje.");
  const buffer = readBufferFromStorageKey(run.generatedFileStorageKey);
  const bank = run.bankCode === BankCalculatorCode.RB ? "RB" : "UCB";
  const ext = path.extname(run.template?.originalFileName ?? "").toLowerCase();
  const suffix = ext === ".xlsx" || ext === ".xlsm" ? ext : ".xlsm";
  const fileName = `${bank}_case_${run.caseId.slice(0, 8)}${suffix}`;
  return {
    buffer,
    fileName,
    mimeType: "application/vnd.ms-excel.sheet.macroEnabled.12",
  };
}
