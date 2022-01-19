import { Arg, Ctx, Mutation, Resolver } from 'type-graphql';
import { GraphQLUpload, FileUpload } from 'graphql-upload';
import { MyContext } from '../types/MyContext';

import { pinFile } from '../middleware/pinataUtils';
import { logger } from '../utils/logger';

@Resolver()
export class UploadResolver {
  @Mutation(() => String, { nullable: true })
  async upload(
    @Arg('image', () => GraphQLUpload) image: FileUpload,
    @Ctx() ctx: MyContext,
  ): Promise<String> {
    const { filename, createReadStream, encoding } = image;

    try {
      const response = await pinFile(createReadStream(), filename, encoding);
      return 'https://gateway.pinata.cloud/ipfs/' + response.data.IpfsHash;
    } catch (e) {
      logger.error('upload() error', e);
      throw Error('Upload file failed');
    }
  }
}
