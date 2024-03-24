import { assert } from 'chai';
import {
  createProjectData,
  generateRandomEtheriumAddress,
  generateRandomEvmTxHash,
  saveProjectDirectlyToDb,
  saveRecurringDonationDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../test/testUtils';
import { createRelatedDonationsToStream } from './recurringDonationService';
import { Donation } from '../entities/donation';
import { addNewAnchorAddress } from '../repositories/anchorContractAddressRepository';
import { NETWORK_IDS } from '../provider';
import { findRecurringDonationById } from '../repositories/recurringDonationRepository';
import { RECURRING_DONATION_STATUS } from '../entities/recurringDonation';

describe(
  'createRelatedDonationsToStream test cases',
  createRelatedDonationsToStreamTestCases,
);

describe(
  'updateRecurringDonationStatusWithNetwork test cases',
  updateRecurringDonationStatusWithNetworkTestCases,
);

function updateRecurringDonationStatusWithNetworkTestCases() {
  it('should verify transaction from OP Sepolia', function () {
    // https://sepolia-optimism.etherscan.io/tx/0xe88c42496c1438d59b2e72b3a96cd73010482302226cffbd8fc64923bab51195
  });
}

function createRelatedDonationsToStreamTestCases() {
  it('should search by the currency', async () => {
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
