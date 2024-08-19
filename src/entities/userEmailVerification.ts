import { Entity, PrimaryGeneratedColumn, Column, BaseEntity } from 'typeorm';

@Entity()
export class UserEmailVerification extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column('text', { nullable: true })
  emailVerificationCode: string | null;

  @Column('timestamptz', { nullable: true })
  emailVerificationCodeExpiredAt: Date | null;
}
