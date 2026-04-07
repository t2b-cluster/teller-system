import { Controller, Get } from '@nestjs/common';
import { SetMetadata } from '@nestjs/common';
import { DataSource } from 'typeorm';

const Public = () => SetMetadata('isPublic', true);

@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get('live')
  @Public()
  live() {
    return { status: 'ok', service: 'transfer-service' };
  }

  @Get('ready')
  @Public()
  async ready() {
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'ok', db: 'connected' };
    } catch {
      return { status: 'error', db: 'disconnected' };
    }
  }
}
