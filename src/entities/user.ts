import { Field, ID, ObjectType } from 'type-graphql';
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  OneToMany,
  ManyToMany,
  BaseEntity,
  JoinTable,
} from 'typeorm';
import { OrganisationUser } from './organisationUser';
import { Organisation } from './organisation';
import { Project } from './project';
import { AccountVerification } from './accountVerification';

export enum UserRole {
  ADMIN = 'admin',
  RESTRICTED = 'restricted',
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

  @OneToMany(
    type => OrganisationUser,
    organisationUser => organisationUser.user,
  )
  organisationUsers?: OrganisationUser[];

  @Field(type => Organisation)
  @ManyToMany(type => Organisation, organisation => organisation.users)
  organisations: Organisation[];

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

  segmentUserId() {
    return `givethId-${this.id}`;
  }
}
