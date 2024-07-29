import { BaseEntity, Check, Column, Entity, PrimaryColumn } from 'typeorm';
import { Field, ObjectType } from 'type-graphql';
import { ColumnBigIntTransformer } from '../utils/entities.js';

@Entity()
@ObjectType()
@Check('"id"')
export class InstantPowerFetchState extends BaseEntity {
  @Field(_type => Boolean)
  @PrimaryColumn()
  id: boolean;

  @Field()
  @Column('bigint', {
    transformer: new ColumnBigIntTransformer(),
  })
  maxFetchedUpdateAtTimestampMS: number;
}
