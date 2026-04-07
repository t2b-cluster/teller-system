import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  const dataSource = {
    query: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  describe('GET /health/live', () => {
    it('should return ok status', () => {
      const result = controller.live();

      expect(result).toEqual({ status: 'ok', service: 'transfer-service' });
    });
  });

  describe('GET /health/ready', () => {
    it('should return ok when database is connected', async () => {
      dataSource.query.mockResolvedValue([{ '': 1 }]);

      const result = await controller.ready();

      expect(result).toEqual({ status: 'ok', db: 'connected' });
      expect(dataSource.query).toHaveBeenCalledWith('SELECT 1');
    });

    it('should return error when database is disconnected', async () => {
      dataSource.query.mockRejectedValue(new Error('Connection refused'));

      const result = await controller.ready();

      expect(result).toEqual({ status: 'error', db: 'disconnected' });
    });
  });
});
