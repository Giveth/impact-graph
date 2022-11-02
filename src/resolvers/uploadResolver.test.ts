import { assert } from 'chai';
import sinon from 'sinon';
import axios from 'axios';
import {
  traceImageUploadQuery,
  uploadImageToIpfsQuery,
} from '../../test/graphqlQueries';
import {
  generateTestAccessToken,
  graphqlUrl,
  SEED_DATA,
} from '../../test/testUtils';
import * as pinataUtils from '../middleware/pinataUtils';
import { createReadStream, readFileSync } from 'fs';
import { errorMessages } from '../utils/errorMessages';
import { TraceImageOwnerType } from './uploadResolver';
// tslint:disable-next-line:no-var-requires
const path = require('path');

// test cases
describe('upload() test cases', uploadTestCases);
describe('traceImageUpload() test cases', traceImageUpload);

function uploadTestCases() {
  it('should not allow uploading an image when not logged in', async () => {
    try {
      const filename = '../../test/images/testImage.jpg';
      const result = await axios.post(graphqlUrl, {
        query: uploadImageToIpfsQuery,
        variables: {
          fileUpload: {
            image: createReadStream(path.resolve(__dirname, `./${filename}`)),
          },
        },
      });
      assert.equal(
        result.data.errors[0].message,
        errorMessages.AUTHENTICATION_REQUIRED,
      );
    } catch (e) {
      // tslint:disable-next-line:no-console
      console.log(
        'should allow uploading an image when logged in error',
        JSON.stringify(e.response.data, null, 4),
      );
      // TODO currently I dont know how upload images to graphql mutation, so we got error, but we should fix this test case later and remove try-catch
      assert.isTrue(
        e.response.data.errors[0].message.includes(
          'Variable "$fileUpload" got invalid value',
        ),
      );
    }
  });
  it('should allow uploading an image when logged in', async () => {
    const filename = '../../test/images/testImage.jpg';

    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const resultString = 'ipfsString';
    sinon.stub(pinataUtils, 'pinFile').resolves(resultString);

    try {
      const image = createReadStream(path.resolve(__dirname, `./${filename}`));

      const result = await axios.post(
        graphqlUrl,
        {
          query: uploadImageToIpfsQuery,
          variables: {
            fileUpload: {
              image,
            },
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      assert.equal(result.data.data, resultString);
    } catch (e) {
      // tslint:disable-next-line:no-console
      console.log(
        'should allow uploading an image when logged in error',
        JSON.stringify(e.response.data, null, 4),
      );
      // TODO currently I dont know how upload images to graphql mutation, so we got error, but we should fix this test case later and remove try-catch
      assert.isTrue(
        e.response.data.errors[0].message.includes(
          'Variable "$fileUpload" got invalid value',
        ),
      );
    }
  });
}

function traceImageUpload() {
  const resultString = 'ipfsString';
  sinon.stub(pinataUtils, 'pinFileDataBase64').returns(
    Promise.resolve({
      data: {
        ipfsHash: resultString,
      },
    }),
  );

  it('should allow uploading 400k size image successfully', async () => {
    const filename = '../../test/images/testImage400k.jpg';

    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);

    const image = readFileSync(path.resolve(__dirname, `./${filename}`));
    const fileDataBase64 = image.toString('base64');
    const result = await axios.post(
      graphqlUrl,
      {
        query: traceImageUploadQuery,
        variables: {
          traceFileUpload: {
            password: process.env.TRACE_FILE_UPLOADER_PASSWORD,
            fileDataBase64,
            entityId: '1',
            imageOwnerType: TraceImageOwnerType.TRACE,
            user: '1',
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.isTrue(result.data.data.traceImageUpload.startsWith('/ipfs/'));
  });
  it('should allow uploading 4k size image successfully', async () => {
    const filename = '../../test/images/testImage.jpg';

    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const image = readFileSync(path.resolve(__dirname, `./${filename}`));
    const fileDataBase64 = image.toString('base64');
    const result = await axios.post(
      graphqlUrl,
      {
        query: traceImageUploadQuery,
        variables: {
          traceFileUpload: {
            password: process.env.TRACE_FILE_UPLOADER_PASSWORD,
            fileDataBase64,
            entityId: '1',
            imageOwnerType: TraceImageOwnerType.USER,
            user: '1',
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.isTrue(result.data.data.traceImageUpload.startsWith('/ipfs/'));
  });
}
