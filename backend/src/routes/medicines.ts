import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate, authorize } from "../middleware/auth";
import { badRequest, notFound } from "../utils/errors";

const router = Router();
router.use(authenticate);

function withStock<T extends { batches: { quantity: number }[] }>(medicine: T) {
  const stock = medicine.batches.reduce((sum, b) => sum + b.quantity, 0);
  return { ...medicine, stock };
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = (req.query.q as string) || "";
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;

    const medicines = await prisma.medicine.findMany({
      where: {
        AND: [
          q
            ? {
                OR: [
                  { name: { contains: q } },
                  { genericName: { contains: q } },
                  { manufacturer: { contains: q } },
                ],
              }
            : {},
          categoryId ? { categoryId } : {},
        ],
      },
      include: { category: true, batches: true },
      orderBy: { name: "asc" },
    });

    res.json(medicines.map(withStock));
  })
);

router.get(
  "/low-stock",
  asyncHandler(async (_req, res) => {
    const medicines = await prisma.medicine.findMany({ include: { category: true, batches: true } });
    const low = medicines
      .map(withStock)
      .filter((m) => m.stock <= m.reorderLevel)
      .sort((a, b) => a.stock - b.stock);
    res.json(low);
  })
);

router.get(
  "/expiring-soon",
  asyncHandler(async (req, res) => {
    const days = req.query.days ? Number(req.query.days) : 30;
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + days);

    const batches = await prisma.batch.findMany({
      where: { expiryDate: { lte: threshold }, quantity: { gt: 0 } },
      include: { medicine: true },
      orderBy: { expiryDate: "asc" },
    });

    res.json(batches);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const medicine = await prisma.medicine.findUnique({
      where: { id },
      include: { category: true, batches: { orderBy: { expiryDate: "asc" } } },
    });
    if (!medicine) throw notFound("Medicine not found");
    res.json(withStock(medicine));
  })
);

const upsertSchema = z.object({
  name: z.string().min(1),
  genericName: z.string().optional(),
  categoryId: z.number().int().optional().nullable(),
  manufacturer: z.string().optional(),
  unit: z.string().default("pcs"),
  strength: z.string().optional(),
  reorderLevel: z.number().int().min(0).default(10),
  purchasePrice: z.number().min(0).default(0),
  sellingPrice: z.number().min(0).default(0),
  requiresPrescription: z.boolean().default(false),
});

router.post(
  "/",
  authorize("ADMIN", "PHARMACIST"),
  asyncHandler(async (req, res) => {
    const parsed = upsertSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest("Invalid medicine payload", parsed.error.flatten());
    const medicine = await prisma.medicine.create({ data: parsed.data });
    res.status(201).json(medicine);
  })
);

router.put(
  "/:id",
  authorize("ADMIN", "PHARMACIST"),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const parsed = upsertSchema.partial().safeParse(req.body);
    if (!parsed.success) throw badRequest("Invalid medicine payload", parsed.error.flatten());
    const existing = await prisma.medicine.findUnique({ where: { id } });
    if (!existing) throw notFound("Medicine not found");
    const medicine = await prisma.medicine.update({ where: { id }, data: parsed.data });
    res.json(medicine);
  })
);

router.delete(
  "/:id",
  authorize("ADMIN"),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const existing = await prisma.medicine.findUnique({ where: { id } });
    if (!existing) throw notFound("Medicine not found");
    await prisma.medicine.delete({ where: { id } });
    res.status(204).send();
  })
);

export default router;
