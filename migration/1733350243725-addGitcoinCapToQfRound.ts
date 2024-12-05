import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGitcoinCapToQfRound1733350243725 implements MigrationInterface {
  name = 'AddGitcoinCapToQfRound1733350243725';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "qf_round" ADD "roundUSDCapPerUserPerProjectWithGitcoinScoreOnly" integer`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "qf_round" DROP COLUMN "roundUSDCapPerUserPerProjectWithGitcoinScoreOnly"`,
    );
  }
}
