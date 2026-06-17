import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { Wallet } from '../wallet/wallet.entity';
import { User } from '../users/user.entity';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('AuthService - Account Lockout', () => {
  let service: AuthService;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockPublicKey = 'GABCDEF1234567890';

  const mockUser = {
    id: mockUserId,
    email: 'test@example.com',
    name: 'Test User',
    failedLoginAttempts: 0,
    lockedUntil: null,
  };

  const mockWallet = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    publicKey: mockPublicKey,
    userId: mockUserId,
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    save: jest.fn().mockResolvedValue({ ...mockUser }),
  };

  const mockWalletRepository = {
    findOne: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-token'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Wallet),
          useValue: mockWalletRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Account Lockout', () => {
    it('should lock account after 5 failed attempts', async () => {
      mockWalletRepository.findOne.mockResolvedValue(mockWallet);
      mockUserRepository.findOne.mockResolvedValue({
        ...mockUser,
        failedLoginAttempts: 0,
        lockedUntil: null,
      });

      jest.spyOn(service as any, 'verifySignature').mockResolvedValue(false);

      // Simulate 4 failed attempts
      for (let i = 0; i < 4; i++) {
        try {
          await service.login({
            publicKey: mockPublicKey,
            signature: 'invalid-signature',
            message: 'test-message',
          });
        } catch {
          // Expected to fail - ignoring
        }
      }

      mockUserRepository.findOne.mockResolvedValue({
        ...mockUser,
        failedLoginAttempts: 4,
        lockedUntil: null,
      });

      try {
        await service.login({
          publicKey: mockPublicKey,
          signature: 'invalid-signature',
          message: 'test-message',
        });
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(HttpException);
        if (error instanceof HttpException) {
          expect(error.getStatus()).toBe(HttpStatus.LOCKED);
          const response = error.getResponse() as { unlockTime?: string };
          expect(response).toHaveProperty('unlockTime');
        }
      }
    });

    it('should return 423 with unlock time when account is locked', async () => {
      const lockUntil = new Date(Date.now() + 15 * 60 * 1000);
      
      mockWalletRepository.findOne.mockResolvedValue(mockWallet);
      mockUserRepository.findOne.mockResolvedValue({
        ...mockUser,
        lockedUntil: lockUntil,
        failedLoginAttempts: 5,
      });

      try {
        await service.login({
          publicKey: mockPublicKey,
          signature: 'invalid-signature',
          message: 'test-message',
        });
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(HttpException);
        if (error instanceof HttpException) {
          expect(error.getStatus()).toBe(HttpStatus.LOCKED);
          const response = error.getResponse() as { unlockTime?: string };
          expect(response).toHaveProperty('unlockTime');
        }
      }
    });

    it('should reset failed attempts on successful login', async () => {
      mockWalletRepository.findOne.mockResolvedValue(mockWallet);
      
      const userWithAttempts = {
        ...mockUser,
        failedLoginAttempts: 3,
        lockedUntil: null,
      };
      mockUserRepository.findOne.mockResolvedValue(userWithAttempts);
      
      jest.spyOn(service as any, 'verifySignature').mockResolvedValue(true);

      await service.login({
        publicKey: mockPublicKey,
        signature: 'valid-signature',
        message: 'test-message',
      });

      // Verify the save was called with reset values
      expect(mockUserRepository.save).toHaveBeenCalled();
      const savedUser = mockUserRepository.save.mock.calls[0][0];
      expect(savedUser.failedLoginAttempts).toBe(0);
      expect(savedUser.lockedUntil).toBeNull();
    });
  });
});
