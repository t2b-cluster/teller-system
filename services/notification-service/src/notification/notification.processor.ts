import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

@Processor('notification-queue')
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  async process(job: Job): Promise<void> {
    const { name, data } = job;

    switch (name) {
      case 'transfer.completed':
        this.logger.log(`Transfer completed: ${data.transactionRef}`);
        // TODO: Send notification to Teller UI via WebSocket/SSE
        break;

      case 'transfer.failed':
        this.logger.warn(`Transfer failed: ${data.transactionRef} - ${data.error}`);
        // TODO: Send failure alert to Teller UI
        break;

      case 'notify.alert':
        this.logger.error(`Alert: ${data.type} - ${JSON.stringify(data)}`);
        // TODO: Send to Slack/PagerDuty/AlertManager
        break;

      default:
        this.logger.log(`Unknown event: ${name} - ${JSON.stringify(data)}`);
    }
  }
}
