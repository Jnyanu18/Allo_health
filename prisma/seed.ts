import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const products = [
  {
    name: "Sexual Health Profile Plus",
    sku: "ALLO-SHP-PLUS",
    price: 6999,
    description:
      "Comprehensive panel - 12 tests incl. testosterone, metabolic markers",
    category: "Diagnostic",
    imageUrl: "🧪",
    stock: [12, 8, 3],
  },
  {
    name: "Asymptomatic STD Early Detection Panel",
    sku: "ALLO-STD-PANEL",
    price: 4999,
    description:
      "4-test panel for recent exposure under 21 days. Discreet home kit.",
    category: "Diagnostic",
    imageUrl: "🔬",
    stock: [20, 15, 1],
  },
  {
    name: "Testosterone Boost Formula - 60 Capsules",
    sku: "ALLO-TEST-60",
    price: 1899,
    description:
      "Science-backed supplement blend for hormonal balance and vitality.",
    category: "Supplement",
    imageUrl: "💊",
    stock: [35, 28, 22],
  },
  {
    name: "Delay Spray - Extra Strength",
    sku: "ALLO-DELAY-ES",
    price: 799,
    description:
      "Clinically tested delay formula. Fast-acting, discreet packaging.",
    category: "Topical",
    imageUrl: "🧴",
    stock: [0, 0, 0],
  },
  {
    name: "Complete Couple Wellness Kit",
    sku: "ALLO-COUPLE-KIT",
    price: 8999,
    description:
      "His + hers panel - 20 comprehensive tests + consultation included.",
    category: "Diagnostic",
    imageUrl: "🩺",
    stock: [5, 3, 7],
  },
  {
    name: "Vitamin D3 + Zinc Complex - 90 Tabs",
    sku: "ALLO-VIT-D3Z",
    price: 649,
    description:
      "Essential micronutrients supporting reproductive health and immunity.",
    category: "Supplement",
    imageUrl: "🌿",
    stock: [50, 40, 30],
  },
];

async function main() {
  await prisma.idempotencyKey.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.stock.deleteMany();
  await prisma.product.deleteMany();
  await prisma.warehouse.deleteMany();

  const warehouses = await Promise.all([
    prisma.warehouse.create({
      data: {
        name: "Mumbai Central Warehouse",
        city: "Mumbai",
        state: "Maharashtra",
      },
    }),
    prisma.warehouse.create({
      data: {
        name: "Delhi North Fulfilment Hub",
        city: "New Delhi",
        state: "Delhi",
      },
    }),
    prisma.warehouse.create({
      data: {
        name: "Bangalore Tech Park Store",
        city: "Bengaluru",
        state: "Karnataka",
      },
    }),
  ]);

  for (const product of products) {
    const created = await prisma.product.create({
      data: {
        name: product.name,
        sku: product.sku,
        price: product.price,
        description: product.description,
        category: product.category,
        imageUrl: product.imageUrl,
      },
    });

    await prisma.stock.createMany({
      data: warehouses.map((warehouse, index) => ({
        productId: created.id,
        warehouseId: warehouse.id,
        total: product.stock[index],
        reserved: 0,
      })),
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
