import { Field } from 'type-graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';
import { User } from './user.js';

export enum BROAD_CAST_NOTIFICATION_STATUS {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
}

@Entity()
export default class BroadcastNotification extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true, default: BROAD_CAST_NOTIFICATION_STATUS.PENDING })
  status?: string;

  @Column()
  html: string;

  @Column()
  title: string;

  @Field(_type => User, { nullable: true })
  @ManyToOne(_type => User, { eager: true, nullable: true })
  adminUser: User;
  @RelationId(
    (broadcastNotification: BroadcastNotification) =>
      broadcastNotification.adminUser,
  )
  adminUserId: number;

  @CreateDateColumn()
  createdAt: Date;
}
