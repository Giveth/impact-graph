import { Field, ID, ObjectType } from 'type-graphql'
import { PrimaryGeneratedColumn, Column, Entity, OneToMany } from 'typeorm'
import { OrganisationUser } from './organisationUser'

@ObjectType()
@Entity()
export class User {
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  readonly id: number

  @Field()
  @Column()
  email: string

  @Field({ nullable: true })
  @Column({ nullable: true })
  name?: string

  @Column()
  password: string

  @Field(type => [OrganisationUser], { nullable: true })
  @OneToMany(
    type => OrganisationUser,
    organisationUser => organisationUser.author
  )
  organisationUsers?: OrganisationUser[]
}
