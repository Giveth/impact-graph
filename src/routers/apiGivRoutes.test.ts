// import { assert } from 'chai';
// import axios from 'axios';
// import {
//   createProjectData,
//   generateRandomEtheriumAddress,
//   generateRandomEvmTxHash,
//   saveProjectDirectlyToDb,
// } from '../../test/testUtils';
// import { createBasicAuthentication } from '../utils/utils';
// import { NETWORK_IDS } from '../provider';
// import { DONATION_STATUS } from '../entities/donation';

// export const restUrl = 'http://localhost:4000/apigive';

// describe('createDonation in apiGiv test cases', () => {
//   it('should create donation ', async () => {
//     const project = await saveProjectDirectlyToDb(createProjectData());
//     const donationData = {
//       toWalletAddress: project.walletAddress,
//       currency: 'GIV',
//       transactionNetworkId: NETWORK_IDS.XDAI,
//       fromWalletAddress: generateRandomEtheriumAddress(),
//       amount: 100,
//       priceUsd: 0.3,
//       valueUsd: 30,
//       donationType: 'apiGivProject',
//       status: DONATION_STATUS.VERIFIED,
//       isFiat: false,
//       transactionId: generateRandomEvmTxHash(),
//     };
//     const basicAuthentication = createBasicAuthentication({
//       userName: process.env.API_GIV_USERNAME,
//       password: process.env.API_GIV_PASSWORD,
//     });

//     const result = await axios.post(`${restUrl}/donations`, donationData, {
//       headers: {
//         Authorization: basicAuthentication,
//       },
//     });

//     assert.isOk(result.data);
//     assert.equal(result.data.transactionId, donationData.transactionId);
//   });
// });
