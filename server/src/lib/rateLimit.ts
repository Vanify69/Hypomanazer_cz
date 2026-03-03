/**
 * Rate limiting pro veřejné endpointy (intake, ref) – ochrana proti zneužití tokenu a brute-force.
 */

import rateLimit from "express-rate-limit";

const WINDOW_MS = 15 * 60 * 1000; // 15 minut
const MAX_REQUESTS = 80; // na IP za okno

export const publicApiLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Příliš mnoho požadavků. Zkuste to znovu za chvíli." },
});
