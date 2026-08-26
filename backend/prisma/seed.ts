import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const adminPassword = await bcrypt.hash("Admin@123", 10);
  const pharmacistPassword = await bcrypt.hash("Pharma@123", 10);
  const cashierPassword = await bcrypt.hash("Cashier@123", 10);

  await prisma.user.upsert({
    where: { email: "admin@pharmacy.com" },
    update: {},
    create: {
      name: "System Admin",
      email: "admin@pharmacy.com",
      password: adminPassword,
      role: "ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { email: "pharmacist@pharmacy.com" },
    update: {},
    create: {
      name: "Head Pharmacist",
      email: "pharmacist@pharmacy.com",
      password: pharmacistPassword,
      role: "PHARMACIST",
    },
  });

  await prisma.user.upsert({
    where: { email: "cashier@pharmacy.com" },
    update: {},
    create: {
      name: "Front Desk Cashier",
      email: "cashier@pharmacy.com",
      password: cashierPassword,
      role: "CASHIER",
    },
  });

  const categories = ["Analgesics", "Antibiotics", "Antacids", "Vitamins & Supplements", "Cold & Cough", "Diabetes Care"];
  const categoryRecords: Record<string, number> = {};
  for (const name of categories) {
    const cat = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    categoryRecords[name] = cat.id;
  }

  const supplier = await prisma.supplier.create({
    data: {
      name: "MediSupply Distributors",
      contactPerson: "John Carter",
      phone: "+1-555-0100",
      email: "sales@medisupply.example.com",
      address: "12 Industrial Ave, Springfield",
    },
  });

  const medicines = [
    { name: "Paracetamol 500mg", genericName: "Paracetamol", category: "Analgesics", manufacturer: "Acme Pharma", unit: "strip", strength: "500mg", reorderLevel: 50, purchasePrice: 0.8, sellingPrice: 1.5 },
    { name: "Amoxicillin 250mg", genericName: "Amoxicillin", category: "Antibiotics", manufacturer: "Acme Pharma", unit: "strip", strength: "250mg", reorderLevel: 30, purchasePrice: 1.2, sellingPrice: 2.4, requiresPrescription: true },
    { name: "Omeprazole 20mg", genericName: "Omeprazole", category: "Antacids", manufacturer: "HealthGen", unit: "strip", strength: "20mg", reorderLevel: 20, purchasePrice: 1.0, sellingPrice: 2.0 },
    { name: "Vitamin C 1000mg", genericName: "Ascorbic Acid", category: "Vitamins & Supplements", manufacturer: "NutriLife", unit: "bottle", strength: "1000mg", reorderLevel: 15, purchasePrice: 3.5, sellingPrice: 6.0 },
    { name: "Cetirizine 10mg", genericName: "Cetirizine", category: "Cold & Cough", manufacturer: "HealthGen", unit: "strip", strength: "10mg", reorderLevel: 25, purchasePrice: 0.6, sellingPrice: 1.2 },
    { name: "Metformin 500mg", genericName: "Metformin", category: "Diabetes Care", manufacturer: "Acme Pharma", unit: "strip", strength: "500mg", reorderLevel: 20, purchasePrice: 1.1, sellingPrice: 2.1, requiresPrescription: true },
  ];

  for (const m of medicines) {
    const medicine = await prisma.medicine.create({
      data: {
        name: m.name,
        genericName: m.genericName,
        categoryId: categoryRecords[m.category],
        manufacturer: m.manufacturer,
        unit: m.unit,
        strength: m.strength,
        reorderLevel: m.reorderLevel,
        purchasePrice: m.purchasePrice,
        sellingPrice: m.sellingPrice,
        requiresPrescription: m.requiresPrescription ?? false,
      },
    });

    const nearExpiry = new Date();
    nearExpiry.setDate(nearExpiry.getDate() + 25);
    const farExpiry = new Date();
    farExpiry.setFullYear(farExpiry.getFullYear() + 2);

    await prisma.batch.create({
      data: {
        medicineId: medicine.id,
        batchNo: `B-${medicine.id}-A`,
        quantity: 40,
        purchasePrice: m.purchasePrice,
        sellingPrice: m.sellingPrice,
        expiryDate: nearExpiry,
      },
    });

    await prisma.batch.create({
      data: {
        medicineId: medicine.id,
        batchNo: `B-${medicine.id}-B`,
        quantity: 100,
        purchasePrice: m.purchasePrice,
        sellingPrice: m.sellingPrice,
        expiryDate: farExpiry,
      },
    });
  }

  await prisma.purchase.create({
    data: {
      invoiceNo: "PUR-SEED-0001",
      supplierId: supplier.id,
      totalAmount: 0,
      status: "RECEIVED",
    },
  });

  await prisma.customer.create({
    data: { name: "Walk-in Customer", phone: "", email: "" },
  });

  console.log("Seeding complete.");
  console.log("Login with: admin@pharmacy.com / Admin@123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
