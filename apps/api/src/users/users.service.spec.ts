import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let usersService: UsersService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    usersService = new UsersService(mockPrisma);
  });

  it('should update user profile firstName and lastName', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      firstName: 'OldFirst',
      lastName: 'OldLast',
    });

    mockPrisma.user.update.mockResolvedValue({
      id: 'user-1',
      email: 'john@example.com',
      firstName: 'NewFirst',
      lastName: 'NewLast',
      avatarUrl: null,
      role: 'USER',
      emailVerified: false,
      createdAt: new Date(),
    });

    const result = await usersService.updateProfile('user-1', {
      firstName: ' NewFirst ',
      lastName: ' NewLast ',
    });

    expect(result.firstName).toBe('NewFirst');
    expect(result.lastName).toBe('NewLast');
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        firstName: 'NewFirst',
        lastName: 'NewLast',
      },
    });
  });

  it('should throw NotFoundException if user is not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(usersService.updateProfile('non-existent', { firstName: 'Jane' })).rejects.toThrow(
      NotFoundException,
    );
  });
});
