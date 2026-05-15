import { Product } from "@/types";
import ProductGrid from "./components/ProductGrid";

async function getProducts(): Promise<Product[]> {
  // Mock data for previewing the Allo Health frontend without a database
  const productsList = [
    {
      name: "Tadalafil 10mg",
      sku: "MED-TAD10",
      desc: "Clinically proven treatment for ED. Long-lasting up to 36 hours.",
      price: 499,
    },
    {
      name: "Sildenafil 50mg",
      sku: "MED-SIL50",
      desc: "Fast-acting ED treatment. Effects start within 30-60 minutes.",
      price: 399,
    },
    {
      name: "Dapoxetine 30mg",
      sku: "MED-DAP30",
      desc: "Effective treatment for Premature Ejaculation (PE).",
      price: 599,
    },
    {
      name: "Testosterone Booster",
      sku: "SUPP-TEST",
      desc: "Natural herbal blend to support healthy testosterone levels.",
      price: 899,
    },
    {
      name: "Ashwagandha KSM-66",
      sku: "SUPP-ASHWA",
      desc: "Premium ashwagandha extract to reduce stress and boost vitality.",
      price: 649,
    },
    {
      name: "Men's Daily Multivitamin",
      sku: "SUPP-MULTI",
      desc: "Comprehensive blend of essential vitamins and minerals.",
      price: 449,
    },
    {
      name: "Delay Spray (Lidocaine)",
      sku: "MED-SPRAY",
      desc: "Desensitizing spray for enhanced endurance and performance.",
      price: 349,
    },
    {
      name: "Minoxidil 5% Topical",
      sku: "MED-MINOX",
      desc: "Clinically proven topical solution for hair regrowth.",
      price: 799,
    },
    {
      name: "Biotin Gummies",
      sku: "SUPP-BIOTIN",
      desc: "Tasty gummies to support healthy hair, skin, and nails.",
      price: 549,
    },
    {
      name: "Shilajit Resin",
      sku: "SUPP-SHILAJIT",
      desc: "Pure Himalayan Shilajit for natural energy and stamina.",
      price: 1299,
    },
    {
      name: "Finasteride 1mg",
      sku: "MED-FIN1",
      desc: "Oral medication to treat male pattern hair loss.",
      price: 699,
    },
    {
      name: "Saw Palmetto Extract",
      sku: "SUPP-SAW",
      desc: "Natural DHT blocker to support prostate and hair health.",
      price: 599,
    },
    {
      name: "Omega-3 Fish Oil",
      sku: "SUPP-OMEGA",
      desc: "High-EPA and DHA for heart, joint, and brain health.",
      price: 849,
    },
    {
      name: "Vitamin D3 60,000 IU",
      sku: "SUPP-D3",
      desc: "High-potency weekly dose for bone and immune health.",
      price: 199,
    },
    {
      name: "L-Arginine 1000mg",
      sku: "SUPP-ARG",
      desc: "Amino acid that boosts nitric oxide and blood flow.",
      price: 549,
    },
    {
      name: "ZMA (Zinc + Magnesium)",
      sku: "SUPP-ZMA",
      desc: "Essential minerals for muscle recovery and sleep quality.",
      price: 699,
    },
    {
      name: "Maca Root Extract",
      sku: "SUPP-MACA",
      desc: "Peruvian superfood known to naturally enhance libido and energy.",
      price: 499,
    },
    {
      name: "Ketoconazole 2% Shampoo",
      sku: "MED-KETO",
      desc: "Antifungal shampoo to treat dandruff and support hair growth.",
      price: 349,
    },
    {
      name: "Plant-Based DHT Blocker",
      sku: "SUPP-DHT",
      desc: "Advanced formula targeting the root causes of hair thinning.",
      price: 899,
    },
    {
      name: "Melatonin 10mg",
      sku: "SUPP-MEL",
      desc: "Sleep aid to help you fall asleep faster and stay asleep longer.",
      price: 299,
    },
    {
      name: "Probiotics 50 Billion CFU",
      sku: "SUPP-PROBIO",
      desc: "Gut health support with 10 distinct bacterial strains.",
      price: 799,
    },
    {
      name: "Curcumin Extract 95%",
      sku: "SUPP-CURC",
      desc: "Potent anti-inflammatory and antioxidant joint support.",
      price: 649,
    },
    {
      name: "Panax Ginseng",
      sku: "SUPP-GINSENG",
      desc: "Traditional herb to improve focus, stamina, and energy.",
      price: 599,
    },
    {
      name: "Horny Goat Weed Extract",
      sku: "SUPP-HGW",
      desc: "Standardized extract to support blood flow and drive.",
      price: 449,
    },
    {
      name: "Tribulus Terrestris",
      sku: "SUPP-TRIB",
      desc: "Natural herb to support male vitality and athletic performance.",
      price: 549,
    },
  ];

  return productsList.map((p, i) => ({
    id: `prod_${i + 1}`,
    name: p.name,
    sku: p.sku,
    description: p.desc,
    price: p.price,
    imageUrl:
      i % 2 === 0
        ? "https://images.unsplash.com/photo-1584308666744-24d5e478eb13?w=400"
        : "https://images.unsplash.com/photo-1628771065518-0d82f1938462?w=400",
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
  }));
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
