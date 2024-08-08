import { Field, ID, ObjectType } from 'type-graphql';
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  BaseEntity,
  ManyToMany,
  OneToMany,
  JoinTable,
} from 'typeorm';
import { Project } from './project';
import { Token } from './token';

@Entity()
@ObjectType()
export class Organization extends BaseEntity {
  @Field(_type => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field()
  @Column('text')
  name: string;

  @Field()
  @Column('boolean', { default: false })
  disableNotifications: boolean;

  @Field()
  @Column('boolean', { default: false })
  disableUpdateEnforcement: boolean;

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

  @Field(_type => [Project], { nullable: true })
  @OneToMany(_type => Project, project => project.organization)
  projects?: Project[];

  @Field(_type => [Token], { nullable: true })
  @ManyToMany(_type => Token, token => token.organizations)
  @JoinTable()
  tokens: Token[];
}

export const ORGANIZATION_LABELS = {
  GIVETH: 'giveth',
  TRACE: 'trace',
  CHANGE: 'change',
  // We removed giving blocks projects except the ones that received donations
  // GIVING_BLOCK: 'givingBlock',
  ENDAOMENT: 'endaoment',
};
