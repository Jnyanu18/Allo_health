export interface StockEntry {
  warehouseId: string;
  warehouseName: string;
  warehouseLocation: string;
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
  imageUrl: string | null;
  stock: StockEntry[];
}

export interface Warehouse {
  id: string;
  name: string;
  location: string;
}

export interface Reservation {
  id: string;
  productId: string;
  productName: string;
  productSku?: string;
  productPrice?: number;
  warehouseId: string;
  warehouseName: string;
  warehouseLocation?: string;
  quantity: number;
  status: "PENDING" | "CONFIRMED" | "RELEASED";
  expiresAt: string;
  confirmedAt: string | null;
  releasedAt: string | null;
  createdAt: string;
}
