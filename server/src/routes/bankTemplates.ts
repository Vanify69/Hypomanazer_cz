import { Router, type Request, type Response } from "express";

function userId(req: Request): string {
  return (req as Request & { user?: { userId: string } }).user!.userId;
}
import multer from "multer";
import { requireAuth } from "../middleware/auth.js";
import {
  listTemplatesForUser,
  uploadTemplate,
  validateTemplate,
} from "../modules/bankCalculators/bankTemplateService.js";

const router = Router();
router.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

router.get("/", async (req: Request, res: Response) => {
  const list = await listTemplatesForUser(userId(req));
  res.json(list);
});

router.post("/:bankCode/upload", upload.single("file"), async (req: Request, res: Response) => {
  try {
    const uid = userId(req);
    const bankCode = req.params.bankCode;
    const f = req.file;
    if (!f?.buffer) {
      res.status(400).json({ error: "Chybí soubor (pole file)." });
      return;
    }
    const template = await uploadTemplate(uid, bankCode, {
      originalname: f.originalname,
      mimetype: f.mimetype,
      buffer: f.buffer,
      size: f.size,
    });
    res.json(template);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Nahrání selhalo.";
    res.status(400).json({ error: msg });
  }
});

router.post("/:bankCode/validate", async (req: Request, res: Response) => {
  try {
    const result = await validateTemplate(userId(req), req.params.bankCode);
    res.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Validace selhala.";
    res.status(400).json({ error: msg });
  }
});

export { router as bankTemplatesRouter };
