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
        name: "Sony WH-1000XM5 Headphones",
        sku: "SONY-WH1000XM5",
        description:
          "Industry-leading noise canceling with Speak-to-Chat technology",
        price: 29990,
        imageUrl:
          "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=400",
      },
    }),
    prisma.product.create({
      data: {
        name: "Apple AirPods Pro (2nd Gen)",
        sku: "APPLE-APP2",
        description:
          "Active noise cancellation, Transparency mode, Adaptive Audio",
        price: 24900,
        imageUrl:
          "https://images.unsplash.com/photo-1588156979435-379b9d802b0a?w=400",
      },
    }),
    prisma.product.create({
      data: {
        name: "Samsung Galaxy Tab S9",
        sku: "SAMSUNG-TABS9",
        description: "11-inch Dynamic AMOLED 2X, 120Hz, IP68 water resistant",
        price: 72999,
        imageUrl:
          "https://images.unsplash.com/photo-1544244015-0df4592c1db1?w=400",
      },
    }),
    prisma.product.create({
      data: {
        name: "Keychron K2 Mechanical Keyboard",
        sku: "KEYCHRON-K2",
        description: "75% layout, hot-swappable, wireless Bluetooth 5.1",
        price: 7499,
        imageUrl:
          "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400",
      },
    }),
    prisma.product.create({
      data: {
        name: "Logitech MX Master 3S",
        sku: "LOGI-MXM3S",
        description: "8K DPI sensor, MagSpeed scroll wheel, USB-C charging",
        price: 9995,
        imageUrl:
          "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400",
      },
    }),
    prisma.product.create({
      data: {
        name: 'Dell 27" 4K USB-C Monitor',
        sku: "DELL-U2723DE",
        description: "IPS Black panel, 99% sRGB, built-in USB-C hub",
        price: 54990,
        imageUrl:
          "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400",
      },
    }),
    prisma.product.create({
      data: {
        name: "Google Pixel 8 Pro",
        sku: "GOOG-P8P",
        description: "Tensor G3, 50MP main camera, Super Actua display",
        price: 106999,
        imageUrl:
          "https://images.unsplash.com/photo-1598327105666-5b89351cb315?w=400",
      },
    }),
    prisma.product.create({
      data: {
        name: "Dyson V15 Detect Absolute",
        sku: "DYSON-V15",
        description:
          "Laser dust detection, piezoelectric sensor, up to 60 min runtime",
        price: 65900,
        imageUrl:
          "https://images.unsplash.com/photo-1558317374-067fb5f30001?w=400",
      },
    }),
    prisma.product.create({
      data: {
        name: "Herman Miller Aeron Chair",
        sku: "HM-AERON",
        description: "Ergonomic office chair, Size B, Graphite finish",
        price: 135000,
        imageUrl:
          "https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?w=400",
      },
    }),
    prisma.product.create({
      data: {
        name: "PlayStation 5 Console",
        sku: "SONY-PS5",
        description: "Ultra-High Speed SSD, Ray Tracing, 4K-TV Gaming",
        price: 54990,
        imageUrl:
          "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=400",
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
