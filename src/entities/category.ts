import { Field, ID, ObjectType } from 'type-graphql';
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  BaseEntity,
  Index,
  ManyToMany,
  ManyToOne,
  RelationId,
} from 'typeorm';
import { Project } from './project';
import { MainCategory } from './mainCategory';
import { Organization } from './organization';

@Entity()
@ObjectType()
export class Category extends BaseEntity {
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field()
  @Column('text', { unique: true, nullable: true })
  name: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  value: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  source: string;

  @ManyToMany(type => Project, project => project.categories)
  projects: Project[];

  @Field(_ => MainCategory, { nullable: true })
  @ManyToOne(_ => MainCategory)
  mainCategory: MainCategory;

  @Field()
  @Column({ default: true })
  // There are some categories that exist, we cant delete them but we dont want allow users
  // To use them anymore on project creation/updating, so we change set the isActive false for them
  isActive: boolean;

  @Field()
  @Column('integer', { unique: false })
  priority: number;

  @RelationId((category: Category) => category.mainCategory)
  mainCategoryId: number;
}
