import { assert } from 'chai';
import * as jwt from 'jsonwebtoken';
import config from '../src/config';
import { User } from '../src/entities/user';

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

export const serverErrorMessages = {
  // ACCESS_DENIED: 'Access denied',
};

export const generateTestAccessToken = async (id: number): Promise<string> => {
  const user = await User.findOne({ id });
  return jwt.sign(
    { userId: id, firstName: user?.firstName },
    config.get('JWT_SECRET') as string,
    { expiresIn: '30d' },
  );
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
  FIRST_PROJECT: {
    id: 1,
    title: `first project`,
    description: 'test description',
    admin: '1',
    walletAddress: generateRandomEtheriumAddress(),
    categories: [],
    verified: true,
    listed: true,
    giveBacks: false,
    creationDate: new Date(),
    slug: 'first-project',
    slugHistory: [],
    qualityScore: 30,
    totalDonations: 0,
    totalReactions: 0,
    totalProjectUpdates: 1,
  },
  SECOND_PROJECT: {
    id: 2,
    title: `second project`,
    description: 'test description',
    admin: '2',
    walletAddress: generateRandomEtheriumAddress(),
    categories: [],
    verified: true,
    listed: true,
    giveBacks: false,
    creationDate: new Date(),
    slug: 'second-project',
    slugHistory: [],
    qualityScore: 30,
    totalDonations: 0,
    totalReactions: 0,
    totalProjectUpdates: 1,
  },
  CATEGORIES: ['food1', 'food2', 'food3', 'food4', 'food5', 'food6', 'food7'],

  STATUSES: [
    // Orders are important, because id of active status should be 5, I know it's very bad :)
    {
      symbol: 'rjt',
      name: 'rejected',
      description: 'rejected description',
    },
    {
      symbol: 'pen',
      name: 'pending',
      description: 'pending description',
    },
    {
      symbol: 'clr',
      name: 'clarificaiton',
      description: 'clarificaiton description',
    },
    {
      symbol: 'ver',
      name: 'verification',
      description: 'verification description',
    },
    {
      symbol: 'act',
      name: 'active',
      description: 'active description',
    },
    {
      symbol: 'can',
      name: 'cancelled',
      description: 'cancelled description',
    },
    {
      symbol: 'del',
      name: 'delisted',
      description: 'delisted description',
    },
  ],
  DAI_SMART_CONTRACT_ADDRESS: '0x6b175474e89094c44da98b954eedeac495271d0f',
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
