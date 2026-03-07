import { app } from "./app";
import { config } from "./config";
import prisma from "./db/client";
import { startBroadcastScheduler, stopBroadcastScheduler } from "./lib/broadcast-scheduler";

async function main() {
  try {
    // Проверяем подключение к БД
    await prisma.$connect();
    console.log("✅ Database connected");

    // Запускаем планировщик отложенных рассылок
    startBroadcastScheduler();

    // Запускаем сервер
    app.listen(config.port, () => {
      console.log(`🚀 Server running on port ${config.port}`);
      console.log(`📍 Environment: ${config.nodeEnv}`);
      console.log(`🔗 Health check: http://localhost:${config.port}/api/health`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down...");
  stopBroadcastScheduler();
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Shutting down...");
  stopBroadcastScheduler();
  await prisma.$disconnect();
  process.exit(0);
});

main();
