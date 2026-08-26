import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();
router.use(authenticate);

// Sales report grouped by day within a date range
router.get(
  "/sales",
  asyncHandler(async (req, res) => {
    const from = req.query.from ? new Date(req.query.from as string) : new Date(new Date().setDate(new Date().getDate() - 30));
    const to = req.query.to ? new Date(req.query.to as string) : new Date();

    const sales = await prisma.sale.findMany({
      where: { createdAt: { gte: from, lte: to } },
      include: { items: true },
      orderBy: { createdAt: "asc" },
    });

    const byDay = new Map<string, { date: string; revenue: number; orders: number; itemsSold: number }>();
    for (const sale of sales) {
      const day = sale.createdAt.toISOString().slice(0, 10);
      const entry = byDay.get(day) || { date: day, revenue: 0, orders: 0, itemsSold: 0 };
      entry.revenue += sale.totalAmount;
      entry.orders += 1;
      entry.itemsSold += sale.items.reduce((s, i) => s + i.quantity, 0);
      byDay.set(day, entry);
    }

    const totalRevenue = sales.reduce((s, sale) => s + sale.totalAmount, 0);

    res.json({
      from,
      to,
      totalRevenue,
      totalOrders: sales.length,
      byDay: Array.from(byDay.values()),
    });
  })
);

// Best selling medicines within a date range
router.get(
  "/top-medicines",
  asyncHandler(async (req, res) => {
    const from = req.query.from ? new Date(req.query.from as string) : new Date(new Date().setDate(new Date().getDate() - 30));
    const to = req.query.to ? new Date(req.query.to as string) : new Date();

    const items = await prisma.saleItem.findMany({
      where: { sale: { createdAt: { gte: from, lte: to } } },
      include: { medicine: true },
    });

    const byMedicine = new Map<number, { medicineId: number; name: string; quantitySold: number; revenue: number }>();
    for (const item of items) {
      const entry = byMedicine.get(item.medicineId) || {
        medicineId: item.medicineId,
        name: item.medicine.name,
        quantitySold: 0,
        revenue: 0,
      };
      entry.quantitySold += item.quantity;
      entry.revenue += item.total;
      byMedicine.set(item.medicineId, entry);
    }

    const result = Array.from(byMedicine.values()).sort((a, b) => b.quantitySold - a.quantitySold).slice(0, 20);
    res.json(result);
  })
);

// Current inventory valuation report
router.get(
  "/inventory",
  authorize("ADMIN", "PHARMACIST"),
  asyncHandler(async (_req, res) => {
    const medicines = await prisma.medicine.findMany({ include: { batches: true, category: true } });
    const rows = medicines.map((m) => {
      const stock = m.batches.reduce((s, b) => s + b.quantity, 0);
      const costValue = m.batches.reduce((s, b) => s + b.quantity * b.purchasePrice, 0);
      const retailValue = m.batches.reduce((s, b) => s + b.quantity * b.sellingPrice, 0);
      return {
        medicineId: m.id,
        name: m.name,
        category: m.category?.name || "Uncategorized",
        stock,
        reorderLevel: m.reorderLevel,
        costValue,
        retailValue,
      };
    });

    const totals = rows.reduce(
      (acc, r) => ({ costValue: acc.costValue + r.costValue, retailValue: acc.retailValue + r.retailValue }),
      { costValue: 0, retailValue: 0 }
    );

    res.json({ rows, totals });
  })
);

// Expiry report
router.get(
  "/expiry",
  asyncHandler(async (req, res) => {
    const days = req.query.days ? Number(req.query.days) : 90;
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

export default router;
