import { bootstrap } from '../src/server/bootstrap';
import {
  saveProjectDirectlyToDb,
  saveDonationDirectlyToDb,
  SEED_DATA,
  DONATION_SEED_DATA,
  REACTION_SEED_DATA,
  PROJECT_UPDATE_SEED_DATA,
} from './testUtils';
import { User } from '../src/entities/user';
import { createdb } from 'pgtools';
import { Category } from '../src/entities/category';
import { ProjectStatus } from '../src/entities/projectStatus';
import { Project, ProjectUpdate } from '../src/entities/project';
import { Reaction } from '../src/entities/reaction';
import { Token } from '../src/entities/token';
import { ProjectStatusReason } from '../src/entities/projectStatusReason';
import {
  Organization,
  ORGANIZATION_LABELS,
} from '../src/entities/organization';
import { NETWORK_IDS } from '../src/provider';
import { MainCategory } from '../src/entities/mainCategory';
import { getConnection } from 'typeorm';
import { UserProjectPowerView1662877385339 } from '../migration/1662877385339-UserProjectPowerView';
import { ProjectPowerView1662915983385 } from '../migration/1662915983385-ProjectPowerView';
import { TakePowerBoostingSnapshotProcedure1663594895751 } from '../migration/1663594895751-takePowerSnapshotProcedure';
import { ProjectFuturePowerView1668411738120 } from '../migration/1668411738120-ProjectFuturePowerView';
import { createGivPowerHistoricTablesProcedure1670429143091 } from '../migration/1670429143091-createGivPowerHistoricTablesProcedure';
import { LastSnapshotProjectPowerView1671448387986 } from '../migration/1671448387986-LastSnapshotProjectPowerView';

// This can also be a connection string
// (in which case the database part is ignored and replaced with postgres)

async function CreateDatabase() {
  const config = {
    user: process.env.TYPEORM_DATABASE_USER,
    password: process.env.TYPEORM_DATABASE_PASSWORD,
    port: process.env.TYPEORM_DATABASE_PORT,
    host: process.env.TYPEORM_DATABASE_HOST,
  };

  // // tslint:disable-next-line:no-console
  // console.log('Dropping DB');
  // try {
  //   await dropdb(config, process.env.TYPEORM_DATABASE_NAME);
  //   // don't drop cron db, because it will be used by pg_cron extension
  // } catch (e) {
  //   // tslint:disable-next-line:no-console
  //   console.log('drop db error', e);
  // }
  //
  // tslint:disable-next-line:no-console
  console.log('Create Fresh DB');
  try {
    await createdb(config, process.env.TYPEORM_DATABASE_NAME);
  } catch (e) {
    if (e?.name !== 'duplicate_database')
      // tslint:disable-next-line:no-console
      console.log('Create Fresh db error', e);
  }
}

async function seedDb() {
  await seedUsers();
  await seedCategories();
  await seedStatuses();
  await seedOrganizations();
  await seedProjects();
  await seedProjectUpdates();
  await seedLikes();
  await seedDonations();
  await seedStatusReasons();
  await seedTokens();
  await relateOrganizationsToTokens();
}

async function seedTokens() {
  for (const token of SEED_DATA.TOKENS.xdai) {
    const tokenData = {
      ...token,
      networkId: 100,
      isGivbackEligible: true,
    };
    if (token.symbol === 'GIV') {
      (tokenData as any).order = 1;
    } else if (token.symbol === 'XDAI') {
      (tokenData as any).order = 2;
    } else if (token.symbol === 'WETH') {
      (tokenData as any).order = 3;
    }
    await Token.create(tokenData as Token).save();
  }
  for (const token of SEED_DATA.TOKENS.mainnet) {
    const tokenData = {
      ...token,
      networkId: 1,
      isGivbackEligible: true,
    };
    if (token.symbol === 'GIV') {
      (tokenData as any).order = 1;
    } else if (token.symbol === 'ETH') {
      (tokenData as any).order = 2;
    }
    await Token.create(tokenData as Token).save();
  }
  for (const token of SEED_DATA.TOKENS.ropsten) {
    const tokenData = {
      ...token,
      networkId: 3,
      isGivbackEligible: true,
    };
    if (token.symbol === 'GIV') {
      (tokenData as any).order = 1;
    } else if (token.symbol === 'ETH') {
      (tokenData as any).order = 2;
    }
    await Token.create(tokenData as Token).save();
  }
  for (const token of SEED_DATA.TOKENS.goerli) {
    const tokenData = {
      ...token,
      networkId: 5,
      isGivbackEligible: true,
    };
    if (token.symbol === 'GIV') {
      (tokenData as any).order = 1;
    } else if (token.symbol === 'ETH') {
      (tokenData as any).order = 2;
    }
    await Token.create(tokenData as Token).save();
  }
}

async function seedOrganizations() {
  for (const organization of SEED_DATA.ORGANIZATIONS) {
    await Organization.create(organization).save();
  }
}

async function relateOrganizationsToTokens() {
  const tokens = await Token.createQueryBuilder('token').getMany();
  const giveth = (await Organization.findOne({
    where: {
      label: ORGANIZATION_LABELS.GIVETH,
    },
  })) as Organization;
  const trace = (await Organization.findOne({
    where: {
      label: ORGANIZATION_LABELS.TRACE,
    },
  })) as Organization;
  const givingBlock = (await Organization.findOne({
    where: {
      label: ORGANIZATION_LABELS.GIVING_BLOCK,
    },
  })) as Organization;
  const change = (await Organization.findOne({
    where: {
      label: ORGANIZATION_LABELS.CHANGE,
    },
  })) as Organization;
  giveth.tokens = tokens;
  await giveth.save();
  trace.tokens = tokens;
  await trace.save();
  const etherMainnetToken = (await Token.findOne({
    where: {
      symbol: 'ETH',
      networkId: NETWORK_IDS.MAIN_NET,
    },
  })) as Token;
  givingBlock.tokens = [etherMainnetToken];
  await givingBlock?.save();
  const changeTokens = await Token.find({
    where: [
      { symbol: 'ETH', networkId: NETWORK_IDS.MAIN_NET },
      { symbol: 'ETH', networkId: NETWORK_IDS.ROPSTEN },
      { symbol: 'ETH', networkId: NETWORK_IDS.GOERLI },
    ],
  });
  change.tokens = changeTokens;
  await change.save();
}
async function seedUsers() {
  await User.create(SEED_DATA.FIRST_USER).save();
  await User.create(SEED_DATA.SECOND_USER).save();
  await User.create(SEED_DATA.THIRD_USER).save();
  await User.create(SEED_DATA.ADMIN_USER).save();
  await User.create(SEED_DATA.PROJECT_OWNER_USER).save();
}
async function seedProjects() {
  await saveProjectDirectlyToDb(SEED_DATA.FIRST_PROJECT);
  await saveProjectDirectlyToDb(SEED_DATA.SECOND_PROJECT);
  await saveProjectDirectlyToDb(SEED_DATA.TRANSAK_PROJECT);
  await saveProjectDirectlyToDb(SEED_DATA.FOURTH_PROJECT);
  await saveProjectDirectlyToDb(SEED_DATA.FIFTH_PROJECT);
  await saveProjectDirectlyToDb(SEED_DATA.SIXTH_PROJECT);
}

async function seedProjectUpdates() {
  await ProjectUpdate.create(
    PROJECT_UPDATE_SEED_DATA.FIRST_PROJECT_UPDATE as ProjectUpdate,
  ).save();
  await ProjectUpdate.create(
    PROJECT_UPDATE_SEED_DATA.SECOND_PROJECT_UPDATE as ProjectUpdate,
  ).save();
  await ProjectUpdate.create(
    PROJECT_UPDATE_SEED_DATA.THIRD_PROJECT_UPDATE as ProjectUpdate,
  ).save();
}

async function seedLikes() {
  await Reaction.create(
    REACTION_SEED_DATA.FIRST_LIKED_PROJECT_REACTION as Reaction,
  ).save();
  await Project.update(
    { id: SEED_DATA.FIRST_PROJECT.id },
    { totalReactions: 1, qualityScore: 10 },
  );

  await Reaction.create(
    REACTION_SEED_DATA.FIRST_LIKED_PROJECT_UPDATE_REACTION as Reaction,
  ).save();
  await ProjectUpdate.update(
    { id: SEED_DATA.FIRST_PROJECT.id },
    { totalReactions: 1 },
  );
}
async function seedDonations() {
  await saveDonationDirectlyToDb(
    DONATION_SEED_DATA.FIRST_DONATION,
    SEED_DATA.FIRST_USER.id,
    SEED_DATA.FIRST_PROJECT.id,
  );
  await saveDonationDirectlyToDb(
    DONATION_SEED_DATA.SECOND_DONATION,
    SEED_DATA.FIRST_USER.id,
    SEED_DATA.FIRST_PROJECT.id,
  );
  await saveDonationDirectlyToDb(
    DONATION_SEED_DATA.INCOMPLETED_TRANSAK_DONATION,
    SEED_DATA.THIRD_USER.id,
    SEED_DATA.FIRST_PROJECT.id,
  );
  await saveDonationDirectlyToDb(
    DONATION_SEED_DATA.COMPLETED_TRANSAK_DONATION,
    SEED_DATA.THIRD_USER.id,
    SEED_DATA.FIRST_PROJECT.id,
  );
  await saveDonationDirectlyToDb(
    DONATION_SEED_DATA.FIFTH_DONATION,
    SEED_DATA.THIRD_USER.id,
    SEED_DATA.FIRST_PROJECT.id,
  );
}
async function seedCategories() {
  for (const mainCategory of SEED_DATA.MAIN_CATEGORIES) {
    await MainCategory.create({
      title: mainCategory,
      slug: mainCategory,
      description: mainCategory,
    }).save();
  }
  const foodMainCategory = await MainCategory.findOne({
    where: { title: 'food' },
  });
  const drinkMainCategory = await MainCategory.findOne({
    where: { title: 'drink' },
  });
  const nonProfitMainCategory = await MainCategory.findOne({
    where: { title: 'nonProfit' },
  });
  for (const category of SEED_DATA.FOOD_SUB_CATEGORIES) {
    await Category.create({
      name: category,
      value: category,
      source: 'adhoc',
      mainCategory: foodMainCategory as MainCategory,
    }).save();
  }
  for (const category of SEED_DATA.DRINK_SUB_CATEGORIES) {
    await Category.create({
      name: category,
      value: category,
      source: 'adhoc',
      mainCategory: drinkMainCategory as MainCategory,
    }).save();
  }

  for (const category of SEED_DATA.NON_PROFIT_SUB_CATEGORIES) {
    await Category.create({
      name: category,
      value: category,
      source: 'adhoc',
      mainCategory: nonProfitMainCategory as MainCategory,
    }).save();
  }
}
async function seedStatuses() {
  for (const status of SEED_DATA.STATUSES) {
    await ProjectStatus.create(status as ProjectStatus).save();
  }
}
async function seedStatusReasons() {
  for (const { description, statusId } of SEED_DATA.STATUS_REASONS) {
    const status = await ProjectStatus.findOne({ where: { id: statusId } });
    await ProjectStatusReason.create({
      description,
      status,
    } as ProjectStatusReason).save();
  }
}

async function runMigrations() {
  const queryRunner = getConnection().createQueryRunner();
  await queryRunner.connect();

  try {
    const userProjectPowerView = new UserProjectPowerView1662877385339();
    const projectPowerView = new ProjectPowerView1662915983385();
    const lastSnapshotProjectPowerView =
      new LastSnapshotProjectPowerView1671448387986();
    const projectFuturePowerView = new ProjectFuturePowerView1668411738120();
    const takeSnapshotProcedure =
      new TakePowerBoostingSnapshotProcedure1663594895751();
    const takeSnapshotsHistoryProcedure =
      new createGivPowerHistoricTablesProcedure1670429143091();

    await userProjectPowerView.up(queryRunner);
    await projectPowerView.up(queryRunner);
    await lastSnapshotProjectPowerView.up(queryRunner);
    await projectFuturePowerView.up(queryRunner);
    await takeSnapshotProcedure.up(queryRunner);
    await takeSnapshotsHistoryProcedure.up(queryRunner);
  } catch (e) {
    throw e;
  } finally {
    await queryRunner.release();
  }
}

before(async () => {
  try {
    await CreateDatabase();
    await bootstrap();
    await seedDb();
    await runMigrations();
  } catch (e) {
    throw new Error(`Could not setup tests requirements \n${e.message}`);
  }
});
