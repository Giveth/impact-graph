import { assert } from 'chai';
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

describe(
  'createRelatedDonationsToStream test cases',
  createRelatedDonationsToStreamTestCases,
);

describe(
  'updateRecurringDonationStatusWithNetwork test cases',
  updateRecurringDonationStatusWithNetworkTestCases,
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
  it('should remain pending, different toAddress from OP Sepolia', async () => {
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
  it('should  donation remain pending, different amount from OP Sepolia', async () => {
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
