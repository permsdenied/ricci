import express from "express";
import cors from "cors";
import path from "path";

import prisma from "./db/client";
import { errorMiddleware } from "./common/middlewares/error";
import { requestLoggerMiddleware } from "./common/middlewares/request-logger";
import { notFoundMiddleware } from "./common/middlewares/not-found";
import { botAuthMiddleware } from "./common/middlewares/bot-auth";

// Routes
import authRoutes from "./modules/auth/auth.routes";
import usersRoutes from "./modules/users/users.routes";
import tagsRoutes from "./modules/tags/tags.routes";
import chatsRoutes from "./modules/chats/chats.routes";
import chatPackagesRoutes from "./modules/chat-packages/chat-packages.routes";
import telegramRoutes from "./modules/telegram/telegram.routes";
import dashboardRoutes from "./modules/dashboard/dashboard.routes";
import broadcastsRoutes from "./modules/broadcasts/broadcasts.routes";
import integrationsRoutes from "./modules/integrations/integrations.routes";
import uploadsRoutes from "./modules/uploads/uploads.routes";

export const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(requestLoggerMiddleware);

// Static: serve uploaded files
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

// Health check (with DB connectivity)
app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: "ok",
      db: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch {
    res.status(503).json({
      status: "error",
      db: "disconnected",
      timestamp: new Date().toISOString(),
    });
  }
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/tags", tagsRoutes);
app.use("/api/chats", chatsRoutes);
app.use("/api/chat-packages", chatPackagesRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/broadcasts", broadcastsRoutes);
app.use("/api/integrations", integrationsRoutes);
app.use("/api/uploads", uploadsRoutes);

// Bot webhook (с отдельной авторизацией)
app.use("/api/bot", botAuthMiddleware, telegramRoutes);

// Error handling
app.use(notFoundMiddleware);
app.use(errorMiddleware);
