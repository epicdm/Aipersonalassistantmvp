import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL || "";

const adapter = new PrismaPg({ connectionString });

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

// Always persist to globalThis — prevents new PrismaClient on every hot-reload or PM2 restart
globalForPrisma.prisma = prisma;
