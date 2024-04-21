import { MigrationInterface, QueryRunner } from 'typeorm';
import { ProjStatus } from '../src/entities/project';

export class seedProjectStatusreasons1643962364050
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    // https://github.com/Giveth/giveth-io-typescript/issues/84#issuecomment-1016941722
    await queryRunner.query(`INSERT INTO public.project_status_reason ("statusId", description ) VALUES
                    (${ProjStatus.deactive},'The project has completed its goals!'),
                    (${ProjStatus.deactive},'The project is no longer in need of funding.'),
                    (${ProjStatus.deactive},'The project is no longer active.'),
                    (${ProjStatus.deactive},'The project was made by mistake.'),
                    (${ProjStatus.deactive},'Other / prefer not to say.')
                    ;`);
  }

  async down(_queryRunner: QueryRunner): Promise<void> {}
}
