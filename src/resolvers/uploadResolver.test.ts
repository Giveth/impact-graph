import { createReadStream, readFileSync } from 'fs';
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
import { errorMessages } from '../utils/errorMessages';
import { TraceImageOwnerType } from './uploadResolver';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const FormData = require('form-data');

// test cases
describe('upload() test cases', uploadTestCases);
describe('traceImageUpload() test cases', traceImageUpload);

function uploadTestCases() {
  const IpfsHash = 'MockIpfsHash';
  before(() => {
    sinon.stub(pinataUtils, 'pinFile').resolves({
      IpfsHash,
    });
  });

  after(() => {
    sinon.restore();
  });

  it('should not allow uploading an image when not logged in', async () => {
    const formData = new FormData();
    const filename = '../../test/images/testImage.jpg';
    const fileUpload = {
      image: null,
    };
    const operations = JSON.stringify({
      query: uploadImageToIpfsQuery,
      variables: { fileUpload },
    });
    formData.append('operations', operations);
    const map = {
      '0': ['variables.fileUpload.image'],
    };
    formData.append('map', JSON.stringify(map));
    formData.append(
      '0',
      createReadStream(path.resolve(__dirname, `./${filename}`)),
    );

    const result = await axios.post(graphqlUrl, formData, {
      // You need to use `getHeaders()` in Node.js because Axios doesn't
      // automatically set the multipart form boundary in Node.
      headers: formData.getHeaders(),
    });
    assert.equal(
      result.data.errors[0].message,
      errorMessages.AUTHENTICATION_REQUIRED,
    );
  });

  // skip this test for now
  it.skip('should allow uploading an image when logged in', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);

    const formData = new FormData();
    const filename = '../../test/images/testImage.jpg';
    const fileUpload = {
      image: null,
    };
    const operations = JSON.stringify({
      query: uploadImageToIpfsQuery,
      variables: { fileUpload },
    });
    formData.append('operations', operations);
    const map = {
      '0': ['variables.fileUpload.image'],
    };
    formData.append('map', JSON.stringify(map));
    formData.append(
      '0',
      createReadStream(path.resolve(__dirname, `./${filename}`)),
    );
    const result = await axios.post(graphqlUrl, formData, {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${accessToken}`,
      },
    });

    assert.equal(
      result.data.data.upload,
      `${process.env.PINATA_GATEWAY_ADDRESS}/ipfs/${IpfsHash}`,
    );
  });
}

function traceImageUpload() {
  const IpfsHash = 'MockIpfsHash';
  before(() => {
    sinon.stub(pinataUtils, 'pinFileDataBase64').returns(
      Promise.resolve({
        IpfsHash,
      }),
    );
  });

  after(() => {
    sinon.restore();
  });

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

    assert.equal(result.data.data.traceImageUpload, '/ipfs/' + IpfsHash);
  });
  // skip this one for now
  it.skip('should allow uploading 4k size image successfully', async () => {
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

    assert.equal(result.data.data.traceImageUpload, '/ipfs/' + IpfsHash);
  });
}
