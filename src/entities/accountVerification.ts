import { Field, ID, ObjectType } from 'type-graphql';
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  BaseEntity,
  ManyToOne,
  RelationId,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.js';

@Entity()
@ObjectType()
export class AccountVerification extends BaseEntity {
  @Field(_type => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field()
  @Column()
  platform: string;

  @Index()
  @Field()
  @Column()
  dId: string;

  @Field()
  @Column()
  protocol: string;

  @Field()
  @Column()
  claim?: string;

  @Field()
  @Column()
  attestation?: string;

  @Index()
  @Field(_type => User)
  // @ts-expect-error migrate to ESM
  @ManyToOne(() => import('./user.js').then(m => m.user), {
    eager: true,
  })
  user: Promise<User>;

  @RelationId(
    (accountVerification: AccountVerification) => accountVerification.user,
  )
  @Column({ nullable: true })
  userId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
