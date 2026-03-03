import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "7d";

// Registrace
router.post("/register", async (req, res) => {
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
    JWT_SECRET as jwt.Secret,
    { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
  );

  res.status(201).json({
    user: { id: user.id, email: user.email, name: user.name },
    token,
  });
});

// Přihlášení
router.post("/login", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email?.trim() || !password) {
    res.status(400).json({ error: "E-mail a heslo jsou povinné." });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    res.status(401).json({ error: "Nesprávný e-mail nebo heslo." });
    return;
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email },
    JWT_SECRET as jwt.Secret,
    { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
  );

  res.json({
    user: { id: user.id, email: user.email, name: user.name },
    token,
  });
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
