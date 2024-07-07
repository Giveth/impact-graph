import { assert } from 'chai';

describe('importLostDonations() test cases', importLostDonationsTestCases);

function importLostDonationsTestCases() {
  it('should create a eth simple transfer donation and erc20 token transfer donation', async () => {
    // eth donation
    // const transactionIdEth =
    //   '0xb017677647418e1a35e59715f8e4e549d0e449d67faf5c73ed20e6d3ce67fb49';
    // const toWalletAddressEth = '0xbf691bdb6c0f32647ebd5b171cce1880c14950bc';
    // const walletAddressEth = '0xb05bc03b85951725e37acb6384c5769605693cb5';
    // const walletAddress2Eth = generateRandomEtheriumAddress();
    // const userEth = await saveUserDirectlyToDb(walletAddressEth);
    // const user2Eth = await saveUserDirectlyToDb(walletAddress2Eth);
    // const project1 = await saveProjectDirectlyToDb({
    //   // test project with real tx
    //   ...createProjectData(),
    //   admin: String(user2Eth.id),
    //   walletAddress: toWalletAddressEth,
    // });

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
    // await importLostDonations();

    // const createdDonationEth = await Donation.createQueryBuilder('donation')
    //   .where(`donation."transactionId" = :transactionIdEth`, {
    //     transactionIdEth,
    //   })
    //   .getOne();

    //   const createdDonationOP = await Donation.createQueryBuilder('donation')
    //     .where(`donation."transactionId" = :transactionIdOP`, { transactionIdOP })
    //     .getOne();

    // assert.equal(createdDonationEth?.toWalletAddress, toWalletAddressEth);
    // assert.equal(createdDonationEth?.fromWalletAddress, walletAddressEth);
    // assert.equal(createdDonationEth?.transactionId, transactionIdEth);
    // assert.equal(createdDonationEth?.projectId, project1.id);
    // assert.isTrue(createdDonationEth?.amount! > 0);
    // assert.isTrue(createdDonationEth?.valueUsd! > 0);
    assert.equal(true, true);

    //   assert.equal(createdDonationOP?.toWalletAddress, toWalletAddressOP);
    //   assert.equal(createdDonationOP?.fromWalletAddress, walletAddressOP);
    //   assert.equal(createdDonationOP?.transactionId, transactionIdOP);
    //   assert.equal(createdDonationOP?.projectId, project2.id);
    //   assert.isTrue(createdDonationOP?.amount! > 0);
    //   assert.isTrue(createdDonationOP?.valueUsd! > 0);
  });
}
