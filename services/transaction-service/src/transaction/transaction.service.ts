import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../entities/transaction.entity';

interface QueryParams {
  accountId?: string;
  startDate?: string;
  endDate?: string;
  type?: string;
  status?: string;
  cursor?: string;
  limit: number;
}

@Injectable()
export class TransactionService {
  constructor(
    @InjectRepository(Transaction) private readonly txRepo: Repository<Transaction>,
  ) {}

  async findAll(params: QueryParams) {
    const qb = this.txRepo.createQueryBuilder('tx');

    if (params.accountId) {
      qb.andWhere('(tx.from_account = :acc OR tx.to_account = :acc)', { acc: params.accountId });
    }
    if (params.startDate) {
      qb.andWhere('tx.created_at >= :start', { start: params.startDate });
    }
    if (params.endDate) {
      qb.andWhere('tx.created_at <= :end', { end: params.endDate });
    }
    if (params.type) {
      qb.andWhere('tx.type = :type', { type: params.type });
    }
    if (params.status) {
      qb.andWhere('tx.status = :status', { status: params.status });
    }
    if (params.cursor) {
      qb.andWhere('tx.created_at < :cursor', { cursor: params.cursor });
    }

    qb.orderBy('tx.created_at', 'DESC').take(params.limit + 1);

    const items = await qb.getMany();
    const hasMore = items.length > params.limit;
    if (hasMore) items.pop();

    return {
      items,
      nextCursor: hasMore ? items[items.length - 1].createdAt.toISOString() : null,
      hasMore,
    };
  }
}
