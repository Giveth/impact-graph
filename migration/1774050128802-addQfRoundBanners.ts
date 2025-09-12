import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddQfRoundBanners1774050128802 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('qf_round');

    // Add displaySize column
    const displaySizeColumn = table?.findColumnByName('displaySize');
    if (!displaySizeColumn) {
      await queryRunner.addColumn(
        'qf_round',
        new TableColumn({
          name: 'displaySize',
          type: 'integer',
          isNullable: true,
        }),
      );
    }

    // Add bannerFull column
    const bannerFullColumn = table?.findColumnByName('bannerFull');
    if (!bannerFullColumn) {
      await queryRunner.addColumn(
        'qf_round',
        new TableColumn({
          name: 'bannerFull',
          type: 'text',
          isNullable: true,
        }),
      );
    }

    // Add bannerMobile column
    const bannerMobileColumn = table?.findColumnByName('bannerMobile');
    if (!bannerMobileColumn) {
      await queryRunner.addColumn(
        'qf_round',
        new TableColumn({
          name: 'bannerMobile',
          type: 'text',
          isNullable: true,
        }),
      );
    }

    // Add hubCardImage column
    const hubCardImageColumn = table?.findColumnByName('hubCardImage');
    if (!hubCardImageColumn) {
      await queryRunner.addColumn(
        'qf_round',
        new TableColumn({
          name: 'hubCardImage',
          type: 'text',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('qf_round', 'displaySize');
    await queryRunner.dropColumn('qf_round', 'bannerFull');
    await queryRunner.dropColumn('qf_round', 'bannerMobile');
    await queryRunner.dropColumn('qf_round', 'hubCardImage');
  }
}
