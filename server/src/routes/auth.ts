import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { getJwtSecret, getJwtExpiresIn } from "../lib/env.js";

const router = Router();

// Registrace
router.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body as {
      email?: string;
      password?: string;
      name?: string;
    };

    if (!email?.trim() || !password?.trim()) {
      res.status(400).json({ error: "E-mail a heslo jsou povinné." });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (existing) {
      res.status(400).json({ error: "Účet s tímto e-mailem již existuje." });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        name: name?.trim() || null,
      },
      select: { id: true, email: true, name: true },
    });

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      getJwtSecret() as jwt.Secret,
      { expiresIn: getJwtExpiresIn() } as jwt.SignOptions
    );

    res.status(201).json({
      user: { id: user.id, email: user.email, name: user.name },
      token,
    });
  } catch (err) {
    console.error("[auth] Chyba při registraci:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Registrace se nepodařila. Zkuste to později.",
    });
  }
});

// Přihlášení
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email?.trim() || !password) {
      res.status(400).json({ error: "E-mail a heslo jsou povinné." });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (!user) {
      res.status(401).json({ error: "Nesprávný e-mail nebo heslo." });
      return;
    }
    if (!user.password) {
      console.error("[auth] User bez hesla:", user.id);
      res.status(500).json({ error: "Účet nemá nastavené heslo. Kontaktujte podporu." });
      return;
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      res.status(401).json({ error: "Nesprávný e-mail nebo heslo." });
      return;
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      getJwtSecret() as jwt.Secret,
      { expiresIn: getJwtExpiresIn() } as jwt.SignOptions
    );

    res.json({
      user: { id: user.id, email: user.email, name: user.name },
      token,
    });
  } catch (err) {
    console.error("[auth] Chyba při přihlášení:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Přihlášení se nepodařilo. Zkuste to později.",
    });
  }
});

// Aktuální uživatel (pro ověření tokenu)
router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: (req as any).user.userId },
    select: { id: true, email: true, name: true },
  });
  if (!user) {
    res.status(404).json({ error: "Uživatel nenalezen." });
    return;
  }
  res.json({ user });
});

export { router as authRouter };
