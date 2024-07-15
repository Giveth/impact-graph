import { assert } from 'chai';
import { ModifyAmountOfUsdcRecurringDonations1720939399738 } from '../1720939399738-modify_amount_of_usdc_recurring_donations';
import { AppDataSource } from '../../src/orm';
import {
  createDonationData,
  createProjectData,
  generateRandomEtheriumAddress,
  generateRandomEvmTxHash,
  saveDonationDirectlyToDb,
  saveProjectDirectlyToDb,
  saveRecurringDonationDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../test/testUtils';
import { addNewAnchorAddress } from '../../src/repositories/anchorContractAddressRepository';
import { NETWORK_IDS } from '../../src/provider';
import {
  RECURRING_DONATION_STATUS,
  RecurringDonation,
} from '../../src/entities/recurringDonation';
import { AnchorContractAddress } from '../../src/entities/anchorContractAddress';
import { findDonationById } from '../../src/repositories/donationRepository';
import { Donation } from '../../src/entities/donation';
import {
  findRecurringDonationById,
  updateRecurringDonationFromTheStreamDonations,
} from '../../src/repositories/recurringDonationRepository';

let queryRunner;
describe('Modify amount of USDC recurring donations', async () => {
  before(async () => {
    await AppDataSource.initialize();
    queryRunner = AppDataSource.getDataSource().createQueryRunner();
    await queryRunner.connect();
  });

  afterEach(async () => {
    await new ModifyAmountOfUsdcRecurringDonations1720939399738().down(
      queryRunner,
    );
  });

  it('Should fix decimals of stream donations and recurring donation of USDC', async () => {
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

    const donationAmount = 4.5183618e11;

    const recurringDonation = await saveRecurringDonationDirectlyToDb({
      donationData: {
        projectId: project.id,
        anchorContractAddressId: anchorContractAddress.id,
        currency: 'ETH',
        status: RECURRING_DONATION_STATUS.ACTIVE,
        txHash:
          '0x516567c51c3506afe1291f7055fa0e858cc2ca9ed4079625c747fe92bd125a10',
        donorId: donor.id,
        flowRate: '10000000',
      },
    });

    const donation = await saveDonationDirectlyToDb({
      ...createDonationData(),
    });
    donation.recurringDonationId = recurringDonation.id;
    donation.currency = 'USDC';
    donation.amount = donationAmount;
    donation.valueUsd = 0.45197627;
    await donation.save();

    await updateRecurringDonationFromTheStreamDonations(recurringDonation.id);
    const updatedRecurringDonation = await findRecurringDonationById(
      recurringDonation.id,
    );
    assert.equal(updatedRecurringDonation!.amountStreamed, donationAmount);
    assert.equal(updatedRecurringDonation!.totalUsdStreamed, 0.45197627);

    await new ModifyAmountOfUsdcRecurringDonations1720939399738().up(
      queryRunner,
    );

    const updatedDonation = await findDonationById(donation.id);
    assert.equal(updatedDonation!.amount, 0.45197627);

    const updatedRecurringDonation2 = await findRecurringDonationById(
      recurringDonation.id,
    );
    assert.equal(updatedRecurringDonation2!.amountStreamed, 0.45197627);
    assert.equal(updatedRecurringDonation2!.totalUsdStreamed, 0.45197627);

    await Donation.delete({ id: donation.id });
    await RecurringDonation.delete({ id: recurringDonation.id });
    await AnchorContractAddress.delete({ id: anchorContractAddress.id });
  });
});
