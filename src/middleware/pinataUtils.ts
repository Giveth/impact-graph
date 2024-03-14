/**
 * Pinata cloud functions helper
 */

import pinataSDK, { PinataPinResponse } from '@pinata/sdk';
import config from '../config';
import ReadableStream = NodeJS.ReadableStream;

let _pinata: pinataSDK;

export const getPinata = (): pinataSDK => {
  if (!_pinata) {
    _pinata = new pinataSDK({
      pinataApiKey: config.get('PINATA_API_KEY') as string,
      pinataSecretApiKey: config.get('PINATA_SECRET_API_KEY') as string,
    });
  }
  return _pinata;
};

export const pinFile = (
  file: ReadableStream,
  filename: string = 'untitled',
): Promise<PinataPinResponse> => {
  return getPinata().pinFileToIPFS(file, {
    pinataMetadata: { name: filename.toString() },
  });
};

export const pinFileDataBase64 = (
  fileDataBase64: string,
  filename: string = 'untitled',
): Promise<PinataPinResponse> => {
  const array = fileDataBase64.split(',');
  const base64FileData =
    array.length > 1 && array[0].indexOf('base64') >= 0 ? array[1] : array[0];
  const fileData = Buffer.from(base64FileData, 'base64');

  return getPinata().pinFileToIPFS(fileData, {
    pinataMetadata: { name: filename.toString() },
  });
};
