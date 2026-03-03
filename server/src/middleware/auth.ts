import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-in-production";

export interface JwtPayload {
  userId: string;
  email: string;
}

export async function requireAuth(
  req: Request & { user?: JwtPayload },
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: "Nejste přihlášeni." });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true },
    });
    if (!user) {
      res.status(401).json({ error: "Uživatel nenalezen." });
      return;
    }
    req.user = { userId: user.id, email: user.email };
    next();
  } catch {
    res.status(401).json({ error: "Neplatný nebo vypršený token." });
  }
}
