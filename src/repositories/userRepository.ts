import { publicSelectionFields, User, UserRole } from '../entities/user';
import { Donation } from '../entities/donation';
import { Reaction } from '../entities/reaction';
import { PowerBoosting } from '../entities/powerBoosting';
import { Project, ProjStatus, ReviewStatus } from '../entities/project';
import { isEvmAddress } from '../utils/networks';
import { retrieveActiveQfRoundUserMBDScore } from './qfRoundRepository';

export const findAdminUserByEmail = async (
  email: string,
): Promise<User | null> => {
  return User.createQueryBuilder()
    .where(`email = :email`, { email })
    .andWhere(`role != '${UserRole.RESTRICTED}'`)
    .getOne();
};

export const setUserAsReferrer = async (
  referrerWalletAddress: string,
): Promise<User | void> => {
  const referrer = await findUserByWalletAddress(referrerWalletAddress);

  if (!referrer) return;

  referrer.isReferrer = true;
  return await referrer.save();
};

export const isFirstTimeDonor = async (userId: number): Promise<boolean> => {
  return Boolean(
    await Donation.createQueryBuilder('donation')
      .where('donation.userId = :userId', { userId })
      .getOne(),
  );
};

export const findUserByWalletAddress = async (
  walletAddress: string,
  includeSensitiveFields = true,
): Promise<User | null> => {
  const query = User.createQueryBuilder('user').where(
    `LOWER("walletAddress") = :walletAddress`,
    {
      walletAddress: walletAddress.toLowerCase(),
    },
  );
  if (!includeSensitiveFields) {
    query.select(publicSelectionFields);
  }
  const user = await query.getOne();
  if (!user) return null;

  user.projectsCount = await fetchUserProjectsCount(
    user!.id,
    includeSensitiveFields,
  );

  const activeQFMBDScore = await retrieveActiveQfRoundUserMBDScore(user.id);
  if (activeQFMBDScore) {
    user.activeQFMBDScore = activeQFMBDScore;
  }

  return user;
};

export const fetchUserProjectsCount = async (
  userId: number,
  includeSensitiveFields: boolean,
) => {
  const projectsCount = Project.createQueryBuilder('project').where(
    'project."adminUserId" = :id',
    { id: userId },
  );

  if (!includeSensitiveFields) {
    projectsCount.andWhere(
      `project.statusId = ${ProjStatus.active} AND project.reviewStatus = :reviewStatus`,
      { reviewStatus: ReviewStatus.Listed },
    );
  }

  return projectsCount.getCount();
};

export const findUserById = (userId: number): Promise<User | null> => {
  return User.createQueryBuilder('user')
    .where(`id=:userId`, {
      userId,
    })
    .getOne();
};

export const findAllUsers = async (params: {
  take: number;
  skip: number;
}): Promise<{ users: User[]; count: number }> => {
  const [users, count] = await User.createQueryBuilder('user')
    .take(params.take)
    .skip(params.skip)
    .getManyAndCount();
  return { users, count };
};

export const createUserWithPublicAddress = async (
  _walletAddress: string,
): Promise<User> => {
  const walletAddress = isEvmAddress(_walletAddress)
    ? _walletAddress.toLocaleLowerCase()
    : _walletAddress;
  return await User.create({
    walletAddress,
    loginType: 'wallet',
    segmentIdentified: true,
  }).save();
};

export const findUsersWhoBoostedProject = async (
  projectId: number,
): Promise<{ walletAddress: string; email?: string }[]> => {
  return PowerBoosting.createQueryBuilder('powerBoosting')
    .leftJoin('powerBoosting.user', 'user')
    .leftJoinAndSelect('powerBoosting.project', 'project')
    .leftJoinAndSelect(
      User,
      'projectOwner',
      'project.adminUserId = projectOwner.id',
    )
    .select('LOWER(user.walletAddress) AS "walletAddress", user.email as email')
    .where(`"projectId"=:projectId`, {
      projectId,
    })
    .andWhere(`percentage > 0`)
    .andWhere(`user.id != projectOwner.id`)
    .getRawMany();
};

export const findUsersWhoLikedProjectExcludeProjectOwner = async (
  projectId: number,
): Promise<{ walletAddress: string; email?: string }[]> => {
  return Reaction.createQueryBuilder('reaction')
    .leftJoin(User, 'user', 'reaction.userId = user.id')
    .leftJoinAndSelect('reaction.project', 'project')
    .leftJoinAndSelect(
      User,
      'projectOwner',
      'project.adminUserId = projectOwner.id',
    )
    .select(
      'LOWER(user.walletAddress) AS "walletAddress", user.email as email, projectOwner.id as ownerId',
    )
    .where(`"projectId"=:projectId`, {
      projectId,
    })
    .andWhere(`user.id != projectOwner.id`)
    .getRawMany();
};

export const findUsersWhoDonatedToProjectExcludeWhoLiked = async (
  projectId: number,
): Promise<{ walletAddress: string; email?: string }[]> => {
  return Donation.createQueryBuilder('donation')
    .leftJoinAndSelect('donation.project', 'project')
    .leftJoinAndSelect(
      User,
      'projectOwner',
      'project.adminUserId = projectOwner.id',
    )
    .leftJoin('donation.user', 'user')
    .leftJoin(
      Reaction,
      'reaction',
      'reaction.projectId = project.id AND user.id = reaction.userId',
    )
    .distinctOn(['user.walletAddress'])
    .select('LOWER(user.walletAddress) AS "walletAddress", user.email as email')
    .where(`donation."projectId"=:projectId`, {
      projectId,
    })
    .andWhere(`reaction.id IS NULL`)
    .andWhere(`user.id != projectOwner.id`)
    .getRawMany();
};

export const findUsersWhoSupportProject = async (
  projectId: number,
): Promise<{ walletAddress: string; email?: string }[]> => {
  const [usersWhoBoosted, usersWhoLiked, usersWhoDonated] = await Promise.all([
    findUsersWhoBoostedProject(projectId),
    findUsersWhoLikedProjectExcludeProjectOwner(projectId),
    findUsersWhoDonatedToProjectExcludeWhoLiked(projectId),
  ]);

  const users: { walletAddress: string; email?: string }[] = [];
  for (const user of usersWhoDonated
    .concat(usersWhoLiked)
    .concat(usersWhoBoosted)) {
    // Make sure we dont add repetitive users
    if (!users.find(u => u.walletAddress === user.walletAddress)) {
      users.push(user);
    }
  }
  return users;
};
