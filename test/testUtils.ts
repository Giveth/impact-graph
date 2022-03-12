import { assert } from 'chai';
import * as jwt from 'jsonwebtoken';
import config from '../src/config';
import { NETWORK_IDS } from '../src/provider';
import { User } from '../src/entities/user';
import { Donation } from '../src/entities/donation';
import {
  Category,
  Project,
  ProjStatus,
  ProjectUpdate,
} from '../src/entities/project';
import { errorMessages } from '../src/utils/errorMessages';
import { ProjectStatus } from '../src/entities/projectStatus';

// tslint:disable-next-line:no-var-requires
const moment = require('moment');

export const graphqlUrl = 'http://localhost:4000/graphql';
export const assertThrowsAsync = async (fn, errorMessage) => {
  let f = () => {
    // empty function
  };
  try {
    await fn();
  } catch (e) {
    f = () => {
      throw e;
    };
  } finally {
    if (errorMessage) {
      assert.throw(f, errorMessage);
    } else {
      assert.throw(f);
    }
  }
};

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const assertNotThrowsAsync = async fn => {
  let f = () => {
    // empty function
  };
  try {
    await fn();
  } catch (e) {
    f = () => {
      throw e;
    };
  } finally {
    assert.doesNotThrow(f);
  }
};

export const generateTestAccessToken = async (id: number): Promise<string> => {
  const user = await User.findOne({ id });
  return jwt.sign(
    { userId: id, firstName: user?.firstName },
    config.get('JWT_SECRET') as string,
    { expiresIn: '30d' },
  );
};

export interface CreateProjectData {
  id?: number;
  title: string;
  description: string;
  admin: string;
  walletAddress: string;
  categories: string[];
  verified?: boolean;
  listed?: boolean;
  giveBacks?: boolean;
  creationDate: Date;
  updatedAt: Date;
  slug: string;
  statusId?: number;
  qualityScore?: number;
  totalDonations?: number;
  totalTraceDonations?: number;
  totalReactions?: number;
  totalProjectUpdates?: number;
  traceCampaignId?: string;
  projectUpdateCreationDate: Date;
}

export const saveUserDirectlyToDb = async (walletAddress: string) => {
  return User.create({
    loginType: 'wallet',
    walletAddress,
  }).save();
};
export const saveProjectDirectlyToDb = async (
  projectData: CreateProjectData,
): Promise<Project> => {
  const statusId = projectData?.statusId
    ? projectData.statusId
    : ProjStatus.active;
  const status = await ProjectStatus.findOne({
    id: statusId,
  });
  const user = (await User.findOne({
    id: Number(projectData.admin),
  })) as User;
  const categoriesPromise = Promise.all(
    projectData.categories
      ? projectData.categories.map(async category => {
          const c = await Category.findOne({ name: category });
          if (!c) {
            throw new Error('Invalid category');
          }
          return c;
        })
      : [],
  );
  const categories = await categoriesPromise;
  const project = await Project.create({
    ...projectData,
    status,
    categories,
    users: [user],
  }).save();

  // default projectUpdate for liking projects
  // this was breaking updateAt tests as it was running update hooks sometime in the future.
  // Found no other way to avoid triggering the hooks.
  const projectUpdateCreatedAt = projectData.projectUpdateCreationDate;
  await ProjectUpdate.query(`
    INSERT INTO public.project_update (
      "userId","projectId",content,title,"createdAt","isMain"
    ) VALUES (
      ${user.id}, ${project.id}, '', '', '${
    projectUpdateCreatedAt.toISOString().split('T')[0]
  }', true
    )`);
  return project;
};
export const createProjectData = (): CreateProjectData => {
  const title = String(new Date().getTime());
  return {
    // title: `test project`,
    title,
    description: 'test description',
    walletAddress: generateRandomEtheriumAddress(),
    categories: ['food1'],
    verified: true,
    listed: true,
    giveBacks: false,
    creationDate: new Date(),
    updatedAt: new Date(),
    slug: title,
    // firstUser's id
    admin: '1',
    qualityScore: 30,
    // just need the initial value to be different than 0
    totalDonations: 10,
    totalReactions: 0,
    totalProjectUpdates: 1,
    projectUpdateCreationDate: new Date(),
  };
};

export const SEED_DATA = {
  FIRST_USER: {
    name: 'firstUser',
    lastName: 'firstUser lastName',
    loginType: 'wallet',
    id: 1,
    walletAddress: generateRandomEtheriumAddress(),
  },
  SECOND_USER: {
    name: 'secondUser',
    lastName: 'secondUser lastName',
    loginType: 'wallet',
    id: 2,
    walletAddress: generateRandomEtheriumAddress(),
  },
  THIRD_USER: {
    name: 'thirdUser',
    lastName: 'thirdUser lastName',
    loginType: 'wallet',
    id: 3,
    walletAddress: generateRandomEtheriumAddress(),
  },
  ADMIN_USER: {
    name: 'adminUser',
    lastName: 'adminUser lastName',
    loginType: 'wallet',
    id: 4,
    walletAddress: generateRandomEtheriumAddress(),
  },
  FIRST_PROJECT: {
    ...createProjectData(),
    title: 'first project',
    slug: 'first-project',
    description: 'first description',
    id: 1,
    admin: '1',
  },
  SECOND_PROJECT: {
    ...createProjectData(),
    title: 'second project',
    slug: 'second-project',
    description: 'second description',
    id: 2,
    admin: '2',
  },
  TRANSAK_PROJECT: {
    ...createProjectData(),
    title: 'transak project',
    slug: 'transak-project',
    description: 'transak description',
    id: 3,
    admin: '3',
  },
  CATEGORIES: [
    'food1',
    'food2',
    'food3',
    'food4',
    'food5',
    'food6',
    'food7',
    'food8',
  ],
  STATUS_REASONS: [
    {
      description: 'The project has completed its goals!',
      statusId: ProjStatus.deactive,
    },
    {
      description: 'The project is no longer active.',
      statusId: ProjStatus.deactive,
    },
    {
      description: 'The project was made by mistake.',
      statusId: ProjStatus.deactive,
    },
    {
      description: 'Other / prefer not to say.',
      statusId: ProjStatus.deactive,
    },
  ],
  STATUSES: [
    // Orders are important, because id of active status should be 5, I know it's very bad :)
    {
      symbol: 'rejected',
      name: 'rejected',
      description: 'rejected description',
    },
    {
      symbol: 'pending',
      name: 'pending',
      description: 'pending description',
    },
    {
      symbol: 'clarification',
      name: 'clarification',
      description: 'clarification description',
    },
    {
      symbol: 'verification',
      name: 'verification',
      description: 'verification description',
    },
    {
      symbol: 'active',
      name: 'active',
      description: 'active description',
    },
    {
      symbol: 'deactive',
      name: 'deactive',
      description: 'cancelled description',
    },
    {
      symbol: 'cancelled',
      name: 'cancelled',
      description: 'delisted description',
    },
    {
      symbol: 'drafted',
      name: 'drafted',
      description: 'drafted description',
    },
  ],
  DAI_SMART_CONTRACT_ADDRESS: '0x6b175474e89094c44da98b954eedeac495271d0f',
};

export const PROJECT_UPDATE_SEED_DATA = {
  FIRST_PROJECT_UPDATE: {
    id: 1,
    title: 'first project update',
    projectId: SEED_DATA.FIRST_PROJECT.id,
    userId: SEED_DATA.FIRST_USER.id,
    content: 'First project update content',
    isMain: false,
  },
  SECOND_PROJECT_UPDATE: {
    id: 2,
    title: 'second project update',
    projectId: SEED_DATA.FIRST_PROJECT.id,
    userId: SEED_DATA.FIRST_USER.id,
    content: 'Second project update content',
    isMain: false,
  },
  THIRD_PROJECT_UPDATE: {
    id: 3,
    title: 'third project update',
    projectId: SEED_DATA.FIRST_PROJECT.id,
    userId: SEED_DATA.FIRST_USER.id,
    content: 'Third project update content',
    isMain: false,
  },
};

export const REACTION_SEED_DATA = {
  FIRST_LIKED_PROJECT_REACTION: {
    id: 1,
    userId: 1,
    reaction: 'heart',
    projectId: 1,
  },

  FIRST_LIKED_PROJECT_UPDATE_REACTION: {
    id: 2,
    userId: 1,
    reaction: 'heart',
    projectUpdateId: 1,
  },
};

export const DONATION_SEED_DATA = {
  FIRST_DONATION: {
    id: 1,
    transactionId: generateRandomEtheriumAddress(),
    transactionNetworkId: NETWORK_IDS.MAIN_NET,
    toWalletAddress: SEED_DATA.FIRST_PROJECT.walletAddress,
    fromWalletAddress: SEED_DATA.FIRST_USER.walletAddress,
    currency: 'ETH',
    anonymous: false,
    amount: 15,
    valueUsd: 15,
    userId: SEED_DATA.FIRST_USER.id,
    projectId: SEED_DATA.FIRST_PROJECT.id,
    createdAt: moment(),
    segmentNotified: true,
  },
  SECOND_DONATION: {
    id: 2,
    transactionId: generateRandomEtheriumAddress(),
    transactionNetworkId: NETWORK_IDS.MAIN_NET,
    toWalletAddress: SEED_DATA.FIRST_PROJECT.walletAddress,
    fromWalletAddress: SEED_DATA.FIRST_USER.walletAddress,
    currency: 'ETH',
    anonymous: false,
    amount: 10,
    valueUsd: 135,
    userId: SEED_DATA.FIRST_USER.id,
    projectId: SEED_DATA.FIRST_PROJECT.id,
    createdAt: moment().subtract(2, 'days'),
    segmentNotified: false,
  },
  INCOMPLETED_TRANSAK_DONATION: {
    id: 3,
    transactionId: generateRandomEtheriumAddress(),
    transactionNetworkId: NETWORK_IDS.MAIN_NET,
    toWalletAddress: SEED_DATA.FIRST_PROJECT.walletAddress,
    fromWalletAddress: SEED_DATA.FIRST_USER.walletAddress,
    currency: 'ETH',
    anonymous: false,
    amount: 10,
    userId: SEED_DATA.FIRST_USER.id,
    projectId: SEED_DATA.FIRST_PROJECT.id,
    createdAt: moment(),
    segmentNotified: false,
    transakStatus: 'AWAITING_PAYMENT_FROM_USER',
  },
  COMPLETED_TRANSAK_DONATION: {
    id: 4,
    transactionId: generateRandomEtheriumAddress(),
    transactionNetworkId: NETWORK_IDS.MAIN_NET,
    toWalletAddress: SEED_DATA.FIRST_PROJECT.walletAddress,
    fromWalletAddress: SEED_DATA.FIRST_USER.walletAddress,
    currency: 'ETH',
    anonymous: false,
    amount: 10,
    userId: SEED_DATA.FIRST_USER.id,
    projectId: SEED_DATA.FIRST_PROJECT.id,
    createdAt: moment(),
    segmentNotified: false,
    transakStatus: 'COMPLETED',
  },
};

export interface CreateDonationData {
  id?: number;
  transactionId: string;
  transactionNetworkId: number;
  toWalletAddress: string;
  fromWalletAddress: string;
  currency: string;
  anonymous: boolean;
  amount: number;
  createdAt: any;
}

export const saveDonationDirectlyToDb = async (
  donationData: CreateDonationData,
  userId: number,
  projectId: number,
) => {
  const user = (await User.findOne({
    id: userId,
  })) as User;
  const project = (await Project.findOne({
    id: projectId,
  })) as Project;
  return Donation.create({
    ...donationData,
    user,
    project,
  }).save();
};

export function generateRandomEtheriumAddress(): string {
  return `0x${generateHexNumber(40)}`;
}

function generateHexNumber(len) {
  const hex = '0123456789abcdef';
  let output = '';
  /* eslint-disable no-plusplus */
  for (let i = 0; i < len; i++) {
    output += hex.charAt(Math.floor(Math.random() * hex.length));
  }
  return output;
}
