import { MigrationInterface, QueryRunner } from 'typeorm';
import { NETWORK_IDS } from '../src/provider';

export class UpdateBaseAddressOfEndaomentProjects1724067829181
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Get the organization ID for Endaoment
    const endaomentOrgIdResult = await queryRunner.query(`
                    SELECT "id" FROM "organization" WHERE "label" = 'endaoment';
             `);
    const endaomentOrgId = endaomentOrgIdResult[0].id;

    await queryRunner.query(`
            UPDATE project_address pa_8453
            JOIN project p ON pa_8453.projectId = p.id
            JOIN project_address pa_1 ON pa_8453.projectId = pa_1.projectId AND pa_1.networkId =  ${NETWORK_IDS.MAIN_NET}
            SET pa_8453.address = pa_1.address
            WHERE pa_8453.networkId = ${NETWORK_IDS.BASE_MAINNET}
            AND p.organizationId = ${endaomentOrgId};
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
