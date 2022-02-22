// import { assert, expect } from 'chai';
// import sinon from 'sinon';
// import axios from 'axios';
// import { FileUpload } from 'graphql-upload';
// import {
//   uploadImageToIpfsQuery,
// } from '../../test/graphqlQueries';
// import {
//   generateTestAccessToken,
//   graphqlUrl,
//   SEED_DATA,
// } from '../../test/testUtils';
// import * as pinataUtils from '../middleware/pinataUtils';

// const fs = require("fs");
// const path = require('path');

// // test cases
// describe('upload() test cases', uploadTestCases);

// function uploadTestCases() {
//   it('should not allow uploading an image when not logged in', async() => {
//     const filename = 'testImage.jpg';

//     const result = await axios.post(
//       graphqlUrl,
//       {
//         query: uploadImageToIpfsQuery,
//         variables: {
//           image: fs.createReadStream(path.resolve(__dirname, `./${filename}`)),
//         },
//       },
//     );

//     console.log(result);
//   });
//   it('should allow uploading an image when logged in', async() => {
//     const filename = 'testImage.jpg';

//     const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
//     const resultString = 'ipfsString';
//     sinon.stub(pinataUtils, 'pinFile').resolves(resultString);

//     const result = await axios.post(
//       graphqlUrl,
//       {
//         query: uploadImageToIpfsQuery,
//         variables: {
//           image: fs.createReadStream(path.resolve(__dirname, `./${filename}`)),
//         },
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${accessToken}`,
//         },
//       },
//     );

//     assert.equal(result.data.data, resultString);
//   });
// }
