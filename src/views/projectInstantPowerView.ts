import {
  OneToOne,
  ViewColumn,
  ViewEntity,
  JoinColumn,
  RelationId,
  BaseEntity,
  PrimaryColumn,
  Column,
} from 'typeorm';
import { Field, Float, ObjectType } from 'type-graphql';
import { Project } from '../entities/project.js';
import { ColumnNumericTransformer } from '../utils/entities.js';

@ViewEntity('project_instant_power_view', { synchronize: false })
@ObjectType()
export class ProjectInstantPowerView extends BaseEntity {
  @Field()
  @ViewColumn()
  @PrimaryColumn()
  @RelationId(
    (projectPowerView: ProjectInstantPowerView) => projectPowerView.project,
  )
  projectId: number;

  @ViewColumn()
  @Field(_type => Float)
  @Column('numeric', {
    scale: 2,
    transformer: new ColumnNumericTransformer(),
  })
  totalPower: number;

  @Field(_type => Project)
  @OneToOne(_type => Project, project => project.projectPower)
  @JoinColumn({ referencedColumnName: 'id' })
  project: Project;

  @ViewColumn()
  @Field()
  powerRank: string;
}
