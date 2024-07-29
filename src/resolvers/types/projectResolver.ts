import { Field, ObjectType } from 'type-graphql';
import { Project } from '../../entities/project.js';

@ObjectType()
export class ProjectBySlugResponse extends Project {
  @Field({ nullable: true })
  givbackFactor?: number;
}
