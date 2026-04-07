import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import { OutboxWorker } from './outbox.worker';
import { OutboxMessage } from '../entities/outbox-message.entity';
import { Transaction } from '../entities/transaction.entity';
import { Account } from '../entities/account.entity';

describe('OutboxWorker', () => {
  let worker: OutboxWorker;

  const mockAccountQb = { update: jest.fn().mockReturnThis(), set: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), execute: jest.fn() };
  const outboxRepo = { find: jest.fn(), save: jest.fn() };
  const txRepo = { update: jest.fn() };
  const accountRepo = { createQueryBuilder: jest.fn().mockReturnValue(mockAccountQb) };
  const notificationQueue = { add: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    accountRepo.createQueryBuilder.mockReturnValue(mockAccountQb);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutboxWorker,
        { provide: getRepositoryToken(OutboxMessage), useValue: outboxRepo },
        { provide: getRepositoryToken(Transaction), useValue: txRepo },
        { provide: getRepositoryToken(Account), useValue: accountRepo },
        { provide: getQueueToken('notification-queue'), useValue: notificationQueue },
      ],
    }).compile();

    worker = module.get<OutboxWorker>(OutboxWorker);
  });

  it('should do nothing when no pending messages', async () => {
    outboxRepo.find.mockResolvedValue([]);
    await worker.processOutbox();
    expect(outboxRepo.save).not.toHaveBeenCalled();
  });

  it('should process a successful outbox message', async () => {
    const msg = {
      id: 'msg-1', status: 'PENDING', retryCount: 0, maxRetries: 5, errorMessage: null, processedAt: null,
      payload: JSON.stringify({ transactionRef: 'TXN-1', toAccount: '1002', amount: 100 }),
    };
    outboxRepo.find.mockResolvedValue([msg]);
    outboxRepo.save.mockResolvedValue(msg);
    mockAccountQb.execute.mockResolvedValue({});
    txRepo.update.mockResolvedValue({});
    notificationQueue.add.mockResolvedValue({});

    await worker.processOutbox();

    expect(msg.status).toBe('SENT');
    expect(msg.processedAt).toBeInstanceOf(Date);
    expect(txRepo.update).toHaveBeenCalledWith({ transactionRef: 'TXN-1' }, expect.objectContaining({ status: 'SUCCESS' }));
    expect(notificationQueue.add).toHaveBeenCalledWith('transfer.completed', expect.any(Object));
    expect(outboxRepo.save).toHaveBeenCalledWith(msg);
  });

  it('should increment retryCount on failure and mark FAILED when max retries reached', async () => {
    const msg = {
      id: 'msg-2', status: 'PENDING', retryCount: 4, maxRetries: 5, errorMessage: null, processedAt: null,
      payload: JSON.stringify({ transactionRef: 'TXN-2', toAccount: '1002', amount: 50 }),
    };
    outboxRepo.find.mockResolvedValue([msg]);
    outboxRepo.save.mockResolvedValue(msg);

    // Make callCoreBanking fail by overriding private method
    (worker as any).callCoreBanking = jest.fn().mockResolvedValue({ success: false, error: 'Rejected' });

    await worker.processOutbox();

    expect(msg.retryCount).toBe(5);
    expect(msg.status).toBe('FAILED');
    expect(txRepo.update).toHaveBeenCalledWith({ transactionRef: 'TXN-2' }, expect.objectContaining({ status: 'FAILED' }));
    expect(notificationQueue.add).toHaveBeenCalledWith('transfer.failed', expect.any(Object));
  });

  it('should retry without marking FAILED when retryCount < maxRetries', async () => {
    const msg = {
      id: 'msg-3', status: 'PENDING', retryCount: 1, maxRetries: 5, errorMessage: null, processedAt: null,
      payload: JSON.stringify({ transactionRef: 'TXN-3', toAccount: '1002', amount: 50 }),
    };
    outboxRepo.find.mockResolvedValue([msg]);
    outboxRepo.save.mockResolvedValue(msg);
    (worker as any).callCoreBanking = jest.fn().mockResolvedValue({ success: false, error: 'Timeout' });

    await worker.processOutbox();

    expect(msg.retryCount).toBe(2);
    expect(msg.status).toBe('PENDING'); // not FAILED yet
    expect(msg.errorMessage).toBe('Timeout');
  });
});
