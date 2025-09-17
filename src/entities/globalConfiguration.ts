import { Field, ID, ObjectType } from 'type-graphql';
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  BaseEntity,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
@ObjectType()
export class GlobalConfiguration extends BaseEntity {
  @Field(_type => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field(_type => String)
  @Column('text', { unique: true })
  key: string;

  @Field(_type => String, { nullable: true })
  @Column('text', { nullable: true })
  value: string | null;

  @Field(_type => String, { nullable: true })
  @Column('text', { nullable: true })
  description: string | null;

  @Field(_type => String, { nullable: true })
  @Column('text', { nullable: true })
  type: string | null; // 'number', 'string', 'boolean', etc.

  @Field(_type => Boolean)
  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
