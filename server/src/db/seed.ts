import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Создаём супер-админа
  const hashedPassword = await bcrypt.hash("admin123", 12);

  const admin = await prisma.admin.upsert({
    where: { email: "admin@ricci.ru" },
    update: {},
    create: {
      email: "admin@ricci.ru",
      password: hashedPassword,
      name: "Super Admin",
      role: "SUPER_ADMIN",
    },
  });
  console.log("✅ Created admin:", admin.email);

  // Создаём базовые теги
  const tags = [
    { name: "IT-отдел", description: "Сотрудники IT", color: "#3B82F6" },
    { name: "HR", description: "Отдел кадров", color: "#10B981" },
    { name: "Маркетинг", description: "Отдел маркетинга", color: "#F59E0B" },
    { name: "Падел", description: "Любители падел-тенниса", color: "#EF4444" },
    { name: "Ricci Future Lab", description: "Участники инновационного хаба", color: "#8B5CF6" },
    { name: "Дайджест лидов", description: "Рассылка дайджеста", color: "#EC4899" },
  ];

  for (const tag of tags) {
    await prisma.tag.upsert({
      where: { name: tag.name },
      update: {},
      create: tag,
    });
  }
  console.log(`✅ Created ${tags.length} tags`);

  // Создаём пакеты чатов
  const packages = [
    {
      name: "Базовый пакет",
      description: "Обязательные чаты для всех сотрудников",
      isDefault: true,
    },
    {
      name: "IT-пакет",
      description: "Чаты для IT-специалистов",
      isDefault: false,
    },
    {
      name: "Менеджерский пакет",
      description: "Чаты для руководителей",
      isDefault: false,
    },
  ];

  for (const pkg of packages) {
    await prisma.chatPackage.upsert({
      where: { name: pkg.name },
      update: {},
      create: pkg,
    });
  }
  console.log(`✅ Created ${packages.length} chat packages`);

  console.log("🎉 Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });