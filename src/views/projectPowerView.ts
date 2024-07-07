import {
  OneToOne,
  ViewColumn,
  ViewEntity,
  JoinColumn,
  RelationId,
  BaseEntity,
  PrimaryColumn,
  Column,
  Index,
} from 'typeorm';
import { Field, Float, Int, ObjectType } from 'type-graphql';
import { Project } from '../entities/project';
import { ColumnNumericTransformer } from '../utils/entities';

@ViewEntity('project_power_view', { synchronize: false })
@Index('project_power_view_project_id_unique', ['projectId', 'round'], {
  unique: true,
})
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
