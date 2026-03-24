import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import prisma from "../../db/client";
import { config } from "../../config";
import { AppError } from "../../common/errors/app-error";
import { JwtPayload } from "../../common/middlewares/auth";
import { LoginDto, RegisterAdminDto, ChangePasswordDto } from "./auth.schema";
import { AdminRole } from "@prisma/client";

class AuthService {
  async login(dto: LoginDto) {
    const admin = await prisma.admin.findUnique({
      where: { email: dto.email },
    });

    if (!admin) {
      throw AppError.unauthorized("Invalid email or password");
    }

    if (!admin.isActive) {
      throw AppError.forbidden("Account is deactivated");
    }

    const isPasswordValid = await bcrypt.compare(dto.password, admin.password);

    if (!isPasswordValid) {
      throw AppError.unauthorized("Invalid email or password");
    }

    const token = this.generateToken({
      adminId: admin.id,
      email: admin.email,
      role: admin.role,
    });

    return {
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    };
  }

  async register(dto: RegisterAdminDto) {
    const existing = await prisma.admin.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw AppError.conflict("Email already registered", "EMAIL_EXISTS");
    }

    const plainPassword = dto.password ?? this.generatePassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 12);

    const admin = await prisma.admin.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
        role: (dto.role as AdminRole) || "ADMIN",
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    // Возвращаем пароль только если он был сгенерирован (не передан клиентом)
    const generatedPassword = dto.password ? undefined : plainPassword;

    return { admin, generatedPassword };
  }

  async changePassword(adminId: string, dto: ChangePasswordDto) {
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      throw AppError.notFound("Admin not found");
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      admin.password,
    );

    if (!isCurrentPasswordValid) {
      throw AppError.badRequest("Current password is incorrect");
    }

    const hashedNewPassword = await bcrypt.hash(dto.newPassword, 12);

    await prisma.admin.update({
      where: { id: adminId },
      data: { password: hashedNewPassword },
    });

    return { message: "Password changed successfully" };
  }

  async getProfile(adminId: string) {
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    if (!admin) {
      throw AppError.notFound("Admin not found");
    }

    return admin;
  }

  private generateToken(payload: JwtPayload): string {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: 604800, // 7 дней в секундах
    });
  }

  private generatePassword(): string {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    return Array.from(crypto.randomBytes(24))
      .map((b) => chars[b % chars.length])
      .join("");
  }
}

export const authService = new AuthService();
