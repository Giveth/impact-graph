import { Field, Float, ID, ObjectType } from 'type-graphql';
import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@ObjectType()
@Entity()
export class BankAccount extends BaseEntity {
  @Field(_type => ID)
  @PrimaryGeneratedColumn()
  readonly id: number;

  @Field()
  @Column()
  projectId: number;

  @Column()
  productId: string;

  @Column()
  bankName: string;

  @Column()
  accountHolderName: string;

  @Column()
  accountHolderType: string;

  @Column()
  country: string;

  @Column()
  currency: string;

  @Column()
  accountId: string;

  @Column()
  fingerprint: string;

  @Column()
  last4: string;

  @Column()
  routingNumber: string;

  @Column()
  status: string;
}

@ObjectType()
@Entity()
export class StripeTransaction extends BaseEntity {
  @Field(_type => ID)
  @PrimaryGeneratedColumn()
  readonly id: number;

  @Field()
  @Column()
  projectId: number;

  @Field()
  @Column()
  status: string;

  @Column({ nullable: true })
  @Field({ nullable: true })
  sessionId?: string;

  @Column({ nullable: true })
  @Field({ nullable: true })
  donorCustomerId: string;

  @Column({ nullable: true })
  @Field({ nullable: true })
  donorName: string;

  @Column({ nullable: true })
  @Field({ nullable: true })
  donorEmail: string;

  @Column()
  @Field()
  createdAt: Date;

  @Column({ type: 'float', nullable: true })
  @Field(_type => Float, { nullable: true })
  amount: number;

  @Column({ nullable: true })
  @Field({ nullable: true })
  donateToGiveth: boolean;

  @Column({ default: false })
  @Field()
  anonymous: boolean;

  @Column()
  @Field()
  currency: string;
}
