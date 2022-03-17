import { Field, ID, ObjectType, Int, Float } from 'type-graphql';
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  OneToMany,
  ManyToMany,
  BaseEntity,
  JoinTable,
} from 'typeorm';
import { Project, ProjStatus } from './project';
import { Donation } from './donation';
import { Reaction } from './reaction';
import { AccountVerification } from './accountVerification';
import { ProjectStatusReason } from './projectStatusReason';
import { ProjectStatusHistory } from './projectStatusHistory';

export enum UserRole {
  ADMIN = 'admin',
  RESTRICTED = 'restricted',
  OPERATOR = 'operator',
}

@ObjectType()
@Entity()
export class User extends BaseEntity {
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  readonly id: number;

  @Field({ nullable: true })
  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.RESTRICTED,
  })
  role: UserRole;

  @Field({ nullable: true })
  @Column({ nullable: true })
  email?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  firstName?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  lastName?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  @Column({ unique: true })
  walletAddress?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  password?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  encryptedPassword?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  avatar?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  url?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  location?: string;

  @Column()
  loginType: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  dId?: string;

  @Column('bool', { default: false })
  confirmed: boolean;

  @Field(type => [Project])
  @ManyToMany(type => Project, project => project.users)
  @JoinTable()
  projects?: Project[];

  @Column('bool', { default: false })
  segmentIdentified: boolean;

  @Field(type => [AccountVerification], { nullable: true })
  @OneToMany(
    type => AccountVerification,
    accountVerification => accountVerification.user,
  )
  accountVerifications?: AccountVerification[];

  @Field(type => Float, { nullable: true })
  @Column({ type: 'real', nullable: true, default: 0 })
  totalDonated: number;

  @Field(type => Float, { nullable: true })
  @Column({ type: 'real', nullable: true, default: 0 })
  totalReceived: number;

  @Field(type => [ProjectStatusHistory], { nullable: true })
  @OneToMany(
    type => ProjectStatusHistory,
    projectStatusHistory => projectStatusHistory.user,
  )
  projectStatusHistories?: ProjectStatusHistory[];

  @Field(type => Int, { nullable: true })
  async projectsCount() {
    const projectsCount = await Project.createQueryBuilder('project')
      .where('project."admin" = :id', { id: String(this.id) })
      .getCount();

    return projectsCount;
  }

  @Field(type => Int, { nullable: true })
  async donationsCount() {
    const donationsCount = await Donation.createQueryBuilder('donation')
      .where(`donation."userId" = :id`, { id: this.id })
      .getCount();

    return donationsCount;
  }

  @Field(type => Int, { nullable: true })
  async likedProjectsCount() {
    const likedProjectsCount = await Reaction.createQueryBuilder('reaction')
      .innerJoinAndSelect('reaction.project', 'project')
      .where('reaction.userId = :id', { id: this.id })
      .andWhere(
        `project.statusId = ${ProjStatus.active} AND project.listed = true`,
      )
      .getCount();

    return likedProjectsCount;
  }

  segmentUserId() {
    return `givethId-${this.id}`;
  }
}
