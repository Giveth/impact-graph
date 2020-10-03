import { Field, ID, ObjectType } from "type-graphql";
import { BaseEntity, Column, Entity, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Organisation } from './organisation';

@ObjectType()
@Entity()
export class BankAccount extends BaseEntity {
    @Field(type => ID)
    @PrimaryGeneratedColumn()
    readonly id: number

    @Field()
    @Column()
    projectId: number

    @Column()
    productId: string
    
    @Column()
    bankName: string
    
    @Column()
    accountHolderName: string
    
    @Column()
    accountHolderType: string
    
    @Column()
    country: string
    
    @Column()
    currency: string
    
    @Column()
    accountId: string
    
    @Column()
    fingerprint: string
    
    @Column()
    last4: string
    
    @Column()
    routingNumber: string
    
    @Column()
    status: string
}