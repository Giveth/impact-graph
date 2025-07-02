import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCauseCancelledStatusReasons1750123930819
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    // Add cause-specific status reasons for cancelled status (statusId=7)
    await queryRunner.query(`INSERT INTO public.project_status_reason ("statusId", description) VALUES
      (7, 'The cause has completed its goals!'),
      (7, 'The cause is no longer in need of funding.'),
      (7, 'The cause is no longer active.'),
      (7, 'The cause was made by mistake.'),
      (7, 'Other.')
    ;`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the cause-specific status reasons for cancelled status
    await queryRunner.query(
      `DELETE FROM public.project_status_reason
      WHERE "statusId" = 7
      AND description IN (
        'The cause has completed its goals!',
        'The cause is no longer in need of funding.',
        'The cause is no longer active.',
        'The cause was made by mistake.',
        'Other.'
      );`,
    );
  }
}
