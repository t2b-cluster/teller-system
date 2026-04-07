import { Test, TestingModule } from '@nestjs/testing';
import { ReconcileController } from './reconcile.controller';
import { ReconcileService } from './reconcile.service';

describe('ReconcileController', () => {
  let controller: ReconcileController;
  const service = { getReconciliationLogs: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReconcileController],
      providers: [{ provide: ReconcileService, useValue: service }],
    }).compile();
    controller = module.get<ReconcileController>(ReconcileController);
  });

  it('should call getReconciliationLogs with matchResult', async () => {
    service.getReconciliationLogs.mockResolvedValue([]);
    await controller.getLogs('MISMATCH');
    expect(service.getReconciliationLogs).toHaveBeenCalledWith('MISMATCH');
  });

  it('should call getReconciliationLogs without filter', async () => {
    service.getReconciliationLogs.mockResolvedValue([]);
    await controller.getLogs();
    expect(service.getReconciliationLogs).toHaveBeenCalledWith(undefined);
  });
});
