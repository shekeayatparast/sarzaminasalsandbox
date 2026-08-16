// Prisma client for the Telegram bot — shares the same SQLite DB as the web app
import { PrismaClient } from "@prisma/client";

const globalForBot = globalThis as unknown as {
  botPrisma: PrismaClient | undefined;
};

export const db =
  globalForBot.botPrisma ??
  new PrismaClient({
    log: ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") globalForBot.botPrisma = db;
