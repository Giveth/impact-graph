import { assert } from 'chai';
import moment from 'moment';
import {
  createProjectData,
  generateRandomEtheriumAddress,
  generateRandomEvmTxHash,
  saveProjectDirectlyToDb,
  saveRecurringDonationDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../test/testUtils';
import {
  createRelatedDonationsToStream,
  updateRecurringDonationStatusWithNetwork,
} from './recurringDonationService';
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

        // Update ProjectQfRound relations to ensure database consistency
        await ProjectQfRound.update(
          { projectId: project.id, qfRoundId: qfRound1.id },
          { sumDonationValueUsd: 0, countUniqueDonors: 0 },
        );

        await ProjectQfRound.update(
          { projectId: project.id, qfRoundId: qfRound2.id },
          { sumDonationValueUsd: 0, countUniqueDonors: 0 },
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
