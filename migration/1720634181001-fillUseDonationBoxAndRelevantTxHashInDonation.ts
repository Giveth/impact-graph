import { MigrationInterface, QueryRunner } from 'typeorm';
import config from '../src/config.js';

interface DonationUpdate {
  id: number;
  useDonationBox: boolean;
  relevantDonationTxHash: string | null;
}

export class FillUseDonationBoxAndRelevantTxHashInDonation1720634181001
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const environment = config.get('ENVIRONMENT') as string;

    if (environment === 'test') {
      return;
    }

    const givethProjectId = 1;
    const timeDiff = 60 * 1000; // 1 minute in milliseconds

    // Load all donations into memory
    const donations = await queryRunner.query(
      `SELECT id, "userId", "projectId", "createdAt", "transactionId" FROM donation`,
    );

    // Calculate relevant donations
    const updates: DonationUpdate[] = [];
    const userDonations = donations.reduce(
      (acc, donation) => {
        const userId = donation.userId;
        if (!acc[userId]) {
          acc[userId] = [];
        }
        acc[userId].push(donation);
        return acc;
      },
      {} as Record<number, any[]>,
    );

    for (const userId in userDonations) {
      const userDonationList = userDonations[userId];
      userDonationList.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );

      for (let i = 0; i < userDonationList.length; i++) {
        const donation = userDonationList[i];
        if (donation.projectId === givethProjectId) {
          let found = false;

          // Check for donations after the current donation
          for (let j = i + 1; j < userDonationList.length; j++) {
            const nextDonation = userDonationList[j];
            const timeDifference =
              new Date(nextDonation.createdAt).getTime() -
              new Date(donation.createdAt).getTime();
            if (timeDifference <= timeDiff) {
              if (nextDonation.projectId !== givethProjectId) {
                updates.push({
                  id: donation.id,
                  useDonationBox: true,
                  relevantDonationTxHash: nextDonation.transactionId,
                });
                updates.push({
                  id: nextDonation.id,
                  useDonationBox: true,
                  relevantDonationTxHash: null,
                });
                found = true;
                break;
              }
            } else {
              break;
            }
          }

          // Check for donations before the current donation if no relevant donation found
          if (!found) {
            for (let k = i - 1; k >= 0; k--) {
              const prevDonation = userDonationList[k];
              const timeDifference =
                new Date(donation.createdAt).getTime() -
                new Date(prevDonation.createdAt).getTime();
              if (timeDifference <= timeDiff) {
                if (prevDonation.projectId !== givethProjectId) {
                  updates.push({
                    id: donation.id,
                    useDonationBox: true,
                    relevantDonationTxHash: prevDonation.transactionId,
                  });
                  updates.push({
                    id: prevDonation.id,
                    useDonationBox: true,
                    relevantDonationTxHash: null,
                  });
                  break;
                }
              } else {
                break;
              }
            }
          }
        }
      }
    }

    // Perform batch update using a single query
    const updateQuery = updates
      .map(
        update =>
          `(${update.id}, ${update.useDonationBox}, ${
            update.relevantDonationTxHash
              ? `'${update.relevantDonationTxHash}'`
              : 'NULL'
          })`,
      )
      .join(', ');

    await queryRunner.query(
      `
      UPDATE donation AS d
      SET "useDonationBox" = u."useDonationBox",
          "relevantDonationTxHash" = u."relevantDonationTxHash"
      FROM (VALUES ${updateQuery}) AS u(id, "useDonationBox", "relevantDonationTxHash")
      WHERE d.id = u.id;
      `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
        UPDATE donation
        SET "useDonationBox" = false,
            "relevantDonationTxHash" = NULL
        WHERE "useDonationBox" = true;
      `,
    );
  }
}
