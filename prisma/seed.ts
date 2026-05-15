import "dotenv/config";
// @ts-ignore - PrismaClient is available after `prisma generate`
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log("🌱 Seeding database...");

  // Clear existing data
  await prisma.reservation.deleteMany();
  await prisma.idempotencyKey.deleteMany();
  await prisma.stock.deleteMany();
  await prisma.product.deleteMany();
  await prisma.warehouse.deleteMany();

  // Create warehouses
  const [mumbai, delhi, bangalore] = await Promise.all([
    prisma.warehouse.create({
      data: { name: "Mumbai Central", location: "Mumbai, Maharashtra" },
    }),
    prisma.warehouse.create({
      data: { name: "Delhi North", location: "New Delhi, Delhi" },
    }),
    prisma.warehouse.create({
      data: { name: "Bangalore Tech Park", location: "Bengaluru, Karnataka" },
    }),
  ]);

  // Create products
  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: "Tadalafil 10mg",
        sku: "MED-TAD10",
        description:
          "Clinically proven treatment for ED. Long-lasting up to 36 hours.",
        price: 499,
        imageUrl:
          "https://images.unsplash.com/photo-1584308666744-24d5e478eb13?w=400",
      },
    }),
    prisma.product.create({
      data: {
        name: "Sildenafil 50mg",
        sku: "MED-SIL50",
        description:
          "Fast-acting ED treatment. Effects start within 30-60 minutes.",
        price: 399,
        imageUrl:
          "https://images.unsplash.com/photo-1584308666744-24d5e478eb13?w=400",
      },
    }),
    prisma.product.create({
      data: {
        name: "Dapoxetine 30mg",
        sku: "MED-DAP30",
        description: "Effective treatment for Premature Ejaculation (PE).",
        price: 599,
        imageUrl:
          "https://images.unsplash.com/photo-1584308666744-24d5e478eb13?w=400",
      },
    }),
    prisma.product.create({
      data: {
        name: "Testosterone Booster",
        sku: "SUPP-TEST",
        description:
          "Natural herbal blend to support healthy testosterone levels.",
        price: 899,
        imageUrl:
          "https://images.unsplash.com/photo-1628771065518-0d82f1938462?w=400",
      },
    }),
    prisma.product.create({
      data: {
        name: "Ashwagandha KSM-66",
        sku: "SUPP-ASHWA",
        description:
          "Premium ashwagandha extract to reduce stress and boost vitality.",
        price: 649,
        imageUrl:
          "https://images.unsplash.com/photo-1628771065518-0d82f1938462?w=400",
      },
    }),
    prisma.product.create({
      data: {
        name: "Men's Daily Multivitamin",
        sku: "SUPP-MULTI",
        description: "Comprehensive blend of essential vitamins and minerals.",
        price: 449,
        imageUrl:
          "https://images.unsplash.com/photo-1628771065518-0d82f1938462?w=400",
      },
    }),
    prisma.product.create({
      data: {
        name: "Delay Spray (Lidocaine)",
        sku: "MED-SPRAY",
        description:
          "Desensitizing spray for enhanced endurance and performance.",
        price: 349,
        imageUrl:
          "https://images.unsplash.com/photo-1584308666744-24d5e478eb13?w=400",
      },
    }),
    prisma.product.create({
      data: {
        name: "Minoxidil 5% Topical",
        sku: "MED-MINOX",
        description: "Clinically proven topical solution for hair regrowth.",
        price: 799,
        imageUrl:
          "https://images.unsplash.com/photo-1584308666744-24d5e478eb13?w=400",
      },
    }),
    prisma.product.create({
      data: {
        name: "Biotin Gummies",
        sku: "SUPP-BIOTIN",
        description: "Tasty gummies to support healthy hair, skin, and nails.",
        price: 549,
        imageUrl:
          "https://images.unsplash.com/photo-1628771065518-0d82f1938462?w=400",
      },
    }),
    prisma.product.create({
      data: {
        name: "Shilajit Resin",
        sku: "SUPP-SHILAJIT",
        description: "Pure Himalayan Shilajit for natural energy and stamina.",
        price: 1299,
        imageUrl:
          "https://images.unsplash.com/photo-1628771065518-0d82f1938462?w=400",
      },
    }),
    prisma.product.create({
      data: {
        name: "Finasteride 1mg",
        sku: "MED-FIN1",
        description: "Oral medication to treat male pattern hair loss.",
        price: 699,
        imageUrl:
          "https://images.unsplash.com/photo-1584308666744-24d5e478eb13?w=400",
      },
    }),
    prisma.product.create({
      data: {
        name: "Saw Palmetto Extract",
        sku: "SUPP-SAW",
        description: "Natural DHT blocker to support prostate and hair health.",
        price: 599,
        imageUrl:
          "https://images.unsplash.com/photo-1628771065518-0d82f1938462?w=400",
      },
    }),
    prisma.product.create({
      data: {
        name: "Omega-3 Fish Oil",
        sku: "SUPP-OMEGA",
        description: "High-EPA and DHA for heart, joint, and brain health.",
        price: 849,
        imageUrl:
          "https://images.unsplash.com/photo-1628771065518-0d82f1938462?w=400",
      },
    }),
    prisma.product.create({
      data: {
        name: "Vitamin D3 60,000 IU",
        sku: "SUPP-D3",
        description: "High-potency weekly dose for bone and immune health.",
        price: 199,
        imageUrl:
          "https://images.unsplash.com/photo-1584308666744-24d5e478eb13?w=400",
      },
    }),
    prisma.product.create({
      data: {
        name: "L-Arginine 1000mg",
        sku: "SUPP-ARG",
        description: "Amino acid that boosts nitric oxide and blood flow.",
        price: 549,
        imageUrl:
          "https://images.unsplash.com/photo-1628771065518-0d82f1938462?w=400",
      },
    }),
    prisma.product.create({
      data: {
        name: "ZMA (Zinc + Magnesium)",
        sku: "SUPP-ZMA",
        description:
          "Essential minerals for muscle recovery and sleep quality.",
        price: 699,
        imageUrl:
          "https://images.unsplash.com/photo-1628771065518-0d82f1938462?w=400",
      },
    }),
    prisma.product.create({
      data: {
        name: "Maca Root Extract",
        sku: "SUPP-MACA",
        description:
          "Peruvian superfood known to naturally enhance libido and energy.",
        price: 499,
        imageUrl:
          "https://images.unsplash.com/photo-1628771065518-0d82f1938462?w=400",
      },
    }),
    prisma.product.create({
      data: {
        name: "Ketoconazole 2% Shampoo",
        sku: "MED-KETO",
        description:
          "Antifungal shampoo to treat dandruff and support hair growth.",
        price: 349,
        imageUrl:
          "https://images.unsplash.com/photo-1584308666744-24d5e478eb13?w=400",
      },
    }),
    prisma.product.create({
      data: {
        name: "Plant-Based DHT Blocker",
        sku: "SUPP-DHT",
        description:
          "Advanced formula targeting the root causes of hair thinning.",
        price: 899,
        imageUrl:
          "https://images.unsplash.com/photo-1628771065518-0d82f1938462?w=400",
      },
    }),
    prisma.product.create({
      data: {
        name: "Melatonin 10mg",
        sku: "SUPP-MEL",
        description:
          "Sleep aid to help you fall asleep faster and stay asleep longer.",
        price: 299,
        imageUrl:
          "https://images.unsplash.com/photo-1628771065518-0d82f1938462?w=400",
      },
    }),
    prisma.product.create({
      data: {
        name: "Probiotics 50 Billion CFU",
        sku: "SUPP-PROBIO",
        description: "Gut health support with 10 distinct bacterial strains.",
        price: 799,
        imageUrl:
          "https://images.unsplash.com/photo-1628771065518-0d82f1938462?w=400",
      },
    }),
    prisma.product.create({
      data: {
        name: "Curcumin Extract 95%",
        sku: "SUPP-CURC",
        description: "Potent anti-inflammatory and antioxidant joint support.",
        price: 649,
        imageUrl:
          "https://images.unsplash.com/photo-1628771065518-0d82f1938462?w=400",
      },
    }),
    prisma.product.create({
      data: {
        name: "Panax Ginseng",
        sku: "SUPP-GINSENG",
        description: "Traditional herb to improve focus, stamina, and energy.",
        price: 599,
        imageUrl:
          "https://images.unsplash.com/photo-1628771065518-0d82f1938462?w=400",
      },
    }),
    prisma.product.create({
      data: {
        name: "Horny Goat Weed Extract",
        sku: "SUPP-HGW",
        description: "Standardized extract to support blood flow and drive.",
        price: 449,
        imageUrl:
          "https://images.unsplash.com/photo-1628771065518-0d82f1938462?w=400",
      },
    }),
    prisma.product.create({
      data: {
        name: "Tribulus Terrestris",
        sku: "SUPP-TRIB",
        description:
          "Natural herb to support male vitality and athletic performance.",
        price: 549,
        imageUrl:
          "https://images.unsplash.com/photo-1628771065518-0d82f1938462?w=400",
      },
    }),
  ]);

  // Create stock entries (varying levels to make it interesting)
  // Create stock entries dynamically for all products
  const warehouses = [mumbai, delhi, bangalore];
  const stockData = products.flatMap((product) =>
    warehouses.map((warehouse) => ({
      productId: product.id,
      warehouseId: warehouse.id,
      // Randomly assign stock between 1 and 30
      total: Math.floor(Math.random() * 30) + 1,
      reserved: 0,
    })),
  );

  await prisma.stock.createMany({ data: stockData });

  console.log(`✅ Created ${products.length} products across 3 warehouses`);
  console.log("🎉 Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
