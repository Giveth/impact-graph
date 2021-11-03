import config from '../config';
import { ApolloServer } from 'apollo-server-express';
import createSchema from './createSchema';
import { ApolloServerPluginUsageReportingDisabled } from 'apollo-server-core';

const createServerWithDummyUser = async () => {
  const schema = await createSchema();

  // Create GraphQL server
  const apolloServer = new ApolloServer({
    schema,
    context: ({ req = {}, res = {} }: any) => {
      req.user = {
        email: 'dummy@example.com',
        name: 'dummy-user',
        userId: 1,
      };
      req.userwalletAddress = '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

      return {
        req,
        res,
      };
    },
    playground: {
      endpoint: '/graphql',
    },
    uploads: {
      maxFileSize: (config.get('UPLOAD_FILE_MAX_SIZE') as number) || 2000000,
    },
    plugins: [ApolloServerPluginUsageReportingDisabled()],
  });
  return apolloServer;
};

export { createServerWithDummyUser };
