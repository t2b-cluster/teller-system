import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uniqueidentifier' })
  userId: string;

  @Column({ length: 500 })
  token: string;

  @Column({ name: 'expires_at', type: 'datetime2' })
  expiresAt: Date;

  @Column({ default: false })
  revoked: boolean;

  @Column({ name: 'created_at', type: 'datetime2', default: () => 'GETUTCDATE()' })
  createdAt: Date;
}
