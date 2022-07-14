import { Field, ID, ObjectType } from 'type-graphql';
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  BaseEntity,
  Index,
  ManyToMany,
  OneToMany,
} from 'typeorm';
import { Category, Project } from './project';

@Entity()
@ObjectType()
export class MainCategory extends BaseEntity {
  @Field(type => ID)
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

  @Field(type => [Category], { nullable: true })
  @OneToMany(type => Category, category => category.mainCategory)
  categories?: Category[];
}
