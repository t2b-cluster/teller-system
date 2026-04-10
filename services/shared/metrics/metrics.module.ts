import { Module, Global, OnModuleInit } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { MetricsInterceptor } from './metrics.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';

@Global()
@Module({
  controllers: [MetricsController],
  providers: [
    MetricsService,
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
  ],
  exports: [MetricsService],
})
export class MetricsModule implements OnModuleInit {
  constructor(private readonly metricsService: MetricsService) {}
  onModuleInit() {
    this.metricsService.initDefaultMetrics();
  }
}
