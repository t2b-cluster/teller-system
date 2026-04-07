import { Test, TestingModule } from '@nestjs/testing';
import { TransferController } from './transfer.controller';
import { TransferService } from './transfer.service';

describe('TransferController', () => {
  let controller: TransferController;

  const transferService = {
    executeTransfer: jest.fn(),
    getStatus: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransferController],
      providers: [
        { provide: TransferService, useValue: transferService },
      ],
    }).compile();

    controller = module.get<TransferController>(TransferController);
  });

  describe('POST /transfers', () => {
    const dto = {
      fromAccount: 'ACC001',
      toAccount: 'ACC002',
      amount: 100,
      currency: 'THB',
    };

    it('should call service.executeTransfer with dto and idempotency key', async () => {
      const expected = { transactionId: 'tx-1', transactionRef: 'TXN-123', status: 'PENDING' };
      transferService.executeTransfer.mockResolvedValue(expected);

      const result = await controller.createTransfer(dto as any, 'idem-key-1');

      expect(transferService.executeTransfer).toHaveBeenCalledWith(dto, 'idem-key-1');
      expect(result).toEqual(expected);
    });

    it('should return error when x-idempotency-key header is missing', async () => {
      const result = await controller.createTransfer(dto as any, undefined as any);

      expect(result).toEqual({ error: 'x-idempotency-key header is required' });
      expect(transferService.executeTransfer).not.toHaveBeenCalled();
    });

    it('should return error when x-idempotency-key header is empty string', async () => {
      const result = await controller.createTransfer(dto as any, '');

      expect(result).toEqual({ error: 'x-idempotency-key header is required' });
      expect(transferService.executeTransfer).not.toHaveBeenCalled();
    });
  });

  describe('GET /transfers/:id/status', () => {
    it('should call service.getStatus with the transaction id', async () => {
      const expected = { transactionId: 'tx-1', ref: 'TXN-123', status: 'COMPLETED' };
      transferService.getStatus.mockResolvedValue(expected);

      const result = await controller.getTransferStatus('tx-1');

      expect(transferService.getStatus).toHaveBeenCalledWith('tx-1');
      expect(result).toEqual(expected);
    });
  });
});
