import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50, unique: true })
  username: string;

  @Column({ name: 'password_hash', length: 255 })
  passwordHash: string;

  @Column({ name: 'full_name', length: 200 })
  fullName: string;

  @Column({ length: 50 })
  role: string; // TELLER, SUPERVISOR, ADMIN

  @Column({ name: 'branch_code', length: 20 })
  branchCode: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'last_login', type: 'datetime2', nullable: true })
  lastLogin: Date;

  @Column({ name: 'created_at', type: 'datetime2', default: () => 'GETUTCDATE()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'datetime2', default: () => 'GETUTCDATE()' })
  updatedAt: Date;
}
