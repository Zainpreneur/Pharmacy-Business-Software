import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/auth";
import { badRequest, notFound } from "../utils/errors";

const router = Router();
router.use(authenticate);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = (req.query.q as string) || "";
    const customers = await prisma.customer.findMany({
      where: q ? { name: { contains: q } } : undefined,
      orderBy: { name: "asc" },
    });
    res.json(customers);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: { sales: { orderBy: { createdAt: "desc" }, take: 20 } },
    });
    if (!customer) throw notFound("Customer not found");
    res.json(customer);
  })
);

const upsertSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
});

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = upsertSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest("Invalid customer payload", parsed.error.flatten());
    const customer = await prisma.customer.create({ data: parsed.data });
    res.status(201).json(customer);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const parsed = upsertSchema.partial().safeParse(req.body);
    if (!parsed.success) throw badRequest("Invalid customer payload", parsed.error.flatten());
    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) throw notFound("Customer not found");
    const customer = await prisma.customer.update({ where: { id }, data: parsed.data });
    res.json(customer);
  })
);

export default router;
