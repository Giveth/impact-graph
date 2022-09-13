import {
  OneToOne,
  ViewColumn,
  ViewEntity,
  PrimaryColumn,
  JoinColumn,
  RelationId,
} from 'typeorm';
import { Project } from '../entities/project';
import { Field, ObjectType } from 'type-graphql';

@ViewEntity('project_power_view', { synchronize: false })
@ObjectType()
export class ProjectPowerView {
  @PrimaryColumn()
  @Field()
  @RelationId((projectPowerView: ProjectPowerView) => projectPowerView.project)
  projectId: number;

  @ViewColumn()
  @Field()
  totalPower: number;

  @OneToOne(type => Project, project => project.powerView)
  @JoinColumn({ referencedColumnName: 'id' })
  project: Project;
}
