import config from '../config';
import * as TypeORM from 'typeorm';
import { entities } from '../entities/entities';
import { seedDatabase } from '../helpers';
import * as TypeGraphQL from 'type-graphql';
import { resolvers } from '../resolvers/resolvers';
import { Container } from 'typedi';
import { userCheck } from '../auth/userCheck';
import { GraphQLSchema } from 'graphql';

const createSchema = async (): Promise<GraphQLSchema> => {
  // James: removing for safety. We shouldn't need to do this again except on a local dev machine
  // const seedData = config.get('SEED_DATABASE') ? config.get('SEED_DATABASE') : false
  // if (seedData === 'true') {
  //     // seed database with some data
  //     // Removed for go live, in future this can be used to init the db with data, such as seed projects or categories
  //     const { defaultUser } = await seedDatabase()
  // }

  // build TypeGraphQL executable schema
  const schema = await TypeGraphQL.buildSchema({
    resolvers,
    container: Container,
    authChecker: userCheck,
  });
  return schema;
};

export default createSchema;
