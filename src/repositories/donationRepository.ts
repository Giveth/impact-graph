import { In } from 'typeorm';
import { Donation } from '../entities/donation';

export const findDonationWithJoinToUserAndProject = async (data: {
  fromDate?: string;
  toDate?: string;
}) => {
  const { fromDate, toDate } = data;
  const query = Donation.createQueryBuilder('donation')
    .leftJoinAndSelect('donation.user', 'user')
    .leftJoinAndSelect('donation.project', 'project');
  if (fromDate) {
    query.andWhere(`"createdAt" >= '${fromDate}'`);
  }
  if (toDate) {
    query.andWhere(`"createdAt" <= '${toDate}'`);
  }
  return await query.getMany();
};

export const findDonationsFromWalletAddresses = async (
  fromWalletAddressesArray: string[],
) => {
  const donations = await Donation.find({
    where: {
      fromWalletAddress: In(fromWalletAddressesArray),
    },
  });
  return donations;
};
