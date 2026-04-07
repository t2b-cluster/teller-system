import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('accounts')
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'account_number', length: 20, unique: true })
  accountNumber: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  balance: number;
}
