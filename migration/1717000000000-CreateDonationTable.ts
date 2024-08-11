import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateDonationTable1717000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'donation',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'transactionId', type: 'varchar', isNullable: true },
          { name: 'nonce', type: 'int', isNullable: true },
          { name: 'transactionNetworkId', type: 'int' },
          { name: 'safeTransactionId', type: 'varchar', isNullable: true },
          { name: 'chainType', type: 'enum', enum: ['EVM'], default: `'EVM'` },
          { name: 'isProjectVerified', type: 'boolean', default: false },
          { name: 'status', type: 'text', default: `'pending'` },
          { name: 'isExternal', type: 'boolean', default: false },
          { name: 'blockNumber', type: 'int', isNullable: true },
          { name: 'origin', type: 'text', isNullable: true },
          { name: 'verifyErrorMessage', type: 'text', isNullable: true },
          { name: 'speedup', type: 'boolean', default: false },
          { name: 'isCustomToken', type: 'boolean', default: false },
          { name: 'isFiat', type: 'boolean', default: false },
          { name: 'toWalletAddress', type: 'varchar' },
          { name: 'fromWalletAddress', type: 'varchar' },
          { name: 'tokenAddress', type: 'varchar', isNullable: true },
          { name: 'currency', type: 'varchar' },
          { name: 'anonymous', type: 'boolean', isNullable: true },
          { name: 'amount', type: 'real' },
          { name: 'valueEth', type: 'real', isNullable: true },
          { name: 'valueUsd', type: 'real', isNullable: true },
          { name: 'priceEth', type: 'real', isNullable: true },
          { name: 'priceUsd', type: 'real', isNullable: true },
          { name: 'projectId', type: 'int', isNullable: true },
          { name: 'qfRoundId', type: 'int', isNullable: true },
          { name: 'distributedFundQfRoundId', type: 'int', isNullable: true },
          { name: 'userId', type: 'int', isNullable: true },
          { name: 'contactEmail', type: 'text', isNullable: true },
          { name: 'qfRoundUserScore', type: 'int', isNullable: true },
          { name: 'createdAt', type: 'timestamp' },
          { name: 'importDate', type: 'timestamp', isNullable: true },
          { name: 'donationType', type: 'varchar', isNullable: true },
          { name: 'referrerWallet', type: 'varchar', isNullable: true },
          {
            name: 'referralStartTimestamp',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'isReferrerGivbackEligible',
            type: 'boolean',
            default: false,
          },
          { name: 'transakStatus', type: 'varchar', isNullable: true },
          { name: 'transakTransactionLink', type: 'varchar', isNullable: true },
          { name: 'segmentNotified', type: 'boolean', default: false },
          {
            name: 'isTokenEligibleForGivback',
            type: 'boolean',
            default: false,
          },
          { name: 'virtualPeriodStart', type: 'int', isNullable: true },
          { name: 'virtualPeriodEnd', type: 'int', isNullable: true },
          {
            name: 'useDonationBox',
            type: 'boolean',
            isNullable: true,
            default: false,
          },
          { name: 'relevantDonationTxHash', type: 'varchar', isNullable: true },
          {
            name: 'donationPercentage',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true,
          },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'donation',
      new TableForeignKey({
        columnNames: ['projectId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'project',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'donation',
      new TableForeignKey({
        columnNames: ['qfRoundId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'qf_round',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'donation',
      new TableForeignKey({
        columnNames: ['distributedFundQfRoundId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'qf_round',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'donation',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'user',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('donation');
  }
}
