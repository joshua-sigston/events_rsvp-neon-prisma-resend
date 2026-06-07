// Shared Prisma client for the app.
// Import this file instead of creating new PrismaClient() instances elsewhere.

import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

// Next.js can reload modules in dev, which would open a new DB connection on every reload.
// Storing the client on globalThis reuses one instance across hot reloads.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  // Prisma 7 requires a driver adapter for serverless Postgres (Neon).
  // PrismaNeon manages the connection pool using your DATABASE_URL.
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
  return new PrismaClient({ adapter });
}

// Reuse an existing client in dev, or create one if none exists yet.
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Cache the client in dev only — in production, each server instance keeps its own client.
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
