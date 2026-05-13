import { assert } from 'chai';
import moment from 'moment';
import { Donation, DONATION_STATUS } from '../entities/donation';
import { Token } from '../entities/token';
import { NETWORK_IDS } from '../provider';
import { ChainType } from '../types/network';
import {
  createDonationData,
  createProjectData,
  generateRandomEtheriumAddress,
  generateRandomEvmTxHash,
  saveProjectDirectlyToDb,
  saveRecurringDonationDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../test/testUtils';
import { exportEligibleDonations } from './givbacksEligibleDonationsCsvService';

const parseCsv = (csvContent: string): Record<string, string>[] => {
  const parsedRows: string[][] = [];
  let currentRow: string[] = [];
  let currentValue = '';
  let isInsideQuotes = false;

  for (let index = 0; index < csvContent.length; index += 1) {
    const character = csvContent[index];

    if (isInsideQuotes) {
      if (character === '"') {
        if (csvContent[index + 1] === '"') {
          currentValue += '"';
          index += 1;
        } else {
          isInsideQuotes = false;
        }
      } else {
        currentValue += character;
      }

      continue;
    }

    if (character === '"') {
      isInsideQuotes = true;
      continue;
    }

    if (character === ',') {
      currentRow.push(currentValue);
      currentValue = '';
      continue;
    }

    if (character === '\n' || character === '\r') {
      if (character === '\r' && csvContent[index + 1] === '\n') {
        index += 1;
      }

      currentRow.push(currentValue);
      parsedRows.push(currentRow);
      currentRow = [];
      currentValue = '';
      continue;
    }

    currentValue += character;
  }

  if (currentRow.length > 0 || currentValue.length > 0) {
    currentRow.push(currentValue);
    parsedRows.push(currentRow);
  }

  const [headers, ...rows] = parsedRows;

  return rows
    .filter(row => row.some(value => value.trim().length > 0))
    .map(row => {
      return headers.reduce<Record<string, string>>((record, header, index) => {
        record[header] = row[index] || '';
        return record;
      }, {});
    });
};

describe(
  'givbacksEligibleDonationsCsvService',
  givbacksEligibleDonationsCsvServiceTestCases,
);

function givbacksEligibleDonationsCsvServiceTestCases() {
  it('exports regular and recurring donations with recurring parent hash', async () => {
    const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(`export-test-${Date.now()}`),
      networkId: NETWORK_IDS.OPTIMISTIC,
      chainType: ChainType.EVM,
    });
    const tokenAddress = generateRandomEtheriumAddress();

    await Token.create({
      name: 'Export Test DAI',
      symbol: 'DAI',
      address: tokenAddress,
      networkId: NETWORK_IDS.OPTIMISTIC,
      chainType: ChainType.EVM,
      decimals: 18,
      isGivbackEligible: true,
    }).save();

    const regularDonation = await Donation.create({
      ...createDonationData({
        status: DONATION_STATUS.VERIFIED,
        valueUsd: 5,
        createdAt: moment.utc('2026-04-01').toDate(),
      }),
      transactionId: generateRandomEvmTxHash(),
      transactionNetworkId: NETWORK_IDS.OPTIMISTIC,
      toWalletAddress: project.walletAddress,
      fromWalletAddress: donor.walletAddress,
      currency: 'DAI',
      amount: 5,
      valueUsd: 5,
      priceUsd: 1,
      project,
      projectId: project.id,
      user: donor,
      userId: donor.id,
      tokenAddress,
      chainType: ChainType.EVM,
      isProjectGivbackEligible: true,
      givbackFactor: 2,
    }).save();

    const parentHash = generateRandomEvmTxHash();
    const recurringDonation = await saveRecurringDonationDirectlyToDb({
      donationData: {
        projectId: project.id,
        donorId: donor.id,
        txHash: parentHash,
        networkId: NETWORK_IDS.OPTIMISTIC,
        currency: 'DAI',
      },
    });
    const firstPeriodStart = moment.utc('2026-04-01').unix();
    const firstPeriodEnd = moment.utc('2026-04-02').unix();
    const secondPeriodStart = moment.utc('2026-04-02').unix();
    const secondPeriodEnd = moment.utc('2026-04-03').unix();

    await Donation.create({
      ...createDonationData({
        status: DONATION_STATUS.VERIFIED,
        valueUsd: 2,
        createdAt: moment.utc('2026-04-02').toDate(),
      }),
      transactionId: generateRandomEvmTxHash(),
      transactionNetworkId: NETWORK_IDS.OPTIMISTIC,
      toWalletAddress: project.walletAddress,
      fromWalletAddress: donor.walletAddress,
      currency: 'DAI',
      amount: 2,
      valueUsd: 2,
      priceUsd: 1,
      project,
      projectId: project.id,
      user: donor,
      userId: donor.id,
      tokenAddress,
      chainType: ChainType.EVM,
      isProjectGivbackEligible: true,
      givbackFactor: 2,
      recurringDonation,
      recurringDonationId: recurringDonation.id,
      virtualPeriodStart: firstPeriodStart,
      virtualPeriodEnd: firstPeriodEnd,
    }).save();

    await Donation.create({
      ...createDonationData({
        status: DONATION_STATUS.VERIFIED,
        valueUsd: 2.25,
        createdAt: moment.utc('2026-04-03').toDate(),
      }),
      transactionId: generateRandomEvmTxHash(),
      transactionNetworkId: NETWORK_IDS.OPTIMISTIC,
      toWalletAddress: project.walletAddress,
      fromWalletAddress: donor.walletAddress,
      currency: 'DAI',
      amount: 2.25,
      valueUsd: 2.25,
      priceUsd: 1,
      project,
      projectId: project.id,
      user: donor,
      userId: donor.id,
      tokenAddress,
      chainType: ChainType.EVM,
      isProjectGivbackEligible: true,
      givbackFactor: 2,
      recurringDonation,
      recurringDonationId: recurringDonation.id,
      virtualPeriodStart: secondPeriodStart,
      virtualPeriodEnd: secondPeriodEnd,
    }).save();

    const result = await exportEligibleDonations({
      projectId: project.id,
      isEligibleForGivbacks: true,
    });
    const rows = parseCsv(result.csvContent);
    const recurringRow = rows.find(
      row => row.transactionId === `recurring-${recurringDonation.id}`,
    );
    const regularRow = rows.find(
      row => row.transactionId === regularDonation.transactionId,
    );

    assert.equal(result.totalDonations, 2);
    if (!recurringRow) assert.fail('recurring row not found');
    assert.equal(recurringRow.amount, '4.25');
    assert.equal(recurringRow.valueUsd, '4.25');
    assert.equal(recurringRow.valueUsdAfterGivbackFactor, '8.5');
    assert.equal(
      recurringRow.legacyRecurringDonationId,
      String(recurringDonation.id),
    );
    assert.equal(recurringRow.parentRecurringDonationTxHash, parentHash);
    assert.equal(
      recurringRow.legacyVirtualPeriodStart,
      '2026-04-01T00:00:00.000Z',
    );
    assert.equal(
      recurringRow.legacyVirtualPeriodEnd,
      '2026-04-03T00:00:00.000Z',
    );
    assert.equal(recurringRow.isEligibleForGivbacks, 'true');

    if (!regularRow) assert.fail('regular row not found');
    assert.equal(regularRow.amount, '5');
    assert.equal(regularRow.valueUsd, '5');
    assert.equal(regularRow.valueUsdAfterGivbackFactor, '10');
    assert.equal(regularRow.isEligibleForGivbacks, 'true');
  });
}
