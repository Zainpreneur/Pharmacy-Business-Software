export type Role = "ADMIN" | "PHARMACIST" | "CASHIER";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: Role;
}

export interface Category {
  id: number;
  name: string;
  _count?: { medicines: number };
}

export interface Supplier {
  id: number;
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
}

export interface Customer {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
}

export interface Batch {
  id: number;
  medicineId: number;
  batchNo: string;
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
  expiryDate: string;
  medicine?: Medicine;
}

export interface Medicine {
  id: number;
  name: string;
  genericName?: string | null;
  categoryId?: number | null;
  category?: Category | null;
  manufacturer?: string | null;
  unit: string;
  strength?: string | null;
  reorderLevel: number;
  purchasePrice: number;
  sellingPrice: number;
  requiresPrescription: boolean;
  batches: Batch[];
  stock: number;
}

export interface PurchaseItem {
  id: number;
  medicineId: number;
  medicine?: Medicine;
  batchNo: string;
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
  expiryDate: string;
}

export interface Purchase {
  id: number;
  invoiceNo: string;
  supplierId: number;
  supplier?: Supplier;
  items: PurchaseItem[];
  totalAmount: number;
  status: string;
  createdAt: string;
}

export interface SaleItem {
  id: number;
  medicineId: number;
  medicine?: Medicine;
  batchId: number;
  batch?: Batch;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Sale {
  id: number;
  invoiceNo: string;
  customerId?: number | null;
  customer?: Customer | null;
  userId: number;
  user?: AuthUser;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  tax: number;
  totalAmount: number;
  paymentMethod: string;
  createdAt: string;
}

export interface DashboardData {
  todayRevenue: number;
  todayOrders: number;
  monthRevenue: number;
  monthOrders: number;
  totalMedicines: number;
  lowStockCount: number;
  expiringSoonCount: number;
  totalCustomers: number;
  totalSuppliers: number;
  inventoryValue: number;
  lowStockItems: Medicine[];
  expiringBatches: Batch[];
  recentSales: Sale[];
}
