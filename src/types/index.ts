export type RoleName = 'ADMIN' | 'MANAGER' | 'CASHIER' | 'BARTENDER' | 'STOREKEEPER';

export interface AuthUser {
  id: string;
  name: string;
  username: string;
  role: RoleName;
}

export interface Category {
  id: string;
  name: string;
  description?: string | null;
}

export interface ProductUnit {
  id: string;
  productId: string;
  name: string;
  quantityInBaseUnit: string;
  isPurchaseUnit: boolean;
  isSaleUnit: boolean;
  isBaseUnit: boolean;
}

export interface Product {
  id: string;
  name: string;
  categoryId?: string | null;
  category?: Category | null;
  sku?: string | null;
  barcode?: string | null;
  description?: string | null;
  trackInventory: boolean;
  tracksEmptyBottles: boolean;
  isActive: boolean;
  units: ProductUnit[];
  prices?: ProductPrice[];
}

export interface ProductPrice {
  id: string;
  productId: string;
  unitId: string;
  unit?: ProductUnit;
  price: string;
  priceType: 'NORMAL' | 'WHOLESALE' | 'HAPPY_HOUR' | 'SPECIAL';
  effectiveFrom: string;
  effectiveTo?: string | null;
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  isActive: boolean;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  creditLimit: string;
  isActive: boolean;
}

export type PaymentMethod = 'CASH' | 'AIRTEL_MONEY' | 'MPAMBA' | 'BANK' | 'CREDIT' | 'OTHER';

export interface CashSession {
  id: string;
  userId: string;
  openedAt: string;
  closedAt?: string | null;
  openingCash: string;
  expectedCash?: string | null;
  actualCash?: string | null;
  difference?: string | null;
  status: 'OPEN' | 'CLOSED';
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  userId: string;
  user?: { id: string; name: string };
  customerId?: string | null;
  customer?: Customer | null;
  saleDate: string;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  status: 'COMPLETED' | 'VOIDED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';
  items: SaleItem[];
  payments: { id: string; paymentMethod: PaymentMethod; amount: string }[];
}

export interface SaleItem {
  id: string;
  productId: string;
  product?: Product;
  unitId: string;
  unit?: ProductUnit;
  quantity: string;
  unitPrice: string;
  discount: string;
  total: string;
}

export interface Purchase {
  id: string;
  supplierId?: string | null;
  supplier?: Supplier | null;
  invoiceNumber?: string | null;
  purchaseDate: string;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  amountPaid: string;
  paymentStatus: 'PAID' | 'PARTIAL' | 'CREDIT';
  items: PurchaseItem[];
}

export interface PurchaseItem {
  id: string;
  productId: string;
  product?: Product;
  unitId: string;
  unit?: ProductUnit;
  quantity: string;
  unitCost: string;
  totalCost: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
}

export interface Expense {
  id: string;
  categoryId: string;
  category?: ExpenseCategory;
  description: string;
  amount: string;
  paymentMethod: PaymentMethod;
  expenseDate: string;
}

export interface StockSummaryEntry {
  productId: string;
  name: string;
  baseUnit: string;
  stock: number;
  status?: 'OUT_OF_STOCK' | 'LOW' | 'OK';
}

export type EmptyBottleTransactionType = 'COLLECTED' | 'RETURNED_TO_SUPPLIER' | 'BROKEN' | 'ADJUSTMENT';

export interface EmptyBottleSummaryEntry {
  productId: string;
  name: string;
  count: number;
}

export interface AuditLogEntry {
  id: string;
  userId?: string | null;
  user?: { id: string; name: string; username: string } | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValues?: unknown;
  newValues?: unknown;
  createdAt: string;
}
