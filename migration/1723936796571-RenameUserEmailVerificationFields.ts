import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameUserEmailVerificationFields1723936796571
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Rename emailConfirmationToken to emailVerificationCode
    await queryRunner.renameColumn(
      'user',
      'emailConfirmationToken',
      'emailVerificationCode',
    );

    // Rename emailConfirmationTokenExpiredAt to emailVerificationCodeExpiredAt
    await queryRunner.renameColumn(
      'user',
      'emailConfirmationTokenExpiredAt',
      'emailVerificationCodeExpiredAt',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert emailVerificationCode back to emailConfirmationToken
    await queryRunner.renameColumn(
      'user',
      'emailVerificationCode',
      'emailConfirmationToken',
    );

    // Revert emailVerificationCodeExpiredAt back to emailConfirmationTokenExpiredAt
    await queryRunner.renameColumn(
      'user',
      'emailVerificationCodeExpiredAt',
      'emailConfirmationTokenExpiredAt',
    );
  }
}
