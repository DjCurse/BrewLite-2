import { jest } from '@jest/globals';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const user = {
    id: 'user_1',
    name: 'Tram',
    email: 'tram@example.com',
    passwordHash: 'hashed-password',
    role: 'CUSTOMER',
    loyaltyPoints: 0,
    createdAt: new Date('2026-01-01T00:00:00Z'),
  };
  const prisma = {
    user: {
      create: jest.fn<(...args: any[]) => Promise<any>>(),
      findUnique: jest.fn<(...args: any[]) => Promise<any>>(),
    },
  };
  const jwt = { signAsync: jest.fn<(...args: any[]) => Promise<string>>() };
  let service: AuthService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new AuthService(prisma as unknown as PrismaService, jwt as unknown as JwtService);
    jwt.signAsync.mockResolvedValue('signed-token');
  });

  it('register hashes the password, normalizes input, and returns a token', async () => {
    prisma.user.create.mockResolvedValue({
      id: user.id,
      name: user.name,
      email: user.email,
      loyaltyPoints: 0,
      createdAt: user.createdAt,
    });

    const result = await service.register({
      name: ' Tram ',
      email: ' TRAM@example.com ',
      password: 'coffee123',
    });

    const createArgs = prisma.user.create.mock.calls[0][0];
    expect(createArgs.data).toMatchObject({ name: 'Tram', email: 'tram@example.com' });
    expect(createArgs.data.passwordHash).not.toBe('coffee123');
    await expect(bcrypt.compare('coffee123', createArgs.data.passwordHash)).resolves.toBe(true);
    expect(result.accessToken).toBe('signed-token');
    expect(jwt.signAsync).toHaveBeenCalledWith({ sub: user.id, email: user.email });
  });

  it('rejects registration when email is already used', async () => {
    prisma.user.create.mockRejectedValue({ code: 'P2002' });
    await expect(service.register({ name: 'Tram', email: user.email, password: 'coffee123' }))
      .rejects.toBeInstanceOf(ConflictException);
  });

  it('logs in with valid credentials and never returns the password hash', async () => {
    prisma.user.findUnique.mockResolvedValue(user);
    const passwordHash = await bcrypt.hash('coffee123', 4);
    prisma.user.findUnique.mockResolvedValue({ ...user, passwordHash });

    const result = await service.login({ email: ' TRAM@example.com ', password: 'coffee123' });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: user.email } });
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(result.accessToken).toBe('signed-token');
  });

  it('rejects invalid login credentials with a generic error', async () => {
    prisma.user.findUnique.mockResolvedValue(user);
    const passwordHash = await bcrypt.hash('correct-password', 4);
    prisma.user.findUnique.mockResolvedValue({ ...user, passwordHash });

    await expect(service.login({ email: user.email, password: 'wrong-pass' }))
      .rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects login when the email does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.login({ email: user.email, password: 'wrong-pass' }))
      .rejects.toBeInstanceOf(UnauthorizedException);
  });
});
