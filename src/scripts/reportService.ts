/* eslint-disable no-console */
import fs from 'fs';
import path from 'path';
import { MongoClient } from 'mongodb';
import config from '../config';

const mongoUri = config.get('MONGO_DB_URI') as string;
const dbName = config.get('MONGO_DB_REPORT_DB_NAME') as string;
const collectionName = 'reports';

// Function to save all reports in the MongoDB
export async function saveReportsToDB(outputFolderPath: string) {
  const client = new MongoClient(mongoUri);
  console.info('Connecting to mongo db ...');
  await client.connect();
  console.info('Connected to mongo db successfully.');
  const db = client.db(dbName);
  const collection = db.collection(collectionName);

  // Traverse the output directory and read files
  const traverseDirectory = async (dir: string) => {
    const files = await fs.promises.readdir(dir, { withFileTypes: true });

    for (const file of files) {
      const filePath = path.join(dir, file.name);

      if (file.isDirectory()) {
        // Recursively traverse subdirectories
        await traverseDirectory(filePath);
      } else if (file.isFile() && path.extname(file.name) === '.json') {
        // Read the file content
        const content = await fs.promises.readFile(filePath, 'utf8');
        const projectPath = path.relative(outputFolderPath, filePath);

        // Upsert file data and relative path to MongoDB
        await collection.updateOne(
          { projectPath }, // Query to check for existing record with the same projectPath
          {
            $set: {
              projectPath,
              content,
              createdAt: new Date(),
            },
          },
          { upsert: true }, // Insert if no document matches the query
        );

        console.info(
          `Saved ${file.name} to MongoDB with path ${path.relative(outputFolderPath, filePath)}`,
        );
      }
    }
  };

  await traverseDirectory(outputFolderPath);
  await client.close();
  console.info('All reports have been saved to MongoDB.');
}

// Function to retrieve all reports from MongoDB and recreate the folder structure
export async function restoreReportsFromDB(outputFolderPath: string) {
  const client = new MongoClient(mongoUri);
  console.info('Connecting to mongo db ...');
  await client.connect();
  console.info('Connected to mongo db successfully.');
  const db = client.db(dbName);
  const collection = db.collection(collectionName);

  // Retrieve all reports from MongoDB
  const reportsCursor = collection.find();
  const reports = await reportsCursor.toArray();

  // Restore the file structure and save each report
  for (const report of reports) {
    const restoredFilePath = path.join(outputFolderPath, report.projectPath);

    // Ensure the directory exists
    await fs.promises.mkdir(path.dirname(restoredFilePath), {
      recursive: true,
    });

    // Write the content to the file
    await fs.promises.writeFile(restoredFilePath, report.content, 'utf8');
    console.info(`Restored report to ${restoredFilePath}`);
  }

  await client.close();
  console.info('All reports have been restored from MongoDB.');
}
