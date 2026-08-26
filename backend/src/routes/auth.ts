import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { badRequest, unauthorized } from "../utils/errors";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest("Invalid credentials payload", parsed.error.flatten());

    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.active) throw unauthorized("Invalid email or password");

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw unauthorized("Invalid email or password");

    const payload = { id: user.id, email: user.email, role: user.role, name: user.name };
    const signOptions: jwt.SignOptions = {
      expiresIn: (process.env.JWT_EXPIRES_IN || "8h") as jwt.SignOptions["expiresIn"],
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET as string, signOptions);

    res.json({ token, user: payload });
  })
);

router.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    res.json({ user: req.user });
  })
);

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "PHARMACIST", "CASHIER"]).default("CASHIER"),
});

// Admin-only user creation (also exposed under /api/users for management)
router.post(
  "/register",
  authenticate,
  authorize("ADMIN"),
  asyncHandler(async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest("Invalid registration payload", parsed.error.flatten());

    const { name, email, password, role } = parsed.data;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw badRequest("A user with this email already exists");

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role },
    });

    res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role });
  })
);

export default router;
