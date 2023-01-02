import { ObjectType, Field, ID } from 'type-graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export default class BroadcastNotification extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title?: string;

  @Column()
  text: string;

  @Column({ nullable: true })
  link?: string;

  @Column({ nullable: true })
  linkTitle?: string;

  @Column({ nullable: true, default: false })
  sendEmail?: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
