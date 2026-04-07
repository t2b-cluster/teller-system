import { Entity, PrimaryGeneratedColumn, Column, VersionColumn } from 'typeorm';

@Entity('accounts')
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'account_number', length: 20, unique: true })
  accountNumber: string;

  @Column({ name: 'account_name', length: 200 })
  accountName: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  balance: number;

  @Column({ length: 3, default: 'THB' })
  currency: string;

  @Column({ length: 20, default: 'ACTIVE' })
  status: string;

  @Column({ name: 'created_at', type: 'datetime2', default: () => 'GETUTCDATE()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'datetime2', default: () => 'GETUTCDATE()' })
  updatedAt: Date;

  @VersionColumn()
  version: number;
}
