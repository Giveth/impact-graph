import { MigrationInterface, QueryRunner } from 'typeorm';

export class createAnchorContractAddressTable1702364570535
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "anchor_contract_address" (
                "id" SERIAL PRIMARY KEY,
                "networkId" INTEGER NOT NULL,
                "isActive" BOOLEAN DEFAULT false,
                "address" TEXT NOT NULL,
                "txHash" TEXT NOT NULL,
                "projectId" INTEGER NULL,
                "creatorId" INTEGER NULL,
                "ownerId" INTEGER NULL,
                "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "UQ_address_networkId_project" UNIQUE ("address", "networkId", "projectId")
            );

            CREATE INDEX "IDX_address" ON "anchor_contract_address" ("address");
            CREATE INDEX "IDX_networkId" ON "anchor_contract_address" ("networkId");
            CREATE INDEX "IDX_projectId" ON "anchor_contract_address" ("projectId");
            CREATE INDEX "IDX_creatorId" ON "anchor_contract_address" ("creatorId");
            CREATE INDEX "IDX_ownerId" ON "anchor_contract_address" ("ownerId");

        `);

    await queryRunner.query(`
            ALTER TABLE "anchor_contract_address"
            ADD CONSTRAINT "FK_anchor_contract_address_project"
            FOREIGN KEY ("projectId") REFERENCES "project"("id")
            ON DELETE SET NULL;
        `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "anchor_contract_address"
            DROP CONSTRAINT "FK_anchor_contract_address_project";
        `);

    await queryRunner.query(`
            DROP TABLE "anchor_contract_address";
        `);
  }
}
