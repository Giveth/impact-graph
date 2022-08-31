import { Field, ID, ObjectType } from 'type-graphql';
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  BaseEntity,
  Index,
  ManyToMany,
  JoinTable,
  OneToMany,
} from 'typeorm';
import { Project } from './project';
import { Token } from './token';

@Entity()
@ObjectType()
export class Organization extends BaseEntity {
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field()
  @Column('text')
  name: string;

  // It should not change during the time, because we are assuming they are readonly
  @Field()
  @Column('text')
  label: string;

  @Field()
  @Column('text', { nullable: true })
  website?: string;

  @Field()
  @Column('boolean', { nullable: true, default: false })
  supportCustomTokens?: boolean;

  @Field(type => [Project], { nullable: true })
  @OneToMany(type => Project, project => project.organization)
  projects?: Project[];

  @Field(type => [Token], { nullable: true })
  @ManyToMany(type => Token, token => token.organizations, {
    nullable: true,
    cascade: true,
  })
  @JoinTable()
  tokens: Token[];
}

export const ORGANIZATION_LABELS = {
  GIVETH: 'giveth',
  TRACE: 'trace',
  CHANGE: 'change',
  GIVING_BLOCK: 'givingBlock',
};
