import { Field, ObjectType } from 'type-graphql';
import { Column, Entity, BaseEntity, PrimaryColumn, Check } from 'typeorm';

@Entity()
@ObjectType()
@Check('"id"')
export class PowerRound extends BaseEntity {
  @Field(_type => Boolean)
  @PrimaryColumn()
  id: boolean;

  @Field()
  @Column({ type: 'integer' })
  round: number;
}
