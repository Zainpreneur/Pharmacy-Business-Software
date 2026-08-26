import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/auth";
import { badRequest, notFound } from "../utils/errors";
import { generateReference } from "../utils/invoice";

const router = Router();
router.use(authenticate);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const from = req.query.from ? new Date(req.query.from as string) : undefined;
    const to = req.query.to ? new Date(req.query.to as string) : undefined;

    const sales = await prisma.sale.findMany({
      where: {
        createdAt: {
          gte: from,
          lte: to,
        },
      },
      include: { customer: true, user: true, items: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    res.json(sales);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        customer: true,
        user: true,
        items: { include: { medicine: true, batch: true } },
      },
    });
    if (!sale) throw notFound("Sale not found");
    res.json(sale);
  })
);

const cartItemSchema = z.object({
  medicineId: z.number().int(),
  quantity: z.number().int().positive(),
});

const createSaleSchema = z.object({
  customerId: z.number().int().optional().nullable(),
  items: z.array(cartItemSchema).min(1),
  discount: z.number().min(0).default(0),
  tax: z.number().min(0).default(0),
  paymentMethod: z.enum(["CASH", "CARD", "MOBILE", "INSURANCE"]).default("CASH"),
});

// Creates a sale, deducting stock across batches using FEFO
// (First-Expiry-First-Out), so soonest-to-expire stock sells first.
router.post(
  "/",
  asyncHandler(async (req, res) => {
    if (!req.user) throw badRequest("Missing authenticated user");
    const parsed = createSaleSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest("Invalid sale payload", parsed.error.flatten());
    const { customerId, items, discount, tax, paymentMethod } = parsed.data;

    const sale = await prisma.$transaction(async (tx) => {
      const saleItemsData: {
        medicineId: number;
        batchId: number;
        quantity: number;
        unitPrice: number;
        total: number;
      }[] = [];
      let subtotal = 0;

      for (const cartItem of items) {
        const medicine = await tx.medicine.findUnique({ where: { id: cartItem.medicineId } });
        if (!medicine) throw notFound(`Medicine ${cartItem.medicineId} not found`);

        const batches = await tx.batch.findMany({
          where: { medicineId: cartItem.medicineId, quantity: { gt: 0 } },
          orderBy: { expiryDate: "asc" },
        });

        const totalAvailable = batches.reduce((sum, b) => sum + b.quantity, 0);
        if (totalAvailable < cartItem.quantity) {
          throw badRequest(
            `Insufficient stock for ${medicine.name}. Available: ${totalAvailable}, requested: ${cartItem.quantity}`
          );
        }

        let remaining = cartItem.quantity;
        for (const batch of batches) {
          if (remaining <= 0) break;
          const deduct = Math.min(batch.quantity, remaining);

          await tx.batch.update({
            where: { id: batch.id },
            data: { quantity: batch.quantity - deduct },
          });

          const unitPrice = batch.sellingPrice || medicine.sellingPrice;
          const lineTotal = deduct * unitPrice;
          subtotal += lineTotal;

          saleItemsData.push({
            medicineId: medicine.id,
            batchId: batch.id,
            quantity: deduct,
            unitPrice,
            total: lineTotal,
          });

          remaining -= deduct;
        }
      }

      const totalAmount = Math.max(0, subtotal - discount + tax);
      const invoiceNo = generateReference("INV");

      return tx.sale.create({
        data: {
          invoiceNo,
          customerId: customerId ?? null,
          userId: req.user!.id,
          subtotal,
          discount,
          tax,
          totalAmount,
          paymentMethod,
          items: { create: saleItemsData },
        },
        include: { items: { include: { medicine: true, batch: true } }, customer: true, user: true },
      });
    });

    res.status(201).json(sale);
  })
);

export default router;
