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

// Vercel env UI sometimes stores values wrapped in quotes (e.g. `"postgresql://..."`),
// which breaks Prisma URL parsing. Normalize once, before PrismaClient is created.
if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = stripOuterQuotes(process.env.DATABASE_URL);
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["query", "info", "warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma; // ✅ VERY IMPORTANT
