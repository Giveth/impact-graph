import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class RenameUSDCapsToPOLCaps1740272296645 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Early Access Round table updates
    await queryRunner.renameColumn(
      'early_access_round',
      'cumulativeUSDCapPerProject',
      'cumulativePOLCapPerProject',
    );
    await queryRunner.renameColumn(
      'early_access_round',
      'cumulativeUSDCapPerUserPerProject',
      'cumulativePOLCapPerUserPerProject',
    );

    // QF Round table updates
    await queryRunner.renameColumn(
      'qf_round',
      'cumulativeUSDCapPerProject',
      'cumulativePOLCapPerProject',
    );
    await queryRunner.renameColumn(
      'qf_round',
      'cumulativeUSDCapPerUserPerProject',
      'cumulativePOLCapPerUserPerProject',
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

    // First drop the old columns
    await queryRunner.dropColumn('qf_round', 'roundUSDCapPerProject');
    await queryRunner.dropColumn('qf_round', 'roundUSDCloseCapPerProject');

    // Add new columns with correct type
    await queryRunner.addColumn(
      'qf_round',
      new TableColumn({
        name: 'roundPOLCapPerProject',
        type: 'decimal',
        precision: 18,
        scale: 8,
        isNullable: true,
      }),
    );

    // Drop tokenPrice columns
    await queryRunner.dropColumn('early_access_round', 'tokenPrice');
    await queryRunner.dropColumn('qf_round', 'tokenPrice');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Early Access Round table rollback
    await queryRunner.renameColumn(
      'early_access_round',
      'cumulativePOLCapPerProject',
      'cumulativeUSDCapPerProject',
    );
    await queryRunner.renameColumn(
      'early_access_round',
      'cumulativePOLCapPerUserPerProject',
      'cumulativeUSDCapPerUserPerProject',
    );

    // QF Round table rollback
    await queryRunner.renameColumn(
      'qf_round',
      'cumulativePOLCapPerProject',
      'cumulativeUSDCapPerProject',
    );
    await queryRunner.renameColumn(
      'qf_round',
      'cumulativePOLCapPerUserPerProject',
      'cumulativeUSDCapPerUserPerProject',
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

    // Add back tokenPrice column
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
