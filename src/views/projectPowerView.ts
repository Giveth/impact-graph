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
import { Project } from '../entities/project';
import { Field, Float, Int, ObjectType } from 'type-graphql';
import { ColumnNumericTransformer } from '../utils/entities';

@ViewEntity('project_power_view', { synchronize: false })
@ObjectType()
export class ProjectPowerView extends BaseEntity {
  @Field()
  @ViewColumn()
  @PrimaryColumn()
  @RelationId((projectPowerView: ProjectPowerView) => projectPowerView.project)
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
  @Field(_type => Int)
  powerRank: number;

  @ViewColumn()
  @Field(_type => Int)
  round: number;
}
