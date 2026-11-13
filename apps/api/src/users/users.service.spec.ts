import { jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  const prisma = {
    user: { findUnique: jest.fn<(...args: any[]) => Promise<any>>() },
  };
  let service: UsersService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new UsersService(prisma as unknown as PrismaService);
  });

  it('returns the current user profile without password data', async () => {
    const profile = {
      id: 'user_1',
      name: 'Tram',
      email: 'tram@example.com',
      loyaltyPoints: 25,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    };
    prisma.user.findUnique.mockResolvedValue(profile);

    await expect(service.findMe('user_1')).resolves.toEqual(profile);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user_1' },
      select: { id: true, name: true, email: true, loyaltyPoints: true, createdAt: true },
    });
  });

  it('throws when the current user no longer exists', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.findMe('missing-user')).rejects.toBeInstanceOf(NotFoundException);
  });
});
