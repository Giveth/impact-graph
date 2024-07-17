import { MigrationInterface, QueryRunner } from 'typeorm';
import { ORGANIZATION_LABELS } from '../src/entities/organization';
import { NETWORK_IDS } from '../src/provider';

export class AddEndaomentOrganization1719740230650
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        INSERT INTO "organization" ("name", "disableNotifications", "disableRecurringDonations", "disableUpdateEnforcement", "label", "website", "supportCustomTokens")
        VALUES ('Endaoment', true, true, true, '${ORGANIZATION_LABELS.ENDAOMENT}', 'https://endaoment.org', false)
        ON CONFLICT ("label") DO NOTHING;
      `);

    const endaomentOrganization = (
      await queryRunner.query(`SELECT * FROM organization
        WHERE label='${ORGANIZATION_LABELS.ENDAOMENT}'`)
    )[0];

    const tokens = await queryRunner.query(`
            SELECT * FROM token
            WHERE "networkId" = ${NETWORK_IDS.BASE_MAINNET} OR "networkId" = ${NETWORK_IDS.MAIN_NET} OR "networkId" = ${NETWORK_IDS.OPTIMISTIC};
          `);

    for (const token of tokens) {
      // Add all Base tokens to Giveth organization
      await queryRunner.query(`  INSERT INTO organization_tokens_token ("tokenId","organizationId") VALUES
        (${token.id}, ${endaomentOrganization!.id})
        ON CONFLICT DO NOTHING;
      ;`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DELETE FROM "organization" WHERE "label" = 'endaoment';
        `);
  }
}
