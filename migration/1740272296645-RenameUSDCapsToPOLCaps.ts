import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class RenameUSDCapsToPOLCaps1740272296645 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Early Access Round table updates
    await queryRunner.renameColumn(
      'early_access_round',
      'roundUSDCapPerProject',
      'roundPOLCapPerProject',
    );
    await queryRunner.renameColumn(
      'early_access_round',
      'roundUSDCapPerUserPerProject',
      'roundPOLCapPerUserPerProject',
    );
    await queryRunner.renameColumn(
      'qf_round',
      'roundUSDCloseCapPerProject',
      'roundPOLCloseCapPerProject',
    );
    await queryRunner.renameColumn(
      'qf_round',
      'roundUSDCapPerUserPerProjectWithGitcoinScoreOnly',
      'roundPOLCapPerUserPerProjectWithGitcoinScoreOnly',
    );
    await queryRunner.renameColumn(
      'qf_round',
      'roundUSDCapPerProject',
      'roundPOLCapPerProject',
    );
    await queryRunner.renameColumn(
      'qf_round',
      'roundUSDCapPerUserPerProject',
      'roundPOLCapPerUserPerProject',
    );

    // Drop tokenPrice columns
    await queryRunner.dropColumn('early_access_round', 'tokenPrice');
    await queryRunner.dropColumn('qf_round', 'tokenPrice');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Early Access Round table rollback
    await queryRunner.renameColumn(
      'early_access_round',
      'roundPOLCapPerProject',
      'roundUSDCapPerProject',
    );
    await queryRunner.renameColumn(
      'early_access_round',
      'roundPOLCapPerUserPerProject',
      'roundUSDCapPerUserPerProject',
    );
    await queryRunner.renameColumn(
      'qf_round',
      'roundPOLCloseCapPerProject',
      'roundUSDCloseCapPerProject',
    );
    await queryRunner.renameColumn(
      'qf_round',
      'roundPOLCapPerUserPerProjectWithGitcoinScoreOnly',
      'roundUSDCapPerUserPerProjectWithGitcoinScoreOnly',
    );
    await queryRunner.renameColumn(
      'qf_round',
      'roundPOLCapPerProject',
      'roundUSDCapPerProject',
    );
    await queryRunner.renameColumn(
      'qf_round',
      'roundPOLCapPerUserPerProject',
      'roundUSDCapPerUserPerProject',
    );

    // Add tokenPrice columns
    await queryRunner.addColumn(
      'early_access_round',
      new TableColumn({
        name: 'tokenPrice',
        type: 'decimal',
        precision: 18,
        scale: 8,
        isNullable: true,
      }),
    );
    await queryRunner.addColumn(
      'qf_round',
      new TableColumn({
        name: 'tokenPrice',
        type: 'decimal',
        precision: 18,
        scale: 8,
        isNullable: true,
      }),
    );
  }
}
