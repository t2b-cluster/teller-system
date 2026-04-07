import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Redis from 'ioredis';
import { Account } from '../entities/account.entity';

@Injectable()
export class BalanceService {
  private redis: Redis;

  constructor(
    @InjectRepository(Account) private readonly accountRepo: Repository<Account>,
  ) {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || 'tellerpass',
    });
  }

  async getBalance(accountId: string) {
    // Cache-Aside: check Redis first
    const cacheKey = `balance:${accountId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return { accountId, balance: parseFloat(cached), source: 'cache' };
    }

    // Fallback to DB
    const account = await this.accountRepo.findOne({
      where: { accountNumber: accountId },
    });
    if (!account) throw new NotFoundException('Account not found');

    // Cache with 30s TTL
    await this.redis.set(cacheKey, account.balance.toString(), 'EX', 30);

    return { accountId, balance: Number(account.balance), source: 'database' };
  }
}
