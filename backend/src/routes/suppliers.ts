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
  asyncHandler(async (req, res) => {
    const q = (req.query.q as string) || "";
    const suppliers = await prisma.supplier.findMany({
      where: q ? { name: { contains: q } } : undefined,
      orderBy: { name: "asc" },
    });
    res.json(suppliers);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: { purchases: { orderBy: { createdAt: "desc" }, take: 20 } },
    });
    if (!supplier) throw notFound("Supplier not found");
    res.json(supplier);
  })
);

const upsertSchema = z.object({
  name: z.string().min(2),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
});

router.post(
  "/",
  authorize("ADMIN", "PHARMACIST"),
  asyncHandler(async (req, res) => {
    const parsed = upsertSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest("Invalid supplier payload", parsed.error.flatten());
    const supplier = await prisma.supplier.create({ data: parsed.data });
    res.status(201).json(supplier);
  })
);

router.put(
  "/:id",
  authorize("ADMIN", "PHARMACIST"),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const parsed = upsertSchema.partial().safeParse(req.body);
    if (!parsed.success) throw badRequest("Invalid supplier payload", parsed.error.flatten());
    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing) throw notFound("Supplier not found");
    const supplier = await prisma.supplier.update({ where: { id }, data: parsed.data });
    res.json(supplier);
  })
);

router.delete(
  "/:id",
  authorize("ADMIN"),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing) throw notFound("Supplier not found");
    await prisma.supplier.delete({ where: { id } });
    res.status(204).send();
  })
);

export default router;
