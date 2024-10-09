// import { assert } from 'chai';
// import { createBackupDonation } from './backupDonationImportJob';
// import {
//   assertThrowsAsync,
//   createProjectData,
//   generateRandomEtheriumAddress,
//   generateRandomEvmTxHash,
//   saveProjectDirectlyToDb,
// } from '../../../test/testUtils';
// import { User } from '../../entities/user';
// import { QACC_NETWORK_ID } from '../../provider';
// import { DONATION_STATUS } from '../../entities/donation';
// import { findTokenByNetworkAndSymbol } from '../../utils/tokenUtils';
// import { QACC_DONATION_TOKEN_SYMBOL } from '../../utils/qacc';

// describe('createBackupDonation test cases', createBackupDonationTestCases);

// function createBackupDonationTestCases() {
//   it('should create donation successfully', async () => {
//     const project = await saveProjectDirectlyToDb(createProjectData());
//     const donorWalletAddress = generateRandomEtheriumAddress();
//     await User.create({
//       walletAddress: donorWalletAddress,
//       loginType: 'wallet',
//       firstName: 'first name',
//     }).save();
//     const token = await findTokenByNetworkAndSymbol(
//       QACC_NETWORK_ID,
//       QACC_DONATION_TOKEN_SYMBOL,
//     );

//     const donation = await createBackupDonation({
//       projectId: project.id,
//       chainId: QACC_NETWORK_ID,
//       txHash: generateRandomEvmTxHash(),
//       nonce: 1,
//       amount: 10,
//       _id: '65a90d86d3a1115b4ebc0731',
//       token: {
//         symbol: token.symbol,
//         address: token.address,
//         networkId: QACC_NETWORK_ID,
//       },
//       anonymous: false,
//       symbol: QACC_DONATION_TOKEN_SYMBOL,
//       walletAddress: donorWalletAddress,
//       imported: false,
//     });
//     assert.isOk(donation);
//     // assert.isTrue(donation?.isTokenEligibleForGivback);
//     assert.equal(donation.status, DONATION_STATUS.PENDING);

//     // should use input createdAt not now time
//     assert.equal(donation.createdAt.getTime(), 1705577862000);
//   });

//   it('should fail if projectId is invalid', async () => {
//     const donorWalletAddress = generateRandomEtheriumAddress();
//     await User.create({
//       walletAddress: donorWalletAddress,
//       loginType: 'wallet',
//       firstName: 'first name',
//     }).save();
//     const token = await findTokenByNetworkAndSymbol(
//       QACC_NETWORK_ID,
//       QACC_DONATION_TOKEN_SYMBOL,
//     );

//     const badFunc = async () => {
//       await createBackupDonation({
//         projectId: 99999999,
//         chainId: QACC_NETWORK_ID,
//         txHash: generateRandomEvmTxHash(),
//         nonce: 1,
//         amount: 10,
//         _id: '65a90d86d3a1115b4ebc0731',
//         token: {
//           symbol: token.symbol,
//           address: token.address,
//           networkId: QACC_NETWORK_ID,
//         },
//         anonymous: false,
//         symbol: QACC_DONATION_TOKEN_SYMBOL,
//         walletAddress: donorWalletAddress,
//         imported: false,
//       });
//     };
//     await assertThrowsAsync(badFunc, 'Project not found.');
//   });
// }
