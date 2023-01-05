import { ObjectType, Field, ID } from 'type-graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';
import { User } from './user';

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

  @Field(type => User, { nullable: true })
  @ManyToOne(type => User, { eager: true, nullable: true })
  adminUser: User;
  @RelationId(
    (broadcastNotification: BroadcastNotification) =>
      broadcastNotification.adminUser,
  )
  adminUserId: number;

  @CreateDateColumn()
  createdAt: Date;
}
