import { Field, ObjectType } from 'type-graphql';
import { Column, Entity, BaseEntity, PrimaryColumn, Check } from 'typeorm';

@Entity()
@ObjectType()
@Check('"id"')
export class AnkrState extends BaseEntity {
  @Field(_type => Boolean)
  @PrimaryColumn()
  id: boolean;

  @Field()
  @Column({ type: 'integer' })
  timestamp: number;
}
