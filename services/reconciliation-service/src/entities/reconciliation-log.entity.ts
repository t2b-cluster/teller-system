import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('reconciliation_logs')
export class ReconciliationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'transaction_ref', length: 50 })
  transactionRef: string;

  @Column({ name: 'channel_status', length: 20 })
  channelStatus: string;

  @Column({ name: 'core_banking_status', length: 20, nullable: true })
  coreBankingStatus: string;

  @Column({ name: 'match_result', length: 20 })
  matchResult: string;

  @Column({ default: false })
  resolved: boolean;

  @Column({ name: 'resolved_at', type: 'datetime2', nullable: true })
  resolvedAt: Date;

  @Column({ length: 1000, nullable: true })
  notes: string;

  @Column({ name: 'created_at', type: 'datetime2', default: () => 'GETUTCDATE()' })
  createdAt: Date;
}
