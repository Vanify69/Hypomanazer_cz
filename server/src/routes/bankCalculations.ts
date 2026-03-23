import { Router, type Request, type Response } from "express";

function userId(req: Request): string {
  return (req as Request & { user?: { userId: string } }).user!.userId;
}
import { requireAuth } from "../middleware/auth.js";
import {
  getCaseBankSummary,
  runAllBanks,
  runCalculation,
  getRunForDownload,
} from "../modules/bankCalculators/bankCalculationService.js";
import { assertBankCode } from "../modules/bankCalculators/bankTemplateService.js";

const router = Router();
router.use(requireAuth);

router.get("/cases/:caseId/summary", async (req: Request, res: Response) => {
  try {
    const summary = await getCaseBankSummary(userId(req), req.params.caseId);
    res.json(summary);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Chyba.";
    res.status(msg.includes("nenalezen") ? 404 : 400).json({ error: msg });
  }
});

router.post("/cases/:caseId/run", async (req: Request, res: Response) => {
  try {
    const uid = userId(req);
    const caseId = req.params.caseId;
    const body = req.body as { bankCode?: string };
    if (body?.bankCode) {
      const code = assertBankCode(body.bankCode);
      const result = await runCalculation(uid, caseId, code);
      res.json(result);
      return;
    }
    const results = await runAllBanks(uid, caseId);
    res.json(results);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Výpočet selhal.";
    res.status(msg.includes("nenalezen") ? 404 : 400).json({ error: msg });
  }
});

router.get("/runs/:runId/download", async (req: Request, res: Response) => {
  try {
    const { buffer, fileName, mimeType } = await getRunForDownload(req.params.runId, userId(req));
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.send(buffer);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Stažení selhalo.";
    res.status(404).json({ error: msg });
  }
});

export { router as bankCalculationsRouter };
