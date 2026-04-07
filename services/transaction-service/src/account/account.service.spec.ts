import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AccountService } from './account.service';
import { Account } from '../entities/account.entity';

describe('AccountService', () => {
  let service: AccountService;
  const repo = { findOne: jest.fn(), create: jest.fn(), save: jest.fn(), find: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountService,
        { provide: getRepositoryToken(Account), useValue: repo },
      ],
    }).compile();
    service = module.get<AccountService>(AccountService);
  });

  describe('create', () => {
    const dto = { accountNumber: '999', accountName: 'Test', initialDeposit: 1000, currency: 'THB' };

    it('should create account successfully', async () => {
      repo.findOne.mockResolvedValue(null);
      repo.create.mockReturnValue({ ...dto, balance: 1000, status: 'ACTIVE' });
      repo.save.mockResolvedValue({ id: 'uuid-1', accountNumber: '999', accountName: 'Test', balance: 1000, currency: 'THB', status: 'ACTIVE' });

      const result = await service.create(dto);
      expect(result.id).toBe('uuid-1');
      expect(result.balance).toBe(1000);
    });

    it('should throw ConflictException for duplicate account', async () => {
      repo.findOne.mockResolvedValue({ id: 'existing' });
      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('should default balance to 0 when no initialDeposit', async () => {
      repo.findOne.mockResolvedValue(null);
      repo.create.mockImplementation((d: any) => d);
      repo.save.mockImplementation((d: any) => Promise.resolve({ id: 'uuid-2', ...d }));

      await service.create({ accountNumber: '888', accountName: 'No Deposit' });
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ balance: 0, currency: 'THB' }));
    });
  });

  describe('findAll', () => {
    it('should return mapped accounts', async () => {
      repo.find.mockResolvedValue([
        { id: '1', accountNumber: '001', accountName: 'A', balance: '500.00', currency: 'THB', status: 'ACTIVE' },
      ]);
      const result = await service.findAll();
      expect(result).toEqual([{ id: '1', accountNumber: '001', accountName: 'A', balance: 500, currency: 'THB', status: 'ACTIVE' }]);
    });

    it('should return empty array when no accounts', async () => {
      repo.find.mockResolvedValue([]);
      const result = await service.findAll();
      expect(result).toEqual([]);
    });
  });
});
