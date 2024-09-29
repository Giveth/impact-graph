import { assert } from 'chai';
import * as jwt from 'jsonwebtoken';
import { Keypair } from '@solana/web3.js';
import config from '../src/config';
import { NETWORK_IDS, QACC_NETWORK_ID } from '../src/provider';
import { User } from '../src/entities/user';
import { Donation, DONATION_STATUS } from '../src/entities/donation';
import {
  Abc,
  Project,
  ProjectUpdate,
  ProjStatus,
  ReviewStatus,
} from '../src/entities/project';
import { ProjectStatus } from '../src/entities/projectStatus';
import {
  Organization,
  ORGANIZATION_LABELS,
} from '../src/entities/organization';
import {
  findUserById,
  findUserByWalletAddress,
} from '../src/repositories/userRepository';
import {
  addNewProjectAddress,
  findProjectRecipientAddressByProjectId,
  findRelatedAddressByWalletAddress,
} from '../src/repositories/projectAddressRepository';
import {
  PROJECT_VERIFICATION_STATUSES,
  ProjectVerificationForm,
} from '../src/entities/projectVerificationForm';
import { MainCategory } from '../src/entities/mainCategory';
import { Category, CATEGORY_NAMES } from '../src/entities/category';
import { FeaturedUpdate } from '../src/entities/featuredUpdate';
import { ChainType } from '../src/types/network';
import { ProjectAddress } from '../src/entities/projectAddress';
import {
  QACC_DONATION_TOKEN_ADDRESS,
  QACC_DONATION_TOKEN_DECIMALS,
  QACC_DONATION_TOKEN_NAME,
  QACC_DONATION_TOKEN_SYMBOL,
} from '../src/constants/qacc';
import { EarlyAccessRound } from '../src/entities/earlyAccessRound';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const moment = require('moment');

export const graphqlUrl = 'http://localhost:4000/graphql';
export const serverBaseAddress = 'http://localhost:4000';

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
  const user = await User.findOne({ where: { id } });
  return jwt.sign(
    {
      userId: id,
      firstName: user?.firstName,
      walletAddress: user?.walletAddress,
      name: user?.name,
      lastName: user?.lastName,
    },
    config.get('JWT_SECRET') as string,
    { expiresIn: '30d' },
  );
};

export const generateConfirmationEmailToken = async (
  id: number,
): Promise<string> => {
  return jwt.sign(
    { projectVerificationFormId: id },
    config.get('MAILER_JWT_SECRET') as string,
    { expiresIn: '120' },
  );
};

// Failed user case from undetected bug in the dapp, userId lost
export const generateUserIdLessAccessToken = async (
  id: number,
): Promise<string> => {
  const user = await User.findOne({ where: { id } });
  return jwt.sign(
    { firstName: user?.firstName },
    config.get('JWT_SECRET') as string,
    { expiresIn: '30d' },
  );
};

export interface CreateProjectData {
  id?: number;
  title: string;
  slug: string;
  description: string;
  adminUserId: number;
  // relatedAddresses: RelatedAddressInputType[];
  walletAddress: string;
  categories: string[];
  verified?: boolean;
  isImported?: boolean;
  listed?: boolean;
  reviewStatus: ReviewStatus;
  giveBacks?: boolean;
  creationDate: Date;
  updatedAt: Date;
  latestUpdateCreationDate: Date;
  statusId?: number;
  organizationLabel?: string;
  qualityScore?: number;
  totalDonations?: number;
  totalTraceDonations?: number;
  totalReactions?: number;
  totalProjectUpdates?: number;
  givingBlocksId?: string;
  traceCampaignId?: string;
  projectUpdateCreationDate?: Date;
  verificationStatus?: string;
  image?: string;
  networkId?: number;
  chainType?: ChainType;
  abc: Abc;
}

export const saveUserDirectlyToDb = async (
  walletAddress: string,
  override: Partial<User> = {},
): Promise<User> => {
  const user = await findUserByWalletAddress(walletAddress);
  if (user) {
    return user;
  }
  return User.create({
    loginType: 'wallet',
    walletAddress,
    firstName: `testUser-${walletAddress}`,
    email: `testEmail-${walletAddress}@giveth.io`,
    privadoVerifiedRequestIds: [],
    ...override,
  }).save();
};

export const saveFeaturedProjectDirectlyToDb = async (
  projectId: number,
  projectUpdateId: number,
): Promise<FeaturedUpdate> => {
  return FeaturedUpdate.create({
    projectId,
    projectUpdateId,
  }).save();
};

export const saveProjectVerificationFormDirectlyToDb = async (params: {
  project: Project;
  user: User;
  status?: PROJECT_VERIFICATION_STATUSES;
}): Promise<ProjectVerificationForm> => {
  const { project, user, status } = params;
  return ProjectVerificationForm.create({
    project,
    user,
    status: status || PROJECT_VERIFICATION_STATUSES.DRAFT,
  }).save();
};

export const saveProjectDirectlyToDb = async (
  projectData: CreateProjectData,
  owner?: User,
): Promise<Project> => {
  const relatedAddress = await findRelatedAddressByWalletAddress(
    projectData.walletAddress,
  );
  if (relatedAddress && relatedAddress.project) {
    return relatedAddress.project;
  }
  const statusId = projectData?.statusId || ProjStatus.active;
  const status = (await ProjectStatus.findOne({
    where: {
      id: statusId,
    },
  })) as ProjectStatus;
  const organizationLabel =
    projectData.organizationLabel || ORGANIZATION_LABELS.GIVETH;
  const organization = (await Organization.findOne({
    where: {
      label: organizationLabel,
    },
  })) as Organization;
  const user =
    owner ||
    ((await User.findOne({
      where: {
        id: projectData.adminUserId,
      },
    })) as User);
  const categoriesPromise = Promise.all(
    projectData.categories
      ? projectData.categories.map(async category => {
          const c = await Category.findOne({ where: { name: category } });
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
    organization,
    categories,
    adminUser: user,
    adminUserId: user.id,
  }).save();

  if (projectData.networkId) {
    await addNewProjectAddress({
      project,
      user,
      isRecipient: true,
      chainType: projectData.chainType || ChainType.EVM,
      address: projectData.walletAddress,
      networkId: projectData.networkId,
    });
  } else {
    for (const networkId of Object.values(NETWORK_IDS)) {
      await addNewProjectAddress({
        project,
        user,
        isRecipient: true,
        address: projectData.walletAddress,
        networkId,
        chainType: ChainType.EVM,
      });
    }
  }
  project.addresses = await findProjectRecipientAddressByProjectId({
    projectId: project.id,
  });

  // default projectUpdate for liking projects
  // this was breaking updateAt tests as it was running update hooks sometime in the future.
  // Found no other way to avoid triggering the hooks.
  const projectUpdateCreatedAt =
    projectData.projectUpdateCreationDate || new Date();
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

export const createProjectAbcData = (override: Partial<Abc> = {}): Abc => {
  return {
    nftContractAddress: generateRandomEtheriumAddress(),
    tokenName: 'tkn name',
    tokenTicker: 'tkn',
    issuanceTokenAddress: generateRandomEtheriumAddress(),
    fundingManagerAddress: generateRandomEtheriumAddress(),
    icon: '',
    orchestratorAddress: generateRandomEtheriumAddress(),
    projectAddress: generateRandomEtheriumAddress(),
    creatorAddress: generateRandomEtheriumAddress(),
    chainId: QACC_NETWORK_ID,
    ...override,
  };
};
export const createProjectData = (name?: string): CreateProjectData => {
  const title = name ? name : String(new Date().getTime());
  const walletAddress = generateRandomEtheriumAddress();
  return {
    // title: `test project`,
    title,
    description: 'test description',
    walletAddress,
    abc: createProjectAbcData({ projectAddress: walletAddress }),
    categories: ['food1'],
    verified: true,
    listed: true,
    reviewStatus: ReviewStatus.Listed,
    giveBacks: false,
    creationDate: new Date(),
    updatedAt: new Date(),
    latestUpdateCreationDate: new Date(),
    slug: title,
    // firstUser's id
    adminUserId: 1,
    qualityScore: 30,
    // just need the initial value to be different from 0
    totalDonations: 10,
    totalReactions: 0,
    totalProjectUpdates: 1,
    projectUpdateCreationDate: new Date(),
  };
};

export const deleteProjectDirectlyFromDb = async (
  projectId: number,
): Promise<void> => {
  // Find and delete related project addresses
  const projectAddresses = await ProjectAddress.find({ where: { projectId } });
  await ProjectAddress.remove(projectAddresses);

  // Find and delete related project updates
  const projectUpdates = await ProjectUpdate.find({ where: { projectId } });
  await ProjectUpdate.remove(projectUpdates);

  // Delete the project
  const project = await Project.findOne({ where: { id: projectId } });
  if (project) {
    await Project.remove(project);
  }
};

export const createDonationData = (params?: {
  status?: string;
  createdAt?: Date;
  valueUsd?: number;
  anonymous?: boolean;
  qfRoundId?: number;
}): CreateDonationData => {
  return {
    transactionId: generateRandomEvmTxHash(),
    transactionNetworkId: NETWORK_IDS.MAIN_NET,
    toWalletAddress: SEED_DATA.FIRST_PROJECT.walletAddress,
    fromWalletAddress: SEED_DATA.FIRST_USER.walletAddress,
    currency: 'ETH',
    status: params?.status || DONATION_STATUS.PENDING,
    anonymous: params?.anonymous || false,
    amount: 15,
    valueUsd: params?.valueUsd || 15,
    createdAt: params?.createdAt || moment().toDate(),
    segmentNotified: true,
    qfRoundId: params?.qfRoundId || undefined,
  };
};

export const SEED_DATA = {
  FIRST_USER: {
    name: 'firstUser name',
    lastName: 'firstUser lastName',
    firstName: 'firstUser firstName',
    email: 'firstUser@giveth.io',
    loginType: 'wallet',
    id: 1,
    walletAddress: generateRandomEtheriumAddress(),
    privadoVerifiedRequestIds: [],
  },
  SECOND_USER: {
    name: 'secondUser',
    email: 'secondUser@giveth.io',
    lastName: 'secondUser lastName',
    firstName: 'secondUser firstName',
    loginType: 'wallet',
    id: 2,
    walletAddress: generateRandomEtheriumAddress(),
    privadoVerifiedRequestIds: [],
  },
  THIRD_USER: {
    name: 'thirdUser',
    lastName: 'thirdUser lastName',
    firstName: 'thirdUser firstName',
    email: 'thirdUser@giveth.io',
    loginType: 'wallet',
    id: 3,
    walletAddress: generateRandomEtheriumAddress(),
    privadoVerifiedRequestIds: [],
  },
  ADMIN_USER: {
    name: 'adminUser',
    lastName: 'adminUser lastName',
    firstName: 'adminUser firstName',
    email: 'adminUser@giveth.io',
    loginType: 'wallet',
    id: 4,
    walletAddress: generateRandomEtheriumAddress(),
    privadoVerifiedRequestIds: [],
  },
  PROJECT_OWNER_USER: {
    name: 'project owner user',
    lastName: 'projectOwner lastName',
    email: 'projectOwnerUser@giveth.io',
    loginType: 'wallet',
    id: 5,
    walletAddress: generateRandomEtheriumAddress(),
    privadoVerifiedRequestIds: [],
  },
  FIRST_PROJECT: {
    ...createProjectData(),
    title: 'first project',
    slug: 'first-project',
    description: 'first description',
    id: 1,
    adminUserId: 1,
  },
  SECOND_PROJECT: {
    ...createProjectData(),
    title: 'second project',
    slug: 'second-project',
    description: 'second description',
    id: 2,
    adminUserId: 2,
  },
  TRANSAK_PROJECT: {
    ...createProjectData(),
    title: 'transak project',
    slug: 'transak-project',
    description: 'transak description',
    id: 3,
    adminUserId: 3,
  },
  FOURTH_PROJECT: {
    ...createProjectData(),
    title: 'forth project',
    slug: 'forth-project',
    description: 'forth description',
    id: 4,
    adminUserId: 1,
  },
  FIFTH_PROJECT: {
    ...createProjectData(),
    title: 'fifth project',
    slug: 'fifth-project',
    description: 'forth description',
    id: 5,
    adminUserId: 1,
  },
  SIXTH_PROJECT: {
    ...createProjectData(),
    title: 'fifth project',
    slug: 'sixth-project',
    description: 'forth description',
    id: 6,
    adminUserId: 1,
  },
  NON_VERIFIED_PROJECT: {
    ...createProjectData(),
    title: 'non verified project',
    slug: 'non-verified-project',
    description: 'non verified description',
    id: 7,
    verified: false,
    adminUserId: 1,
  },
  MAIN_CATEGORIES: ['drink', 'food', 'nonProfit'],
  NON_PROFIT_SUB_CATEGORIES: [CATEGORY_NAMES.registeredNonProfits],
  FOOD_SUB_CATEGORIES: [
    'food1',
    'food2',
    'food3',
    'food4',
    'food5',
    'food6',
    'food7',
    'food8',
  ],
  DRINK_SUB_CATEGORIES: [
    'drink1',
    'drink2',
    'drink3',
    'drink4',
    'drink5',
    'drink6',
    'drink7',
    'drink8',
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
  MALFORMED_ETHEREUM_ADDRESS: '0x5AC583Feb2b1f288C0A51d6Cdca2e8c814BFE93A', // changed last character
  MALFORMED_SOLANA_ADDRESS: 'CdLgY2DCG36HXCySCHoBnEb2cXWpar8BKhp8Nbxpnww0', // changed last character
  ORGANIZATIONS: [
    {
      name: 'Giveth',
      label: ORGANIZATION_LABELS.GIVETH,
      website: 'https://giveth.io',
      supportCustomTokens: true,
    },
    {
      name: 'Trace',
      label: ORGANIZATION_LABELS.TRACE,
      website: 'https://trace.giveth.io',
      supportCustomTokens: true,
    },
    {
      name: 'Endaoment',
      label: ORGANIZATION_LABELS.ENDAOMENT,
      website: 'https://thegivingblock.com',
      disableUpdateEnforcement: true,
      disableNotifications: true,
      supportCustomTokens: false,
    },
    {
      name: 'CHANGE',
      label: ORGANIZATION_LABELS.CHANGE,
      website: 'https://getchange.io',
      supportCustomToken: false,
    },
  ],
  TOKENS: {
    [QACC_NETWORK_ID]: [
      {
        name: QACC_DONATION_TOKEN_NAME,
        symbol: QACC_DONATION_TOKEN_SYMBOL,
        address: QACC_DONATION_TOKEN_ADDRESS,
        decimals: QACC_DONATION_TOKEN_DECIMALS,
        isStableCoin: false,
      },
    ],
    mainnet: [
      {
        name: 'Ethereum native token',
        symbol: 'ETH',
        address: '0x0000000000000000000000000000000000000000',
        decimals: 18,
      },
      {
        name: 'Giveth Token',
        symbol: 'GIV',
        coingeckoId: 'giveth',
        address: '0x900db999074d9277c5da2a43f252d74366230da0',
        decimals: 18,
      },
      {
        address: '0xd56dac73a4d6766464b38ec6d91eb45ce7457c44',
        symbol: 'PAN',
        name: 'Panvala',
        decimals: 18,
      },
      {
        address: '0x6b175474e89094c44da98b954eedeac495271d0f',
        symbol: 'DAI',
        name: 'Dai',
        decimals: 18,
        isStableCoin: true,
      },
      {
        address: '0x03ab458634910aad20ef5f1c8ee96f1d6ac54919',
        symbol: 'RAI',
        name: 'Rai Reflex Index',
        decimals: 18,
      },
      {
        address: '0xda007777d86ac6d989cc9f79a73261b3fc5e0da0',
        symbol: 'NODE',
        name: 'dAppNode',
        decimals: 18,
      },
      {
        address: '0x056fd409e1d7a124bd7017459dfea2f387b6d5cd',
        symbol: 'GUSD',
        name: 'Gemini Dollar',
        decimals: 2,
      },
      {
        address: '0xde30da39c46104798bb5aa3fe8b9e0e1f348163f',
        symbol: 'GTC',
        name: 'Gitcoin',
        decimals: 18,
      },
      {
        address: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
        symbol: 'FOX',
        name: 'ShapeShift FOX Token (FOX)',
        decimals: 18,
      },
      {
        address: '0xD533a949740bb3306d119CC777fa900bA034cd52',
        symbol: 'CRV',
        name: 'Curve DAO Token',
        decimals: 18,
      },
      {
        address: '0xa47c8bf37f92abed4a126bda807a7b7498661acd',
        symbol: 'UST',
        name: 'TerraUSD',
        decimals: 18,
      },
      {
        address: '0x6b3595068778dd592e39a122f4f5a5cf09c90fe2',
        symbol: 'SUSHI',
        name: 'Sushi Token',
        decimals: 18,
      },
      {
        address: '0xba100000625a3754423978a60c9317c58a424e3d',
        symbol: 'BAL',
        name: 'Balancer',
        decimals: 18,
      },
      {
        address: '0xad32a8e6220741182940c5abf610bde99e737b2d',
        symbol: 'DOUGH',
        name: 'PieDAO DOUGH',
        decimals: 18,
      },
      {
        address: '0x09a3ecafa817268f77be1283176b946c4ff2e608',
        symbol: 'MIR',
        name: 'Wrapped MIR Token',
        decimals: 18,
      },
      {
        address: '0x30cf203b48edaa42c3b4918e955fed26cd012a3f',
        symbol: 'SEED',
        name: 'Metagame SEED',
        decimals: 18,
      },
      {
        address: '0xdd1ad9a21ce722c151a836373babe42c868ce9a4',
        symbol: 'UBI',
        name: 'PoH Universal Basic Income',
        decimals: 18,
      },
      {
        address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
        symbol: 'USDT',
        name: 'Tether',
        decimals: 6,
        isStableCoin: true,
      },
      {
        address: '0xa0b73e1ff0b80914ab6fe0444e65848c4c34450b',
        symbol: 'CRO',
        name: 'Crypto.com Coin',
        decimals: 8,
      },
      {
        address: '0x514910771af9ca656af840dff83e8264ecf986ca',
        symbol: 'LINK',
        name: 'Chainlink',
        decimals: 18,
      },
      {
        address: '0x2af5d2ad76741191d15dfe7bf6ac92d4bd912ca3',
        symbol: 'LEO',
        name: 'UNUS SED LEO',
        decimals: 18,
      },
      {
        address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        isStableCoin: true,
      },
      {
        address: '0x6f259637dcd74c767781e37bc6133cd6a68aa161',
        symbol: 'HT',
        name: 'Huobi Token',
        decimals: 18,
      },
      {
        address: '0xc00e94cb662c3520282e6f5717214004a7f26888',
        symbol: 'COMP',
        name: 'Compound',
        decimals: 18,
      },
      {
        address: '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2',
        symbol: 'MKR',
        name: 'Maker',
        decimals: 18,
      },
      {
        address: '0xf1290473e210b2108a85237fbcd7b6eb42cc654f',
        symbol: 'HEDG',
        name: 'HedgeTrade',
        decimals: 18,
      },
      {
        address: '0x0d8775f648430679a709e98d2b0cb6250d2887ef',
        symbol: 'BAT',
        name: 'Basic Attention Token',
        decimals: 18,
      },
      {
        address: '0x75231f58b43240c9718dd58b4967c5114342a86c',
        symbol: 'OKB',
        name: 'OKB',
        decimals: 18,
      },
      {
        address: '0x8e870d67f660d95d5be530380d0ec0bd388289e1',
        symbol: 'PAX',
        name: 'Paxos Standard',
        decimals: 18,
      },
      {
        address: '0xe41d2489571d322189246dafa5ebde1f4699f498',
        symbol: 'ZRX',
        name: 'ZRX 0x',
        decimals: 18,
      },
      {
        address: '0xdd974d5c2e2928dea5f71b9825b8b646686bd200',
        symbol: 'KNC',
        name: 'Kyber Network',
        decimals: 18,
      },
      {
        address: '0xd26114cd6ee289accf82350c8d8487fedb8a0c07',
        symbol: 'OMG',
        name: 'OMG Network',
        decimals: 18,
      },
      {
        address: '0x10086399dd8c1e3de736724af52587a2044c9fa2',
        symbol: 'TMTG',
        name: 'The Midas Touch Gold',
        decimals: 18,
      },
      {
        address: '0x1985365e9f78359a9b6ad760e32412f4a445e862',
        symbol: 'REP',
        name: 'Augur',
        decimals: 18,
      },
      {
        address: '0x80fb784b7ed66730e8b1dbd9820afd29931aab03',
        symbol: 'LEND',
        name: 'Lend Aave',
        decimals: 18,
      },
      {
        address: '0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f',
        symbol: 'SNX',
        name: 'Synthetix Network Token',
        decimals: 18,
      },
      {
        address: '0xe99a894a69d7c2e3c92e61b64c505a6a57d2bc07',
        symbol: 'HYN',
        name: 'Hyperion',
        decimals: 18,
      },
      {
        address: '0xf629cbd94d3791c9250152bd8dfbdf380e2a3b9c',
        symbol: 'ENJ',
        name: 'Enjin Coin',
        decimals: 18,
      },
      {
        address: '0x408e41876cccdc0f92210600ef50372656052a38',
        symbol: 'REN',
        name: 'Ren',
        decimals: 18,
      },
      {
        address: '0xdf574c24545e5ffecb9a659c229253d4111d87e1',
        symbol: 'HUSD',
        name: 'HUSD',
        decimals: 8,
      },
      {
        address: '0xaaaebe6fe48e54f431b0c390cfaf0b017d09d42d',
        symbol: 'CEL',
        name: 'Celsius',
        decimals: 4,
      },
      {
        address: '0xbd0793332e9fb844a52a205a233ef27a5b34b927',
        symbol: 'ZB',
        name: 'ZB Token',
        decimals: 18,
      },
      {
        address: '0x973e52691176d36453868d9d86572788d27041a9',
        symbol: 'DX',
        name: 'DxChain Token',
        decimals: 18,
      },
      {
        address: '0x4a220e6096b25eadb88358cb44068a3248254675',
        symbol: 'QNT',
        name: 'Quant',
        decimals: 18,
      },
      {
        address: '0x6c6ee5e31d828de241282b9606c8e98ea48526e2',
        symbol: 'HOT',
        name: 'Holo',
        decimals: 18,
      },
      {
        address: '0xba9d4199fab4f26efe3551d490e3821486f135ba',
        symbol: 'CHSB',
        name: 'SwissBorg',
        decimals: 8,
      },
      {
        address: '0xbbbbca6a901c926f240b89eacb641d8aec7aeafd',
        symbol: 'LRC',
        name: 'Loopring',
        decimals: 18,
      },
      {
        address: '0x744d70fdbe2ba4cf95131626614a1763df805b9e',
        symbol: 'SNT',
        name: 'Status',
        decimals: 18,
      },
      {
        address: '0xa974c709cfb4566686553a20790685a47aceaa33',
        symbol: 'XIN',
        name: 'Mixin',
        decimals: 18,
      },
      {
        address: '0x1f573d6fb3f13d689ff844b4ce37794d79a7ff1c',
        symbol: 'BNT',
        name: 'Bancor',
        decimals: 18,
      },
      {
        address: '0x039b5649a59967e3e936d7471f9c3700100ee1ab',
        symbol: 'KCS',
        name: 'KuCoin Shares',
        decimals: 6,
      },
      {
        address: '0xb63b606ac810a52cca15e44bb630fd42d8d1d83d',
        symbol: 'MCO',
        name: 'MCO',
        decimals: 8,
      },
      {
        address: '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0',
        symbol: 'MATIC',
        name: 'Matic Network',
        decimals: 18,
      },
      {
        address: '0x73cee8348b9bdd48c64e13452b8a6fbc81630573',
        symbol: 'EGR',
        name: 'Egoras',
        decimals: 18,
      },
      {
        address: '0x1776e1f26f98b1a5df9cd347953a26dd3cb46671',
        symbol: 'NMR',
        name: 'Numeraire',
        decimals: 18,
      },
      {
        address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
        symbol: 'WBTC',
        name: 'Wrapped Bitcoin',
        decimals: 8,
      },
      {
        address: '0x0f5d2fb29fb7d3cfee444a200298f468908cc942',
        symbol: 'MANA',
        name: 'Decentraland',
        decimals: 18,
      },
      {
        address: '0xa74476443119a942de498590fe1f2454d7d4ac0d',
        symbol: 'GNT',
        name: 'Golem',
        decimals: 18,
      },
      {
        address: '0x45804880de22913dafe09f4980848ece6ecbaf78',
        symbol: 'PAXG',
        name: 'PAX Gold',
        decimals: 18,
      },
      {
        address: '0x607f4c5bb672230e8672085532f7e901544a7375',
        symbol: 'RLC',
        name: 'iExec RLC',
        decimals: 9,
      },
      {
        address: '0xbf2179859fc6d5bee9bf9158632dc51678a4100e',
        symbol: 'ELF',
        name: 'aelf',
        decimals: 18,
      },
      {
        address: '0x446c9033e7516d820cc9a2ce2d0b7328b579406f',
        symbol: 'SOLVE',
        name: 'SOLVE',
        decimals: 8,
      },
      {
        address: '0x8762db106b2c2a0bccb3a80d1ed41273552616e8',
        symbol: 'RSR',
        name: 'Reserve Rights',
        decimals: 18,
      },
      {
        address: '0xf51ebf9a26dbc02b13f8b3a9110dac47a4d62d78',
        symbol: 'APIX',
        name: 'APIX',
        decimals: 18,
      },
      {
        address: '0xa117000000f279d81a1d3cc75430faa017fa5a2e',
        symbol: 'ANT',
        name: 'Aragon',
        decimals: 18,
      },
      {
        address: '0x8400d94a5cb0fa0d041a3788e395285d61c9ee5e',
        symbol: 'UBT',
        name: 'Unibright',
        decimals: 8,
      },
      {
        address: '0x5dd57da40e6866c9fcc34f4b6ddc89f1ba740dfe',
        symbol: 'BRIGHT',
        name: 'BrightID',
        decimals: 18,
      },
      {
        address: '0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e',
        symbol: 'YFI',
        name: 'yearn.finance',
        decimals: 18,
      },
      {
        address: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE',
        symbol: 'SHIB',
        name: 'SHIBA INU',
        decimals: 18,
      },
      {
        address: '0x111111111117dc0aa78b770fa6a738034120c302',
        symbol: '1INCH',
        name: '1INCH Token',
        decimals: 18,
      },
      {
        address: '0xbe428c3867f05dea2a89fc76a102b544eac7f772',
        symbol: 'CVT',
        name: 'CyberVein',
        decimals: 18,
      },
      {
        address: '0xb683d83a532e2cb7dfa5275eed3698436371cc9f',
        symbol: 'BTU',
        name: 'BTU Protocol',
        decimals: 18,
      },
      {
        address: '0xc666081073e8dff8d3d1c2292a29ae1a2153ec09',
        symbol: 'DGTX',
        name: 'Digitex Futures',
        decimals: 18,
      },
      {
        address: '0x6bc1f3a1ae56231dbb64d3e82e070857eae86045',
        symbol: 'XSR',
        name: 'Xensor',
        decimals: 18,
      },
      {
        address: '0x419c4db4b9e25d6db2ad9691ccb832c8d9fda05e',
        symbol: 'DRGN',
        name: 'Dragonchain',
        decimals: 18,
      },
      {
        address: '0xdb25f211ab05b1c97d595516f45794528a807ad8',
        symbol: 'EURS',
        name: 'STASIS EURO',
        decimals: 2,
      },
      {
        address: '0x595832f8fc6bf59c85c527fec3740a1b7a361269',
        symbol: 'POWR',
        name: 'Power Ledger',
        decimals: 6,
      },
      {
        address: '0x8ce9137d39326ad0cd6491fb5cc0cba0e089b6a9',
        symbol: 'SXP',
        name: 'Swipe',
        decimals: 18,
      },
      {
        address: '0xa15c7ebe1f07caf6bff097d8a589fb8ac49ae5b3',
        symbol: 'NPXS',
        name: 'Pundi X',
        decimals: 18,
      },
      {
        address: '0xe66747a101bff2dba3697199dcce5b743b454759',
        symbol: 'GT',
        name: 'Gatechain Token',
        decimals: 18,
      },
      {
        address: '0x653430560be843c4a3d143d0110e896c2ab8ac0d',
        symbol: 'MOF',
        name: 'Molecular Future',
        decimals: 16,
      },
      {
        address: '0xff56cc6b1e6ded347aa0b7676c85ab0b3d08b0fa',
        symbol: 'ORBS',
        name: 'Orbs',
        decimals: 18,
      },
      {
        address: '0x80a7e048f37a50500351c204cb407766fa3bae7f',
        symbol: 'CRPT',
        name: 'Crypterium',
        decimals: 18,
      },
      {
        address: '0xf970b8e36e23f7fc3fd752eea86f8be8d83375a6',
        symbol: 'RCN',
        name: 'Ripio Credit Network',
        decimals: 18,
      },
      {
        address: '0x0cf0ee63788a0849fe5297f3407f701e122cc023',
        symbol: 'DATA',
        name: 'Streamr',
        decimals: 18,
      },
      {
        address: '0xa66daa57432024023db65477ba87d4e7f5f95213',
        symbol: 'HPT',
        name: 'Huobi Pool Token',
        decimals: 18,
      },
      {
        address: '0xfc29b6e626b67776675fff55d5bc0452d042f434',
        symbol: 'BHT',
        name: 'BHEX Token',
        decimals: 18,
      },
      {
        address: '0x6810e776880c02933d47db1b9fc05908e5386b96',
        symbol: 'GNO',
        name: 'Gnosis',
        decimals: 18,
      },
      {
        address: '0xb705268213d593b8fd88d3fdeff93aff5cbdcfae',
        symbol: 'IDEX',
        name: 'IDEX',
        decimals: 18,
      },
      // ADD THESE TO MONOSWAP
      {
        address: '0x4fE83213D56308330EC302a8BD641f1d0113A4Cc',
        symbol: 'NU',
        name: 'NuCypher',
        decimals: 18,
      },
      {
        address: '0x875773784Af8135eA0ef43b5a374AaD105c5D39e',
        symbol: 'IDLE',
        name: 'Idle Finance',
        decimals: 18,
      },
      {
        address: '0x25f8087ead173b73d6e8b84329989a8eea16cf73',
        symbol: 'YGG',
        name: 'Yield Guild',
        decimals: 18,
      },
      // THESE ARE TAKEN FROM THE GIVING BLOCK LIST
      {
        address: '0xdbdb4d16eda451d0503b854cf79d55697f90c8df',
        symbol: 'ALCX',
        name: 'Alchemix',
        decimals: 18,
      },
      {
        address: '0xff20817765cb7f73d4bde2e66e067e58d11095c2',
        symbol: 'AMP',
        name: 'Amp',
        decimals: 18,
      },
      {
        address: '0x8290333cef9e6d528dd5618fb97a76f268f3edd4',
        symbol: 'ANKR',
        name: 'Ankr Network',
        decimals: 18,
      },
      {
        address: '0xbb0e17ef65f82ab018d8edd776e8dd940327b28b',
        symbol: 'AXS',
        name: 'Axie Infinity Shard',
        decimals: 18,
      },
      {
        address: '0x0391D2021f89DC339F60Fff84546EA23E337750f',
        symbol: 'BOND',
        name: 'BarnBridge Governance Token',
        decimals: 18,
      },
      {
        address: '0x321c2fe4446c7c963dc41dd58879af648838f98d',
        symbol: 'CTX',
        name: 'Cryptex',
        decimals: 18,
      },
      {
        address: '0x4e15361fd6b4bb609fa63c81a2be19d873717870',
        symbol: 'FTM',
        name: 'Fantom Token',
        decimals: 18,
      },
      {
        address: '0xc944e90c64b2c07662a292be6244bdf05cda44a7',
        symbol: 'GRT',
        name: 'Graph Token',
        decimals: 18,
      },
      {
        address: '0xe28b3B32B6c345A34Ff64674606124Dd5Aceca30',
        symbol: 'INJ',
        name: 'Injective Token',
        decimals: 18,
      },
      {
        address: '0x58b6a8a3302369daec383334672404ee733ab239',
        symbol: 'LPT',
        name: 'Livepeer Token',
        decimals: 18,
      },
      {
        address: '0xfc98e825a2264d890f9a1e68ed50e1526abccacd',
        symbol: 'MCO2',
        name: 'Moss Carbon Credit',
        decimals: 18,
      },
      {
        address: '0x4575f41308EC1483f3d399aa9a2826d74Da13Deb',
        symbol: 'OXT',
        name: 'Orchid',
        decimals: 18,
      },
      {
        address: '0x3845badAde8e6dFF049820680d1F14bD3903a5d0',
        symbol: 'SAND',
        name: 'The Sandbox',
        decimals: 18,
      },
      {
        address: '0x00c83aecc790e8a4453e5dd3b0b4b3680501a7a7',
        symbol: 'SKALE',
        name: 'Skale',
        decimals: 18,
      },
      {
        address: '0xcc8fa225d80b9c7d42f96e9570156c65d6caaa25',
        symbol: 'SLP',
        name: 'Smooth Love Potion',
        decimals: 18,
      },
      {
        address: '0xdf801468a808a32656d2ed2d2d80b72a129739f4',
        symbol: 'CUBE',
        name: 'Somnium Space Cubes',
        decimals: 18,
      },
      {
        address: '0xb64ef51c888972c908cfacf59b47c1afbc0ab8ac',
        symbol: 'STORJ',
        name: 'Storj',
        decimals: 18,
      },
      {
        address: '0xd2877702675e6ceb975b4a1dff9fb7baf4c91ea9',
        symbol: 'LUNA',
        name: 'Wrapped LUNA Token',
        decimals: 18,
      },
      {
        address: '0x04Fa0d235C4abf4BcF4787aF4CF447DE572eF828',
        symbol: 'UMA',
        name: 'UMA Voting Token v1',
        decimals: 18,
      },
      {
        address: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
        symbol: 'UNI',
        name: 'Uniswap',
        decimals: 18,
      },
      {
        address: '0xc221b7e65ffc80de234bbb6667abdd46593d34f0',
        symbol: 'wCFG',
        name: 'Wrapped Centrifuge',
        decimals: 18,
      },
      {
        address: '0x18aAA7115705e8be94bfFEBDE57Af9BFc265B998',
        symbol: 'AUDIO',
        name: 'Audius',
        decimals: 18,
      },
      {
        address: '0x69af81e73a73b40adf4f3d4223cd9b1ece623074',
        symbol: 'MASK',
        name: 'Mask Network',
        decimals: 18,
      },
      {
        address: '0x31c8eacbffdd875c74b94b077895bd78cf1e64a3',
        symbol: 'RAD',
        name: 'Radicle',
        decimals: 18,
      },
      {
        address: '0x0b38210ea11411557c13457D4dA7dC6ea731B88a',
        symbol: 'API3',
        name: 'API3',
        decimals: 18,
      },
      {
        address: '0x71590d4ed14d9cbacb2cff8abf919ac4d22c5b7b',
        symbol: 'ASH',
        name: 'The Burn Token',
        decimals: 18,
      },
      {
        address: '0xba5bde662c17e2adff1075610382b9b691296350',
        symbol: 'RARE',
        name: 'SuperRare',
        decimals: 18,
      },
      {
        address: '0xaea46A60368A7bD060eec7DF8CBa43b7EF41Ad85',
        symbol: 'FET',
        name: 'Fetch',
        decimals: 18,
      },

      {
        name: 'GLO',
        symbol: 'GLO',
        address: '0x4f604735c1cf31399c6e711d5962b2b3e0225ad3',
        decimals: 18,
        isStableCoin: true,
      },
      {
        name: 'pyUSD',
        symbol: 'pyUSD',
        address: '0x6c3ea9036406852006290770BEdFcAbA0e23A0e8',
        decimals: 18,
        isStableCoin: true,
      },
      {
        name: 'mpETH',
        symbol: 'mpETH',
        address: '0x48afbbd342f64ef8a9ab1c143719b63c2ad81710',
        decimals: 18,
        isStableCoin: true,
        coingeckoId: 'mpeth',
      },
    ],
    ropsten: [
      {
        name: 'Ethereum native token',
        symbol: 'ETH',
        address: '0x0000000000000000000000000000000000000000',
        decimals: 18,
      },
      {
        address: '0xad6d458402f60fd3bd25163575031acdce07538d',
        symbol: 'DAI',
        name: 'DAI Ropsten',
        decimals: 18,
        isStableCoin: true,
      },
      {
        address: '0x067eA48882E6D728A37acfd1535ec03f8E33794a',
        symbol: 'YAY',
        name: 'Giveth Ropsten Test',
        decimals: 18,
      },
      {
        address: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
        symbol: 'UNI',
        name: 'UNI Ropsten',
        decimals: 18,
      },
    ],
    polygon: [
      {
        name: 'POLYGON native token',
        symbol: 'MATIC',
        address: '0x52459834ca561cb55411699e9c2143683bcf865f',
        decimals: 18,
      },

      {
        name: 'GLO',
        symbol: 'GLO',
        address: '0x4f604735c1cf31399c6e711d5962b2b3e0225ad3',
        decimals: 18,
        isStableCoin: true,
      },
    ],
    optimistic: [
      {
        name: 'OPTIMISTIC native token',
        symbol: 'ETH',
        address: '0x0000000000000000000000000000000000000000',
        decimals: 18,
      },
      {
        name: 'OPTIMISTIC OP token',
        symbol: 'OP',
        address: '0x4200000000000000000000000000000000000042',
        decimals: 18,
      },
      {
        name: 'GLO',
        symbol: 'GLO',
        address: '0x4f604735c1cf31399c6e711d5962b2b3e0225ad3',
        decimals: 18,
        isStableCoin: true,
      },
      {
        name: 'mpETH',
        symbol: 'mpETH',
        address: '0x819845b60a192167ed1139040b4f8eca31834f27',
        decimals: 18,
        isStableCoin: true,
        coingeckoId: 'mpeth',
      },
    ],
    etc: [
      {
        name: 'ETHEREUM CLASSIC native token',
        symbol: 'ETC',
        address: '0x0000000000000000000000000000000000000000',
        decimals: 18,
      },
      {
        name: 'Dai Stablecoin',
        symbol: 'DAI',
        address: '0x2C78f1b70Ccf63CDEe49F9233e9fAa99D43AA07e',
        decimals: 18,
      },
    ],
    morderEtc: [
      {
        name: 'ETHEREUM CLASSIC Testnet native token',
        symbol: 'mETC',
        address: '0x0000000000000000000000000000000000000000',
        decimals: 18,
      },
    ],
    optimism_sepolia: [
      {
        name: 'OPTIMISM native token',
        symbol: 'ETH',
        address: '0x0000000000000000000000000000000000000000',
        decimals: 18,
      },
    ],
    solana_mainnet: [
      {
        name: 'Solana native token',
        symbol: 'SOL',
        address: '11111111111111111111111111111111',
        decimals: 9,
      },
      {
        name: 'Marinade staked SOL',
        symbol: 'mSOL',
        address: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',
        decimals: 9,
      },
      {
        name: 'USDC',
        symbol: 'USDC',
        address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        decimals: 6,
      },
      {
        name: 'Tether',
        symbol: 'USDCT',
        address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
        decimals: 6,
      },
      {
        name: 'Raydium',
        symbol: 'RAY',
        address: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
        decimals: 6,
      },
      {
        name: 'BlazeStake Staked SOL',
        symbol: 'BSOL',
        address: 'bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1',
        decimals: 9,
      },
      {
        name: 'Audius (Wormhole)',
        symbol: 'AUDIO',
        address: '9LzCMqDgTKYz9Drzqnpgee3SGa89up3a247ypMj2xrqM',
        decimals: 8,
      },
      {
        name: 'Mango',
        symbol: 'MANGO',
        address: 'MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLac',
        decimals: 6,
      },
      {
        name: 'Coin98',
        symbol: 'C98',
        address: 'C98A4nkJXhpVZNAZdHUA95RpTF3T4whtQubL3YobiUX9',
        decimals: 6,
      },
    ],
    solana_devnet: [
      {
        name: 'Solana native token',
        symbol: 'SOL',
        address: '11111111111111111111111111111111',
        decimals: 9,
      },
      {
        name: 'TEST-SPL-TOKEN',
        symbol: 'TEST-SPL-TOKEN',
        address: 'BrEahxkTrCKfjVy36pLD2gvVoMCUMEb1PinrAFtvJqPX',
        decimals: 9,
      },
      {
        name: 'TEST-SPL-TOKEN2',
        symbol: 'TEST-SPL-TOKEN2',
        address: '8LDBhHJB7oMAjkJaetXa4njjetUVWDRTqvzkmhFQjgeK',
        decimals: 9,
      },
    ],
    solana_testnet: [
      {
        name: 'Solana native token',
        symbol: 'SOL',
        address: '11111111111111111111111111111111',
        decimals: 9,
      },
    ],
    goerli: [
      {
        name: 'Ethereum native token',
        symbol: 'ETH',
        address: '0x0000000000000000000000000000000000000000',
        decimals: 18,
      },
      {
        address: '0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60',
        symbol: 'DAI',
        name: 'DAI Goerli',
        decimals: 18,
        isStableCoin: true,
      },
      {
        address: '0xA2470F25bb8b53Bd3924C7AC0C68d32BF2aBd5be',
        symbol: 'DRGIV3',
        name: 'GIV test',
        decimals: 18,
      },
    ],
    xdai: [
      {
        name: 'XDAI native token',
        symbol: 'XDAI',
        address: '0x0000000000000000000000000000000000000000',
        decimals: 18,
        isStableCoin: true,
      },
      {
        name: 'Giveth Token',
        symbol: 'GIV',
        coingeckoId: 'giveth',
        address: '0x4f4F9b8D5B4d0Dc10506e5551B0513B61fD59e75',
        decimals: 18,
      },
      {
        address: '0x1337BedC9D22ecbe766dF105c9623922A27963EC',
        symbol: 'CRV',
        name: 'Curve DAO Token',
        decimals: 18,
      },
      {
        address: '0xc60e38C6352875c051B481Cbe79Dd0383AdB7817',
        symbol: 'XNODE',
        name: 'dAppNode on xDAI',
        decimals: 18,
      },
      {
        address: '0x981fb9ba94078a2275a8fc906898ea107b9462a8',
        symbol: 'PAN',
        name: 'Panvala',
        decimals: 18,
      },
      {
        address: '0x71850b7E9Ee3f13Ab46d67167341E4bDc905Eef9',
        symbol: 'HNY',
        name: 'Honey',
        decimals: 18,
      },
      {
        address: '0xb7D311E2Eb55F2f68a9440da38e7989210b9A05e',
        symbol: 'STAKE',
        name: 'STAKE on xDai',
        decimals: 18,
      },
      {
        address: '0xDDAfbb505ad214D7b80b1f830fcCc89B60fb7A83',
        symbol: 'USDC',
        name: 'USDC on xDai',
        decimals: 6,
      },
      {
        address: '0x6A023CCd1ff6F2045C3309768eAd9E68F978f6e1',
        symbol: 'WETH',
        name: 'Wrapped Ether on xDai',
        decimals: 18,
      },
      {
        address: '0xE2e73A1c69ecF83F464EFCE6A5be353a37cA09b2',
        symbol: 'LINK',
        name: 'ChainLink Token on xDai',
        decimals: 18,
      },
      {
        address: '0x1e16aa4Df73d29C029d94CeDa3e3114EC191E25A',
        symbol: 'xMOON',
        name: 'Moons on xDai',
        decimals: 18,
      },
      {
        address: '0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d',
        symbol: 'WXDAI',
        name: 'Wrapped XDAI',
        decimals: 18,
        isStableCoin: true,
      },
      {
        address: '0x4ECaBa5870353805a9F068101A40E0f32ed605C6',
        symbol: 'USDT',
        name: 'Tether USD on xDai',
        decimals: 6,
        isStableCoin: true,
      },
      {
        address: '0x8e5bBbb09Ed1ebdE8674Cda39A0c169401db4252',
        symbol: 'WBTC',
        name: 'Wrapped BTC on xDai',
        decimals: 8,
      },
      {
        address: '0x3a97704a1b25F08aa230ae53B352e2e72ef52843',
        symbol: 'AGVE',
        name: 'Agave Token',
        decimals: 18,
      },
      {
        address: '0x38Fb649Ad3d6BA1113Be5F57B927053E97fC5bF7',
        symbol: 'XCOMB',
        name: 'xDAI Native Comb',
        decimals: 18,
      },
      {
        address: '0xb0C5f3100A4d9d9532a4CfD68c55F1AE8da987Eb',
        symbol: 'HAUS',
        name: 'DAOhaus',
        decimals: 18,
      },
      {
        address: '0x21a42669643f45Bc0e086b8Fc2ed70c23D67509d',
        symbol: 'FOX',
        name: 'Fox Token',
        decimals: 18,
      },
      {
        address: '0x83FF60E2f93F8eDD0637Ef669C69D5Fb4f64cA8E',
        symbol: 'BRIGHT',
        name: 'Bright on xDAI',
        decimals: 18,
      },
    ],
    celo: [
      {
        symbol: 'CELO',
        name: 'Celo Native',
        address: '0x0000000000000000000000000000000000000000',
        // address: '0x471EcE3750Da237f93B8E339c536989b8978a438',
        decimals: 18,
      },
      {
        symbol: 'cUSD',
        name: 'Celo Dollar',
        address: '0x765DE816845861e75A25fCA122bb6898B8B1282a',
        decimals: 18,
        isStableCoin: true,
      },
      {
        symbol: 'cEUR',
        name: 'Celo Euro',
        address: '0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73',
        decimals: 18,
      },
      {
        symbol: 'cREAL',
        name: 'Celo Brazilian Real',
        address: '0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787',
        decimals: 18,
      },
      {
        name: 'GLO',
        symbol: 'GLO',
        address: '0x4f604735c1cf31399c6e711d5962b2b3e0225ad3',
        decimals: 18,
        isStableCoin: true,
      },
    ],
    celo_alfajores: [
      {
        symbol: 'CELO',
        name: 'Celo Native',
        address: '0x0000000000000000000000000000000000000000',
        // address: '0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9',
        decimals: 18,
      },
      {
        symbol: 'cUSD',
        name: 'Celo Dollar',
        address: '0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1',
        decimals: 18,
        isStableCoin: true,
      },
      {
        symbol: 'cEUR',
        name: 'Celo Euro',
        address: '0x10c892A6EC43a53E45D0B916B4b7D383B1b78C0F',
        decimals: 18,
      },
      {
        symbol: 'cREAL',
        name: 'Celo Brazilian Real',
        address: '0xE4D517785D091D3c54818832dB6094bcc2744545',
        decimals: 18,
      },
    ],
    arbitrum_mainnet: [
      {
        name: 'Arbitrum ETH',
        symbol: 'ETH',
        address: '0x0000000000000000000000000000000000000000',
        decimals: 18,
        coingeckoId: 'ethereum',
      },
      {
        name: 'usdt',
        symbol: 'USDT',
        address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
        decimals: 6,
        coingeckoId: 'tether',
      },
    ],
    arbitrum_sepolia: [
      {
        name: 'Arbitrum Sepolia native token',
        symbol: 'ETH',
        address: '0x0000000000000000000000000000000000000000',
        decimals: 18,
        coingeckoId: 'ethereum',
      },
      {
        name: 'Chromatic test Eth',
        symbol: 'cETH',
        address: '0x93252009E644138b906aE1a28792229E577239B9',
        decimals: 18,
        coingeckoId: 'weth',
      },
    ],
    base_mainnet: [
      {
        name: 'Base ETH',
        symbol: 'ETH',
        address: '0x0000000000000000000000000000000000000000',
        decimals: 18,
        coingeckoId: 'ethereum',
      },
    ],
    base_sepolia: [
      {
        name: 'Base Sepolia native token',
        symbol: 'ETH',
        address: '0x0000000000000000000000000000000000000000',
        decimals: 18,
        coingeckoId: 'ethereum',
      },
    ],
    zkevm_mainnet: [
      {
        name: 'ZKEVM ETH',
        symbol: 'ETH',
        address: '0x0000000000000000000000000000000000000000',
        decimals: 18,
        coingeckoId: 'ethereum',
      },
    ],
    zkevm_cardano: [
      {
        name: 'ZKEVM Cardano native token',
        symbol: 'ETH',
        address: '0x0000000000000000000000000000000000000000',
        decimals: 18,
        coingeckoId: 'ethereum',
      },
    ],
  },
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
    transactionId: generateRandomEvmTxHash(),
    transactionNetworkId: NETWORK_IDS.MAIN_NET,
    toWalletAddress: SEED_DATA.FIRST_PROJECT.walletAddress,
    fromWalletAddress: SEED_DATA.FIRST_USER.walletAddress,
    currency: 'GIV',
    anonymous: false,
    amount: 15,
    valueUsd: 15,
    userId: SEED_DATA.FIRST_USER.id,
    projectId: SEED_DATA.FIRST_PROJECT.id,
    createdAt: moment(),
    status: 'verified',
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
    amount: 100,
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
    valueUsd: 3,
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
    valueUsd: 2,
    userId: SEED_DATA.FIRST_USER.id,
    projectId: SEED_DATA.FIRST_PROJECT.id,
    createdAt: moment(),
    segmentNotified: false,
    transakStatus: 'COMPLETED',
  },
  FIFTH_DONATION: {
    id: 5,
    transactionId: generateRandomEtheriumAddress(),
    transactionNetworkId: NETWORK_IDS.MAIN_NET,
    toWalletAddress: SEED_DATA.FIRST_PROJECT.walletAddress,
    fromWalletAddress: SEED_DATA.THIRD_USER.walletAddress,
    currency: 'ETH',
    anonymous: false,
    amount: 1,
    valueUsd: 1,
    userId: SEED_DATA.THIRD_USER.id,
    projectId: SEED_DATA.FIRST_PROJECT.id,
    createdAt: moment().add(2, 'days'),
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
  segmentNotified?: boolean;
  amount: number;
  createdAt: any;
  valueUsd?: number;
  valueEth?: number;
  nonce?: number;
  // userId?: number;
  projectId?: number;
  status?: string;
  verified?: string;
  qfRoundId?: number;
  earlyAccessRoundId?: number;
  tokenAddress?: string;
  qfRoundUserScore?: number;
  useDonationBox?: boolean;
  relevantDonationTxHash?: string;
  donationPercentage?: number;
  blockNumber?: number;
}

export interface CategoryData {
  id?: number;
  value: string;
  name: string;
  isActive: boolean;
  mainCategory: MainCategory;
  source?: string;
}

export interface MainCategoryData {
  id?: number;
  banner: string;
  description: string;
  slug: string;
  title: string;
}

export const saveDonationDirectlyToDb = async (
  donationData: CreateDonationData,
  userId?: number,
  projectId?: number,
): Promise<Donation> => {
  if (userId) {
    const user = await findUserById(userId);
    donationData.fromWalletAddress = user?.walletAddress as string;
  }
  return Donation.create({
    ...donationData,
    userId,
    projectId,
  }).save();
};

export const saveCategoryDirectlyToDb = async (categoryData: CategoryData) => {
  return Category.create(categoryData as Category).save();
};

export const saveMainCategoryDirectlyToDb = async (
  mainCategoryData: MainCategoryData,
) => {
  return MainCategory.create({
    ...mainCategoryData,
  }).save();
};

export function generateRandomEtheriumAddress(): string {
  return `0x${generateHexNumber(40)}`;
}

export function generateRandomSolanaAddress(): string {
  return Keypair.generate().publicKey.toString();
}

export function generateRandomEvmTxHash(): string {
  return `0x${generateHexNumber(64)}`;
}

export function generateHexNumber(len): string {
  const hex = '0123456789abcdef';
  let output = '';
  /* eslint-disable no-plusplus */
  for (let i = 0; i < len; i++) {
    output += hex.charAt(Math.floor(Math.random() * hex.length));
  }
  return output;
}

function generateRandomAlphanumeric(length) {
  let result = '';
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

export function generateRandomSolanaTxHash() {
  // Random length between 86 and 88
  const length = Math.floor(Math.random() * 3) + 86;
  return generateRandomAlphanumeric(length);
}

// list of test cases titles that doesn't require DB interaction
export const dbIndependentTests = ['AdminJsPermissions'];

export const saveEARoundDirectlyToDb = async (
  roundData: Partial<EarlyAccessRound>,
): Promise<EarlyAccessRound> => {
  const round = EarlyAccessRound.create(roundData) as EarlyAccessRound;
  return round.save();
};

let nextQfRoundNumber = 1000;
export function generateQfRoundNumber(): number {
  return nextQfRoundNumber++;
}
let nextEARoundNumber = 1000;
export function generateEARoundNumber(): number {
  return nextEARoundNumber++;
}
