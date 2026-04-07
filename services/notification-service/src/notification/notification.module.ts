import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationProcessor } from './notification.processor';
import { NotificationController } from './notification.controller';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'notification-queue' }),
  ],
  controllers: [NotificationController],
  providers: [NotificationProcessor],
})
export class NotificationModule {}
