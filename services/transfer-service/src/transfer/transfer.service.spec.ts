import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { TransferService } from './transfer.service';
import { TransferProducer } from './transfer.producer';
import { RedisLockService } from '../infrastructure/redis-lock.service';
import { Account } from '../entities/account.entity';
import { Transaction } from '../entities/transaction.entity';
import { IdempotencyKey } from '../entities/idempotency-key.entity';
import { CreateTransferDto } from './transfer.dto';

describe('TransferService', () => {
  let service: TransferService;

  const accountRepo = { findOne: jest.fn() };
  const txRepo = { findOne: jest.fn() };
  const idemRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockLock = { release: jest.fn() };
  const lockService = {
    acquire: jest.fn().mockResolvedValue(mockLock),
    release: jest.fn().mockResolvedValue(undefined),
  };

  const transferProducer = {
    publishTransferInitiated: jest.fn().mockResolvedValue(undefined),
    publishTransferCompleted: jest.fn().mockResolvedValue(undefined),
    publishTransferFailed: jest.fn().mockResolvedValue(undefined),
  };

  // Mock query builder chain for pessimistic lock
  const mockGetOne = jest.fn();
  const mockWhere = jest.fn().mockReturnThis();
  const mockSetLock = jest.fn().mockReturnValue({ where: mockWhere });
  const mockExecute = jest.fn().mockResolvedValue(undefined);
  const mockSet = jest.fn().mockReturnValue({ where: jest.fn().mockReturnValue({ execute: mockExecute }) });

  const mockManager = {
    createQueryBuilder: jest.fn().mockImplementation((entity?: any, alias?: string) => {
      if (alias) {
        // SELECT query builder (with alias) — pessimistic lock path
        return {
          setLock: mockSetLock,
        };
      }
      // UPDATE query builder (no alias)
      return {
        update: jest.fn().mockReturnValue({
          set: mockSet,
        }),
      };
    }),
    create: jest.fn().mockImplementation((_entity, data) => data),
    save: jest.fn().mockImplementation((data) =>
      Promise.resolve({ id: 'tx-uuid-1', ...data }),
    ),
  };

  const dataSource = {
    transaction: jest.fn().mockImplementation((cb: Function) => cb(mockManager)),
  };

  const dto: CreateTransferDto = {
    fromAccount: 'ACC001',
    toAccount: 'ACC002',
    amount: 100,
    currency: 'THB',
    description: 'Test transfer',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockWhere.mockReturnValue({ getOne: mockGetOne });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransferService,
        { provide: DataSource, useValue: dataSource },
        { provide: getRepositoryToken(Account), useValue: accountRepo },
        { provide: getRepositoryToken(Transaction), useValue: txRepo },
        { provide: getRepositoryToken(IdempotencyKey), useValue: idemRepo },
        { provide: RedisLockService, useValue: lockService },
        { provide: TransferProducer, useValue: transferProducer },
      ],
    }).compile();

    service = module.get<TransferService>(TransferService);
  });

  describe('executeTransfer', () => {
    it('should return cached result when idempotency key exists (idempotent)', async () => {
      const cachedResult = { transactionId: 'tx-1', transactionRef: 'TXN-123', status: 'PENDING' };
      idemRepo.findOne.mockResolvedValue({
        idempotencyKey: 'idem-1',
        response: JSON.stringify(cachedResult),
      });

      const result = await service.executeTransfer(dto, 'idem-1');

      expect(result).toEqual(cachedResult);
      expect(lockService.acquire).not.toHaveBeenCalled();
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('should execute a successful transfer (lock + DB tx + outbox + idempotency)', async () => {
      idemRepo.findOne.mockResolvedValue(null);
      mockGetOne.mockResolvedValue({ accountNumber: 'ACC001', balance: 500 });
      idemRepo.create.mockImplementation((data: any) => data);
      idemRepo.save.mockResolvedValue(undefined);

      const result = await service.executeTransfer(dto, 'idem-new');

      // Acquired distributed lock
      expect(lockService.acquire).toHaveBeenCalledWith('lock:account:ACC001', 5000);

      // DB transaction was called
      expect(dataSource.transaction).toHaveBeenCalled();

      // Pessimistic lock query
      expect(mockSetLock).toHaveBeenCalledWith('pessimistic_write');
      expect(mockWhere).toHaveBeenCalledWith('a.account_number = :num', { num: 'ACC001' });

      // Transaction record saved
      expect(mockManager.save).toHaveBeenCalled();

      // Outbox message saved (second save call)
      const saveCalls = mockManager.save.mock.calls;
      const outboxCall = saveCalls.find((c: any[]) => c[0]?.eventType === 'transfer.initiated');
      expect(outboxCall).toBeDefined();

      // Idempotency key stored
      expect(idemRepo.create).toHaveBeenCalled();
      expect(idemRepo.save).toHaveBeenCalled();

      // Published to queue
      expect(transferProducer.publishTransferInitiated).toHaveBeenCalled();

      // Lock released
      expect(lockService.release).toHaveBeenCalledWith(mockLock);

      // Result shape
      expect(result).toHaveProperty('transactionRef');
      expect(result).toHaveProperty('status', 'PENDING');
    });

    it('should throw BadRequestException when transferring to the same account', async () => {
      idemRepo.findOne.mockResolvedValue(null);
      const sameAccountDto = { ...dto, toAccount: 'ACC001' };

      await expect(service.executeTransfer(sameAccountDto, 'idem-same'))
        .rejects.toThrow(BadRequestException);
      await expect(service.executeTransfer(sameAccountDto, 'idem-same'))
        .rejects.toThrow('Cannot transfer to the same account');
    });

    it('should throw NotFoundException when source account is not found', async () => {
      idemRepo.findOne.mockResolvedValue(null);
      mockGetOne.mockResolvedValue(null);

      await expect(service.executeTransfer(dto, 'idem-notfound'))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when balance is insufficient', async () => {
      idemRepo.findOne.mockResolvedValue(null);
      mockGetOne.mockResolvedValue({ accountNumber: 'ACC001', balance: 10 });

      await expect(service.executeTransfer(dto, 'idem-nobal'))
        .rejects.toThrow(BadRequestException);
    });

    it('should always release the lock in finally block even when transaction fails', async () => {
      idemRepo.findOne.mockResolvedValue(null);
      dataSource.transaction.mockRejectedValueOnce(new Error('DB exploded'));

      await expect(service.executeTransfer(dto, 'idem-fail'))
        .rejects.toThrow('DB exploded');

      expect(lockService.release).toHaveBeenCalledWith(mockLock);
    });

    it('should release the lock when NotFoundException is thrown inside transaction', async () => {
      idemRepo.findOne.mockResolvedValue(null);
      mockGetOne.mockResolvedValue(null);

      await expect(service.executeTransfer(dto, 'idem-lock-release'))
        .rejects.toThrow(NotFoundException);

      expect(lockService.release).toHaveBeenCalledWith(mockLock);
    });
  });

  describe('getStatus', () => {
    it('should return transaction status when found', async () => {
      txRepo.findOne.mockResolvedValue({
        id: 'tx-uuid-1',
        transactionRef: 'TXN-123',
        status: 'COMPLETED',
      });

      const result = await service.getStatus('tx-uuid-1');

      expect(result).toEqual({
        transactionId: 'tx-uuid-1',
        ref: 'TXN-123',
        status: 'COMPLETED',
      });
      expect(txRepo.findOne).toHaveBeenCalledWith({ where: { id: 'tx-uuid-1' } });
    });

    it('should throw NotFoundException when transaction is not found', async () => {
      txRepo.findOne.mockResolvedValue(null);

      await expect(service.getStatus('nonexistent'))
        .rejects.toThrow(NotFoundException);
    });
  });
});
