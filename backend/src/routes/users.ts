import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate, authorize } from "../middleware/auth";
import { badRequest, notFound } from "../utils/errors";

const router = Router();
router.use(authenticate, authorize("ADMIN"));

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    res.json(users);
  })
);

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(["ADMIN", "PHARMACIST", "CASHIER"]).optional(),
  active: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest("Invalid user payload", parsed.error.flatten());
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw notFound("User not found");

    const data: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.password) {
      data.password = await bcrypt.hash(parsed.data.password, 10);
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, active: true },
    });
    res.json(user);
  })
);

export default router;
