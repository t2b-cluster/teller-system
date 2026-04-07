import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('outbox_messages')
export class OutboxMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'aggregate_type', length: 50 })
  aggregateType: string;

  @Column({ name: 'aggregate_id', length: 100 })
  aggregateId: string;

  @Column({ name: 'event_type', length: 100 })
  eventType: string;

  @Column({ type: 'nvarchar', length: 'max' })
  payload: string;

  @Column({ length: 20, default: 'PENDING' })
  status: string;

  @Column({ name: 'retry_count', default: 0 })
  retryCount: number;

  @Column({ name: 'max_retries', default: 5 })
  maxRetries: number;

  @Column({ name: 'created_at', type: 'datetime2', default: () => 'GETUTCDATE()' })
  createdAt: Date;

  @Column({ name: 'processed_at', type: 'datetime2', nullable: true })
  processedAt: Date;

  @Column({ name: 'error_message', length: 1000, nullable: true })
  errorMessage: string;
}
