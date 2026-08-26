import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate, authorize } from "../middleware/auth";
import { badRequest, notFound } from "../utils/errors";
import { generateReference } from "../utils/invoice";

const router = Router();
router.use(authenticate);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const supplierId = req.query.supplierId ? Number(req.query.supplierId) : undefined;
    const purchases = await prisma.purchase.findMany({
      where: supplierId ? { supplierId } : undefined,
      include: { supplier: true, items: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(purchases);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const purchase = await prisma.purchase.findUnique({
      where: { id },
      include: { supplier: true, items: { include: { medicine: true } } },
    });
    if (!purchase) throw notFound("Purchase not found");
    res.json(purchase);
  })
);

const itemSchema = z.object({
  medicineId: z.number().int(),
  batchNo: z.string().min(1),
  quantity: z.number().int().positive(),
  purchasePrice: z.number().min(0),
  sellingPrice: z.number().min(0),
  expiryDate: z.string().min(1), // ISO date
});

const createSchema = z.object({
  supplierId: z.number().int(),
  items: z.array(itemSchema).min(1),
});

// Creating a purchase receives stock: it creates a Batch per item (stock-in)
// and updates the medicine's default purchase/selling price for convenience.
router.post(
  "/",
  authorize("ADMIN", "PHARMACIST"),
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest("Invalid purchase payload", parsed.error.flatten());
    const { supplierId, items } = parsed.data;

    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) throw notFound("Supplier not found");

    for (const item of items) {
      const medicine = await prisma.medicine.findUnique({ where: { id: item.medicineId } });
      if (!medicine) throw notFound(`Medicine ${item.medicineId} not found`);
    }

    const totalAmount = items.reduce((sum, i) => sum + i.quantity * i.purchasePrice, 0);
    const invoiceNo = generateReference("PUR");

    const purchase = await prisma.$transaction(async (tx) => {
      const created = await tx.purchase.create({
        data: {
          invoiceNo,
          supplierId,
          totalAmount,
          status: "RECEIVED",
          items: {
            create: items.map((i) => ({
              medicineId: i.medicineId,
              batchNo: i.batchNo,
              quantity: i.quantity,
              purchasePrice: i.purchasePrice,
              sellingPrice: i.sellingPrice,
              expiryDate: new Date(i.expiryDate),
            })),
          },
        },
        include: { items: true, supplier: true },
      });

      for (const item of items) {
        await tx.batch.create({
          data: {
            medicineId: item.medicineId,
            batchNo: item.batchNo,
            quantity: item.quantity,
            purchasePrice: item.purchasePrice,
            sellingPrice: item.sellingPrice,
            expiryDate: new Date(item.expiryDate),
          },
        });

        await tx.medicine.update({
          where: { id: item.medicineId },
          data: { purchasePrice: item.purchasePrice, sellingPrice: item.sellingPrice },
        });
      }

      return created;
    });

    res.status(201).json(purchase);
  })
);

export default router;
