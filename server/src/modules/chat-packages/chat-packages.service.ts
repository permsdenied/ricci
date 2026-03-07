import prisma from "../../db/client";
import { AppError } from "../../common/errors/app-error";
import {
  CreateChatPackageDto,
  UpdateChatPackageDto,
  UpdatePackageChatsDto,
} from "./chat-packages.schema";

class ChatPackagesService {
  async create(dto: CreateChatPackageDto) {
    // Если новый пакет default, убираем default с других
    if (dto.isDefault) {
      await prisma.chatPackage.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const chatPackage = await prisma.chatPackage.create({
      data: {
        name: dto.name,
        description: dto.description,
        isDefault: dto.isDefault || false,
        items: dto.chatIds
          ? {
              create: dto.chatIds.map((chatId) => ({ chatId })),
            }
          : undefined,
      },
      include: {
        items: {
          include: { chat: true },
        },
      },
    });

    return this.serializePackage(chatPackage);
  }

  async findAll() {
    const packages = await prisma.chatPackage.findMany({
      orderBy: { name: "asc" },
      include: {
        items: {
          include: {
            chat: {
              select: {
                id: true,
                telegramId: true,
                title: true,
                type: true,
              },
            },
          },
        },
      },
    });

    return packages.map(this.serializePackage);
  }

  async findById(id: string) {
    const chatPackage = await prisma.chatPackage.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            chat: true,
          },
        },
      },
    });

    if (!chatPackage) {
      throw AppError.notFound("Chat package not found");
    }

    return this.serializePackage(chatPackage);
  }

  async update(id: string, dto: UpdateChatPackageDto) {
    // Если новый пакет становится default, убираем default с других
    if (dto.isDefault) {
      await prisma.chatPackage.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const chatPackage = await prisma.chatPackage.update({
      where: { id },
      data: dto,
      include: {
        items: {
          include: { chat: true },
        },
      },
    });

    return this.serializePackage(chatPackage);
  }

  async updateChats(id: string, dto: UpdatePackageChatsDto) {
    // Удаляем старые связи и создаём новые
    await prisma.$transaction([
      prisma.chatPackageItem.deleteMany({ where: { packageId: id } }),
      prisma.chatPackageItem.createMany({
        data: dto.chatIds.map((chatId) => ({ packageId: id, chatId })),
      }),
    ]);

    return this.findById(id);
  }

  async addChats(id: string, chatIds: string[]) {
    await prisma.chatPackageItem.createMany({
      data: chatIds.map((chatId) => ({ packageId: id, chatId })),
      skipDuplicates: true,
    });

    return this.findById(id);
  }

  async removeChats(id: string, chatIds: string[]) {
    await prisma.chatPackageItem.deleteMany({
      where: {
        packageId: id,
        chatId: { in: chatIds },
      },
    });

    return this.findById(id);
  }

  async delete(id: string) {
    await prisma.chatPackage.delete({
      where: { id },
    });

    return { message: "Chat package deleted successfully" };
  }

  async getDefault() {
    const chatPackage = await prisma.chatPackage.findFirst({
      where: { isDefault: true },
      include: {
        items: {
          include: { chat: true },
        },
      },
    });

    return chatPackage ? this.serializePackage(chatPackage) : null;
  }

  private serializePackage(pkg: any) {
    return {
      ...pkg,
      chats:
        pkg.items?.map((item: any) => ({
          ...item.chat,
          telegramId: item.chat.telegramId.toString(),
        })) || [],
      items: undefined,
    };
  }
}

export const chatPackagesService = new ChatPackagesService();