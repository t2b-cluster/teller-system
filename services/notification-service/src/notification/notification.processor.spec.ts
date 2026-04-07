import { NotificationProcessor } from './notification.processor';

describe('NotificationProcessor', () => {
  let processor: NotificationProcessor;

  beforeEach(() => {
    processor = new NotificationProcessor();
  });

  it('should handle transfer.completed event', async () => {
    const job = { name: 'transfer.completed', data: { transactionRef: 'TXN-1' } } as any;
    await expect(processor.process(job)).resolves.not.toThrow();
  });

  it('should handle transfer.failed event', async () => {
    const job = { name: 'transfer.failed', data: { transactionRef: 'TXN-2', error: 'Timeout' } } as any;
    await expect(processor.process(job)).resolves.not.toThrow();
  });

  it('should handle notify.alert event', async () => {
    const job = { name: 'notify.alert', data: { type: 'RECONCILE_MISMATCH', transactionRef: 'TXN-3' } } as any;
    await expect(processor.process(job)).resolves.not.toThrow();
  });

  it('should handle unknown event gracefully', async () => {
    const job = { name: 'unknown.event', data: { foo: 'bar' } } as any;
    await expect(processor.process(job)).resolves.not.toThrow();
  });
});
