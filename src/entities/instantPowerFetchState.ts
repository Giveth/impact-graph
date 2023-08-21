import { BaseEntity, Check, Column, Entity, PrimaryColumn } from 'typeorm';
import { Field, ObjectType } from 'type-graphql';

@Entity()
@ObjectType()
@Check('"id"')
export class InstantPowerFetchState extends BaseEntity {
  @Field(type => Boolean)
  @PrimaryColumn()
  id: boolean;

  @Field()
  @Column()
  maxFetchedUpdateAtTimestampMS: number;
}
