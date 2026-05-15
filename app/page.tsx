import { Product } from "@/types";
import ProductGrid from "./components/ProductGrid";

async function getProducts(): Promise<Product[]> {
  // Mock data for previewing frontend without a database
  return [
    {
      id: "prod_1",
      name: "Sony WH-1000XM5 Headphones",
      sku: "SONY-WH1000XM5",
      description: "Industry-leading noise canceling with Speak-to-Chat technology",
      price: 29990,
      imageUrl: "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=400",
      stock: [
        { warehouseId: "w1", warehouseName: "Mumbai Central", warehouseLocation: "Mumbai", total: 15, reserved: 0, available: 15 },
        { warehouseId: "w2", warehouseName: "Bangalore Tech Park", warehouseLocation: "Bengaluru", total: 3, reserved: 0, available: 3 }
      ]
    },
    {
      id: "prod_2",
      name: "Apple AirPods Pro (2nd Gen)",
      sku: "APPLE-APP2",
      description: "Active noise cancellation, Transparency mode, Adaptive Audio",
      price: 24900,
      imageUrl: "https://images.unsplash.com/photo-1588156979435-379b9d802b0a?w=400",
      stock: [
        { warehouseId: "w1", warehouseName: "Mumbai Central", warehouseLocation: "Mumbai", total: 0, reserved: 0, available: 0 }
      ]
    },
    {
      id: "prod_3",
      name: "Logitech MX Master 3S",
      sku: "LOGI-MXM3S",
      description: "8K DPI sensor, MagSpeed scroll wheel, USB-C charging",
      price: 9995,
      imageUrl: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400",
      stock: [
        { warehouseId: "w2", warehouseName: "Bangalore Tech Park", warehouseLocation: "Bengaluru", total: 22, reserved: 20, available: 2 }
      ]
    }
  ];
}

export default async function Home() {
  const products = await getProducts();

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* Hero section */}
      <div className="mb-14 relative">
        <div className="absolute -top-6 -left-6 w-32 h-32 bg-[#e8c547]/5 blur-[80px] pointer-events-none" />
        <p className="font-mono text-xs text-[#e8c547] tracking-[0.3em] mb-4 animate-fade-in">
          MULTI-WAREHOUSE INVENTORY
        </p>
        <h1 className="text-5xl font-bold tracking-tight text-[#e8e4dc] mb-4 leading-[1.1]">
          Available Products
        </h1>
        <p className="text-[#555] text-sm max-w-xl leading-relaxed">
          Stock is shown per warehouse. Reservations hold units for{" "}
          <span className="text-[#e8c547] font-mono">10 minutes</span> while you
          complete checkout. Concurrency-safe — powered by Redis locks and
          serializable transactions.
        </p>
        <div className="flex items-center gap-4 mt-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#55c47a] animate-pulse" />
            <span className="font-mono text-xs text-[#555]">
              {products.length} PRODUCTS AVAILABLE
            </span>
          </div>
          <span className="text-[#222]">·</span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#e8c547]" />
            <span className="font-mono text-xs text-[#555]">
              {products.reduce((sum, p) => sum + p.stock.length, 0)} WAREHOUSE
              ENTRIES
            </span>
          </div>
        </div>
      </div>
      <ProductGrid products={products} />
    </div>
  );
}
