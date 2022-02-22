import { assert } from 'chai';
import sinon from 'sinon';
import axios from 'axios';
import { uploadImageToIpfsQuery } from '../../test/graphqlQueries';
import {
  generateTestAccessToken,
  graphqlUrl,
  SEED_DATA,
} from '../../test/testUtils';
import * as pinataUtils from '../middleware/pinataUtils';
import { createReadStream } from 'fs';
// tslint:disable-next-line:no-var-requires
const path = require('path');

// tslint:disable-next-line:no-var-requires
const FormData = require('form-data');

// test cases
describe('upload() test cases', uploadTestCases);

function uploadTestCases() {
  it('should not allow uploading an image when not logged in', async () => {
    const filename = '../../test/images/testImage.jpg';
    const result = await axios.post(graphqlUrl, {
      query: uploadImageToIpfsQuery,
      variables: {
        fileUpload: {
          image: createReadStream(path.resolve(__dirname, `./${filename}`)),
        },
      },
    });

    // tslint:disable-next-line:no-console
    console.log(result);
  });
  it('should allow uploading an image when logged in', async () => {
    const filename = '../../test/images/testImage.jpg';

    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const resultString = 'ipfsString';
    sinon.stub(pinataUtils, 'pinFile').resolves(resultString);

    try {
      const image = {
        createReadStream: createReadStream(
          path.resolve(__dirname, `./${filename}`),
        ),
        filename: 'test.jpg',
        encoding: null,
      };
      // tslint:disable-next-line:no-console
      console.log('*****upload***** image', JSON.stringify(image, null, 4));
      const data = new FormData();
      data.append({
        image: createReadStream(path.resolve(__dirname, `./${filename}`)),
      });

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
        '*****upload***** result',
        JSON.stringify(e.response.data, null, 4),
      );
    }
  });
}
