import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TransactionService } from './transaction.service';
import { Transaction } from '../entities/transaction.entity';

describe('TransactionService', () => {
  let service: TransactionService;

  const mockQb = {
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  const txRepo = {
    createQueryBuilder: jest.fn().mockReturnValue(mockQb),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    txRepo.createQueryBuilder.mockReturnValue(mockQb);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionService,
        { provide: getRepositoryToken(Transaction), useValue: txRepo },
      ],
    }).compile();

    service = module.get<TransactionService>(TransactionService);
  });

  it('should return items with no filters', async () => {
    const items = [{ id: '1', createdAt: new Date() }];
    mockQb.getMany.mockResolvedValue(items);

    const result = await service.findAll({ limit: 50 });

    expect(txRepo.createQueryBuilder).toHaveBeenCalledWith('tx');
    expect(mockQb.orderBy).toHaveBeenCalledWith('tx.created_at', 'DESC');
    expect(mockQb.take).toHaveBeenCalledWith(51);
    expect(result).toEqual({ items, nextCursor: null, hasMore: false });
  });

  it('should apply accountId filter', async () => {
    mockQb.getMany.mockResolvedValue([]);
    await service.findAll({ accountId: '123', limit: 10 });
    expect(mockQb.andWhere).toHaveBeenCalledWith(
      '(tx.from_account = :acc OR tx.to_account = :acc)', { acc: '123' },
    );
  });

  it('should apply startDate and endDate filters', async () => {
    mockQb.getMany.mockResolvedValue([]);
    await service.findAll({ startDate: '2026-01-01', endDate: '2026-12-31', limit: 10 });
    expect(mockQb.andWhere).toHaveBeenCalledWith('tx.created_at >= :start', { start: '2026-01-01' });
    expect(mockQb.andWhere).toHaveBeenCalledWith('tx.created_at <= :end', { end: '2026-12-31' });
  });

  it('should apply type and status filters', async () => {
    mockQb.getMany.mockResolvedValue([]);
    await service.findAll({ type: 'TRANSFER', status: 'SUCCESS', limit: 10 });
    expect(mockQb.andWhere).toHaveBeenCalledWith('tx.type = :type', { type: 'TRANSFER' });
    expect(mockQb.andWhere).toHaveBeenCalledWith('tx.status = :status', { status: 'SUCCESS' });
  });

  it('should apply cursor filter', async () => {
    mockQb.getMany.mockResolvedValue([]);
    await service.findAll({ cursor: '2026-01-01T00:00:00Z', limit: 10 });
    expect(mockQb.andWhere).toHaveBeenCalledWith('tx.created_at < :cursor', { cursor: '2026-01-01T00:00:00Z' });
  });

  it('should return hasMore=true and nextCursor when more items exist', async () => {
    const date = new Date('2026-06-15T10:00:00Z');
    const items = Array.from({ length: 11 }, (_, i) => ({ id: String(i), createdAt: date }));
    mockQb.getMany.mockResolvedValue(items);

    const result = await service.findAll({ limit: 10 });

    expect(result.hasMore).toBe(true);
    expect(result.items).toHaveLength(10);
    expect(result.nextCursor).toBe(date.toISOString());
  });
});
