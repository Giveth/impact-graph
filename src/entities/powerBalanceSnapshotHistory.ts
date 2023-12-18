import { Field, ID, ObjectType } from 'type-graphql';
import { Column, Entity, BaseEntity, PrimaryColumn } from 'typeorm';

@Entity()
@ObjectType()
export class PowerBalanceSnapshotHistory extends BaseEntity {
  @Field(type => ID)
  @PrimaryColumn()
  id: number;

  @Field(type => ID)
  @Column()
  userId: number;

  @Field()
  @Column('float')
  balance: number;

  @Field(type => ID)
  @Column()
  powerSnapshotId: number;
}
