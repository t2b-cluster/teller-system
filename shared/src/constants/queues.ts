export const QUEUE_NAMES = {
  TRANSFER: 'transfer-queue',
  NOTIFICATION: 'notification-queue',
  RECONCILIATION: 'reconciliation-queue',
  OUTBOX: 'outbox-queue',
} as const;

export const QUEUE_EVENTS = {
  TRANSFER_INITIATED: 'transfer.initiated',
  TRANSFER_COMPLETED: 'transfer.completed',
  TRANSFER_FAILED: 'transfer.failed',
  OUTBOX_PROCESS: 'outbox.process',
  RECONCILE_CHECK: 'reconcile.check',
  NOTIFY_TELLER: 'notify.teller',
  NOTIFY_ALERT: 'notify.alert',
} as const;
