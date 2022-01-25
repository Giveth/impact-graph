import { bootstrap } from '../src/server/bootstrap';
import { SEED_DATA } from './testUtils';
import { User } from '../src/entities/user';
// var pgtools = require('pgtools');
import { dropdb, createdb } from 'pgtools';
import { Category } from '../src/entities/category';
import { ProjectStatus } from '../src/entities/projectStatus';
import { Project } from '../src/entities/project';

// This can also be a connection string
// (in which case the database part is ignored and replaced with postgres)

async function dropDatabaseAndCreateFreshOne() {
  const config = {
    user: process.env.TYPEORM_DATABASE_USER,
    password: process.env.TYPEORM_DATABASE_PASSWORD,
    port: process.env.TYPEORM_DATABASE_PORT,
    host: process.env.TYPEORM_DATABASE_HOST,
  };

  // tslint:disable-next-line:no-console
  console.log('Dropping DB');
  try {
    await dropdb(config, process.env.TYPEORM_DATABASE_NAME);
  } catch (e) {
    // tslint:disable-next-line:no-console
    console.log('drop db error', e);
  }

  // tslint:disable-next-line:no-console
  console.log('Create Fresh DB');
  try {
    await createdb(config, process.env.TYPEORM_DATABASE_NAME);
  } catch (e) {
    // tslint:disable-next-line:no-console
    console.log('Create Fresh db error', e);
  }
}

async function seedDb() {
  await seedUsers();
  await seedCategories();
  await seedStatuses();
  await seedProjects();
}
async function seedUsers() {
  await User.create(SEED_DATA.FIRST_USER).save();
  await User.create(SEED_DATA.SECOND_USER).save();
}
async function seedProjects() {
  await Project.create(SEED_DATA.FIRST_PROJECT).save();
  await Project.create(SEED_DATA.SECOND_PROJECT).save();
}
async function seedCategories() {
  for (const category of SEED_DATA.CATEGORIES) {
    await Category.create({
      name: category,
      value: category,
      source: 'adhoc',
    }).save();
  }
}
async function seedStatuses() {
  for (const status of SEED_DATA.STATUSES) {
    await ProjectStatus.create(status).save();
  }
}

before(async () => {
  try {
    await dropDatabaseAndCreateFreshOne();
    await bootstrap();
    await seedDb();
  } catch (e) {
    throw new Error(`Could not setup tests requirements \n${e.message}`);
  }
});
