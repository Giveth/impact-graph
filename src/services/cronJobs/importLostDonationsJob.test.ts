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
      '0x4012421fbc2cecc85804f3b98bdd31bef04589dbac8292deca33e699868af01f';
    const toWalletAddressEth = '0x6e8873085530406995170da467010565968c7c62';
    const walletAddressEth = '0x317bbc1927be411cd05615d2ffdf8d320c6c4052';
    const walletAddress2Eth = generateRandomEtheriumAddress();
    const userEth = await saveUserDirectlyToDb(walletAddressEth);
    const user2Eth = await saveUserDirectlyToDb(walletAddress2Eth);
    const project1 = await saveProjectDirectlyToDb({
      // test project with real tx
      ...createProjectData(),
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
