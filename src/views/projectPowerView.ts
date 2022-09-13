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
import { Field, ObjectType } from 'type-graphql';

@ViewEntity('project_power_view', { synchronize: false })
@ObjectType()
export class ProjectPowerView extends BaseEntity {
  @ViewColumn()
  @PrimaryColumn()
  @RelationId((projectPowerView: ProjectPowerView) => projectPowerView.project)
  projectId: number;

  @ViewColumn()
  @Field()
  totalPower: number;

  @Field(type => Project)
  @OneToOne(type => Project, project => project.projectPower)
  @JoinColumn({ referencedColumnName: 'id' })
  project: Project;
}
