import { BaseEntity, Column, Entity, PrimaryColumn } from 'typeorm';
import { Field, Float, ID, ObjectType } from 'type-graphql';
import { ColumnNumericTransformer } from '../utils/entities';

@Entity()
@ObjectType()
export class PowerBoostingSnapshotHistory extends BaseEntity {
  @Field(_type => ID)
  @PrimaryColumn()
  id: number;

  @Field(_type => ID)
  @Column()
  userId: number;

  @Field(_type => ID)
  @Column()
  projectId: number;

  @Field(_type => ID)
  @Column()
  powerSnapshotId: number;

  @Field(_type => Float)
  @Column('numeric', {
    precision: 5, // 100.00
    scale: 2,
    transformer: new ColumnNumericTransformer(),
  })
  percentage: number;
}
