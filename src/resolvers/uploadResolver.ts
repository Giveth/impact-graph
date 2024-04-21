import {
  Arg,
  Ctx,
  Field,
  InputType,
  Mutation,
  registerEnumType,
  Resolver,
} from 'type-graphql';
import GraphQLUpload from 'graphql-upload/GraphQLUpload.js';
import { FileUpload } from 'graphql-upload/Upload.js';
import { ApolloContext } from '../types/ApolloContext';
import { pinFile, pinFileDataBase64 } from '../middleware/pinataUtils';
import { logger } from '../utils/logger';
import { getLoggedInUser } from '../services/authorizationServices';
import { i18n, translationErrorMessagesKeys } from '../utils/errorMessages';
import SentryLogger from '../sentryLogger';

@InputType()
export class FileUploadInputType {
  // Client uploads image file
  @Field(_type => GraphQLUpload)
  image: FileUpload;
}

export enum TraceImageOwnerType {
  USER = 'USER',
  TRACE = 'TRACE',
  CAMPAIGN = 'CAMPAIGN',
  DAC = 'DAC',
}
registerEnumType(TraceImageOwnerType, {
  name: 'TraceImageOwnerType',
  description:
    'The entity (e.g. user, trace, campaign, or community) type owns the image',
});

@InputType()
export class TraceFileUploadInputType {
  // Client uploads image file
  @Field()
  fileDataBase64: string;

  @Field()
  user: string;

  @Field()
  entityId: string;

  @Field(_type => TraceImageOwnerType)
  imageOwnerType: TraceImageOwnerType;

  @Field()
  password: string;
}

@Resolver()
export class UploadResolver {
  @Mutation(() => String, { nullable: true })
  async upload(
    @Arg('fileUpload') fileUpload: FileUploadInputType,
    @Ctx() ctx: ApolloContext,
  ): Promise<string> {
    await getLoggedInUser(ctx);
    // if (!fileUpload.image) {
    //   throw Error('Upload file failed');
    // }
    const { filename, createReadStream } = await fileUpload.image;

    try {
      const response = await pinFile(createReadStream(), filename);
      return `${process.env.PINATA_GATEWAY_ADDRESS}/ipfs/${response.IpfsHash}`;
    } catch (e) {
      logger.error('upload() error', e);
      throw Error(
        i18n.__(translationErrorMessagesKeys.IPFS_IMAGE_UPLOAD_FAILED),
      );
    }
  }

  @Mutation(() => String, { nullable: true })
  async traceImageUpload(
    @Arg('traceFileUpload') traceFileUpload: TraceFileUploadInputType,
    @Ctx() ctx: ApolloContext,
  ): Promise<string> {
    const { fileDataBase64, password } = traceFileUpload;

    let errorMessage;
    if (!process.env.TRACE_FILE_UPLOADER_PASSWORD) {
      errorMessage = `No password is defined for trace file uploader `;
    } else if (password !== process.env.TRACE_FILE_UPLOADER_PASSWORD) {
      // @ts-expect-error ip is not null
      errorMessage = `Invalid password to upload trace image from ip ${ctx?.req?.ip}`;
    }

    if (errorMessage) {
      const userMessage = 'Access denied';
      SentryLogger.captureMessage(errorMessage);
      logger.error(errorMessage);
      throw new Error(userMessage);
    }

    try {
      const response = await pinFileDataBase64(fileDataBase64, undefined);
      return `/ipfs/${response.IpfsHash}`;
    } catch (e) {
      logger.error('upload() error', e);
      throw Error(
        i18n.__(translationErrorMessagesKeys.IPFS_IMAGE_UPLOAD_FAILED),
      );
    }
  }
}
