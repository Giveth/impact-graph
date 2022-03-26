import { Field, ID, ObjectType } from 'type-graphql';
import {
  Column,
  Entity,
  BaseEntity,
  PrimaryGeneratedColumn,
  ManyToOne,
  RelationId,
} from 'typeorm';
import { Project } from './project';
import { User } from './user';

// only purpose of this entity is to serve as a custom page in adminbro
@Entity()
@ObjectType()
export class ThirdPartyProjectImport extends BaseEntity {
  // required always for entities
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  readonly id: number;

  // change logic in admin bro based on string
  @Field({ nullable: true })
  @Column({ nullable: true })
  thirdPartyAPI: string;

  // searchTerm
  @Field({ nullable: true })
  @Column({ nullable: true })
  projectName: string;

  // History of who exported
  @Field(type => User)
  @ManyToOne(type => User)
  user?: User;

  @RelationId(
    (thirdPartyProjectImport: ThirdPartyProjectImport) =>
      thirdPartyProjectImport.user,
  )
  userId: number;

  // Link to project
  @Field(type => Project)
  @ManyToOne(type => Project)
  project?: Project;

  @RelationId(
    (thirdPartyProjectImport: ThirdPartyProjectImport) =>
      thirdPartyProjectImport.project,
  )
  projectId: number;
}
