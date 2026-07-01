import { PrismaClient, UserRole, PaymentStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning existing database records...");
  
  // Wipe existing entries to prevent duplicate key constraint crashes during seeding
  await prisma.payment.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.address.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.coupon.deleteMany({});
  await prisma.announcement.deleteMany({});
  
  // Delete products via nested relation deletions
  await prisma.productImage.deleteMany({});
  await prisma.product.deleteMany({});

  console.log("Seeding premium promotional announcements...");
  await prisma.announcement.create({
    data: {
      title: "Inaugural Launch Offer 🎉",
      body: "Get free express shipping on all orders above ₹999. Use promo code WELCOME10 for 10% off at checkout!",
      isActive: true,
      location: "storefront",
      startsAt: new Date(),
      endsAt: null
    }
  });

  console.log("Seeding database with valid Coupon schemas...");
  await prisma.coupon.create({
    data: {
      code: "WELCOME10",
      description: "10% Inaugural Launch Discount",
      discountType: "PERCENTAGE" as any, // Mapped to the database-compatible enum key
      discountPercentage: 10,
      isActive: true,
      startsAt: new Date()
    }
  });

  console.log("Seeding administrators...");
  await prisma.user.create({
    data: {
      email: "admin@heartsandbeans.in",
      name: "Hearts & Beans Lead Admin",
      role: UserRole.ADMIN
    }
  });

  console.log("Seeding custom magazine formats...");

  // 1. Format: The Classic Keepsake (Min 15, Max 35 photos)
  await prisma.product.create({
    data: {
      name: "The Classic Keepsake",
      slug: "classic-keepsake",
      shortDescription: "Our signature linen-bound custom photo magazine.",
      description: "Expertly printed on premium heavy linen-textured art papers. Hand-assembled with flat-lay binding and an asymmetrical, high-contrast grid design manually arranged by our lead editorial design crew.",
      basePricePaise: 129900, // ₹1,299
      salePricePaise: 99900,  // ₹999
      stockQuantity: 150,
      productionDays: 5,
      minPhotos: 15,
      maxPhotos: 35,
      isActive: true,
      images: {
        create: [
          {
            url: "https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=1200",
            alt: "The Classic Keepsake Linen Spreads",
            sortOrder: 1
          },
          {
            url: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?q=80&w=1200",
            alt: "Curated paper texture binding closeup",
            sortOrder: 2
          },
          {
            url: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1200",
            alt: "Stunning editorial bookshelf styling",
            sortOrder: 3
          }
        ]
      }
    }
  });

  // 2. Format: The Editorial Portrait (Min 10, Max 25 photos)
  await prisma.product.create({
    data: {
      name: "The Editorial Portrait",
      slug: "editorial-portrait",
      shortDescription: "A vertical-oriented portfolio layout for creators and couples.",
      description: "Optimized for vertical smartphone photography and high-contrast portraits. Printed on structured semi-gloss paper blocks with full-bleed photo spreads and minimal caption margins.",
      basePricePaise: 149900, // ₹1,499
      salePricePaise: 119900, // ₹1,199
      stockQuantity: 80,
      productionDays: 4,
      minPhotos: 10,
      maxPhotos: 25,
      isActive: true,
      images: {
        create: [
          {
            url: "https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1200",
            alt: "The Editorial Portrait Vertical Spreads",
            sortOrder: 1
          },
          {
            url: "https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?q=80&w=1200",
            alt: "High contrast luxury model spreads",
            sortOrder: 2
          }
        ]
      }
    }
  });

  // 3. Format: The Softcover Folio (Min 20, Max 35 photos)
  await prisma.product.create({
    data: {
      name: "The Softcover Folio",
      slug: "softcover-folio",
      shortDescription: "A lighter, landscape-style photo-memoir layout.",
      description: "A flexible, premium horizontal booklet printed on silk-finish paper stock. Perfect for cataloging family vacations, birthday weekends, or seasonal portfolios.",
      basePricePaise: 99900, // ₹999
      salePricePaise: 79900, // ₹799
      stockQuantity: 200,
      productionDays: 3,
      minPhotos: 20,
      maxPhotos: 35,
      isActive: true,
      images: {
        create: [
          {
            url: "https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=1200",
            alt: "The Softcover Folio landscape showcase",
            sortOrder: 1
          }
        ]
      }
    }
  });

  console.log("Database seeding finished successfully! 🎉");
}

main()
  .catch((e) => {
    console.error("Error during database seed execution:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });