export type ReservationStatus = "PENDING" | "CONFIRMED" | "RELEASED";

export interface StockEntry {
  warehouseId: string;
  warehouseName: string;
  warehouseCity: string;
  total: number;
  reserved: number;
  available: number;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  price: number;
  category: string;
  imageUrl: string | null;
  stock: StockEntry[];
}

export interface Warehouse {
  id: string;
  name: string;
  city: string;
  state: string;
}

export interface Reservation {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  productPrice: number;
  warehouseId: string;
  warehouseName: string;
  warehouseCity: string;
  quantity: number;
  status: ReservationStatus;
  expiresAt: string;
  confirmedAt: string | null;
  releasedAt: string | null;
  createdAt: string;
}

export interface ApiErrorResponse {
  error: string;
  details?: unknown;
  available?: number;
  requested?: number;
  expiredAt?: string;
}
