import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { TransferProducer } from './transfer.producer';

describe('TransferProducer', () => {
  let producer: TransferProducer;

  const transferQueue = { add: jest.fn().mockResolvedValue(undefined) };
  const notificationQueue = { add: jest.fn().mockResolvedValue(undefined) };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransferProducer,
        { provide: getQueueToken('transfer-queue'), useValue: transferQueue },
        { provide: getQueueToken('notification-queue'), useValue: notificationQueue },
      ],
    }).compile();

    producer = module.get<TransferProducer>(TransferProducer);
  });

  describe('publishTransferInitiated', () => {
    it('should add job to transfer-queue with correct name, payload, and options', async () => {
      const payload = { fromAccount: 'ACC001', toAccount: 'ACC002', amount: 100 };

      await producer.publishTransferInitiated('TXN-123', payload);

      expect(transferQueue.add).toHaveBeenCalledWith(
        'transfer.initiated',
        expect.objectContaining({
          transactionRef: 'TXN-123',
          fromAccount: 'ACC001',
          toAccount: 'ACC002',
          amount: 100,
          timestamp: expect.any(String),
        }),
        expect.objectContaining({
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: 1000,
          removeOnFail: 5000,
        }),
      );
    });
  });

  describe('publishTransferCompleted', () => {
    it('should add job to notification-queue with transfer.completed event', async () => {
      const data = { fromAccount: 'ACC001', toAccount: 'ACC002', amount: 100 };

      await producer.publishTransferCompleted('TXN-456', data);

      expect(notificationQueue.add).toHaveBeenCalledWith(
        'transfer.completed',
        expect.objectContaining({
          transactionRef: 'TXN-456',
          fromAccount: 'ACC001',
          toAccount: 'ACC002',
          amount: 100,
          timestamp: expect.any(String),
        }),
      );
    });
  });

  describe('publishTransferFailed', () => {
    it('should add job to notification-queue with transfer.failed event', async () => {
      await producer.publishTransferFailed('TXN-789', 'Insufficient funds');

      expect(notificationQueue.add).toHaveBeenCalledWith(
        'transfer.failed',
        expect.objectContaining({
          transactionRef: 'TXN-789',
          error: 'Insufficient funds',
          timestamp: expect.any(String),
        }),
      );
    });
  });
});
