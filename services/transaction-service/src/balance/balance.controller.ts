import { Controller, Get, Param } from '@nestjs/common';
import { BalanceService } from './balance.service';

@Controller('balance')
export class BalanceController {
  constructor(private readonly balanceService: BalanceService) {}

  @Get(':accountId')
  async getBalance(@Param('accountId') accountId: string) {
    return this.balanceService.getBalance(accountId);
  }
}
