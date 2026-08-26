import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/auth";

const router = Router();
router.use(authenticate);

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const expiryThreshold = new Date();
    expiryThreshold.setDate(expiryThreshold.getDate() + 30);

    const [todaySales, monthSales, medicines, totalCustomers, totalSuppliers, expiringBatches, recentSales] =
      await Promise.all([
        prisma.sale.aggregate({
          where: { createdAt: { gte: startOfToday } },
          _sum: { totalAmount: true },
          _count: true,
        }),
        prisma.sale.aggregate({
          where: { createdAt: { gte: startOfMonth } },
          _sum: { totalAmount: true },
          _count: true,
        }),
        prisma.medicine.findMany({ include: { batches: true } }),
        prisma.customer.count(),
        prisma.supplier.count(),
        prisma.batch.findMany({
          where: { expiryDate: { lte: expiryThreshold }, quantity: { gt: 0 } },
          include: { medicine: true },
          orderBy: { expiryDate: "asc" },
          take: 10,
        }),
        prisma.sale.findMany({
          orderBy: { createdAt: "desc" },
          take: 5,
          include: { customer: true, user: true },
        }),
      ]);

    const lowStock = medicines
      .map((m) => ({ ...m, stock: m.batches.reduce((s, b) => s + b.quantity, 0) }))
      .filter((m) => m.stock <= m.reorderLevel);

    const inventoryValue = medicines.reduce(
      (sum, m) => sum + m.batches.reduce((s, b) => s + b.quantity * b.sellingPrice, 0),
      0
    );

    res.json({
      todayRevenue: todaySales._sum.totalAmount || 0,
      todayOrders: todaySales._count,
      monthRevenue: monthSales._sum.totalAmount || 0,
      monthOrders: monthSales._count,
      totalMedicines: medicines.length,
      lowStockCount: lowStock.length,
      expiringSoonCount: expiringBatches.length,
      totalCustomers,
      totalSuppliers,
      inventoryValue,
      lowStockItems: lowStock.slice(0, 10),
      expiringBatches,
      recentSales,
    });
  })
);

export default router;
