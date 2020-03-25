import { Field, ID, ObjectType } from "type-graphql";
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, ColumnOptions } from "typeorm";

import { User } from "./user";
//NO idea why the below import doesn't work!!!
//import { RelationColumn } from "../helpers";
function RelationColumn(options?: ColumnOptions) {
  return Column({ nullable: true, ...options });
}

@Entity()
@ObjectType()
export class Project {
  @Field(type => ID )
  @PrimaryGeneratedColumn()
  readonly id: number;
  
  @Field()
  @Column()
  title: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  description?: string;

  @Field()
  @Column({ nullable: true })
  creationDate: Date;

  @Field(type => User)
  @ManyToOne(type => User)
  author: User;

  @RelationColumn()
  authorId: number;
}
