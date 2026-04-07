import { Controller, Post, Body, Headers, HttpCode, Get, Param } from '@nestjs/common';
import { TransferService } from './transfer.service';
import { CreateTransferDto } from './transfer.dto';

@Controller('transfers')
export class TransferController {
  constructor(private readonly transferService: TransferService) {}

  @Post()
  @HttpCode(200)
  async createTransfer(
    @Body() dto: CreateTransferDto,
    @Headers('x-idempotency-key') idempotencyKey: string,
  ) {
    if (!idempotencyKey) {
      return { error: 'x-idempotency-key header is required' };
    }
    return this.transferService.executeTransfer(dto, idempotencyKey);
  }

  @Get(':id/status')
  async getTransferStatus(@Param('id') id: string) {
    return this.transferService.getStatus(id);
  }
}
