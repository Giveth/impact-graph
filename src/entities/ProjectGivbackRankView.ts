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

@ViewEntity('project_givback_rank_view', { synchronize: false })
@Index('project_givback_rank_view_project_id_unique', ['projectId', 'round'], {
  unique: true,
})
// It's similar to ProjectPowerView, but with a small difference that it uses a different view
// That just includes project with isGivbackEligible = true
@ObjectType()
export class ProjectGivbackRankView extends BaseEntity {
  @Field()
  @ViewColumn()
  @PrimaryColumn()
  @RelationId(
    (projectGivbackRankView: ProjectGivbackRankView) =>
      projectGivbackRankView.project,
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
  @Field(_type => Int)
  powerRank: number;

  @ViewColumn()
  @Field(_type => Int)
  round: number;
}
