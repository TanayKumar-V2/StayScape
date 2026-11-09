import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccountStatus, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminAuditService } from './admin-audit.service';
import { AdminUserQueryDto } from '../dto/admin-query.dto';
import { ActivateActionDto, SuspendActionDto } from '../dto/admin-actions.dto';

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AdminAuditService,
  ) {}

  async getUsers(query: AdminUserQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 10));
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.status && (query.status === 'ACTIVE' || query.status === 'SUSPENDED')) {
      where.status = query.status as AccountStatus;
    }

    if (query.role && (query.role === 'USER' || query.role === 'ADMIN')) {
      where.role = query.role as UserRole;
    }

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          role: true,
          status: true,
          emailVerified: true,
          lastLoginAt: true,
          createdAt: true,
          hostProfile: {
            select: {
              id: true,
              displayName: true,
              status: true,
            },
          },
          _count: {
            select: {
              bookings: true,
              reviews: true,
            },
          },
        },
        orderBy: { createdAt: query.sort === 'oldest' ? 'asc' : 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: users.map((u) => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        name: `${u.firstName} ${u.lastName}`.trim(),
        avatarUrl: u.avatarUrl,
        role: u.role,
        status: u.status,
        emailVerified: u.emailVerified,
        lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
        createdAt: u.createdAt.toISOString(),
        isHost: Boolean(u.hostProfile),
        hostProfile: u.hostProfile,
        bookingsCount: u._count.bookings,
        reviewsCount: u._count.reviews,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async getUserDetails(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        role: true,
        status: true,
        emailVerified: true,
        tokenVersion: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        hostProfile: {
          select: {
            id: true,
            displayName: true,
            bio: true,
            status: true,
            createdAt: true,
            _count: {
              select: {
                properties: true,
              },
            },
          },
        },
        _count: {
          select: {
            bookings: true,
            reviews: true,
            wishlistItems: true,
            submittedReports: true,
          },
        },
        bookings: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            bookingReference: true,
            propertyTitleSnapshot: true,
            checkIn: true,
            checkOut: true,
            totalAmountPaise: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found.`);
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      name: `${user.firstName} ${user.lastName}`.trim(),
      avatarUrl: user.avatarUrl,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      hostProfile: user.hostProfile
        ? {
            id: user.hostProfile.id,
            displayName: user.hostProfile.displayName,
            bio: user.hostProfile.bio,
            status: user.hostProfile.status,
            createdAt: user.hostProfile.createdAt.toISOString(),
            propertiesCount: user.hostProfile._count.properties,
          }
        : null,
      stats: {
        bookingsCount: user._count.bookings,
        reviewsCount: user._count.reviews,
        wishlistCount: user._count.wishlistItems,
        reportsCount: user._count.submittedReports,
      },
      recentBookings: user.bookings.map((b) => ({
        id: b.id,
        bookingReference: b.bookingReference,
        propertyTitle: b.propertyTitleSnapshot,
        checkIn: b.checkIn.toISOString().slice(0, 10),
        checkOut: b.checkOut.toISOString().slice(0, 10),
        totalAmountPaise: b.totalAmountPaise,
        status: b.status,
        createdAt: b.createdAt.toISOString(),
      })),
    };
  }

  async suspendUser(adminId: string, userId: string, dto: SuspendActionDto) {
    if (adminId === userId) {
      throw new ForbiddenException('Security rule violation: You cannot suspend your own administrative account.');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, status: true, tokenVersion: true },
    });

    if (!targetUser) {
      throw new NotFoundException(`User with ID "${userId}" not found.`);
    }

    if (targetUser.status === AccountStatus.SUSPENDED) {
      throw new BadRequestException('This account is already suspended.');
    }

    await this.prisma.$transaction(async (tx) => {
      // 0. Protect the last active administrator. The census is taken INSIDE the
      // transaction -- locking the active admin set with FOR UPDATE -- so two
      // concurrent suspend operations on the last remaining admins serialize:
      // the second payment sees the first's committed rows (READ COMMITTED
      // re-evaluates the locked rows) and correctly aborts.
      if (targetUser.role === UserRole.ADMIN) {
        const activeAdminRows = (await tx.$queryRaw<Array<{ id: string }>>(
          Prisma.sql`SELECT id FROM "users" WHERE role = 'ADMIN' AND status = 'ACTIVE' ORDER BY id FOR UPDATE`,
        )) as Array<{ id: string }>;

        if (!activeAdminRows.some((row) => row.id === userId) || activeAdminRows.length <= 1) {
          throw new ForbiddenException(
            'Security rule violation: Cannot suspend the last active platform administrator.',
          );
        }
      }

      // 1. Update user status and bump tokenVersion
      const updated = await tx.user.update({
        where: { id: userId },
        data: {
          status: AccountStatus.SUSPENDED,
          tokenVersion: { increment: 1 },
        },
        select: { id: true, status: true, tokenVersion: true },
      });

      // 2. Revoke all active refresh tokens
      await tx.refreshToken.deleteMany({
        where: { userId },
      });

      // 3. Write immutable audit log
      await this.auditService.log(
        {
          adminUserId: adminId,
          action: 'SUSPEND_USER',
          entityType: 'User',
          entityId: userId,
          reason: dto.reason,
          beforeData: { status: targetUser.status, tokenVersion: targetUser.tokenVersion },
          afterData: { status: updated.status, tokenVersion: updated.tokenVersion },
        },
        tx,
      );
    });

    return {
      success: true,
      message: `User account "${targetUser.email}" has been suspended.`,
    };
  }

  async activateUser(adminId: string, userId: string, dto: ActivateActionDto) {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, status: true },
    });

    if (!targetUser) {
      throw new NotFoundException(`User with ID "${userId}" not found.`);
    }

    if (targetUser.status === AccountStatus.ACTIVE) {
      throw new BadRequestException('This account is already active.');
    }

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: userId },
        data: {
          status: AccountStatus.ACTIVE,
        },
        select: { id: true, status: true },
      });

      await this.auditService.log(
        {
          adminUserId: adminId,
          action: 'ACTIVATE_USER',
          entityType: 'User',
          entityId: userId,
          reason: dto.reason,
          beforeData: { status: targetUser.status },
          afterData: { status: updated.status },
        },
        tx,
      );
    });

    return {
      success: true,
      message: `User account "${targetUser.email}" has been reactivated.`,
    };
  }
}

