import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient(
    // { datasources: { db: { url: `${process.env.TYPEORM_DATABASE_URL}` } } }
);
