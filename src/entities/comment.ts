// import { Field, ID, ObjectType } from 'type-graphql';
// import {
//   PrimaryGeneratedColumn,
//   Column,
//   Entity,
//   BaseEntity,
//   UpdateDateColumn,
//   CreateDateColumn,
//   Index,
//   ManyToOne,
//   RelationId,
// } from 'typeorm';
// import { Project } from './project';
// import { ProjectVerificationForm } from './projectVerificationForm';
// import { User } from './user';

// @Entity()
// @ObjectType()
// export class Comment extends BaseEntity {
//   @Field(type => ID)
//   @PrimaryGeneratedColumn()
//   id: number;

//   @Field()
//   @Column('text', { unique: true, nullable: true })
//   content: string;

//   @Index()
//   @Field(type => ProjectVerificationForm)
//   @ManyToOne(type => ProjectVerificationForm)
//   projectVerificationForm: ProjectVerificationForm;

//   @RelationId((comment: Comment) => comment.projectVerificationForm)
//   projectVerificationFormId: number;

//   @Index()
//   @Field(type => User)
//   @ManyToOne(type => User)
//   commenter: User;

//   @RelationId((comment: Comment) => comment.commenter)
//   commenterId: number;

//   @UpdateDateColumn()
//   updatedAt: Date;

//   @CreateDateColumn()
//   createdAt: Date;
// }
