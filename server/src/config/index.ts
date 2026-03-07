import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  nodeEnv: process.env.NODE_ENV || "development",

  jwt: {
    secret: process.env.JWT_SECRET || "fallback-secret-change-me",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },

  telegram: {
    botToken: process.env.BOT_TOKEN || "",
    webhookSecret: process.env.BOT_WEBHOOK_SECRET || "",
  },

  // API ключ для внешних интеграций (CRM, BI и т.д.)
  integration: {
    apiKey: process.env.INTEGRATION_API_KEY || "",
  },

  isDev: process.env.NODE_ENV === "development",
  isProd: process.env.NODE_ENV === "production",
} as const;
