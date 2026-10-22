import { assert } from 'chai';
import moment from 'moment';
import sinon from 'sinon';
import {
  createProjectData,
  generateRandomEtheriumAddress,
  generateRandomEvmTxHash,
  saveProjectDirectlyToDb,
  saveRecurringDonationDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../test/testUtils';
import {
  assertStreamMatchesRecurringDonation,
  createRelatedDonationsToStream,
  getStreamSyncLockKey,
  reconcileRecurringDonationStatusWithNetwork,
  updateRecurringDonationStatusWithNetwork,
  withRecurringDonationSyncLock,
} from './recurringDonationService';
import { LEASE_REDIS_OP_TIMEOUT_MS, redis } from '../redis';
import { SuperFluidAdapter } from '../adapters/superFluid/superFluidAdapter';
import { SuperFluidMockAdapter } from '../adapters/superFluid/superFluidMockAdapter';
import { errorMessages } from '../utils/errorMessages';
import { sleep } from '../utils/utils';
import {
  RecurringDonationSyncLockedError,
  STREAM_SYNC_LOCK_RETRY_DELAY_MS,
  updateRecurringDonationStream,
} from './recurringDonationStreamQueue';
import { Donation } from '../entities/donation';
import { addNewAnchorAddress } from '../repositories/anchorContractAddressRepository';
import { NETWORK_IDS } from '../provider';
import {
  RECURRING_DONATION_STATUS,
  RecurringDonation,
} from '../entities/recurringDonation';
import { AnchorContractAddress } from '../entities/anchorContractAddress';
import { findRecurringDonationById } from '../repositories/recurringDonationRepository';
import { QfRound } from '../entities/qfRound';
import { Token } from '../entities/token';
import { ProjectQfRound } from '../entities/projectQfRound';

describe(
  'createRelatedDonationsToStream test cases',
  createRelatedDonationsToStreamTestCases,
);

describe(
  'updateRecurringDonationStatusWithNetwork test cases',
  updateRecurringDonationStatusWithNetworkTestCases,
);

describe(
  'QF Smart Select with Recurring Donations test cases',
  qfSmartSelectTestCases,
);

describe(
  'assertStreamMatchesRecurringDonation test cases',
  assertStreamMatchesRecurringDonationTestCases,
);

describe(
  'reconcileRecurringDonationStatusWithNetwork test cases',
  reconcileRecurringDonationStatusWithNetworkTestCases,
);

describe(
  'withRecurringDonationSyncLock test cases',
  withRecurringDonationSyncLockTestCases,
);

describe(
  'updateRecurringDonationStream (daily job) test cases',
  updateRecurringDonationStreamTestCases,
);

function updateRecurringDonationStatusWithNetworkTestCases() {
  it('should verify transaction from OP Sepolia #1 createFlow', async () => {
    // https://sepolia-optimism.etherscan.io/tx/0x516567c51c3506afe1291f7055fa0e858cc2ca9ed4079625c747fe92bd125a10
    const projectOwner = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const project = await saveProjectDirectlyToDb(
      createProjectData(),
      projectOwner,
    );
    const contractCreator = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );

    const donor = await saveUserDirectlyToDb(
      '0x871cd6353b803ceceb090bb827ecb2f361db81ab',
    );

    const anchorContractAddress = await addNewAnchorAddress({
      project,
      owner: projectOwner,
      creator: contractCreator,
      address: '0x1190f5ac0f509d8f3f4b662bf17437d37d64527c',
      networkId: NETWORK_IDS.OPTIMISM_SEPOLIA,
      txHash: generateRandomEvmTxHash(),
    });

    const recurringDonation = await saveRecurringDonationDirectlyToDb({
      donationData: {
        projectId: project.id,
        anchorContractAddressId: anchorContractAddress.id,
        currency: 'ETH',
        status: RECURRING_DONATION_STATUS.PENDING,
        txHash:
          '0x516567c51c3506afe1291f7055fa0e858cc2ca9ed4079625c747fe92bd125a10',
        donorId: donor.id,
        flowRate: '285225986',
      },
    });
    const updatedDonation = await updateRecurringDonationStatusWithNetwork({
      donationId: recurringDonation.id,
    });
    assert.equal(updatedDonation.status, RECURRING_DONATION_STATUS.ACTIVE);
    await RecurringDonation.delete({ id: recurringDonation.id });
    await AnchorContractAddress.delete({ id: anchorContractAddress.id });
  });

  it('should verify transaction from OP Sepolia #2 batchCall', async () => {
    // https://sepolia-optimism.etherscan.io/tx/0x1833603bc894448b54cf9c03483fa361508fa101abcfa6c3b6ef51425cab533f
    const projectOwner = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const project = await saveProjectDirectlyToDb(
      createProjectData(),
      projectOwner,
    );
    const contractCreator = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );

    const donor = await saveUserDirectlyToDb(
      '0xa1179f64638adb613ddaac32d918eb6beb824104',
    );

    const anchorContractAddress = await addNewAnchorAddress({
      project,
      owner: projectOwner,
      creator: contractCreator,
      address: '0xe6375bc298aEB29D173B2AB359D492439A43b268',
      networkId: NETWORK_IDS.OPTIMISM_SEPOLIA,
      txHash: generateRandomEvmTxHash(),
    });

    const recurringDonation = await saveRecurringDonationDirectlyToDb({
      donationData: {
        projectId: project.id,
        anchorContractAddressId: anchorContractAddress.id,
        currency: 'ETH',
        status: RECURRING_DONATION_STATUS.PENDING,
        txHash:
          '0x1833603bc894448b54cf9c03483fa361508fa101abcfa6c3b6ef51425cab533f',
        donorId: donor.id,
        flowRate: '152207001',
        isBatch: true,
      },
    });
    const updatedDonation = await updateRecurringDonationStatusWithNetwork({
      donationId: recurringDonation.id,
    });
    assert.equal(updatedDonation.status, RECURRING_DONATION_STATUS.ACTIVE);
    await RecurringDonation.delete({ id: recurringDonation.id });
    await AnchorContractAddress.delete({ id: anchorContractAddress.id });
  });

  it('should verify transaction from OP Sepolia when updateFlow function of smart contract has been called', async () => {
    // https://sepolia-optimism.etherscan.io/tx/0x74d98ba95c7969746afc38e46748aa64f239e816785be74b03372397cf844986
    const projectOwner = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const project = await saveProjectDirectlyToDb(
      createProjectData(),
      projectOwner,
    );
    const contractCreator = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );

    const donor = await saveUserDirectlyToDb(
      '0xf577ae8b97d839b9c0522a620299dc08792c738c',
    );

    const anchorContractAddress = await addNewAnchorAddress({
      project,
      owner: projectOwner,
      creator: contractCreator,
      address: '0x0015cE4FeA643B64000400B0e61F4C03E020b75f',
      networkId: NETWORK_IDS.OPTIMISM_SEPOLIA,
      txHash: generateRandomEvmTxHash(),
    });

    const recurringDonation = await saveRecurringDonationDirectlyToDb({
      donationData: {
        projectId: project.id,
        anchorContractAddressId: anchorContractAddress.id,
        currency: 'ETH',
        status: RECURRING_DONATION_STATUS.PENDING,
        txHash:
          '0x74d98ba95c7969746afc38e46748aa64f239e816785be74b03372397cf844986',
        donorId: donor.id,
        flowRate: '23194526400669',
      },
    });
    const updatedDonation = await updateRecurringDonationStatusWithNetwork({
      donationId: recurringDonation.id,
    });
    assert.equal(updatedDonation.status, RECURRING_DONATION_STATUS.ACTIVE);
    await RecurringDonation.delete({ id: recurringDonation.id });
    await AnchorContractAddress.delete({ id: anchorContractAddress.id });
  });
  it.skip('should remain pending, different toAddress from OP Sepolia', async () => {
    //Because in mock adapter we always the sender address, so it should not remain pending and we have to skip this test case
    // https://sepolia-optimism.etherscan.io/tx/0x516567c51c3506afe1291f7055fa0e858cc2ca9ed4079625c747fe92bd125a10
    const projectOwner = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const project = await saveProjectDirectlyToDb(
      createProjectData(),
      projectOwner,
    );
    const contractCreator = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );

    const donor = await saveUserDirectlyToDb(
      '0x871cd6353b803ceceb090bb827ecb2f361db81ab',
    );

    const anchorContractAddress = await addNewAnchorAddress({
      project,
      owner: projectOwner,
      creator: contractCreator,
      address: generateRandomEtheriumAddress(),
      networkId: NETWORK_IDS.OPTIMISM_SEPOLIA,
      txHash: generateRandomEvmTxHash(),
    });

    const recurringDonation = await saveRecurringDonationDirectlyToDb({
      donationData: {
        projectId: project.id,
        anchorContractAddressId: anchorContractAddress.id,
        currency: 'ETH',
        status: RECURRING_DONATION_STATUS.PENDING,
        txHash:
          '0x516567c51c3506afe1291f7055fa0e858cc2ca9ed4079625c747fe92bd125a10',
        donorId: donor.id,
        flowRate: '285225986',
      },
    });
    const updatedDonation = await updateRecurringDonationStatusWithNetwork({
      donationId: recurringDonation.id,
    });
    assert.equal(updatedDonation.status, RECURRING_DONATION_STATUS.PENDING);

    await RecurringDonation.delete({ id: recurringDonation.id });
    await AnchorContractAddress.delete({ id: anchorContractAddress.id });
  });
  it.skip('should  donation remain pending, different amount from OP Sepolia', async () => {
    //Because in mock adapter we always the sender address, so it should not remain pending and we have to skip this test case
    // https://sepolia-optimism.etherscan.io/tx/0x516567c51c3506afe1291f7055fa0e858cc2ca9ed4079625c747fe92bd125a10
    const projectOwner = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const project = await saveProjectDirectlyToDb(
      createProjectData(),
      projectOwner,
    );
    const contractCreator = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );

    const donor = await saveUserDirectlyToDb(
      '0x871cd6353b803ceceb090bb827ecb2f361db81ab',
    );

    const anchorContractAddress = await addNewAnchorAddress({
      project,
      owner: projectOwner,
      creator: contractCreator,
      address: generateRandomEtheriumAddress(),
      networkId: NETWORK_IDS.OPTIMISM_SEPOLIA,
      txHash: generateRandomEvmTxHash(),
    });

    const recurringDonation = await saveRecurringDonationDirectlyToDb({
      donationData: {
        projectId: project.id,
        anchorContractAddressId: anchorContractAddress.id,
        currency: 'ETH',
        status: RECURRING_DONATION_STATUS.PENDING,
        txHash:
          '0x516567c51c3506afe1291f7055fa0e858cc2ca9ed4079625c747fe92bd125a10',
        donorId: donor.id,
        flowRate: '10000000',
      },
    });
    const updatedDonation = await updateRecurringDonationStatusWithNetwork({
      donationId: recurringDonation.id,
    });
    assert.equal(updatedDonation.status, RECURRING_DONATION_STATUS.PENDING);

    await RecurringDonation.delete({ id: recurringDonation.id });
    await AnchorContractAddress.delete({ id: anchorContractAddress.id });
  });
}

function createRelatedDonationsToStreamTestCases() {
  // TODO As I changed superFluid adapter to user staging address
  // And return not mockAdapter in test more this test is not valid anymore
  // I will skip it for now but we will keep it here for future reference
  it.skip('should search by the currency', async () => {
    const projectOwner = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const project = await saveProjectDirectlyToDb(
      createProjectData(),
      projectOwner,
    );
    const contractCreator = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );

    const anchorContractAddress = await addNewAnchorAddress({
      project,
      owner: projectOwner,
      creator: contractCreator,
      address: generateRandomEtheriumAddress(),
      networkId: NETWORK_IDS.OPTIMISTIC,
      txHash: generateRandomEvmTxHash(),
    });

    const recurringDonation = await saveRecurringDonationDirectlyToDb({
      donationData: {
        projectId: project.id,
        anchorContractAddressId: anchorContractAddress.id,
        currency: 'Daix',
        status: 'pending',
      },
    });

    const recurringDonationWithAnchorContract = await findRecurringDonationById(
      recurringDonation.id,
    );

    await createRelatedDonationsToStream(recurringDonationWithAnchorContract!);

    const recurringDonationUpdated = await findRecurringDonationById(
      recurringDonationWithAnchorContract!.id,
    );

    const donations = await Donation.createQueryBuilder('donation')
      .where(`donation."recurringDonationId" = :recurringDonationId`, {
        recurringDonationId: recurringDonationWithAnchorContract!.id,
      })
      .getMany();

    // STREAM TEST DATA HAS ENDED STATUS
    assert.equal(
      recurringDonationUpdated?.status,
      RECURRING_DONATION_STATUS.ENDED,
    );
    assert.equal(donations.length, 4);
    assert.equal(true, true); // its not saving the recurring donation Id, saving as null
    // add more tests, define criteria for verified
  });
}

function qfSmartSelectTestCases() {
  describe('Integration with createRelatedDonationsToStream', () => {
    it('should create mini-donations with correct QF round when smart select succeeds', async () => {
      // Set environment to use mock adapter
      const originalSuperFluidAdapter = process.env.SUPER_FLUID_ADAPTER;
      process.env.SUPER_FLUID_ADAPTER = 'mock';

      try {
        const projectOwner = await saveUserDirectlyToDb(
          generateRandomEtheriumAddress(),
        );
        const project = await saveProjectDirectlyToDb(
          createProjectData(),
          projectOwner,
        );

        const contractCreator = await saveUserDirectlyToDb(
          generateRandomEtheriumAddress(),
        );

        const donor = await saveUserDirectlyToDb(
          generateRandomEtheriumAddress(),
        );

        // Create anchor contract
        const anchorContractAddress = await addNewAnchorAddress({
          project,
          owner: projectOwner,
          creator: contractCreator,
          address: generateRandomEtheriumAddress(),
          networkId: NETWORK_IDS.OPTIMISM_SEPOLIA,
          txHash: generateRandomEvmTxHash(),
        });

        // Find or create DAI token for the test
        let daiToken = await Token.findOne({
          where: {
            symbol: 'DAI',
            networkId: NETWORK_IDS.OPTIMISM_SEPOLIA,
          },
        });

        if (!daiToken) {
          daiToken = await Token.create({
            symbol: 'DAI',
            name: 'Dai Stablecoin',
            address: '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063',
            networkId: NETWORK_IDS.OPTIMISM_SEPOLIA,
            isGivbackEligible: true,
            decimals: 18,
          }).save();
        }

        // Create QF round
        const qfRound = await QfRound.create({
          isActive: true,
          name: 'Test QF Round',
          allocatedFund: 100000,
          allocatedFundUSD: 50000,
          minimumPassportScore: 8,
          slug: `${new Date().getTime()}-1`,
          beginDate: new Date(),
          endDate: moment().add(30, 'days').toDate(),
          eligibleNetworks: [NETWORK_IDS.OPTIMISM_SEPOLIA],
          priority: 1,
        }).save();

        project.qfRounds = [qfRound];
        await project.save();

        // Create recurring donation
        const recurringDonation = await saveRecurringDonationDirectlyToDb({
          donationData: {
            donorId: donor.id,
            projectId: project.id,
            anchorContractAddressId: anchorContractAddress.id,
            flowRate: '1000000000000000000', // 1 token per second
            currency: 'DAIx', // Use DAIx to match mock adapter
            status: RECURRING_DONATION_STATUS.ACTIVE,
            networkId: NETWORK_IDS.OPTIMISM_SEPOLIA,
          },
        });

        // Get the recurring donation with relations
        const recurringDonationWithRelations = await findRecurringDonationById(
          recurringDonation.id,
        );

        // Call the function
        await createRelatedDonationsToStream(recurringDonationWithRelations!);

        // Verify that donations were created with the correct QF round
        const donations = await Donation.find({
          where: {
            recurringDonationId: recurringDonation.id,
          },
        });

        assert.equal(donations.length, 4); // Mock adapter returns 4 virtual periods
        const donation = donations[0];
        assert.equal(donation.qfRoundId, qfRound.id);
        assert.equal(donation.projectId, project.id);
        assert.equal(donation.currency, 'DAI');

        // Cleanup
        await Donation.delete({ recurringDonationId: recurringDonation.id });
        await RecurringDonation.delete({ id: recurringDonation.id });
        await AnchorContractAddress.delete({ id: anchorContractAddress.id });
        qfRound.isActive = false;
        await qfRound.save();
      } finally {
        // Restore original environment
        if (originalSuperFluidAdapter) {
          process.env.SUPER_FLUID_ADAPTER = originalSuperFluidAdapter;
        } else {
          delete process.env.SUPER_FLUID_ADAPTER;
        }
      }
    });

    it('should fall back to old logic when smart select fails (no eligible QF rounds)', async () => {
      // Set environment to use mock adapter
      const originalSuperFluidAdapter = process.env.SUPER_FLUID_ADAPTER;
      process.env.SUPER_FLUID_ADAPTER = 'mock';

      try {
        const projectOwner = await saveUserDirectlyToDb(
          generateRandomEtheriumAddress(),
        );
        const project = await saveProjectDirectlyToDb(
          createProjectData(),
          projectOwner,
        );

        const contractCreator = await saveUserDirectlyToDb(
          generateRandomEtheriumAddress(),
        );

        const donor = await saveUserDirectlyToDb(
          generateRandomEtheriumAddress(),
        );

        // Create anchor contract
        const anchorContractAddress = await addNewAnchorAddress({
          project,
          owner: projectOwner,
          creator: contractCreator,
          address: generateRandomEtheriumAddress(),
          networkId: NETWORK_IDS.OPTIMISM_SEPOLIA,
          txHash: generateRandomEvmTxHash(),
        });

        // Find or create DAI token for the test
        let daiToken = await Token.findOne({
          where: {
            symbol: 'DAI',
            networkId: NETWORK_IDS.OPTIMISM_SEPOLIA,
          },
        });

        if (!daiToken) {
          daiToken = await Token.create({
            symbol: 'DAI',
            name: 'Dai Stablecoin',
            address: '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063',
            networkId: NETWORK_IDS.OPTIMISM_SEPOLIA,
            isGivbackEligible: true,
            decimals: 18,
          }).save();
        }

        // Create QF round that's not eligible for the network
        const qfRound = await QfRound.create({
          isActive: true,
          name: 'Ineligible QF Round',
          allocatedFund: 100000,
          allocatedFundUSD: 50000,
          minimumPassportScore: 8,
          slug: `${new Date().getTime()}-1`,
          beginDate: new Date(),
          endDate: moment().add(30, 'days').toDate(),
          eligibleNetworks: [NETWORK_IDS.MAIN_NET], // Different network
          priority: 1,
        }).save();

        project.qfRounds = [qfRound];
        await project.save();

        // Create recurring donation
        const recurringDonation = await saveRecurringDonationDirectlyToDb({
          donationData: {
            donorId: donor.id,
            projectId: project.id,
            anchorContractAddressId: anchorContractAddress.id,
            flowRate: '1000000000000000000', // 1 token per second
            currency: 'DAIx', // Use DAIx to match mock adapter
            status: RECURRING_DONATION_STATUS.ACTIVE,
            networkId: NETWORK_IDS.OPTIMISM_SEPOLIA,
          },
        });

        // Get the recurring donation with relations
        const recurringDonationWithRelations = await findRecurringDonationById(
          recurringDonation.id,
        );

        // Call the function
        await createRelatedDonationsToStream(recurringDonationWithRelations!);

        // Verify that donations were created but without QF round (fallback to old logic)
        const donations = await Donation.find({
          where: {
            recurringDonationId: recurringDonation.id,
          },
        });

        assert.equal(donations.length, 4); // Mock adapter returns 4 virtual periods
        const donation = donations[0];
        assert.equal(donation.qfRoundId, null); // Should be null due to fallback
        assert.equal(donation.projectId, project.id);
        assert.equal(donation.currency, 'DAI');

        // Cleanup
        await Donation.delete({ recurringDonationId: recurringDonation.id });
        await RecurringDonation.delete({ id: recurringDonation.id });
        await AnchorContractAddress.delete({ id: anchorContractAddress.id });
        qfRound.isActive = false;
        await qfRound.save();
      } finally {
        // Restore original environment
        if (originalSuperFluidAdapter) {
          process.env.SUPER_FLUID_ADAPTER = originalSuperFluidAdapter;
        } else {
          delete process.env.SUPER_FLUID_ADAPTER;
        }
      }
    });

    it('should create mini-donations with highest priority QF round when multiple rounds are active', async () => {
      // Set environment to use mock adapter
      const originalSuperFluidAdapter = process.env.SUPER_FLUID_ADAPTER;
      process.env.SUPER_FLUID_ADAPTER = 'mock';

      try {
        const projectOwner = await saveUserDirectlyToDb(
          generateRandomEtheriumAddress(),
        );
        const project = await saveProjectDirectlyToDb(
          createProjectData(),
          projectOwner,
        );

        const contractCreator = await saveUserDirectlyToDb(
          generateRandomEtheriumAddress(),
        );

        const donor = await saveUserDirectlyToDb(
          generateRandomEtheriumAddress(),
        );

        // Create anchor contract
        const anchorContractAddress = await addNewAnchorAddress({
          project,
          owner: projectOwner,
          creator: contractCreator,
          address: generateRandomEtheriumAddress(),
          networkId: NETWORK_IDS.OPTIMISM_SEPOLIA,
          txHash: generateRandomEvmTxHash(),
        });

        // Find or create DAI token for the test
        let daiToken = await Token.findOne({
          where: {
            symbol: 'DAI',
            networkId: NETWORK_IDS.OPTIMISM_SEPOLIA,
          },
        });

        if (!daiToken) {
          daiToken = await Token.create({
            symbol: 'DAI',
            name: 'Dai Stablecoin',
            address: '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063',
            networkId: NETWORK_IDS.OPTIMISM_SEPOLIA,
            isGivbackEligible: true,
            decimals: 18,
          }).save();
        }

        // Create multiple QF rounds with different priorities
        const qfRound1 = await QfRound.create({
          isActive: true,
          name: 'Higher Priority QF Round',
          allocatedFund: 100000,
          allocatedFundUSD: 50000,
          minimumPassportScore: 8,
          slug: `${new Date().getTime()}-1`,
          beginDate: new Date(),
          endDate: moment().add(30, 'days').toDate(),
          eligibleNetworks: [NETWORK_IDS.OPTIMISM_SEPOLIA],
          priority: 1, // Higher priority (lower number)
        }).save();

        const qfRound2 = await QfRound.create({
          isActive: true,
          name: 'Lower Priority QF Round',
          allocatedFund: 100000,
          allocatedFundUSD: 50000, // Same USD amount
          minimumPassportScore: 8,
          slug: `${new Date().getTime()}-2`,
          beginDate: new Date(),
          endDate: moment().add(30, 'days').toDate(),
          eligibleNetworks: [NETWORK_IDS.OPTIMISM_SEPOLIA],
          priority: 2, // Lower priority (higher number)
        }).save();

        // Associate QF rounds with the project through the junction table
        project.qfRounds = [qfRound1, qfRound2];
        await project.save();

        // Upsert ProjectQfRound relations to ensure database consistency
        await ProjectQfRound.upsert(
          {
            projectId: project.id,
            qfRoundId: qfRound1.id,
            sumDonationValueUsd: 0,
            countUniqueDonors: 0,
          },
          ['projectId', 'qfRoundId'],
        );

        await ProjectQfRound.upsert(
          {
            projectId: project.id,
            qfRoundId: qfRound2.id,
            sumDonationValueUsd: 0,
            countUniqueDonors: 0,
          },
          ['projectId', 'qfRoundId'],
        );

        // Create recurring donation
        const recurringDonation = await saveRecurringDonationDirectlyToDb({
          donationData: {
            donorId: donor.id,
            projectId: project.id,
            anchorContractAddressId: anchorContractAddress.id,
            flowRate: '1000000000000000000', // 1 token per second
            currency: 'DAIx', // Use DAIx to match mock adapter
            status: RECURRING_DONATION_STATUS.ACTIVE,
            networkId: NETWORK_IDS.OPTIMISM_SEPOLIA,
          },
        });

        // Get the recurring donation with relations
        const recurringDonationWithRelations = await findRecurringDonationById(
          recurringDonation.id,
        );

        // Call the function
        await createRelatedDonationsToStream(recurringDonationWithRelations!);

        // Verify that donations were created with the higher priority QF round
        const donations = await Donation.find({
          where: {
            recurringDonationId: recurringDonation.id,
          },
        });

        assert.equal(donations.length, 4); // Mock adapter returns 4 virtual periods
        const donation = donations[0];
        assert.equal(donation.qfRoundId, qfRound1.id); // Should select qfRound1 (higher priority)
        assert.equal(donation.projectId, project.id);
        assert.equal(donation.currency, 'DAI');

        // Cleanup
        await Donation.delete({ recurringDonationId: recurringDonation.id });
        await RecurringDonation.delete({ id: recurringDonation.id });
        await AnchorContractAddress.delete({ id: anchorContractAddress.id });
        qfRound1.isActive = false;
        qfRound2.isActive = false;
        await qfRound1.save();
        await qfRound2.save();
      } finally {
        // Restore original environment
        if (originalSuperFluidAdapter) {
          process.env.SUPER_FLUID_ADAPTER = originalSuperFluidAdapter;
        } else {
          delete process.env.SUPER_FLUID_ADAPTER;
        }
      }
    });
  });
}

// Shared fixtures for the reconciliation tests -------------------------------

const createRecurringDonationForReconcile = async (
  overrides: {
    status?: string;
    anonymous?: boolean;
    currency?: string;
    networkId?: number;
  } = {},
) => {
  const projectOwner = await saveUserDirectlyToDb(
    generateRandomEtheriumAddress(),
  );
  const project = await saveProjectDirectlyToDb(
    createProjectData(),
    projectOwner,
  );
  const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
  const networkId = overrides.networkId || NETWORK_IDS.OPTIMISTIC;
  const anchorContractAddress = await addNewAnchorAddress({
    project,
    owner: projectOwner,
    creator: donor,
    address: generateRandomEtheriumAddress(),
    networkId,
    txHash: generateRandomEvmTxHash(),
  });
  const saved = await saveRecurringDonationDirectlyToDb({
    donationData: {
      projectId: project.id,
      donorId: donor.id,
      anchorContractAddressId: anchorContractAddress.id,
      currency: overrides.currency || 'USDC',
      networkId,
      status: overrides.status || RECURRING_DONATION_STATUS.ACTIVE,
      anonymous: overrides.anonymous || false,
      txHash: generateRandomEvmTxHash(),
      flowRate: '1902587519025',
    },
  });
  const recurringDonation = await findRecurringDonationById(saved.id);
  return recurringDonation!;
};

// Mirrors the shape returned by https://accounting.superfluid.dev/v1/stream-periods
const streamPeriodFor = (
  recurringDonation: RecurringDonation,
  overrides: Record<string, unknown> = {},
) => ({
  id: `${recurringDonation.anchorContractAddress.address}-${recurringDonation.donor.walletAddress as string}-0.0`,
  flowRate: recurringDonation.flowRate,
  startedAtTimestamp: String(
    Math.floor(recurringDonation.createdAt.getTime() / 1000),
  ),
  startedAtBlockNumber: '1',
  stoppedAtTimestamp: null,
  stoppedAtBlockNumber: null,
  totalAmountStreamed: '0',
  chainId: recurringDonation.networkId,
  token: {
    id: '0x35adeb0638eb192755b6e52544650603fe65a006',
    symbol: 'USDCx',
    name: 'Super USDC',
  },
  sender: recurringDonation.donor.walletAddress as string,
  receiver: recurringDonation.anchorContractAddress.address,
  startedAtEvent: recurringDonation.txHash,
  stoppedAtEvent: null,
  virtualPeriods: [],
  ...overrides,
});

const stubStreamPeriods = (impl: (...args: any[]) => Promise<any>) => {
  // The adapter in use depends on SUPER_FLUID_ADAPTER, so stub both.
  const realStub = sinon
    .stub(SuperFluidAdapter.prototype, 'streamPeriods')
    .callsFake(impl);
  sinon.stub(SuperFluidMockAdapter.prototype, 'streamPeriods').callsFake(impl);
  return realStub;
};

function assertStreamMatchesRecurringDonationTestCases() {
  it('accepts a period whose sender, receiver, chain and token match', async () => {
    const recurringDonation = await createRecurringDonationForReconcile();
    assert.doesNotThrow(() =>
      assertStreamMatchesRecurringDonation(
        streamPeriodFor(recurringDonation),
        recurringDonation,
      ),
    );
  });

  it('accepts checksummed (mixed-case) addresses and native ETH', async () => {
    const recurringDonation = await createRecurringDonationForReconcile({
      currency: 'ETH',
    });
    assert.doesNotThrow(() =>
      assertStreamMatchesRecurringDonation(
        streamPeriodFor(recurringDonation, {
          sender: (
            recurringDonation.donor.walletAddress as string
          ).toUpperCase(),
          receiver:
            recurringDonation.anchorContractAddress.address.toUpperCase(),
          token: { id: '0x', symbol: 'ETHx' },
        }),
        recurringDonation,
      ),
    );
  });

  it('rejects a period with a different sender', async () => {
    const recurringDonation = await createRecurringDonationForReconcile();
    assert.throws(
      () =>
        assertStreamMatchesRecurringDonation(
          streamPeriodFor(recurringDonation, {
            sender: generateRandomEtheriumAddress(),
          }),
          recurringDonation,
        ),
      errorMessages.RECURRING_DONATION_STREAM_MISMATCH,
    );
  });

  it('rejects a period with a different receiver', async () => {
    const recurringDonation = await createRecurringDonationForReconcile();
    assert.throws(
      () =>
        assertStreamMatchesRecurringDonation(
          streamPeriodFor(recurringDonation, {
            receiver: generateRandomEtheriumAddress(),
          }),
          recurringDonation,
        ),
      errorMessages.RECURRING_DONATION_STREAM_MISMATCH,
    );
  });

  it('rejects a period from another chain', async () => {
    const recurringDonation = await createRecurringDonationForReconcile();
    assert.throws(
      () =>
        assertStreamMatchesRecurringDonation(
          streamPeriodFor(recurringDonation, {
            chainId: NETWORK_IDS.BASE_MAINNET,
          }),
          recurringDonation,
        ),
      errorMessages.RECURRING_DONATION_STREAM_MISMATCH,
    );
  });

  it('rejects a period for another token', async () => {
    const recurringDonation = await createRecurringDonationForReconcile();
    assert.throws(
      () =>
        assertStreamMatchesRecurringDonation(
          streamPeriodFor(recurringDonation, {
            token: { id: '0x', symbol: 'DAIx' },
          }),
          recurringDonation,
        ),
      errorMessages.RECURRING_DONATION_STREAM_MISMATCH,
    );
  });
}

function reconcileRecurringDonationStatusWithNetworkTestCases() {
  afterEach(() => {
    sinon.restore();
  });

  it('keeps an active stream ACTIVE and unfinished', async () => {
    const recurringDonation = await createRecurringDonationForReconcile();
    stubStreamPeriods(async () => streamPeriodFor(recurringDonation));

    const result = await reconcileRecurringDonationStatusWithNetwork({
      recurringDonation,
    });

    assert.equal(result.status, RECURRING_DONATION_STATUS.ACTIVE);
    assert.isFalse(result.finished);
    const fromDb = await findRecurringDonationById(recurringDonation.id);
    assert.equal(fromDb?.status, RECURRING_DONATION_STATUS.ACTIVE);
    assert.isFalse(fromDb?.finished);
  });

  it('marks a stream ended by the donor as ENDED without changing its txHash', async () => {
    const recurringDonation = await createRecurringDonationForReconcile();
    const originalTxHash = recurringDonation.txHash;
    stubStreamPeriods(async () =>
      streamPeriodFor(recurringDonation, {
        stoppedAtTimestamp: String(Math.floor(Date.now() / 1000) - 3600),
        stoppedAtEvent: generateRandomEvmTxHash(),
      }),
    );

    const result = await reconcileRecurringDonationStatusWithNetwork({
      recurringDonation,
    });

    assert.equal(result.status, RECURRING_DONATION_STATUS.ENDED);
    assert.isTrue(result.finished);
    const fromDb = await findRecurringDonationById(recurringDonation.id);
    assert.equal(fromDb?.status, RECURRING_DONATION_STATUS.ENDED);
    assert.isTrue(fromDb?.finished);
    // The historical stop event must never be stored as the donation's own tx.
    assert.equal(fromDb?.txHash, originalTxHash);
  });

  it('marks a stream liquidated by a Superfluid sentinel as ENDED', async () => {
    // Liquidation (issue #5503): the stop event is a sentinel transaction,
    // not one sent by the donor. The accounting API reports it the same way.
    const recurringDonation = await createRecurringDonationForReconcile();
    stubStreamPeriods(async () =>
      streamPeriodFor(recurringDonation, {
        stoppedAtTimestamp: '1773817211',
        stoppedAtEvent:
          '0xe4630acb9ffec1ab7a3a63342cf7d1cb3dd17c7f4d3e4ac120a82800ac931e30',
      }),
    );

    const result = await reconcileRecurringDonationStatusWithNetwork({
      recurringDonation,
    });

    assert.equal(result.status, RECURRING_DONATION_STATUS.ENDED);
    assert.isTrue(result.finished);
  });

  it('reconciles a stream that ended on-chain before the daily sync ran', async () => {
    // Backend still ACTIVE from an earlier sync; the stream stopped since.
    const recurringDonation = await createRecurringDonationForReconcile({
      status: RECURRING_DONATION_STATUS.ACTIVE,
    });
    stubStreamPeriods(async () =>
      streamPeriodFor(recurringDonation, {
        stoppedAtTimestamp: String(Math.floor(Date.now() / 1000) - 60),
        stoppedAtEvent: generateRandomEvmTxHash(),
      }),
    );
    const result = await reconcileRecurringDonationStatusWithNetwork({
      recurringDonation,
    });
    assert.equal(result.status, RECURRING_DONATION_STATUS.ENDED);
  });

  it('is idempotent: repeated calls do not re-query or change an ended donation', async () => {
    const recurringDonation = await createRecurringDonationForReconcile();
    const stub = stubStreamPeriods(async () =>
      streamPeriodFor(recurringDonation, {
        stoppedAtTimestamp: String(Math.floor(Date.now() / 1000) - 60),
        stoppedAtEvent: generateRandomEvmTxHash(),
      }),
    );

    const first = await reconcileRecurringDonationStatusWithNetwork({
      recurringDonation,
    });
    assert.equal(first.status, RECURRING_DONATION_STATUS.ENDED);
    const callsAfterFirst = stub.callCount;

    const second = await reconcileRecurringDonationStatusWithNetwork({
      recurringDonation: first,
    });
    assert.equal(second.status, RECURRING_DONATION_STATUS.ENDED);
    assert.isTrue(second.finished);
    assert.equal(stub.callCount, callsAfterFirst);
  });

  it('handles anonymous recurring donations like any other', async () => {
    const recurringDonation = await createRecurringDonationForReconcile({
      anonymous: true,
    });
    stubStreamPeriods(async () =>
      streamPeriodFor(recurringDonation, {
        stoppedAtTimestamp: String(Math.floor(Date.now() / 1000) - 60),
        stoppedAtEvent: generateRandomEvmTxHash(),
      }),
    );
    const result = await reconcileRecurringDonationStatusWithNetwork({
      recurringDonation,
    });
    assert.equal(result.status, RECURRING_DONATION_STATUS.ENDED);
    assert.isTrue(result.anonymous);
  });

  it('fails without changing anything when the stream cannot be found', async () => {
    const recurringDonation = await createRecurringDonationForReconcile();
    stubStreamPeriods(async () => undefined);

    let errorMessage = '';
    try {
      await reconcileRecurringDonationStatusWithNetwork({ recurringDonation });
    } catch (e) {
      errorMessage = e.message;
    }
    assert.equal(
      errorMessage,
      errorMessages.RECURRING_DONATION_STREAM_NOT_VERIFIABLE,
    );
    const fromDb = await findRecurringDonationById(recurringDonation.id);
    assert.equal(fromDb?.status, RECURRING_DONATION_STATUS.ACTIVE);
    assert.isFalse(fromDb?.finished);
  });

  it('fails without changing anything when the Superfluid API errors', async () => {
    const recurringDonation = await createRecurringDonationForReconcile();
    stubStreamPeriods(async () => {
      throw new Error('accounting api down');
    });

    let errorMessage = '';
    try {
      await reconcileRecurringDonationStatusWithNetwork({ recurringDonation });
    } catch (e) {
      errorMessage = e.message;
    }
    assert.equal(errorMessage, 'accounting api down');
    const fromDb = await findRecurringDonationById(recurringDonation.id);
    assert.equal(fromDb?.status, RECURRING_DONATION_STATUS.ACTIVE);
  });

  it('fails without changing anything when the stream belongs to someone else', async () => {
    const recurringDonation = await createRecurringDonationForReconcile();
    stubStreamPeriods(async () =>
      streamPeriodFor(recurringDonation, {
        sender: generateRandomEtheriumAddress(),
        stoppedAtTimestamp: String(Math.floor(Date.now() / 1000) - 60),
      }),
    );

    let errorMessage = '';
    try {
      await reconcileRecurringDonationStatusWithNetwork({ recurringDonation });
    } catch (e) {
      errorMessage = e.message;
    }
    assert.equal(
      errorMessage,
      errorMessages.RECURRING_DONATION_STREAM_MISMATCH,
    );
    const fromDb = await findRecurringDonationById(recurringDonation.id);
    assert.equal(fromDb?.status, RECURRING_DONATION_STATUS.ACTIVE);
  });

  it('runs the sync only once for concurrent requests', async () => {
    const recurringDonation = await createRecurringDonationForReconcile();
    const stub = stubStreamPeriods(async () => {
      await sleep(300);
      return streamPeriodFor(recurringDonation, {
        stoppedAtTimestamp: String(Math.floor(Date.now() / 1000) - 60),
        stoppedAtEvent: generateRandomEvmTxHash(),
      });
    });

    const [first, second] = await Promise.all([
      reconcileRecurringDonationStatusWithNetwork({ recurringDonation }),
      reconcileRecurringDonationStatusWithNetwork({ recurringDonation }),
    ]);
    // Both calls resolve without error; one performs the sync, the locked-out
    // one re-reads the row (status at that moment, never a throw).
    assert.isOk(first);
    assert.isOk(second);
    assert.equal(stub.callCount, 1);
    const fromDb = await findRecurringDonationById(recurringDonation.id);
    assert.equal(fromDb?.status, RECURRING_DONATION_STATUS.ENDED);
    assert.isTrue(fromDb?.finished);
  });

  it('does not run twice when the daily job and a reconciliation overlap', async () => {
    const recurringDonation = await createRecurringDonationForReconcile();
    const stub = stubStreamPeriods(async () => {
      await sleep(300);
      return streamPeriodFor(recurringDonation, {
        stoppedAtTimestamp: String(Math.floor(Date.now() / 1000) - 60),
        stoppedAtEvent: generateRandomEvmTxHash(),
      });
    });

    await Promise.all([
      updateRecurringDonationStream({
        recurringDonationId: recurringDonation.id,
      }),
      reconcileRecurringDonationStatusWithNetwork({ recurringDonation }),
    ]);

    // The shared lock lets only one of the two run the sync (and therefore
    // insert stream-period donations); the other skips without error.
    assert.equal(stub.callCount, 1);
    const fromDb = await findRecurringDonationById(recurringDonation.id);
    assert.equal(fromDb?.status, RECURRING_DONATION_STATUS.ENDED);
    assert.isTrue(fromDb?.finished);
  });

  it('returns the latest persisted status when locked out by another sync', async () => {
    const recurringDonation = await createRecurringDonationForReconcile();
    const stub = stubStreamPeriods(async () =>
      streamPeriodFor(recurringDonation),
    );
    const lockKey = getStreamSyncLockKey(recurringDonation.id);
    // Another holder owns the lease and has already persisted ENDED.
    await redis.set(lockKey, 'another-sync', 'PX', 60_000);
    try {
      const fresh = (await findRecurringDonationById(recurringDonation.id))!;
      fresh.status = RECURRING_DONATION_STATUS.ENDED;
      fresh.finished = true;
      await fresh.save();

      const result = await reconcileRecurringDonationStatusWithNetwork({
        recurringDonation, // stale in-memory snapshot, still ACTIVE
      });

      assert.equal(stub.callCount, 0);
      assert.equal(result.status, RECURRING_DONATION_STATUS.ENDED);
      assert.isTrue(result.finished);
    } finally {
      await redis.del(lockKey);
    }
  });

  it('still reconciles when Redis rejects the lock command', async () => {
    const recurringDonation = await createRecurringDonationForReconcile();
    stubStreamPeriods(async () =>
      streamPeriodFor(recurringDonation, {
        stoppedAtTimestamp: String(Math.floor(Date.now() / 1000) - 60),
        stoppedAtEvent: generateRandomEvmTxHash(),
      }),
    );
    sinon.stub(redis, 'set').rejects(new Error('Connection is closed.'));

    const result = await reconcileRecurringDonationStatusWithNetwork({
      recurringDonation,
    });
    assert.equal(result.status, RECURRING_DONATION_STATUS.ENDED);
    const fromDb = await findRecurringDonationById(recurringDonation.id);
    assert.equal(fromDb?.status, RECURRING_DONATION_STATUS.ENDED);
  });

  it('does not queue behind a disconnected Redis client', async () => {
    const recurringDonation = await createRecurringDonationForReconcile();
    stubStreamPeriods(async () =>
      streamPeriodFor(recurringDonation, {
        stoppedAtTimestamp: String(Math.floor(Date.now() / 1000) - 60),
        stoppedAtEvent: generateRandomEvmTxHash(),
      }),
    );
    const setStub = sinon.stub(redis, 'set');
    sinon.stub(redis, 'status').value('reconnecting');

    const result = await reconcileRecurringDonationStatusWithNetwork({
      recurringDonation,
    });
    assert.equal(setStub.callCount, 0);
    assert.equal(result.status, RECURRING_DONATION_STATUS.ENDED);
  });

  it('bounds a hanging Redis lock command and proceeds', async () => {
    const recurringDonation = await createRecurringDonationForReconcile();
    stubStreamPeriods(async () =>
      streamPeriodFor(recurringDonation, {
        stoppedAtTimestamp: String(Math.floor(Date.now() / 1000) - 60),
        stoppedAtEvent: generateRandomEvmTxHash(),
      }),
    );
    // Simulates ioredis holding the command in its offline queue.
    sinon.stub(redis, 'set').returns(new Promise(() => undefined) as any);

    const startedAt = Date.now();
    const result = await reconcileRecurringDonationStatusWithNetwork({
      recurringDonation,
    });
    const elapsed = Date.now() - startedAt;
    assert.isBelow(elapsed, LEASE_REDIS_OP_TIMEOUT_MS + 5_000);
    assert.equal(result.status, RECURRING_DONATION_STATUS.ENDED);
  });

  it('re-reads the donation inside the lock and skips work already done', async () => {
    const recurringDonation = await createRecurringDonationForReconcile();
    // Simulate the daily job finishing it after this request loaded it.
    const fresh = (await findRecurringDonationById(recurringDonation.id))!;
    fresh.status = RECURRING_DONATION_STATUS.ENDED;
    fresh.finished = true;
    await fresh.save();
    const stub = stubStreamPeriods(async () =>
      streamPeriodFor(recurringDonation),
    );

    const result = await reconcileRecurringDonationStatusWithNetwork({
      recurringDonation,
    });

    assert.equal(stub.callCount, 0);
    assert.equal(result.status, RECURRING_DONATION_STATUS.ENDED);
    assert.isTrue(result.finished);
  });

  it('leaves already finished donations untouched without querying', async () => {
    const recurringDonation = await createRecurringDonationForReconcile({
      status: RECURRING_DONATION_STATUS.ENDED,
    });
    recurringDonation.finished = true;
    await recurringDonation.save();
    const stub = stubStreamPeriods(async () =>
      streamPeriodFor(recurringDonation),
    );

    const result = await reconcileRecurringDonationStatusWithNetwork({
      recurringDonation,
    });
    assert.equal(result.status, RECURRING_DONATION_STATUS.ENDED);
    assert.equal(stub.callCount, 0);
  });
}

function withRecurringDonationSyncLockTestCases() {
  afterEach(() => {
    sinon.restore();
  });

  it('runs the callback under the lease and releases it afterwards', async () => {
    const lockKey = getStreamSyncLockKey(987654321);
    const outcome = await withRecurringDonationSyncLock(987654321, async () => {
      assert.isNotNull(await redis.get(lockKey));
      return 'done';
    });
    assert.deepEqual(outcome, { acquired: true, result: 'done' });
    assert.isNull(await redis.get(lockKey));
  });

  it('does not run the callback while another holder owns the lease', async () => {
    const lockKey = getStreamSyncLockKey(987654322);
    await redis.set(lockKey, 'another-holder', 'PX', 60_000);
    try {
      let ran = false;
      const outcome = await withRecurringDonationSyncLock(
        987654322,
        async () => {
          ran = true;
        },
      );
      assert.isFalse(outcome.acquired);
      assert.isFalse(ran);
      assert.equal(await redis.get(lockKey), 'another-holder');
    } finally {
      await redis.del(lockKey);
    }
  });

  it('never deletes a lease that expired and was re-acquired by another owner', async () => {
    const lockKey = getStreamSyncLockKey(987654323);
    try {
      await withRecurringDonationSyncLock(987654323, async () => {
        // Simulate: our lease expired mid-run and someone else acquired it.
        await redis.del(lockKey);
        await redis.set(lockKey, 'new-owner', 'PX', 60_000);
      });
      assert.equal(await redis.get(lockKey), 'new-owner');
    } finally {
      await redis.del(lockKey);
    }
  });

  it('runs the callback unlocked when Redis is unavailable', async () => {
    sinon.stub(redis, 'set').rejects(new Error('Connection is closed.'));
    const outcome = await withRecurringDonationSyncLock(
      987654324,
      async () => 'ran',
    );
    assert.deepEqual(outcome, { acquired: true, result: 'ran' });
  });
}

function updateRecurringDonationStreamTestCases() {
  afterEach(() => {
    sinon.restore();
  });

  it('syncs an active donation and marks it ENDED when the stream stopped', async () => {
    const recurringDonation = await createRecurringDonationForReconcile();
    const stub = stubStreamPeriods(async () =>
      streamPeriodFor(recurringDonation, {
        stoppedAtTimestamp: String(Math.floor(Date.now() / 1000) - 60),
        stoppedAtEvent: generateRandomEvmTxHash(),
      }),
    );
    await updateRecurringDonationStream({
      recurringDonationId: recurringDonation.id,
    });
    assert.equal(stub.callCount, 1);
    const fromDb = await findRecurringDonationById(recurringDonation.id);
    assert.equal(fromDb?.status, RECURRING_DONATION_STATUS.ENDED);
  });

  it('leaves the donation untouched when the accounting API returns nothing', async () => {
    const recurringDonation = await createRecurringDonationForReconcile();
    stubStreamPeriods(async () => undefined);
    await updateRecurringDonationStream({
      recurringDonationId: recurringDonation.id,
    });
    const fromDb = await findRecurringDonationById(recurringDonation.id);
    assert.equal(fromDb?.status, RECURRING_DONATION_STATUS.ACTIVE);
    assert.isFalse(fromDb?.finished);
    const donations = await Donation.find({
      where: { recurringDonationId: recurringDonation.id },
    });
    assert.equal(donations.length, 0);
  });

  it('retries while the lease is held and syncs once it is released', async () => {
    const recurringDonation = await createRecurringDonationForReconcile();
    const stub = stubStreamPeriods(async () =>
      streamPeriodFor(recurringDonation, {
        stoppedAtTimestamp: String(Math.floor(Date.now() / 1000) - 60),
        stoppedAtEvent: generateRandomEvmTxHash(),
      }),
    );
    const lockKey = getStreamSyncLockKey(recurringDonation.id);
    await redis.set(lockKey, 'another-sync', 'PX', 60_000);
    // Release it while the job is waiting for its second attempt.
    setTimeout(() => redis.del(lockKey), STREAM_SYNC_LOCK_RETRY_DELAY_MS / 2);
    try {
      await updateRecurringDonationStream({
        recurringDonationId: recurringDonation.id,
      });
    } finally {
      await redis.del(lockKey);
    }
    assert.equal(stub.callCount, 1);
    const fromDb = await findRecurringDonationById(recurringDonation.id);
    assert.equal(fromDb?.status, RECURRING_DONATION_STATUS.ENDED);
  });

  it('fails loudly instead of reporting success when the lease stays held', async () => {
    const recurringDonation = await createRecurringDonationForReconcile();
    const stub = stubStreamPeriods(async () =>
      streamPeriodFor(recurringDonation),
    );
    const lockKey = getStreamSyncLockKey(recurringDonation.id);
    await redis.set(lockKey, 'another-sync', 'PX', 60_000);
    try {
      let error: Error | undefined;
      try {
        await updateRecurringDonationStream({
          recurringDonationId: recurringDonation.id,
        });
      } catch (e) {
        error = e;
      }
      assert.instanceOf(error, RecurringDonationSyncLockedError);
      assert.equal(stub.callCount, 0);
    } finally {
      await redis.del(lockKey);
    }
  });

  it('skips the sync when the other holder finished the donation meanwhile', async () => {
    const recurringDonation = await createRecurringDonationForReconcile();
    const stub = stubStreamPeriods(async () =>
      streamPeriodFor(recurringDonation),
    );
    const lockKey = getStreamSyncLockKey(recurringDonation.id);
    await redis.set(lockKey, 'another-sync', 'PX', 60_000);
    setTimeout(async () => {
      const fresh = (await findRecurringDonationById(recurringDonation.id))!;
      fresh.status = RECURRING_DONATION_STATUS.ENDED;
      fresh.finished = true;
      await fresh.save();
      await redis.del(lockKey);
    }, STREAM_SYNC_LOCK_RETRY_DELAY_MS / 2);
    try {
      await updateRecurringDonationStream({
        recurringDonationId: recurringDonation.id,
      });
    } finally {
      await redis.del(lockKey);
    }
    assert.equal(stub.callCount, 0);
  });
}
