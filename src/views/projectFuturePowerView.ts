import {
  OneToOne,
  ViewColumn,
  ViewEntity,
  JoinColumn,
  RelationId,
  BaseEntity,
  PrimaryColumn,
} from 'typeorm';
import { Project } from '../entities/project';
import { Field, Int, ObjectType } from 'type-graphql';

@ViewEntity('project_future_power_view', { synchronize: false })
@ObjectType()
export class ProjectFuturePowerView extends BaseEntity {
  @Field()
  @ViewColumn()
  @PrimaryColumn()
  @RelationId(
    (projectFuturePowerView: ProjectFuturePowerView) =>
      projectFuturePowerView.project,
  )
  projectId: number;

  @ViewColumn()
  @Field()
  totalPower: number;

  @Field(type => Project)
  @OneToOne(type => Project, project => project.projectFuturePower)
  @JoinColumn({ referencedColumnName: 'id' })
  project: Project;

  @ViewColumn()
  @Field(type => Int)
  powerRank: number;

  @ViewColumn()
  @Field(type => Int)
  round: number;
}
