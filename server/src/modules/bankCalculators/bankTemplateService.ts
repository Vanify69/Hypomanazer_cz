import crypto from "crypto";
import path from "path";
import {
  bankTemplateRelativePath,
  writeBufferToStorageKey,
  readBufferFromStorageKey,
  storageKeyExists,
} from "../../lib/bankStoragePaths.js";
import {
  prisma,
  BankCalculatorCode,
  BankTemplateMappingStatus,
} from "../../lib/prisma.js";
import { bankAdapterRegistry } from "./registry.js";
import { MockCalculationEngine } from "./calculationEngine.js";

const ALLOWED_EXT = ".xlsm";
const MAX_BYTES = 25 * 1024 * 1024;

function parseBankCode(raw: string): BankCalculatorCode | null {
  const u = raw.toUpperCase();
  if (u === "RB") return BankCalculatorCode.RB;
  if (u === "UCB") return BankCalculatorCode.UCB;
  return null;
}

export function assertBankCode(raw: string): BankCalculatorCode {
  const c = parseBankCode(raw);
  if (!c) throw new Error("Neplatný kód banky. Použijte RB nebo UCB.");
  return c;
}

export async function listTemplatesForUser(userId: string) {
  return prisma.bankTemplate.findMany({
    where: { userId },
    orderBy: { bankCode: "asc" },
  });
}

export async function uploadTemplate(
  userId: string,
  bankCodeRaw: string,
  file: { originalname: string; mimetype?: string; buffer: Buffer; size: number }
) {
  const bankCode = assertBankCode(bankCodeRaw);
  if (!file.buffer?.length) throw new Error("Prázdný soubor.");
  if (file.size > MAX_BYTES) throw new Error("Soubor je příliš velký (max. 25 MB).");

  const orig =
    Buffer.from(file.originalname || "template.xlsm", "latin1").toString("utf8") || "template.xlsm";
  const ext = path.extname(orig).toLowerCase();
  if (ext !== ALLOWED_EXT) throw new Error("Povolený formát je pouze .xlsm.");

  const unique = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ALLOWED_EXT}`;
  const safeBase = path.basename(orig, ext).replace(/[^\w.\-]+/g, "_").slice(0, 60) || "template";
  const storageKey = bankTemplateRelativePath(userId, bankCode, `${safeBase}-${unique}`);

  const contentHash = crypto.createHash("sha256").update(file.buffer).digest("hex");

  writeBufferToStorageKey(storageKey, file.buffer);

  const template = await prisma.bankTemplate.upsert({
    where: { userId_bankCode: { userId, bankCode } },
    create: {
      userId,
      bankCode,
      originalFileName: orig,
      mimeType: file.mimetype ?? "application/vnd.ms-excel.sheet.macroEnabled.12",
      storageKey,
      mappingStatus: BankTemplateMappingStatus.NEEDS_REVIEW,
      contentHash,
      mappingVersion: 1,
    },
    update: {
      originalFileName: orig,
      mimeType: file.mimetype ?? "application/vnd.ms-excel.sheet.macroEnabled.12",
      storageKey,
      mappingStatus: BankTemplateMappingStatus.NEEDS_REVIEW,
      contentHash,
    },
  });

  return template;
}

/**
 * Ověří, že soubor existuje na disku a že adaptér ho umí načíst (bez skutečného Excel přepočtu).
 */
export async function validateTemplate(userId: string, bankCodeRaw: string): Promise<{
  ok: boolean;
  message: string;
  mappingStatus: BankTemplateMappingStatus;
}> {
  const bankCode = assertBankCode(bankCodeRaw);
  const template = await prisma.bankTemplate.findUnique({
    where: { userId_bankCode: { userId, bankCode } },
  });
  if (!template) {
    return {
      ok: false,
      message: "Nejprve nahrajte šablonu.",
      mappingStatus: BankTemplateMappingStatus.UNKNOWN,
    };
  }
  if (!storageKeyExists(template.storageKey)) {
    await prisma.bankTemplate.update({
      where: { id: template.id },
      data: { mappingStatus: BankTemplateMappingStatus.INVALID },
    });
    return {
      ok: false,
      message: "Soubor šablony na disku chybí. Nahrajte šablonu znovu.",
      mappingStatus: BankTemplateMappingStatus.INVALID,
    };
  }

  const adapter = bankAdapterRegistry.get(bankCode);
  if (!adapter) {
    return { ok: false, message: "Adaptér pro banku není zaregistrován.", mappingStatus: BankTemplateMappingStatus.INVALID };
  }

  try {
    const buf = readBufferFromStorageKey(template.storageKey);
    const loaded = await adapter.loadTemplate({ template, fileBuffer: buf });
    const engine = new MockCalculationEngine();
    await adapter.mapInputs(loaded, { caseId: "validate", applicants: [{ role: "primary" }] });
    await adapter.calculate(loaded, engine);
    await prisma.bankTemplate.update({
      where: { id: template.id },
      data: { mappingStatus: BankTemplateMappingStatus.VALID, mappingVersion: loaded.mapping.version },
    });
    return {
      ok: true,
      message: "Šablona je načitelná (mock validace – skutečné buňky ještě ověřte).",
      mappingStatus: BankTemplateMappingStatus.VALID,
    };
  } catch (e) {
    await prisma.bankTemplate.update({
      where: { id: template.id },
      data: { mappingStatus: BankTemplateMappingStatus.INVALID },
    });
    const msg = e instanceof Error ? e.message : "Validace selhala.";
    return { ok: false, message: msg, mappingStatus: BankTemplateMappingStatus.INVALID };
  }
}
