import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('idempotency_keys')
export class IdempotencyKey {
  @PrimaryColumn({ name: 'idempotency_key', length: 100 })
  idempotencyKey: string;

  @Column({ type: 'nvarchar', length: 'max' })
  response: string;

  @Column({ name: 'status_code', default: 200 })
  statusCode: number;

  @Column({ name: 'created_at', type: 'datetime2', default: () => 'GETUTCDATE()' })
  createdAt: Date;

  @Column({ name: 'expires_at', type: 'datetime2' })
  expiresAt: Date;
}
