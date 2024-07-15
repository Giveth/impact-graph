import { Field, ID, ObjectType } from 'type-graphql';
import {
  Column,
  Entity,
  BaseEntity,
  PrimaryGeneratedColumn,
  ManyToOne,
  RelationId,
} from 'typeorm';
import { Project } from './project.js';
import { User } from './user.js';

// only purpose of this entity is to serve as a custom page in AdminJs
@Entity()
@ObjectType()
export class ThirdPartyProjectImport extends BaseEntity {
  // required always for entities
  @Field(_type => ID)
  @PrimaryGeneratedColumn()
  readonly id: number;

  // change logic in adminJs based on string
  @Field({ nullable: true })
  @Column({ nullable: true })
  thirdPartyAPI: string;

  // searchTerm
  @Field({ nullable: true })
  @Column({ nullable: true })
  projectName: string;

  // History of who exported
  @Field(_type => User)
  @ManyToOne(_type => User)
  user?: User;

  @RelationId(
    (thirdPartyProjectImport: ThirdPartyProjectImport) =>
      thirdPartyProjectImport.user,
  )
  userId: number;

  // Link to project
  @Field(_type => Project)
  @ManyToOne(_type => Project)
  project?: Project;

  @RelationId(
    (thirdPartyProjectImport: ThirdPartyProjectImport) =>
      thirdPartyProjectImport.project,
  )
  @Column({ nullable: true })
  projectId: number;
}
