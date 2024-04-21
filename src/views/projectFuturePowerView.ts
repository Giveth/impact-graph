import {
  OneToOne,
  ViewColumn,
  ViewEntity,
  JoinColumn,
  RelationId,
  BaseEntity,
  PrimaryColumn,
} from 'typeorm';
import { Field, Int, ObjectType } from 'type-graphql';
import { Project } from '../entities/project';

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

  @Field(_type => Project)
  @OneToOne(_type => Project, project => project.projectFuturePower)
  @JoinColumn({ referencedColumnName: 'id' })
  project: Project;

  @ViewColumn()
  @Field(_type => Int)
  powerRank: number;

  @ViewColumn()
  @Field(_type => Int)
  round: number;
}
