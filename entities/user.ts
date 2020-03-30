import { Field, ID, ObjectType } from 'type-graphql'
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  OneToMany,
  ManyToMany,
  BaseEntity
} from 'typeorm'
import { OrganisationUser } from './organisationUser'
import { Organisation } from './organisation'

@ObjectType()
@Entity()
export class User extends BaseEntity {
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  readonly id: number

  @Field()
  @Column('text', { unique: true })
  email: string

  @Field({ nullable: true })
  @Column({ nullable: true })
  firstName?: string

  @Field({ nullable: true })
  @Column({ nullable: true })
  lastName?: string

  @Column()
  password: string

  @Field(type => [OrganisationUser], { nullable: true })
  @OneToMany(
    type => OrganisationUser,
    organisationUser => organisationUser.user
  )
  organisationUsers?: OrganisationUser[]

  @Field(type => Organisation)
  @ManyToMany(
    type => Organisation,
    organisation => organisation.users
  )
  organisations: Organisation[]
  // @Field(type => [Organisation])
  // organisations: Organisation[]
}
