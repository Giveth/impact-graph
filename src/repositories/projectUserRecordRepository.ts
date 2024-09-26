import { Donation, DONATION_STATUS } from '../entities/donation';
import { ProjectUserRecord } from '../entities/projectUserRecord';

export async function updateOrCreateProjectUserRecord({
  projectId,
  userId,
}: {
  projectId: number;
  userId: number;
}): Promise<ProjectUserRecord> {
  const { totalDonationAmount } = await Donation.createQueryBuilder('donation')
    .select('SUM(donation.amount)', 'totalDonationAmount')
    .where('donation.projectId = :projectId', { projectId })
    .andWhere('donation.status = :status', {
      status: DONATION_STATUS.VERIFIED,
    })
    .andWhere('donation.userId = :userId', { userId })
    .getRawOne();

  let projectUserRecord = await ProjectUserRecord.findOneBy({
    projectId,
    userId,
  });

  if (!projectUserRecord) {
    projectUserRecord = ProjectUserRecord.create({
      projectId,
      userId,
    });
  }

  projectUserRecord.totalDonationAmount = totalDonationAmount || 0;

  return projectUserRecord.save();
}

export async function getProjectUserRecordAmount({
  projectId,
  userId,
}: {
  projectId: number;
  userId: number;
}): Promise<number> {
  const record = await ProjectUserRecord.findOneBy({ projectId, userId });
  return record?.totalDonationAmount || 0;
}
