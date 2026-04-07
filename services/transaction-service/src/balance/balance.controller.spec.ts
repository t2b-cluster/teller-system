import { Test, TestingModule } from '@nestjs/testing';
import { BalanceController } from './balance.controller';
import { BalanceService } from './balance.service';

describe('BalanceController', () => {
  let controller: BalanceController;
  const service = { getBalance: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BalanceController],
      providers: [{ provide: BalanceService, useValue: service }],
    }).compile();
    controller = module.get<BalanceController>(BalanceController);
  });

  it('should call service.getBalance with accountId', async () => {
    service.getBalance.mockResolvedValue({ accountId: '1001', balance: 100, source: 'cache' });
    const result = await controller.getBalance('1001');
    expect(service.getBalance).toHaveBeenCalledWith('1001');
    expect(result.accountId).toBe('1001');
  });
});
