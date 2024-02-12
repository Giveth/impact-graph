import { MigrationInterface, QueryRunner } from 'typeorm';

export class createRecurringDonationTable1702445735585
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
                CREATE TABLE recurring_donation (
                id SERIAL PRIMARY KEY,
                "networkId" INT NOT NULL,
                "txHash" text NOT NULL,
                "projectId" INT,
                "anchorContractAddressId" INT,
                "donorId" INT,
                "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                finished BOOLEAN, 
                CONSTRAINT fk_project
                    FOREIGN KEY("projectId") 
                    REFERENCES project(id),
                CONSTRAINT fk_anchor_contract_address
                    FOREIGN KEY("anchorContractAddressId") 
                    REFERENCES anchor_contract_address(id),
                CONSTRAINT fk_donor
                    FOREIGN KEY("donorId") 
                    REFERENCES "user"(id),
                UNIQUE("txHash", "networkId", "projectId")
            );
            
            CREATE INDEX "idx_txHash" ON recurring_donation("txHash");
            CREATE INDEX "idx_projectId" ON recurring_donation("projectId");
            CREATE INDEX "idx_anchorContractAddressId" ON recurring_donation("anchorContractAddressId");
            CREATE INDEX "donorId" ON recurring_donation("donorId");
        `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS recurring_donations;`);
  }
}
