import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import { ReconcileService } from './reconcile.service';
import { Transaction } from '../entities/transaction.entity';
import { ReconciliationLog } from '../entities/reconciliation-log.entity';

describe('ReconcileService', () => {
  let service: ReconcileService;

  const txQb = { where: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(), take: jest.fn().mockReturnThis(), getMany: jest.fn() };
  const txRepo = { createQueryBuilder: jest.fn().mockReturnValue(txQb) };

  const reconQb = { where: jest.fn().mockReturnThis(), orderBy: jest.fn().mockReturnThis(), take: jest.fn().mockReturnThis(), getMany: jest.fn() };
  const reconRepo = { createQueryBuilder: jest.fn().mockReturnValue(reconQb), create: jest.fn(), save: jest.fn() };

  const notificationQueue = { add: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    txRepo.createQueryBuilder.mockReturnValue(txQb);
    reconRepo.createQueryBuilder.mockReturnValue(reconQb);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReconcileService,
        { provide: getRepositoryToken(Transaction), useValue: txRepo },
        { provide: getRepositoryToken(ReconciliationLog), useValue: reconRepo },
        { provide: getQueueToken('notification-queue'), useValue: notificationQueue },
      ],
    }).compile();

    service = module.get<ReconcileService>(ReconcileService);
  });

  describe('reconcilePendingTransactions', () => {
    it('should do nothing when no pending transactions', async () => {
      txQb.getMany.mockResolvedValue([]);
      await service.reconcilePendingTransactions();
      expect(reconRepo.save).not.toHaveBeenCalled();
    });

    it('should create MISMATCH log and send alert when statuses differ', async () => {
      const tx = { transactionRef: 'TXN-1', status: 'PENDING' };
      txQb.getMany.mockResolvedValue([tx]);
      // checkCoreBankingStatus returns 'PENDING' by default → MATCH with tx.status
      // Override to return 'SUCCESS' to create MISMATCH
      (service as any).checkCoreBankingStatus = jest.fn().mockResolvedValue('SUCCESS');
      reconRepo.create.mockReturnValue({ transactionRef: 'TXN-1', channelStatus: 'PENDING', coreBankingStatus: 'SUCCESS', matchResult: 'MISMATCH' });
      reconRepo.save.mockResolvedValue({});

      await service.reconcilePendingTransactions();

      expect(reconRepo.create).toHaveBeenCalledWith(expect.objectContaining({ matchResult: 'MISMATCH' }));
      expect(notificationQueue.add).toHaveBeenCalledWith('notify.alert', expect.objectContaining({ type: 'RECONCILE_MISMATCH' }));
    });

    it('should create MATCH log without alert when statuses match', async () => {
      const tx = { transactionRef: 'TXN-2', status: 'PENDING' };
      txQb.getMany.mockResolvedValue([tx]);
      // Default checkCoreBankingStatus returns 'PENDING' → MATCH
      reconRepo.create.mockReturnValue({ matchResult: 'MATCH' });
      reconRepo.save.mockResolvedValue({});

      await service.reconcilePendingTransactions();

      expect(reconRepo.create).toHaveBeenCalledWith(expect.objectContaining({ matchResult: 'MATCH' }));
      expect(notificationQueue.add).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully without crashing', async () => {
      const tx = { transactionRef: 'TXN-3', status: 'PENDING' };
      txQb.getMany.mockResolvedValue([tx]);
      (service as any).checkCoreBankingStatus = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(service.reconcilePendingTransactions()).resolves.not.toThrow();
    });
  });

  describe('getReconciliationLogs', () => {
    it('should return logs without filter', async () => {
      reconQb.getMany.mockResolvedValue([{ id: '1' }]);
      const result = await service.getReconciliationLogs();
      expect(reconQb.where).not.toHaveBeenCalled();
      expect(result).toEqual([{ id: '1' }]);
    });

    it('should apply matchResult filter', async () => {
      reconQb.getMany.mockResolvedValue([]);
      await service.getReconciliationLogs('MISMATCH');
      expect(reconQb.where).toHaveBeenCalledWith('r.match_result = :result', { result: 'MISMATCH' });
    });
  });
});
