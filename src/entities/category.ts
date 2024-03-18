import { Field, ID, ObjectType } from 'type-graphql';
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  BaseEntity,
  ManyToMany,
  ManyToOne,
  RelationId,
} from 'typeorm';
import { Project } from './project';
import { MainCategory } from './mainCategory';

export const CATEGORY_NAMES = {
  // There are lots of categories but I put the ones that I use here
  registeredNonProfits: 'registered-non-profits',
};

@Entity()
@ObjectType()
export class Category extends BaseEntity {
  @Field(_type => ID)
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

  @ManyToMany(_type => Project, project => project.categories)
  projects: Project[];

  @Field(_ => MainCategory, { nullable: true })
  @ManyToOne(_ => MainCategory)
  mainCategory: MainCategory;

  @Field()
  @Column({ default: true })
  // There are some categories that exist, we cant delete them but we dont want allow users
  // To use them anymore on project creation/updating, so we change set the isActive false for them
  isActive: boolean;

  @RelationId((category: Category) => category.mainCategory)
  @Column()
  mainCategoryId: number;
}
