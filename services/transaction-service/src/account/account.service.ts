import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from '../entities/account.entity';
import { CreateAccountDto } from './account.dto';
import { MetricsService } from '../metrics/metrics.service';

@Injectable()
export class AccountService {
  constructor(
    @InjectRepository(Account) private readonly accountRepo: Repository<Account>,
    private readonly metrics: MetricsService,
  ) {}

  async create(dto: CreateAccountDto) {
    const existing = await this.accountRepo.findOne({
      where: { accountNumber: dto.accountNumber },
    });
    if (existing) {
      throw new ConflictException('เลขบัญชีนี้มีอยู่ในระบบแล้ว');
    }

    const account = this.accountRepo.create({
      accountNumber: dto.accountNumber,
      accountName: dto.accountName,
      balance: dto.initialDeposit || 0,
      currency: dto.currency || 'THB',
      status: 'ACTIVE',
    });

    const saved = await this.accountRepo.save(account);

    this.metrics.accountCreatedTotal.inc();

    return {
      id: saved.id,
      accountNumber: saved.accountNumber,
      accountName: saved.accountName,
      balance: Number(saved.balance),
      currency: saved.currency,
      status: saved.status,
    };
  }

  async findAll() {
    const accounts = await this.accountRepo.find({ order: { accountNumber: 'ASC' } });
    return accounts.map((a) => ({
      id: a.id,
      accountNumber: a.accountNumber,
      accountName: a.accountName,
      balance: Number(a.balance),
      currency: a.currency,
      status: a.status,
    }));
  }
}
