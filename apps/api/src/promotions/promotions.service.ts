import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';

const STAFF_ROLES = ['STAFF', 'ADMIN', 'MANAGER'];

@Injectable()
export class PromotionsService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureStaff(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    const role = String(user?.role ?? '').toUpperCase();
    if (!STAFF_ROLES.includes(role)) {
      throw new ForbiddenException(
        'Chỉ nhân viên quầy hoặc quản lý mới có quyền cấu hình khuyến mãi.',
      );
    }
  }

  async findAllForUser(userId?: string) {
    let isStaff = false;
    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      isStaff = STAFF_ROLES.includes(String(user?.role ?? '').toUpperCase());
    }

    const list = await this.prisma.promotion.findMany({
      where: isStaff ? undefined : { isActive: true, staffOnly: false },
      orderBy: [{ staffOnly: 'desc' }, { code: 'asc' }],
    });

    return list.map((p) => ({
      ...p,
      value: Number(p.value),
      minOrderValue: Number(p.minOrderValue),
      remainingUses:
        p.maxUses !== null ? Math.max(0, p.maxUses - p.usedCount) : null,
    }));
  }

  async validatePromotion(codeInput: string, subtotal: number, userId: string) {
    const code = codeInput.trim().toUpperCase();
    if (!code) {
      throw new BadRequestException('Vui lòng nhập mã khuyến mãi.');
    }

    const [promo, user] = await Promise.all([
      this.prisma.promotion.findUnique({ where: { code } }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      }),
    ]);

    if (!promo) {
      throw new NotFoundException(`Mã khuyến mãi "${code}" không tồn tại.`);
    }

    const now = new Date();
    const isStaff = STAFF_ROLES.includes(String(user?.role ?? '').toUpperCase());

    if (promo.staffOnly && !isStaff) {
      throw new ForbiddenException(
        'Mã khuyến mãi này chỉ dành riêng cho nhân viên áp dụng tại quầy.',
      );
    }

    if (!promo.isActive || now < promo.startDate || now > promo.endDate) {
      throw new BadRequestException(
        `Mã khuyến mãi "${code}" đã hết hạn hoặc tạm ngưng áp dụng.`,
      );
    }

    if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
      throw new BadRequestException(
        `Mã khuyến mãi "${code}" đã hết lượt sử dụng (${promo.usedCount}/${promo.maxUses}).`,
      );
    }

    if (!promo.staffOnly && promo.perUserLimit !== null) {
      const userUsedCount = await this.prisma.order.count({
        where: {
          userId,
          promotionId: promo.id,
          status: { not: 'CANCELLED' },
        },
      });
      if (userUsedCount >= promo.perUserLimit) {
        throw new BadRequestException(
          `Bạn đã sử dụng hết ${promo.perUserLimit} lượt cho mã "${code}".`,
        );
      }
    }

    const minOrder = Number(promo.minOrderValue);
    if (subtotal < minOrder) {
      throw new BadRequestException(
        `Đơn hàng tối thiểu ${minOrder.toLocaleString('vi-VN')}đ để dùng mã "${code}".`,
      );
    }

    const rawDiscount =
      promo.type === 'PERCENTAGE'
        ? Math.round((subtotal * Number(promo.value)) / 100)
        : Number(promo.value);
    const discountAmount = Math.min(subtotal, Math.max(0, rawDiscount));

    return {
      id: promo.id,
      code: promo.code,
      type: promo.type,
      value: Number(promo.value),
      staffOnly: promo.staffOnly,
      maxUses: promo.maxUses,
      usedCount: promo.usedCount,
      remainingUses:
        promo.maxUses !== null ? Math.max(0, promo.maxUses - promo.usedCount) : null,
      discountAmount,
    };
  }

  async createPromotion(userId: string, dto: CreatePromotionDto) {
    await this.ensureStaff(userId);
    const code = dto.code.trim().toUpperCase();
    if (!code) {
      throw new BadRequestException('Mã khuyến mãi không được để trống.');
    }

    const maxUses =
      dto.maxUses === undefined || dto.maxUses === null || Number(dto.maxUses) <= 0
        ? null
        : Math.floor(Number(dto.maxUses));

    const staffOnly = dto.staffOnly ?? true;

    return this.prisma.promotion.create({
      data: {
        code,
        type: dto.type,
        value: Number(dto.value),
        minOrderValue: Number(dto.minOrderValue ?? 0),
        startDate: new Date(),
        endDate: dto.endDate
          ? new Date(dto.endDate)
          : new Date('2027-12-31T23:59:59.000Z'),
        isActive: dto.isActive ?? true,
        staffOnly,
        maxUses,
        usedCount: 0,
        perUserLimit: staffOnly ? null : (dto.perUserLimit ?? 1),
      },
    });
  }

  async updatePromotion(
    userId: string,
    id: string,
    dto: UpdatePromotionDto,
  ) {
    await this.ensureStaff(userId);
    const existing = await this.prisma.promotion.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy mã khuyến mãi.');
    }

    const nextUsedCount = dto.resetUsedCount ? 0 : existing.usedCount;
    const nextMaxUses =
      dto.maxUses === undefined
        ? existing.maxUses
        : dto.maxUses === null || Number(dto.maxUses) <= 0
          ? null
          : Math.floor(Number(dto.maxUses));

    const nextStaffOnly = dto.staffOnly ?? existing.staffOnly;
    const autoReactivate =
      nextMaxUses === null || nextUsedCount < nextMaxUses;

    return this.prisma.promotion.update({
      where: { id },
      data: {
        ...(dto.type ? { type: dto.type } : {}),
        ...(dto.value !== undefined ? { value: Number(dto.value) } : {}),
        ...(dto.minOrderValue !== undefined
          ? { minOrderValue: Number(dto.minOrderValue) }
          : {}),
        ...(dto.endDate ? { endDate: new Date(dto.endDate) } : {}),
        staffOnly: nextStaffOnly,
        maxUses: nextMaxUses,
        usedCount: nextUsedCount,
        perUserLimit: nextStaffOnly ? null : (existing.perUserLimit ?? 1),
        isActive: dto.isActive !== undefined ? dto.isActive : autoReactivate,
      },
    });
  }
}