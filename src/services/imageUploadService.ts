import { FileUpload } from 'graphql-upload';
import { pinFile } from '../middleware/pinataUtils';
import { errorMessages } from '../utils/errorMessages';

// only returns the url for consulting the uploaded image
export const uploadImageToIpfs = async (
  imageUpload: FileUpload,
): Promise<string> => {
  if (imageUpload) {
    const { filename, createReadStream, encoding } = await imageUpload;
    try {
      const pinResponse = await pinFile(createReadStream(), filename, encoding);
      return 'https://gateway.pinata.cloud/ipfs/' + pinResponse.data.IpfsHash;
    } catch (e) {
      throw Error(errorMessages.IPFS_IMAGE_UPLOAD_FAILED);
    }
  }
  throw Error(errorMessages.IPFS_IMAGE_UPLOAD_FAILED);
};
