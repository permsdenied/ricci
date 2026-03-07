import prisma from "../../db/client";
import { AppError } from "../../common/errors/app-error";
import { CreateTagDto, UpdateTagDto } from "./tags.schema";

class TagsService {
  async create(dto: CreateTagDto) {
    return prisma.tag.create({
      data: dto,
    });
  }

  async findAll() {
    const tags = await prisma.tag.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    return tags.map((tag) => ({
      ...tag,
      usersCount: tag._count.users,
      _count: undefined,
    }));
  }

  async findById(id: string) {
    const tag = await prisma.tag.findUnique({
      where: { id },
      include: {
        users: {
          include: {
            user: {
              select: {
                id: true,
                telegramId: true,
                username: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!tag) {
      throw AppError.notFound("Tag not found");
    }

    return {
      ...tag,
      users: tag.users.map((ut) => ({
        ...ut.user,
        telegramId: ut.user.telegramId.toString(),
      })),
    };
  }

  async update(id: string, dto: UpdateTagDto) {
    return prisma.tag.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string) {
    // Связи UserTag удалятся автоматически благодаря onDelete: Cascade
    await prisma.tag.delete({
      where: { id },
    });

    return { message: "Tag deleted successfully" };
  }

  async getUsersByTag(tagId: string) {
    const users = await prisma.user.findMany({
      where: {
        tags: { some: { tagId } },
        status: "ACTIVE",
      },
      select: {
        id: true,
        telegramId: true,
        username: true,
        firstName: true,
        lastName: true,
        department: true,
      },
    });

    return users.map((u) => ({
      ...u,
      telegramId: u.telegramId.toString(),
    }));
  }
}

export const tagsService = new TagsService();