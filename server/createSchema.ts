import config from '../config';
import * as TypeORM from 'typeorm';
import { entities } from '../entities/entities';
import { seedDatabase } from '../helpers';
import * as TypeGraphQL from 'type-graphql';
import { resolvers } from '../resolvers/resolvers';
import { Container } from 'typedi';
import { userCheck } from '../auth/userCheck';
import { RegisterResolver } from '../user/register/RegisterResolver';
import { ConfirmUserResolver } from '../user/ConfirmUserResolver';
import { GraphQLSchema } from 'graphql';

const createSchema = async (): Promise<GraphQLSchema> => {
    TypeORM.useContainer(Container)

    if (config.get('REGISTER_USERNAME_PASSWORD') === 'true') {
        resolvers.push.apply(resolvers, [RegisterResolver, ConfirmUserResolver])
    }

    const dropSchema = config.get('TYPEORM_DROP_SCHEMA') === 'true'
    await TypeORM.createConnection({
        type: 'postgres',
        database: config.get('TYPEORM_DATABASE_NAME') as string,
        username: config.get('TYPEORM_DATABASE_USER') as string,
        password: config.get('TYPEORM_DATABASE_PASSWORD') as string,
        port: config.get('PORT') as number,
        host: config.get('TYPEORM_DATABASE_HOST') as string,
        entities,
        synchronize: true,
        logger: 'advanced-console',
        logging: 'all',
        dropSchema,
        cache: true
    })

    // if (dropSchema) {
    //     // seed database with some data
    //     const { defaultUser } = await seedDatabase()
    // }
    //
    // build TypeGraphQL executable schema
    const schema = await TypeGraphQL.buildSchema({
        resolvers,
        container: Container,
        authChecker: userCheck
    })
    return schema
}

export default createSchema;