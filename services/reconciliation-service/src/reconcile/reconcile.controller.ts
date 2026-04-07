import { Controller, Get, Query } from '@nestjs/common';
import { ReconcileService } from './reconcile.service';

@Controller('reconciliation')
export class ReconcileController {
  constructor(private readonly reconcileService: ReconcileService) {}

  @Get('logs')
  async getLogs(@Query('matchResult') matchResult?: string) {
    return this.reconcileService.getReconciliationLogs(matchResult);
  }
}
