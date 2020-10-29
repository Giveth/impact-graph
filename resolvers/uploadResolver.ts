// tslint:disable-next-line:no-var-requires
require('dotenv').config()

import { Arg, Ctx, Mutation, Resolver } from 'type-graphql'
import { GraphQLUpload, FileUpload } from 'graphql-upload';
import { MyContext } from '../types/MyContext'

import { pinFile } from '../middleware/pinataUtils';


@Resolver()
export class UploadResolver {
    @Mutation(() => String, { nullable: true })
    async upload (
        @Arg('image', () => GraphQLUpload) image: FileUpload,
        @Ctx() ctx: MyContext
    ): Promise<String | null> {
        const { filename, createReadStream, encoding } = image;

        let result: string | null = null;

        try {
            const response = await pinFile(createReadStream(), filename, encoding);
            result ='https://gateway.pinata.cloud/ipfs/' + response.data.IpfsHash;
        } catch (e) {
            console.error(e);
            throw Error('Upload file failed')
        }

        return result;
    }
}
