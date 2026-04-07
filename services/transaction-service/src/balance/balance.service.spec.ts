/* eslint-disable @typescript-eslint/no-var-requires */
const redisMock = { get: jest.fn(), set: jest.fn() };
jest.mock('ioredis', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => redisMock),
  };
});

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BalanceService } from './balance.service';
import { Account } from '../entities/account.entity';

describe('BalanceService', () => {
  let service: BalanceService;
  const accountRepo = { findOne: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BalanceService,
        { provide: getRepositoryToken(Account), useValue: accountRepo },
      ],
    }).compile();
    service = module.get<BalanceService>(BalanceService);
  });

  it('should return cached balance when Redis has data', async () => {
    redisMock.get.mockResolvedValue('50000.50');
    const result = await service.getBalance('1001');
    expect(result).toEqual({ accountId: '1001', balance: 50000.50, source: 'cache' });
    expect(accountRepo.findOne).not.toHaveBeenCalled();
  });

  it('should query DB and cache when Redis miss', async () => {
    redisMock.get.mockResolvedValue(null);
    accountRepo.findOne.mockResolvedValue({ accountNumber: '1001', balance: 75000 });
    redisMock.set.mockResolvedValue('OK');

    const result = await service.getBalance('1001');
    expect(result).toEqual({ accountId: '1001', balance: 75000, source: 'database' });
    expect(redisMock.set).toHaveBeenCalledWith('balance:1001', '75000', 'EX', 30);
  });

  it('should throw NotFoundException when account not found', async () => {
    redisMock.get.mockResolvedValue(null);
    accountRepo.findOne.mockResolvedValue(null);
    await expect(service.getBalance('9999')).rejects.toThrow(NotFoundException);
  });
});
