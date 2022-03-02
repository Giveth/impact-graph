import {
  createDonation,
  listDelist,
  updateStatusOfProjects,
  verifyProjects,
} from './adminBro';
import {
  createProjectData,
  saveProjectDirectlyToDb,
  SEED_DATA,
} from '../../test/testUtils';
import { Project, ProjStatus } from '../entities/project';
import { User } from '../entities/user';
import { assert } from 'chai';
import { messages } from '../utils/messages';
import { NETWORK_IDS } from '../provider';
import { Donation } from '../entities/donation';

describe(
  'updateStatusOfProjects() test cases',
  updateStatusOfProjectsTestCases,
);

describe('verifyProjects() test cases', verifyProjectsTestCases);
describe('listDelist() test cases', listDelistTestCases);
describe('createDonation() test cases', createDonationTestCases);

function createDonationTestCases() {
  it('Should create donations for csv airDrop', async () => {
    // https://blockscout.com/xdai/mainnet/tx/0x7a063fbb9dc674f814b8b7607e64f20e09ce4b891de72360d8be3e5ac92a4351

    const ethPrice = 2800;
    const txHash =
      '0x7a063fbb9dc674f814b8b7607e64f20e09ce4b891de72360d8be3e5ac92a4351';
    const firstProjectAddress = '0x21e0Ca21F517a26db49Ec8FCf05FCeAbBABe98FA';
    const secondProjectAddress = '0xD6c10A567A6D06eBb357f7b93195C65eC9F42Ab4';
    const thirdProjectAddress = '0x2C0d12Ecee29f36c39510Ac41d6dd1287D4Fbf8A';
    const forthProjectAddress = '0xc172542e7F4F625Bb0301f0BafC423092d9cAc71';
    const fifthProjectAddress = '0x87f1C862C166b0CEb79da7ad8d0864d53468D076';
    const sixthProjectAddress = '0xe3f738ff9fA4E157cAB12EE6f1847F680495229A';
    const firstProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress: firstProjectAddress,
    });
    const secondProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress: secondProjectAddress,
    });
    const thirdProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress: thirdProjectAddress,
    });
    const forthProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress: forthProjectAddress,
    });
    const fifthProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress: fifthProjectAddress,
    });
    const sixthProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress: sixthProjectAddress,
    });
    const adminUser = await User.findOne({ id: SEED_DATA.ADMIN_USER.id });
    await createDonation(
      {
        query: {
          recordIds: '',
        },
        payload: {
          transactionNetworkId: NETWORK_IDS.XDAI,
          transactionId: txHash,
          currency: 'WETH',
          priceUsd: ethPrice,
          txType: 'csvAirDrop',
          segmentNotified: true,
        },
      },
      {
        send: () => {
          //
        },
      },
      {
        currentAdmin: adminUser as User,
        h: {},
        resource: {},
        records: [],
      },
    );

    const firstDonation = await Donation.findOne({
      transactionId: txHash,
      toWalletAddress: firstProjectAddress.toLowerCase(),
    });
    assert.isOk(firstDonation);
    assert.equal(firstDonation?.projectId, firstProject.id);

    const secondDonation = await Donation.findOne({
      transactionId: txHash,
      toWalletAddress: secondProjectAddress.toLowerCase(),
    });
    assert.isOk(secondDonation);
    assert.equal(secondDonation?.projectId, secondProject.id);

    const thirdDonation = await Donation.findOne({
      transactionId: txHash,
      toWalletAddress: thirdProjectAddress.toLowerCase(),
    });
    assert.isOk(thirdDonation);
    assert.equal(thirdDonation?.projectId, thirdProject.id);

    const forthDonation = await Donation.findOne({
      transactionId: txHash,
      toWalletAddress: forthProjectAddress.toLowerCase(),
    });
    assert.isOk(forthDonation);
    assert.equal(forthDonation?.projectId, forthProject.id);

    const fifthDonation = await Donation.findOne({
      transactionId: txHash,
      toWalletAddress: fifthProjectAddress.toLowerCase(),
    });
    assert.isOk(fifthDonation);
    assert.equal(fifthDonation?.projectId, fifthProject.id);

    const sixthDonation = await Donation.findOne({
      transactionId: txHash,
      toWalletAddress: sixthProjectAddress.toLowerCase(),
    });
    assert.isOk(sixthDonation);
    assert.equal(sixthDonation?.projectId, sixthProject.id);

    const allTxDonations = await Donation.find({
      transactionId: txHash,
    });
    assert.equal(allTxDonations.length, 6);
    for (const donation of allTxDonations) {
      assert.equal(donation.donationType, 'csvAirDrop');
      assert.equal(donation.status, 'verified');
      assert.equal(donation.priceUsd, ethPrice);
      assert.equal(donation.segmentNotified, true);
      assert.equal(donation.amount, 0.0001);
      assert.equal(
        donation.createdAt.getTime(),
        new Date('2022-02-28T00:05:35.000Z').getTime(),
      );
    }
  });
}

function updateStatusOfProjectsTestCases() {
  it('should deList and unverified project, when changing status of one project to cancelled', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: true,
      listed: true,
    });
    const adminUser = await User.findOne({ id: SEED_DATA.ADMIN_USER.id });
    const result = await updateStatusOfProjects(
      {
        currentAdmin: adminUser as User,
        h: {},
        resource: {},
        records: [],
      },
      {
        query: {
          recordIds: String(project.id),
        },
      },
      ProjStatus.cancelled,
    );
    assert.equal(
      result.notice.message,
      messages.PROJECT_STATUS_UPDATED_SUCCESSFULLY,
    );

    const updatedProject = await Project.findOne({ id: project.id });
    assert.isOk(updatedProject);
    assert.equal(updatedProject?.statusId, ProjStatus.cancelled);
    assert.isNotTrue(updatedProject?.verified);
    assert.isNotTrue(updatedProject?.listed);
  });

  it('should deList and unverified project, when changing status of multi projects to cancelled', async () => {
    const firstProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: true,
      listed: true,
    });
    const secondProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: true,
      listed: true,
    });
    const adminUser = await User.findOne({ id: SEED_DATA.ADMIN_USER.id });
    const result = await updateStatusOfProjects(
      {
        currentAdmin: adminUser as User,
        h: {},
        resource: {},
        records: [],
      },
      {
        query: {
          recordIds: `${firstProject.id},${secondProject.id}`,
        },
      },
      ProjStatus.cancelled,
    );
    assert.equal(
      result.notice.message,
      'Project(s) status successfully updated',
    );

    const updatedFirstProject = await Project.findOne({ id: firstProject.id });
    assert.isOk(updatedFirstProject);
    assert.equal(updatedFirstProject?.statusId, ProjStatus.cancelled);
    assert.isNotTrue(updatedFirstProject?.verified);
    assert.isNotTrue(updatedFirstProject?.listed);

    const updatedSecondProject = await Project.findOne({
      id: secondProject.id,
    });
    assert.isOk(updatedSecondProject);
    assert.equal(updatedSecondProject?.statusId, ProjStatus.cancelled);
    assert.isNotTrue(updatedSecondProject?.verified);
    assert.isNotTrue(updatedSecondProject?.listed);
  });
}

function verifyProjectsTestCases() {
  it('should unverify projects when the badge is revoked', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: true,
      listed: true,
    });
    const adminUser = await User.findOne({ id: SEED_DATA.ADMIN_USER.id });
    await verifyProjects(
      {
        currentAdmin: adminUser as User,
        h: {},
        resource: {},
        records: [],
      },
      {
        query: {
          recordIds: String(project.id),
        },
      },
      true, // give priority to revoke badge
      true, // revoke badge
    );

    const updatedProject = await Project.findOne({ id: project.id });
    assert.isOk(updatedProject);
    assert.isFalse(updatedProject?.verified);
    assert.isTrue(updatedProject?.listed);
  });
  it('should not change listed(true) status when verifying project', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: false,
      listed: true,
    });
    const adminUser = await User.findOne({ id: SEED_DATA.ADMIN_USER.id });
    await verifyProjects(
      {
        currentAdmin: adminUser as User,
        h: {},
        resource: {},
        records: [],
      },
      {
        query: {
          recordIds: String(project.id),
        },
      },
      true,
    );

    const updatedProject = await Project.findOne({ id: project.id });
    assert.isOk(updatedProject);
    assert.isTrue(updatedProject?.verified);
    assert.isTrue(updatedProject?.listed);
  });

  it('should not change listed(false) status when verifying project', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: false,
      listed: false,
    });
    const adminUser = await User.findOne({ id: SEED_DATA.ADMIN_USER.id });
    await verifyProjects(
      {
        currentAdmin: adminUser as User,
        h: {},
        resource: {},
        records: [],
      },
      {
        query: {
          recordIds: String(project.id),
        },
      },
      true,
    );

    const updatedProject = await Project.findOne({ id: project.id });
    assert.isOk(updatedProject);
    assert.isTrue(updatedProject?.verified);
    assert.isFalse(updatedProject?.listed);
  });

  it('should not change listed(true) status when unVerifying project', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: true,
      listed: true,
    });
    const adminUser = await User.findOne({ id: SEED_DATA.ADMIN_USER.id });
    await verifyProjects(
      {
        currentAdmin: adminUser as User,
        h: {},
        resource: {},
        records: [],
      },
      {
        query: {
          recordIds: String(project.id),
        },
      },
      false,
    );

    const updatedProject = await Project.findOne({ id: project.id });
    assert.isOk(updatedProject);
    assert.isFalse(updatedProject?.verified);
    assert.isTrue(updatedProject?.listed);
  });

  it('should not change listed(false) status when unVerifying project', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: true,
      listed: false,
    });
    const adminUser = await User.findOne({ id: SEED_DATA.ADMIN_USER.id });
    await verifyProjects(
      {
        currentAdmin: adminUser as User,
        h: {},
        resource: {},
        records: [],
      },
      {
        query: {
          recordIds: String(project.id),
        },
      },
      false,
    );

    const updatedProject = await Project.findOne({ id: project.id });
    assert.isOk(updatedProject);
    assert.isFalse(updatedProject?.verified);
    assert.isFalse(updatedProject?.listed);
  });
}

function listDelistTestCases() {
  it('should not change verified(true) status when listing project', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: true,
      listed: false,
    });
    const adminUser = await User.findOne({ id: SEED_DATA.ADMIN_USER.id });
    await listDelist(
      {
        currentAdmin: adminUser as User,
        h: {},
        resource: {},
        records: [],
      },
      {
        query: {
          recordIds: String(project.id),
        },
      },
      true,
    );

    const updatedProject = await Project.findOne({ id: project.id });
    assert.isOk(updatedProject);
    assert.isTrue(updatedProject?.listed);
    assert.isTrue(updatedProject?.listed);
  });

  it('should not change verified(false) status when listing project', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: false,
      listed: false,
    });
    const adminUser = await User.findOne({ id: SEED_DATA.ADMIN_USER.id });
    await listDelist(
      {
        currentAdmin: adminUser as User,
        h: {},
        resource: {},
        records: [],
      },
      {
        query: {
          recordIds: String(project.id),
        },
      },
      true,
    );

    const updatedProject = await Project.findOne({ id: project.id });
    assert.isOk(updatedProject);
    assert.isFalse(updatedProject?.verified);
    assert.isTrue(updatedProject?.listed);
  });

  it('should not change verified(true) status when deListing project', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: true,
      listed: true,
    });
    const adminUser = await User.findOne({ id: SEED_DATA.ADMIN_USER.id });
    await listDelist(
      {
        currentAdmin: adminUser as User,
        h: {},
        resource: {},
        records: [],
      },
      {
        query: {
          recordIds: String(project.id),
        },
      },
      false,
    );

    const updatedProject = await Project.findOne({ id: project.id });
    assert.isOk(updatedProject);
    assert.isTrue(updatedProject?.verified);
    assert.isFalse(updatedProject?.listed);
  });

  it('should not change verified(false) status when deListing project', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: false,
      listed: true,
    });
    const adminUser = await User.findOne({ id: SEED_DATA.ADMIN_USER.id });
    await listDelist(
      {
        currentAdmin: adminUser as User,
        h: {},
        resource: {},
        records: [],
      },
      {
        query: {
          recordIds: String(project.id),
        },
      },
      false,
    );

    const updatedProject = await Project.findOne({ id: project.id });
    assert.isOk(updatedProject);
    assert.isFalse(updatedProject?.verified);
    assert.isFalse(updatedProject?.listed);
  });
}
