import { ObjectType, Field, ID } from 'type-graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum BROAD_CAST_NOTIFICATION_STATUS {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
}

@Entity()
export default class BroadcastNotification extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title?: string;

  @Column()
  text: string;

  @Column({ nullable: true, default: BROAD_CAST_NOTIFICATION_STATUS.PENDING })
  status?: string;

  @Column({ nullable: true })
  link?: string;

  @Column({ nullable: true })
  linkTitle?: string;

  @Column({ nullable: true, default: false })
  sendEmail?: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
