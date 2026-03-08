import { PrismaClient } from "@prisma/client";

function stripOuterQuotes(value: string) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

// Some hosting UIs store values wrapped in quotes (e.g. `"postgresql://..."`),
// which breaks Prisma URL parsing. Normalize once, before PrismaClient is created.
if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = stripOuterQuotes(process.env.DATABASE_URL);
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "production" ? ["warn", "error"] : ["query", "info", "warn", "error"],
  });

globalForPrisma.prisma = prismaClient;

export const prisma = prismaClient;

export default prisma; // ✅ VERY IMPORTANT
