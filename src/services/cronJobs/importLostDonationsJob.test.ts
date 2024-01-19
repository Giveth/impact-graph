import { assert } from 'chai';
import {
  createProjectData,
  generateRandomEtheriumAddress,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../../test/testUtils';
import { importLostDonations } from './importLostDonationsJob';
import { Donation } from '../../entities/donation';

describe('importLostDonations() test cases', importLostDonationsTestCases);

function importLostDonationsTestCases() {
  it('should create a eth simple transfer donation and erc20 token transfer donation', async () => {
    // eth donation
    const transactionIdEth =
      '0x33a2b423cddd37b1e67a42ffab35166cdf54a56b2a5dbf59bd22040f047af2a9';
    const toWalletAddressEth = '0xffbd35255008f86322051f2313d4b343540e0e00';
    const walletAddressEth = '0xdd8422da958d7b9773b033717eccce0fbb26ce01';
    const walletAddress2Eth = generateRandomEtheriumAddress();
    const userEth = await saveUserDirectlyToDb(walletAddressEth);
    const user2Eth = await saveUserDirectlyToDb(walletAddress2Eth);
    const project1 = await saveProjectDirectlyToDb({
      // test project with real tx
      ...createProjectData(),
      networkId: 10,
      admin: String(user2Eth.id),
      walletAddress: toWalletAddressEth,
    });

    //   // optimism donation from safe SKIP
    //   const transactionIdOP =
    //     '0x067e91368272dc73bc715a21a2af863a333cde20f410189fa53bceaa9cb8c86b';
    //   const toWalletAddressOP = '0xa64f2228ccec96076c82abb903021c33859082f8';
    //   const walletAddressOP = '0x40891ce6e8574bb9118913a8a304195437f36213';
    //   const walletAddress2OP = generateRandomEtheriumAddress();
    //   const userOP = await saveUserDirectlyToDb(walletAddressOP);
    //   const user2OP = await saveUserDirectlyToDb(walletAddress2OP);
    //   const project2 = await saveProjectDirectlyToDb({
    //     // test project with real tx
    //     ...createProjectData(),
    //     admin: String(user2OP.id),
    //     walletAddress: toWalletAddressOP,
    //   });
    await importLostDonations();

    const createdDonationEth = await Donation.createQueryBuilder('donation')
      .where(`donation."transactionId" = :transactionIdEth`, {
        transactionIdEth,
      })
      .getOne();

    //   const createdDonationOP = await Donation.createQueryBuilder('donation')
    //     .where(`donation."transactionId" = :transactionIdOP`, { transactionIdOP })
    //     .getOne();

    assert.equal(createdDonationEth?.toWalletAddress, toWalletAddressEth);
    assert.equal(createdDonationEth?.fromWalletAddress, walletAddressEth);
    assert.equal(createdDonationEth?.transactionId, transactionIdEth);
    assert.equal(createdDonationEth?.projectId, project1.id);
    assert.isTrue(createdDonationEth?.amount! > 0);
    assert.isTrue(createdDonationEth?.valueUsd! > 0);

    //   assert.equal(createdDonationOP?.toWalletAddress, toWalletAddressOP);
    //   assert.equal(createdDonationOP?.fromWalletAddress, walletAddressOP);
    //   assert.equal(createdDonationOP?.transactionId, transactionIdOP);
    //   assert.equal(createdDonationOP?.projectId, project2.id);
    //   assert.isTrue(createdDonationOP?.amount! > 0);
    //   assert.isTrue(createdDonationOP?.valueUsd! > 0);
  });
}
