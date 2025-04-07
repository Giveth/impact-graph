import { ViewEntity, ViewColumn, BaseEntity } from 'typeorm';

@ViewEntity('user_ranks_materialized_view')
export class UserRankMaterializedView extends BaseEntity {
  @ViewColumn()
  id: number;

  @ViewColumn()
  name: string;

  @ViewColumn()
  qaccPoints: number;

  @ViewColumn()
  walletAddress: string;

  @ViewColumn()
  projectsFundedCount: number;

  @ViewColumn()
  rank: number;
}
