import { Field, ID, ObjectType } from 'type-graphql';
import {
  BaseEntity,
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Category } from './category';

@Entity()
@ObjectType()
export class MainCategory extends BaseEntity {
  @Field(_type => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field()
  @Column('text', { unique: true })
  title: string;

  @Field()
  @Column('text', { unique: true })
  slug: string;

  @Field({ nullable: true })
  @Column('text', { nullable: true })
  description: string;

  @Field({ nullable: true })
  @Column('text', { nullable: true })
  // ipfs link
  banner: string;

  @Field()
  @Column({ default: true })
  isActive: boolean;

  @Field(_type => [Category], { nullable: true })
  @OneToMany(_type => Category, category => category.mainCategory)
  categories?: Category[];
}
