import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'transaction_ref', length: 50, unique: true })
  transactionRef: string;

  @Column({ name: 'from_account', length: 20, nullable: true })
  fromAccount: string;

  @Column({ name: 'to_account', length: 20, nullable: true })
  toAccount: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number;

  @Column({ length: 3, default: 'THB' })
  currency: string;

  @Column({ length: 20 })
  type: string;

  @Column({ length: 20, default: 'PENDING' })
  status: string;

  @Column({ length: 500, nullable: true })
  description: string;

  @Column({ name: 'core_banking_ref', length: 100, nullable: true })
  coreBankingRef: string;

  @Column({ name: 'error_message', length: 1000, nullable: true })
  errorMessage: string;

  @Column({ name: 'created_at', type: 'datetime2', default: () => 'GETUTCDATE()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'datetime2', default: () => 'GETUTCDATE()' })
  updatedAt: Date;
}
