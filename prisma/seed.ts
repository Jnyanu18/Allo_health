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
  ]);

  // Create stock entries (varying levels to make it interesting)
  const stockData = [
    // Sony Headphones
    {
      productId: products[0].id,
      warehouseId: mumbai.id,
      total: 15,
      reserved: 0,
    },
    { productId: products[0].id, warehouseId: delhi.id, total: 8, reserved: 0 },
    {
      productId: products[0].id,
      warehouseId: bangalore.id,
      total: 3,
      reserved: 0,
    }, // low stock!

    // AirPods Pro
    {
      productId: products[1].id,
      warehouseId: mumbai.id,
      total: 25,
      reserved: 0,
    },
    {
      productId: products[1].id,
      warehouseId: delhi.id,
      total: 12,
      reserved: 0,
    },
    {
      productId: products[1].id,
      warehouseId: bangalore.id,
      total: 1,
      reserved: 0,
    }, // very low!

    // Samsung Tab
    {
      productId: products[2].id,
      warehouseId: mumbai.id,
      total: 6,
      reserved: 0,
    },
    { productId: products[2].id, warehouseId: delhi.id, total: 4, reserved: 0 },
    {
      productId: products[2].id,
      warehouseId: bangalore.id,
      total: 9,
      reserved: 0,
    },

    // Keychron
    {
      productId: products[3].id,
      warehouseId: mumbai.id,
      total: 20,
      reserved: 0,
    },
    { productId: products[3].id, warehouseId: delhi.id, total: 2, reserved: 0 }, // low!
    {
      productId: products[3].id,
      warehouseId: bangalore.id,
      total: 15,
      reserved: 0,
    },

    // Logitech Mouse
    {
      productId: products[4].id,
      warehouseId: mumbai.id,
      total: 30,
      reserved: 0,
    },
    {
      productId: products[4].id,
      warehouseId: delhi.id,
      total: 18,
      reserved: 0,
    },
    {
      productId: products[4].id,
      warehouseId: bangalore.id,
      total: 22,
      reserved: 0,
    },

    // Dell Monitor
    {
      productId: products[5].id,
      warehouseId: mumbai.id,
      total: 4,
      reserved: 0,
    },
    { productId: products[5].id, warehouseId: delhi.id, total: 7, reserved: 0 },
    {
      productId: products[5].id,
      warehouseId: bangalore.id,
      total: 2,
      reserved: 0,
    }, // low!
  ];

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
