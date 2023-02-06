import * as TypeGraphQL from 'type-graphql';
import { getResolvers } from '../resolvers/resolvers';
import { Container } from 'typedi';
import { userCheck } from '../auth/userCheck';
import { GraphQLSchema } from 'graphql';
import { NonEmptyArray } from 'type-graphql';
import config from '../config';

const createSchema = async (): Promise<GraphQLSchema> => {
  // James: removing for safety. We shouldn't need to do this again except on a local dev machine
  // const seedData = config.get('SEED_DATABASE') ? config.get('SEED_DATABASE') : false
  // if (seedData === 'true') {
  //     // seed database with some data
  //     // Removed for go live, in future this can be used to init the db with data, such as seed projects or categories
  //     const { defaultUser } = await seedDatabase()
  // }

  const environment = config.get('ENVIRONMENT') as string;
  // build TypeGraphQL executable schema
  const schema = await TypeGraphQL.buildSchema({
    resolvers: getResolvers() as NonEmptyArray<Function>,
    container: Container,
    authChecker: userCheck,
    validate: {
      forbidUnknownValues: false,
      enableDebugMessages: environment !== 'production',
    },
  });
  return schema;
};

export default createSchema;
