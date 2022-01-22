/**
 * For running this script you should add a production.env in your config folder and run this:
 *  NODE_ENV=production  ts-node src/scripts/findConflicts.ts
 *  after running script a fill will be generated in ./src/scripts with including json
 *  Then if you want to manually insert these donations to DB you should calculate valueUsd, ethUsd, userId,..
 *  And after that you use below query:
 */
//
// INSERT INTO public.donation ("transactionId", "transactionNetworkId", "toWalletAddress", "fromWalletAddress", currency,
//   anonymous, amount, "userId", "projectId", "createdAt", "valueUsd", "valuEth", "priceEth", "priceUsd", "status")
// values (transactionId, transactionNetworkId, toWalletAddress, fromWalletAddress, currency, anonymous, amount,
//   userId, projectId, createdAt, valueUsd, valuEth, priceEth, priceUsd, status)

import axios from 'axios';
import { getEtherscanOrBlockScoutUrl, NETWORK_IDS } from '../provider';
import { Container } from 'typedi';
import * as TypeORM from 'typeorm';
import { entities } from '../entities/entities';
import { Donation } from '../entities/donation';
import { Project } from '../entities/project';
import { sleep } from '../utils/utils';
import { writeFileSync } from 'fs';
import { findTokenByNetworkAndSymbol } from '../utils/tokenUtils';
import { isWalletAddressSmartContract } from '../utils/validators/projectValidator';
import { fetchGivHistoricPrice } from '../services/givPriceService';

const EXCLUDED_FROM_ADDRESSES = ['0x0000000000000000000000000000000000000000'];

const smartContractAddresses: string[] = [];

// 2022/01/07 16:00:00 GMT, beginning of round
const beginTimestamp = 1641571200;

// 2022/01/21 16:00:00 GMT, end of round
const endTimestamp = 1642780800;

interface Transaction {
  hash: string;
  blockNumber: number;
  timestamp: number;
  from: string;
  to: string;
  value: string;
  tokenSymbol: string;
  tokenDecimal: number;

  donationIdInOurDb?: number;
  statusInOurDb?: string;
}

setupDb().then(async () => {
  const missedDonations = await findMissedDonations();
  writeFileSync(
    `./src/scripts/transaction${new Date()}.json`,
    JSON.stringify(missedDonations, null, 4),
  );
  // tslint:disable-next-line:no-console
  console.log('missedDonations ', missedDonations);
});

async function setupDb() {
  TypeORM.useContainer(Container);
  // tslint:disable-next-line:no-console
  console.log('setupDb connections', {
    host: process.env.TYPEORM_DATABASE_HOST,
  });
  await TypeORM.createConnection({
    type: 'postgres',
    database: process.env.TYPEORM_DATABASE_NAME,
    username: process.env.TYPEORM_DATABASE_USER,
    password: process.env.TYPEORM_DATABASE_PASSWORD,
    port: Number(process.env.TYPEORM_DATABASE_PORT),
    host: process.env.TYPEORM_DATABASE_HOST,
    entities,
    logger: 'advanced-console',
    logging: ['error'],
    cache: true,
  });
}

async function findMissedDonations() {
  const projects = await Project.find({
    verified: true,
  });
  const walletAddresses = projects.map(project => {
    return project.walletAddress;
  });
  // tslint:disable-next-line:no-console
  console.log(
    'findMissedDonations walletAddresses.length',
    walletAddresses.length,
  );
  let transactions: Transaction[] = [];
  let i = 0;
  for (const project of projects) {
    i++;
    // tslint:disable-next-line:no-console
    console.log('project ', {
      id: project.id,
      index: i,
      title: project.title,
    });
    const xdaiWalletTransactions = await getTokenTransfers({
      networkId: NETWORK_IDS.XDAI,
      project,
    });
    // tslint:disable-next-line:no-console
    console.log('xdaiWalletTransactions', xdaiWalletTransactions);
    transactions = transactions.concat(xdaiWalletTransactions);

    const mainnetWalletTransactions = await getTokenTransfers({
      networkId: NETWORK_IDS.MAIN_NET,
      project,
    });
    transactions = transactions.concat(mainnetWalletTransactions);
    writeFileSync(
      './src/scripts/transaction.json',
      JSON.stringify(transactions, null, 4),
    );
    // tslint:disable-next-line:no-console
    console.log('missed transactions length', transactions.length);
  }
  return transactions;
}

async function getTokenTransfers(input: {
  networkId: number;
  project: Project;
}): Promise<Transaction[]> {
  const { networkId, project } = input;
  const walletAddress = project.walletAddress as string;
  const offset = 1000;
  let scanComplete = false;
  let page = 1;
  const transactions: Transaction[] = [];
  while (!scanComplete) {
    const userTransactions = await getListOfERC20TokenTransfers({
      address: walletAddress,
      page,
      offset,
      networkId,
    });
    // tslint:disable-next-line:no-console
    console.log('getListOfERC20TokenTransfers result', {
      transactions: userTransactions.walletTransactions.length,
      walletAddress,
      network: networkId === 1 ? 'mainnet' : 'xDai',
    });
    await sleep(500);
    if (userTransactions.isTransactionListEmpty) {
      scanComplete = true;
      break;
    }
    const promises: any[] = [];
    for (const transaction of userTransactions.walletTransactions) {
      promises.push(
        checkTransactionWithOurDonations(transaction, networkId, project),
      );
    }
    const result = await Promise.all(promises);
    for (const item of result) {
      if (item && item.outOfRange) {
        scanComplete = true;
      } else if (item && item.transaction) {
        const prices = await fetchGivHistoricPrice(
          item.transaction.hash,
          item.transaction.networkId,
        );
        transactions.push({
          ...item.transaction,
          projectId: project.id,
          amount:
            Number(item.transaction.value) /
            10 ** Number(item.transaction.tokenDecimal),
          givPrice: prices.givPriceInUsd,
          ethPrice: prices.ethPriceInUsd,
          projectLink: `https://giveth.io/project/${project.slug}`,
        });
      }
    }
    page++;
  }
  return transactions;
}

async function checkTransactionWithOurDonations(
  transaction: Transaction,
  networkId: number,
  project: Project,
): Promise<any> {
  try {
    if (transaction.timestamp < beginTimestamp) {
      return {
        outOfRange: true,
      };
    } else if (transaction.timestamp > endTimestamp) {
      const message = `Token is not is newer than time range ${transaction.tokenSymbol}  ${transaction.hash}`;
      // tslint:disable-next-line:no-console
      console.log('checkTransactionWithOurDonations() message', message);
      // token is not in time range
      return { message };
    } else if (
      !findTokenByNetworkAndSymbol(networkId, transaction.tokenSymbol)
    ) {
      const message = `Token is not whitelisted ${transaction.timestamp}  ${transaction.hash}`;
      // tslint:disable-next-line:no-console
      console.log('checkTransactionWithOurDonations() message', message);
      // token is not whitelisted
      return { message };
    }

    const isFromAddressAnSmartContract = await isWalletAddressSmartContract(
      transaction.from,
    );
    if (isFromAddressAnSmartContract) {
      smartContractAddresses.push(transaction.from.toLowerCase());
      throw new Error(
        'FromAddress is a smart contract address ' + transaction.from,
      );
    }
    const correspondingDonation = await Donation.findOne({
      transactionId: transaction.hash,
    });
    if (!correspondingDonation) {
      // tslint:disable-next-line:no-console
      console.log('Transaction is not in our DB ', {
        hash: transaction.hash,
        walletAddress: transaction.to,
        from: transaction.from,
        projectId: project.id,
      });
      return { transaction };
    } else if (correspondingDonation.status !== 'verified') {
      // tslint:disable-next-line:no-console
      console.log('Transaction is  in our DB, but not verified status ', {
        hash: transaction.hash,
        statusInOurDb: correspondingDonation.status,
        donationIdInOurDb: correspondingDonation.id,
        projectId: project.id,
      });

      return {
        transaction: {
          ...transaction,
          statusInOurDb: correspondingDonation.status,
          donationIdInOurDb: correspondingDonation.id,
        },
      };
    }
  } catch (e) {
    // tslint:disable-next-line:no-console
    console.log('checkTransactionWithOurDonations error', e.message);
    return {
      message: e.message,
    };
  }
}

async function getListOfERC20TokenTransfers(input: {
  networkId: number;
  address: string;
  page?: number;
  offset?: number;
}): Promise<{
  walletTransactions: Transaction[];
  isTransactionListEmpty: boolean;
}> {
  try {
    const { address, page, offset, networkId } = input;
    // https://docs.etherscan.io/api-endpoints/accounts#get-a-list-of-erc20-token-transfer-events-by-address
    // https://blockscout.com/xdai/mainnet/api-docs#account
    const result = await axios.get(getEtherscanOrBlockScoutUrl(networkId), {
      params: {
        module: 'account',
        action: 'tokentx',
        page: page || 1,
        offset: offset || 1000,
        address,
        sort: 'desc',
      },
      headers: {
        Cookie: 'network=dai',
      },
    });
    if (!result.data.result) {
      throw new Error(
        'Response of etherscan/blockscout has problem' +
          JSON.stringify(result.data, null, 4),
      );
    }
    const walletTransactions = result.data.result
      .filter(tx => {
        return (
          tx.to.toLowerCase() === input.address.toLowerCase() &&
          // If to and from is our smart contracts, it means it's for staking or swapping and we dont giv givback to smart contracts :))
          !smartContractAddresses.includes(tx.from.toLowerCase()) &&
          !EXCLUDED_FROM_ADDRESSES.includes(tx.from.toLowerCase())
        );
      })
      .map(tx => {
        // in this case we know it's a token transfer (smart contract call)
        return {
          hash: tx.hash,
          blockNumber: tx.blockNumber,
          timestamp: tx.timeStamp,
          from: tx.from,
          to: tx.to,
          value: tx.value,
          tokenSymbol: tx.tokenSymbol,
          tokenDecimal: tx.tokenDecimal,
          networkId,
          txLink:
            networkId === 1
              ? `https://etherscan.io/tx/${tx.hash}`
              : `https://blockscout.com/xdai/mainnet/tx/${tx.hash}`,
        };
      });
    return {
      walletTransactions,
      isTransactionListEmpty: result.data.result.length === 0,
    };
  } catch (e) {
    // tslint:disable-next-line:no-console
    console.log('getListOfERC20TokenTransfers() error', {
      error: e.message,
      input,
    });
    return {
      walletTransactions: [],

      // TO not try again
      isTransactionListEmpty: true,
    };
  }
}
