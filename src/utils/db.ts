import * as mongoDB from 'mongodb';

let mongoClient: mongoDB.MongoClient;

export async function connectToMongo() {
  const url = process.env.DONATION_SAVE_BACKUP_CONNECTION_URI;
  if (!url) {
    throw new Error('MONGODB_CONNECTION_URL is not set');
  }
  if (!mongoClient) {
    mongoClient = new mongoDB.MongoClient(url);
    await mongoClient.connect();
  }
  return mongoClient;
}

export async function getMongoDB(): Promise<mongoDB.Db> {
  const client = await connectToMongo();
  return client.db(process.env.DONATION_SAVE_BACKUP_DATABASE);
}
