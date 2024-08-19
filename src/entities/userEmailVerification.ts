import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  BaseEntity,
} from 'typeorm';
import { User } from './user';

@Entity()
export class UserEmailVerification extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => User, user => user.emailVerification, { onDelete: 'CASCADE' })
  user: User;

  @Column({ nullable: true })
  emailVerificationCode: string | null;

  @Column('timestamptz', { nullable: true })
  emailVerificationCodeExpiredAt: Date | null;
}
