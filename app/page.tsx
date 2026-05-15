import { Product } from "@/types";
import ProductGrid from "./components/ProductGrid";

async function getProducts(): Promise<Product[]> {
  // Mock data for previewing the Allo Health frontend without a database
  return [
    {
      id: "prod_1",
      name: "Tadalafil 10mg",
      sku: "MED-TAD10",
      description:
        "Clinically proven treatment for ED. Long-lasting up to 36 hours.",
      price: 499,
      imageUrl:
        "https://images.unsplash.com/photo-1584308666744-24d5e478eb13?w=400",
      stock: [
        {
          warehouseId: "w1",
          warehouseName: "Mumbai Central",
          warehouseLocation: "Mumbai",
          total: 15,
          reserved: 0,
          available: 15,
        },
        {
          warehouseId: "w2",
          warehouseName: "Delhi North",
          warehouseLocation: "Delhi",
          total: 5,
          reserved: 0,
          available: 5,
        },
      ],
    },
    {
      id: "prod_2",
      name: "Sildenafil 50mg",
      sku: "MED-SIL50",
      description:
        "Fast-acting ED treatment. Effects start within 30-60 minutes.",
      price: 399,
      imageUrl:
        "https://images.unsplash.com/photo-1584308666744-24d5e478eb13?w=400",
      stock: [
        {
          warehouseId: "w1",
          warehouseName: "Mumbai Central",
          warehouseLocation: "Mumbai",
          total: 0,
          reserved: 0,
          available: 0,
        },
      ],
    },
    {
      id: "prod_3",
      name: "Testosterone Booster",
      sku: "SUPP-TEST",
      description:
        "Natural herbal blend to support healthy testosterone levels.",
      price: 899,
      imageUrl:
        "https://images.unsplash.com/photo-1628771065518-0d82f1938462?w=400",
      stock: [
        {
          warehouseId: "w2",
          warehouseName: "Bangalore Tech Park",
          warehouseLocation: "Bengaluru",
          total: 22,
          reserved: 20,
          available: 2,
        },
      ],
    },
  ];
}

export default async function Home() {
  const products = await getProducts();

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* Hero section */}
      <div className="mb-14 border-b border-[var(--border-subtle)] pb-10">
        <div className="inline-flex items-center rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs font-semibold text-[var(--gold)] mb-6 tracking-wide uppercase">
          Multi-Warehouse Inventory System
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[var(--text-primary)] mb-4">
          Medical Products Inventory
        </h1>
        <p className="text-[var(--text-secondary)] text-base max-w-2xl leading-relaxed">
          Real-time stock levels across all our warehouses. Reservations
          securely hold units for
          <span className="font-semibold text-[var(--gold)]">
            {" "}
            10 minutes
          </span>{" "}
          while you complete checkout.
        </p>
      </div>

      <ProductGrid products={products} />
    </div>
  );
}
