import { assert } from 'chai';
import * as jwt from 'jsonwebtoken';
import config from '../src/config';
import { NETWORK_IDS } from '../src/provider';
import { User, UserRole } from '../src/entities/user';
import { Donation } from '../src/entities/donation';
import {
  Category,
  Project,
  ProjStatus,
  ProjectUpdate,
} from '../src/entities/project';
import { ProjectStatus } from '../src/entities/projectStatus';
import {
  Organization,
  ORGANIZATION_LABELS,
} from '../src/entities/organization';
import { findUserByWalletAddress } from '../src/repositories/userRepository';

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

// Failed user case from undetected bug in the dapp, userId lost
export const generateUserIdLessAccessToken = async (
  id: number,
): Promise<string> => {
  const user = await User.findOne({ id });
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
  admin: string;
  walletAddress: string;
  categories: string[];
  verified?: boolean;
  listed?: boolean;
  giveBacks?: boolean;
  creationDate: Date;
  updatedAt: Date;
  statusId?: number;
  organizationLabel?: string;
  qualityScore?: number;
  totalDonations?: number;
  totalTraceDonations?: number;
  totalReactions?: number;
  totalProjectUpdates?: number;
  traceCampaignId?: string;
  image?: string;
}

export const saveUserDirectlyToDb = async (
  walletAddress: string,
): Promise<User> => {
  const user = await findUserByWalletAddress(walletAddress);
  if (user) {
    return user;
  }
  return User.create({
    loginType: 'wallet',
    walletAddress,
  }).save();
};
export const saveProjectDirectlyToDb = async (
  projectData: CreateProjectData,
): Promise<Project> => {
  const statusId = projectData?.statusId || ProjStatus.active;
  const status = await ProjectStatus.findOne({
    id: statusId,
  });
  const organizationLabel =
    projectData.organizationLabel || ORGANIZATION_LABELS.GIVETH;
  const organization = await Organization.findOne({
    label: organizationLabel,
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
    organization,
    categories,
    users: [user],
  }).save();

  // default projectUpdate for liking projects
  // this was breaking updateAt tests as it was running update hooks sometime in the future.
  // Found no other way to avoid triggering the hooks.
  await ProjectUpdate.query(`
    INSERT INTO public.project_update (
      "userId","projectId",content,title,"createdAt","isMain"
    ) VALUES (
      ${user.id}, ${project.id}, '', '', '${
    new Date().toISOString().split('T')[0]
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
  };
};
export const createDonationData = (): CreateDonationData => {
  return {
    transactionId: generateRandomTxHash(),
    transactionNetworkId: NETWORK_IDS.MAIN_NET,
    toWalletAddress: SEED_DATA.FIRST_PROJECT.walletAddress,
    fromWalletAddress: SEED_DATA.FIRST_USER.walletAddress,
    currency: 'ETH',
    anonymous: false,
    amount: 15,
    valueUsd: 15,
    createdAt: moment(),
    segmentNotified: true,
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
  PROJECT_OWNER_USER: {
    name: 'project owner user',
    lastName: 'projectOwner lastName',
    loginType: 'wallet',
    id: 5,
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
      name: 'Giving Block',
      label: ORGANIZATION_LABELS.GIVING_BLOCK,
      website: 'https://thegivingblock.com',
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
    xdai: [
      {
        name: 'XDAI native token',
        symbol: 'XDAI',
        address: '0x0000000000000000000000000000000000000000',
        decimals: 18,
      },
      {
        name: 'Giveth Token',
        symbol: 'GIV',
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
      },
      {
        address: '0x4ECaBa5870353805a9F068101A40E0f32ed605C6',
        symbol: 'USDT',
        name: 'Tether USD on xDai',
        decimals: 6,
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
    transactionId: generateRandomTxHash(),
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
  // userId?: number;
  projectId?: number;
  status?: string;
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
export function generateRandomTxHash(): string {
  return `0x${generateHexNumber(64)}`;
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
