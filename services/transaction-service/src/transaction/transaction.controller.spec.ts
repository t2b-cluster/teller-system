import { Test, TestingModule } from '@nestjs/testing';
import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';

describe('TransactionController', () => {
  let controller: TransactionController;
  const service = { findAll: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionController],
      providers: [{ provide: TransactionService, useValue: service }],
    }).compile();
    controller = module.get<TransactionController>(TransactionController);
  });

  it('should call findAll with parsed params', async () => {
    service.findAll.mockResolvedValue({ items: [], nextCursor: null, hasMore: false });
    await controller.getTransactions('123', undefined, undefined, 'TRANSFER', 'SUCCESS', undefined, '20');
    expect(service.findAll).toHaveBeenCalledWith({
      accountId: '123', startDate: undefined, endDate: undefined,
      type: 'TRANSFER', status: 'SUCCESS', cursor: undefined, limit: 20,
    });
  });

  it('should default limit to 50', async () => {
    service.findAll.mockResolvedValue({ items: [], nextCursor: null, hasMore: false });
    await controller.getTransactions();
    expect(service.findAll).toHaveBeenCalledWith(expect.objectContaining({ limit: 50 }));
  });
});
