import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate, authorize } from "../middleware/auth";
import { badRequest, notFound } from "../utils/errors";

const router = Router();
router.use(authenticate);

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { medicines: true } } },
    });
    res.json(categories);
  })
);

const upsertSchema = z.object({ name: z.string().min(2) });

router.post(
  "/",
  authorize("ADMIN", "PHARMACIST"),
  asyncHandler(async (req, res) => {
    const parsed = upsertSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest("Invalid category payload", parsed.error.flatten());
    const category = await prisma.category.create({ data: parsed.data });
    res.status(201).json(category);
  })
);

router.put(
  "/:id",
  authorize("ADMIN", "PHARMACIST"),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const parsed = upsertSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest("Invalid category payload", parsed.error.flatten());
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) throw notFound("Category not found");
    const category = await prisma.category.update({ where: { id }, data: parsed.data });
    res.json(category);
  })
);

router.delete(
  "/:id",
  authorize("ADMIN"),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) throw notFound("Category not found");
    await prisma.category.delete({ where: { id } });
    res.status(204).send();
  })
);

export default router;
