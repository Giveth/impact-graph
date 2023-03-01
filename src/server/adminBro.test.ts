// @ts-ignore-start
import {
  addFeaturedProjectUpdate,
  createDonation,
  createToken,
  exportProjectsWithFiltersToCsv,
  generateOrganizationList,
  importThirdPartyProject,
  linkOrganizations,
  listDelist,
  permute,
  sendBroadcastNotification,
  updateStatusOfProjects,
  verifyProjects,
} from './adminBro';
import {
  createProjectData,
  generateRandomEtheriumAddress,
  generateRandomTxHash,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
  SEED_DATA,
  sleep,
} from '../../test/testUtils';
import {
  Project,
  ProjectUpdate,
  ProjStatus,
  ReviewStatus,
  RevokeSteps,
} from '../entities/project';
import { User } from '../entities/user';
import { assert } from 'chai';
import { messages } from '../utils/messages';
import { HISTORY_DESCRIPTIONS } from '../entities/projectStatusHistory';
import { ProjectStatus } from '../entities/projectStatus';
import { NETWORK_IDS } from '../provider';
import {
  Donation,
  DONATION_STATUS,
  DONATION_TYPES,
} from '../entities/donation';
import * as ChangeAPI from '../services/changeAPI/nonProfits';
import sinon from 'sinon';
import { errorMessages } from '../utils/errorMessages';
import { Token } from '../entities/token';
import { Organization, ORGANIZATION_LABELS } from '../entities/organization';
import {
  createProjectVerificationForm,
  getVerificationFormByProjectId,
} from '../repositories/projectVerificationRepository';
import {
  PROJECT_VERIFICATION_STATUSES,
  PROJECT_VERIFICATION_STEPS,
} from '../entities/projectVerificationForm';
import {
  findProjectById,
  verifyMultipleProjects,
} from '../repositories/projectRepository';
import { ProjectAddress } from '../entities/projectAddress';
import BroadcastNotification, {
  BROAD_CAST_NOTIFICATION_STATUS,
} from '../entities/broadcastNotification';
import { findBroadcastNotificationById } from '../repositories/broadcastNotificationRepository';
import { findUserById } from '../repositories/userRepository';
import { findOneProjectStatusHistory } from '../repositories/projectSatusHistoryRepository';
import { findTokenByTokenAddress } from '../repositories/tokenRepository';
import { FeaturedProject } from '../entities/featuredProject';

describe(
  'updateStatusOfProjects() test cases',
  updateStatusOfProjectsTestCases,
);
describe(
  'verifyMultipleProjects() test cases',
  verifyMultipleProjectsTestCases,
);
describe(
  'generateOrganizationListTestCases',
  generateOrganizationListTestCases,
);
describe('permuteTestCases', permuteTestCases);
describe('verifyProjects() test cases', verifyProjectsTestCases);
describe('listDelist() test cases', listDelistTestCases);
describe('createToken() test cases', createTokenTestCases);
describe('linkOrganizations() test cases', linkOrganizationsTestCases);
describe('createDonation() test cases', createDonationTestCases);
describe(
  'exportProjectsWithFiltersToCsv() test cases',
  exportProjectsWithFiltersToCsvTestCases,
);
describe(
  'importThirdPartyProject() test cases',
  importThirdPartyProjectTestCases,
);
describe(
  'addToFeaturedProjectUpdate() TestCases',
  addToFeaturedProjectUpdateTestCases,
);
describe(
  'sendBroadcastNotification() test cases',
  sendBroadcastNotificationTestCases,
);

const recursiveFactorial = (n: number) => {
  if (n === 0) {
    return 1;
  }
  return n * recursiveFactorial(n - 1);
};

function permuteTestCases() {
  // it should follow the combination formula without repetition
  // n = elements to choose from
  // k = elements chosen (array lenghs to generate)
  // Ck(n) = ( n  k )  = n! / k!(n−k)!
  it('should permute 4 items with lenght 2 for a result of 6 combinations', async () => {
    const n = 4;
    const items = ['a', 'b', 'c', 'd'];
    const k = 2;
    const nFact = recursiveFactorial(n);
    const kFact = recursiveFactorial(k);
    const differenceFact = recursiveFactorial(n - k);
    // Ck(n) = ( n  k )  = n! / k!(n−k)!
    const result = nFact / (kFact * differenceFact);

    const organizationsPermuted = permute(items, k);
    assert.equal(organizationsPermuted.length, 6);
    assert.equal(organizationsPermuted.length, result);
  });
  it('should permute 4 items with length 3 for a result of 4 combinations', async () => {
    const n = 4;
    const items = ['a', 'b', 'c', 'd'];
    const k = 3;
    const nFact = recursiveFactorial(n);
    const kFact = recursiveFactorial(k);
    const differenceFact = recursiveFactorial(n - k);
    // Ck(n) = ( n  k )  = n! / k!(n−k)!
    const result = nFact / (kFact * differenceFact);
    const organizationsPermuted = permute(items, k);
    assert.equal(organizationsPermuted.length, 4);
    assert.equal(organizationsPermuted.length, result);
  });
}

function generateOrganizationListTestCases() {
  // this includes all organizations option
  it('should return 15 permutations option when 4 organizations are present', async () => {
    let totalPermutations = 0;
    const [_, n] = await Organization.createQueryBuilder('organization')
      .orderBy('organization.id')
      .getManyAndCount();
    // there is no take 0 elements case
    for (let i = 1; i <= n; i++) {
      const k = i;
      const nFact = recursiveFactorial(n);
      const kFact = recursiveFactorial(k);
      const differenceFact = recursiveFactorial(n - k);
      // Ck(n) = ( n  k )  = n! / k!(n−k)!
      const result = nFact / (kFact * differenceFact);
      totalPermutations = totalPermutations + result;
    }

    const organizationDropdown = await generateOrganizationList();
    assert.equal(organizationDropdown.length, 15);
    assert.equal(organizationDropdown.length, totalPermutations);
  });
  it('should return 31 permutations when 5 organizations are present', async () => {
    let totalPermutations = 0;
    const organization = Organization.create({
      name: 'NewOrg',
      label: 'neworg',
      supportCustomTokens: true,
      website: 'neworg.org',
    });
    await organization.save();

    const [_, n] = await Organization.createQueryBuilder('organization')
      .orderBy('organization.id')
      .getManyAndCount();
    // there is no take 0 elements case
    for (let i = 1; i <= n; i++) {
      const k = i;
      const nFact = recursiveFactorial(n);
      const kFact = recursiveFactorial(k);
      const differenceFact = recursiveFactorial(n - k);
      // Ck(n) = ( n  k )  = n! / k!(n−k)!
      const result = nFact / (kFact * differenceFact);
      totalPermutations = totalPermutations + result;
    }

    const organizationDropdown = await generateOrganizationList();
    assert.equal(organizationDropdown.length, 31);
    assert.equal(organizationDropdown.length, totalPermutations);
  });
}

const DRGTTokenAddress = generateRandomTxHash();
function createTokenTestCases() {
  it('should create token when unique it is unique by network, address', async () => {
    await createToken(
      {
        query: {},
        payload: {
          address: DRGTTokenAddress,
          decimals: 18,
          isGivbackEligible: true,
          mainnetAddress: '',
          name: 'DragonToken',
          networkId: 1,
          symbol: 'DRGT',
          organizations: 'giveth,trace',
        },
      },
      {
        send: () => {
          // ..
        },
      },
    );

    const newToken = await findTokenByTokenAddress(DRGTTokenAddress);
    const organizations = await Organization.createQueryBuilder('organization')
      .where(`organization.label = 'giveth' OR organization.label = 'trace'`)
      .getMany();
    assert.isOk(newToken);
    assert.isTrue(newToken!.organizations.length === organizations.length);
    assert.equal(newToken!.organizations[0].id, organizations[0].id);
  });
  it('should not create token when it is not unique by network and address', async () => {
    await createToken(
      {
        query: {},
        payload: {
          address: DRGTTokenAddress,
          decimals: 18,
          isGivbackEligible: true,
          mainnetAddress: '',
          name: 'DragonToken',
          networkId: 1,
          symbol: 'DRGT',
          organizations: 'giveth,trace',
        },
      },
      {
        send: () => {
          // ..
        },
      },
    );

    const tokensWithAddress = await Token.find({
      where: { address: DRGTTokenAddress },
    });
    assert.equal(tokensWithAddress.length, 1);
  });
}

function linkOrganizationsTestCases() {
  it('should overwrite token organizations relationships when present', async () => {
    const token = await Token.findOne({ where: { address: DRGTTokenAddress } });
    await linkOrganizations({
      query: {},
      record: {
        params: {
          id: token!.id,
          address: DRGTTokenAddress,
          decimals: 18,
          isGivbackEligible: true,
          mainnetAddress: '',
          name: 'DragonToken',
          networkId: 1,
          symbol: 'DRGT',
          organizations: ORGANIZATION_LABELS.GIVING_BLOCK,
        },
      },
    });

    const tokenUpdated = await findTokenByTokenAddress(DRGTTokenAddress);

    assert.isTrue(tokenUpdated!.organizations.length === 1);
    assert.equal(
      tokenUpdated!.organizations[0].label,
      ORGANIZATION_LABELS.GIVING_BLOCK,
    );
  });
}

function importThirdPartyProjectTestCases() {
  it('should throw error when change api throws error', async () => {
    const adminUser = await findUserById(SEED_DATA.ADMIN_USER.id);
    const stub = sinon
      .stub(ChangeAPI, 'getChangeNonProfitByNameOrIEN')
      .rejects(errorMessages.CHANGE_API_INVALID_TITLE_OR_EIN);

    await importThirdPartyProject(
      {
        query: {},
        payload: {
          thirdPartyAPI: 'Change',
          projectName: 'ChangeApiTestProject',
        },
      },
      {
        send: () => {
          // ..
        },
      },
      {
        currentAdmin: adminUser as User,
        h: {},
        resource: {},
        records: [],
      },
    );

    const createdProject = await Project.findOne({
      where: {
        title: 'ChangeApiTestProject',
      },
    });
    assert.isNull(createdProject);
    stub.restore();
  });
  it('creates the project succesfully when changeAPI returns data', async () => {
    const adminUser = await findUserById(SEED_DATA.ADMIN_USER.id);
    sinon.stub(ChangeAPI, 'getChangeNonProfitByNameOrIEN').resolves({
      address_line: 'test',
      category: 'test',
      city: 'test',
      classification: 'test',
      crypto: {
        ethereum_address: generateRandomEtheriumAddress(),
        solana_address: generateRandomEtheriumAddress(),
      },
      ein: '1234',
      icon_url: 'test',
      id: 'test',
      mission: 'test',
      name: 'ChangeApiTestProject',
      socials: {
        facebook: 'test',
        instagram: 'instagram',
        twitter: 'twitter',
        youtube: 'youtube',
      },
      state: 'test',
      website: 'test',
      zip_code: 'test',
    });

    await importThirdPartyProject(
      {
        query: {},
        payload: {
          thirdPartyAPI: 'Change',
          projectName: 'ChangeApiTestProject',
        },
      },
      {
        send: () => {
          // ..
        },
      },
      {
        currentAdmin: adminUser as User,
        h: {},
        resource: {},
        records: [],
      },
    );

    const createdProject = await Project.findOne({
      where: {
        title: 'ChangeApiTestProject',
      },
    });
    assert.isOk(createdProject);
    assert.isTrue(createdProject?.title === 'ChangeApiTestProject');
    const address = await ProjectAddress.createQueryBuilder('address')
      .where('address.projectId = :projectId', {
        projectId: createdProject!.id,
      })
      .getOne();
    assert.equal(address?.address, createdProject!.walletAddress);
    assert.equal(address?.projectId, createdProject!.id);
    assert.equal(address?.userId, adminUser!.id);
  });
}

function verifyMultipleProjectsTestCases() {
  it('should verify projects and set verificationStatus as null', async () => {
    const project1 = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: false,
      verificationStatus: 'revoked',
      listed: true,
      reviewStatus: ReviewStatus.Listed,
    });
    const project2 = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: true,
      verificationStatus: 'reminder',
      listed: true,
      reviewStatus: ReviewStatus.Listed,
    });

    await verifyMultipleProjects({
      verified: true,
      projectsIds: [project1.id, project2.id],
    });

    const project1Updated = await Project.findOne({
      where: { id: project1.id },
    });
    const project2Updated = await Project.findOne({
      where: { id: project2.id },
    });

    assert.notEqual(project1Updated?.verificationStatus, 'revoked');
    assert.equal(project1Updated?.verificationStatus, null);
    assert.notEqual(project1Updated?.verified, false);
    assert.equal(project1Updated?.verified, true);

    assert.notEqual(project2Updated?.verificationStatus, 'reminder');
    assert.equal(project2Updated?.verificationStatus, null);
    assert.notEqual(project2Updated?.verified, false);
    assert.equal(project2Updated?.verified, true);
  });
  it('should unverify projects and not change the verificationStatus', async () => {
    const project1 = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: false,
      verificationStatus: 'revoked',
      listed: true,
      reviewStatus: ReviewStatus.Listed,
    });
    const project2 = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: true,
      verificationStatus: 'reminder',
      listed: true,
      reviewStatus: ReviewStatus.Listed,
    });

    await verifyMultipleProjects({
      verified: false,
      projectsIds: [project1.id, project2.id],
    });

    const project1Updated = await Project.findOne({
      where: { id: project1.id },
    });
    const project2Updated = await Project.findOne({
      where: { id: project2.id },
    });

    assert.equal(project1Updated?.verificationStatus, 'revoked');
    assert.notEqual(project1Updated?.verificationStatus, null);
    assert.equal(project1Updated?.verified, false);
    assert.notEqual(project1Updated?.verified, true);

    assert.equal(project2Updated?.verificationStatus, 'reminder');
    assert.notEqual(project2Updated?.verificationStatus, null);
    assert.equal(project2Updated?.verified, false);
    assert.notEqual(project2Updated?.verified, true);
  });
}

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
    const adminUser = await findUserById(SEED_DATA.ADMIN_USER.id);
    await createDonation(
      {
        query: {
          recordIds: '',
        },
        payload: {
          transactionNetworkId: NETWORK_IDS.XDAI,
          transactionId: txHash,
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
      where: {
        transactionId: txHash,
        toWalletAddress: firstProjectAddress.toLowerCase(),
      },
    });
    assert.isOk(firstDonation);
    assert.equal(firstDonation?.projectId, firstProject.id);

    const secondDonation = await Donation.findOne({
      where: {
        transactionId: txHash,
        toWalletAddress: secondProjectAddress.toLowerCase(),
      },
    });
    assert.isOk(secondDonation);
    assert.equal(secondDonation?.projectId, secondProject.id);

    const thirdDonation = await Donation.findOne({
      where: {
        transactionId: txHash,
        toWalletAddress: thirdProjectAddress.toLowerCase(),
      },
    });
    assert.isOk(thirdDonation);
    assert.equal(thirdDonation?.projectId, thirdProject.id);

    const forthDonation = await Donation.findOne({
      where: {
        transactionId: txHash,
        toWalletAddress: forthProjectAddress.toLowerCase(),
      },
    });
    assert.isOk(forthDonation);
    assert.equal(forthDonation?.projectId, forthProject.id);

    const fifthDonation = await Donation.findOne({
      where: {
        transactionId: txHash,
        toWalletAddress: fifthProjectAddress.toLowerCase(),
      },
    });
    assert.isOk(fifthDonation);
    assert.equal(fifthDonation?.projectId, fifthProject.id);

    const sixthDonation = await Donation.findOne({
      where: {
        transactionId: txHash,
        toWalletAddress: sixthProjectAddress.toLowerCase(),
      },
    });
    assert.isOk(sixthDonation);
    assert.equal(sixthDonation?.projectId, sixthProject.id);

    const allTxDonations = await Donation.find({
      where: {
        transactionId: txHash,
      },
    });
    assert.equal(allTxDonations.length, 6);
    for (const donation of allTxDonations) {
      assert.equal(donation.donationType, 'csvAirDrop');
      assert.equal(donation.status, 'verified');
      assert.equal(donation.priceUsd, ethPrice);
      assert.equal(donation.segmentNotified, true);
      assert.equal(donation.amount, 0.0001);
      assert.equal(
        donation.fromWalletAddress.toLowerCase(),
        '0xB6D8D84CA33C2e8fE3be1f1B4B0B7dE57cCf4a3c'.toLowerCase(),
      );
      assert.equal(donation.currency, 'WETH');
      assert.equal(
        donation.createdAt.getTime(),
        new Date('2022-02-28T00:05:35.000Z').getTime(),
      );
    }
  });
  it('Should create donations for gnosis safe', async () => {
    // https://blockscout.com/xdai/mainnet/tx/0x43f82708d1608aa9355c0738659c658b138d54f618e3322e33a4410af48c200b

    const tokenPrice = 1;
    const txHash =
      '0x43f82708d1608aa9355c0738659c658b138d54f618e3322e33a4410af48c200b';
    const firstProjectAddress = '0x10E1439455BD2624878b243819E31CfEE9eb721C';
    const firstProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress: firstProjectAddress,
    });
    const adminUser = await findUserById(SEED_DATA.ADMIN_USER.id);
    await createDonation(
      {
        query: {
          recordIds: '',
        },
        payload: {
          transactionNetworkId: NETWORK_IDS.XDAI,
          transactionId: txHash,
          priceUsd: tokenPrice,
          txType: 'gnosisSafe',
          segmentNotified: true,
          isProjectVerified: true,
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
      where: {
        transactionId: txHash,
        toWalletAddress: firstProjectAddress.toLowerCase(),
      },
    });
    assert.isOk(firstDonation);
    assert.equal(firstDonation?.projectId, firstProject.id);

    const allTxDonations = await Donation.find({
      where: {
        transactionId: txHash,
      },
    });
    assert.equal(allTxDonations.length, 1);
    for (const donation of allTxDonations) {
      assert.equal(donation.donationType, DONATION_TYPES.GNOSIS_SAFE);
      assert.equal(donation.status, DONATION_STATUS.VERIFIED);
      assert.equal(donation.priceUsd, tokenPrice);
      assert.equal(donation.segmentNotified, true);
      assert.equal(donation.isProjectVerified, true);
      assert.equal(donation.amount, 5);
      assert.equal(
        donation.fromWalletAddress.toLowerCase(),
        '0x5f0253950c0a7715CBA25153a6ED5eBcFFEDe48e'.toLowerCase(),
      );
      assert.equal(donation.currency, 'USDC');
      assert.equal(
        donation.createdAt.getTime(),
        new Date('2022-07-04T16:55:30.000Z').getTime(),
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
      reviewStatus: ReviewStatus.Listed,
    });
    const adminUser = await findUserById(SEED_DATA.ADMIN_USER.id);
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

    const updatedProject = await findProjectById(project.id);
    assert.isOk(updatedProject);
    assert.equal(updatedProject?.statusId, ProjStatus.cancelled);
    assert.isNotTrue(updatedProject?.verified);
    assert.isNotTrue(updatedProject?.listed);
    assert.notEqual(updatedProject?.reviewStatus, ReviewStatus.Listed);
  });

  it('should deList and unverified project, when changing status of multi projects to cancelled', async () => {
    const firstProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: true,
      listed: true,
      reviewStatus: ReviewStatus.Listed,
    });
    const secondProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: true,
      listed: true,
      reviewStatus: ReviewStatus.Listed,
    });
    const adminUser = await findUserById(SEED_DATA.ADMIN_USER.id);
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

    const updatedFirstProject = await findProjectById(firstProject.id);
    assert.isOk(updatedFirstProject);
    assert.equal(updatedFirstProject?.statusId, ProjStatus.cancelled);
    assert.isNotTrue(updatedFirstProject?.verified);
    assert.isNotTrue(updatedFirstProject?.listed);
    assert.notEqual(updatedFirstProject?.reviewStatus, ReviewStatus.Listed);

    const updatedSecondProject = await findProjectById(secondProject.id);
    assert.isOk(updatedSecondProject);
    assert.equal(updatedSecondProject?.statusId, ProjStatus.cancelled);
    assert.isNotTrue(updatedSecondProject?.verified);
    assert.isNotTrue(updatedSecondProject?.listed);
    assert.notEqual(updatedSecondProject?.reviewStatus, ReviewStatus.Listed);
  });

  it('should create history item, when changing status of one project to cancelled', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });
    const adminUser = await findUserById(SEED_DATA.ADMIN_USER.id);
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

    const updatedProject = await findProjectById(project.id);
    assert.isOk(updatedProject);
    assert.equal(updatedProject?.statusId, ProjStatus.cancelled);
    const status = await ProjectStatus.findOne({
      where: { id: ProjStatus.cancelled },
    });

    // We should wait to history be created because creating histories use fire and forget strategy
    await sleep(50);

    const history = await findOneProjectStatusHistory({
      projectId: project.id,
      userId: adminUser?.id,
      statusId: status?.id,
    });
    assert.isOk(history);
  });
}

function verifyProjectsTestCases() {
  it('should unverify projects when the badge is revoked and set verification form as draft', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: true,
      listed: true,
      reviewStatus: ReviewStatus.Listed,
    });

    const projectVerificationForm = await createProjectVerificationForm({
      projectId: project.id,
      userId: Number(project.admin),
    });

    projectVerificationForm.status = PROJECT_VERIFICATION_STATUSES.VERIFIED;
    await projectVerificationForm.save();

    const adminUser = await findUserById(SEED_DATA.ADMIN_USER.id);
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

    const updatedProject = await findProjectById(project.id);
    const updatedVerificationForm = await getVerificationFormByProjectId(
      project.id,
    );
    assert.isOk(updatedProject);
    assert.isFalse(updatedProject?.verified);
    assert.isTrue(updatedProject?.listed);
    assert.equal(updatedProject?.reviewStatus, ReviewStatus.Listed);
    assert.equal(
      updatedVerificationForm!.status,
      PROJECT_VERIFICATION_STATUSES.DRAFT,
    );
    assert.equal(
      updatedVerificationForm!.lastStep,
      PROJECT_VERIFICATION_STEPS.MANAGING_FUNDS,
    );
    assert.equal(updatedVerificationForm!.isTermAndConditionsAccepted, false);
    assert.notEqual(
      projectVerificationForm.status,
      updatedVerificationForm!.status,
    );
    assert.notEqual(
      updatedProject?.verificationStatus,
      project.verificationStatus,
    );
    assert.equal(updatedProject?.verificationStatus, RevokeSteps.Revoked);
  });
  it('should not change listed(true) status when verifying project and set verification form as verified', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: false,
      verificationStatus: RevokeSteps.Revoked,
      listed: true,
      reviewStatus: ReviewStatus.Listed,
    });

    const projectVerificationForm = await createProjectVerificationForm({
      projectId: project.id,
      userId: Number(project.admin),
    });

    projectVerificationForm.status = PROJECT_VERIFICATION_STATUSES.DRAFT;
    await projectVerificationForm.save();

    const adminUser = await findUserById(SEED_DATA.ADMIN_USER.id);
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

    const updatedProject = await findProjectById(project.id);
    const updatedVerificationForm = await getVerificationFormByProjectId(
      project.id,
    );
    assert.isOk(updatedProject);
    assert.isTrue(updatedProject?.verified);
    assert.isTrue(updatedProject?.listed);
    assert.equal(updatedProject?.reviewStatus, ReviewStatus.Listed);
    assert.isTrue(project!.verificationStatus === RevokeSteps.Revoked);
    assert.isTrue(updatedProject!.verificationStatus === null);
    assert.equal(
      updatedVerificationForm!.status,
      PROJECT_VERIFICATION_STATUSES.VERIFIED,
    );
    assert.equal(updatedVerificationForm!.isTermAndConditionsAccepted, true);
    assert.equal(
      updatedVerificationForm!.lastStep,
      PROJECT_VERIFICATION_STEPS.SUBMIT,
    );
  });

  it('should not change listed(false) status when verifying project', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: false,
      listed: false,
      reviewStatus: ReviewStatus.NotListed,
    });
    const adminUser = await findUserById(SEED_DATA.ADMIN_USER.id);
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

    const updatedProject = await findProjectById(project.id);
    assert.isOk(updatedProject);
    assert.isTrue(updatedProject?.verified);
    assert.isFalse(updatedProject?.listed);
    assert.equal(updatedProject?.reviewStatus, ReviewStatus.NotListed);
  });

  it('should not change listed(true) status when unVerifying project', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: true,
      listed: true,
      reviewStatus: ReviewStatus.Listed,
      verificationStatus: RevokeSteps.Revoked,
    });
    const projectVerificationForm = await createProjectVerificationForm({
      projectId: project.id,
      userId: Number(project.admin),
    });

    projectVerificationForm.status = PROJECT_VERIFICATION_STATUSES.VERIFIED;
    await projectVerificationForm.save();

    const adminUser = await findUserById(SEED_DATA.ADMIN_USER.id);
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

    const updatedProject = await findProjectById(project.id);
    const updatedVerificationForm = await getVerificationFormByProjectId(
      project.id,
    );
    assert.isOk(updatedProject);
    assert.isFalse(updatedProject?.verified);
    assert.isTrue(updatedProject?.listed);
    assert.equal(updatedProject?.reviewStatus, ReviewStatus.Listed);
    assert.isTrue(updatedProject!.verificationStatus === RevokeSteps.Revoked);
    assert.equal(
      updatedVerificationForm!.status,
      PROJECT_VERIFICATION_STATUSES.DRAFT,
    );
    assert.equal(updatedVerificationForm!.isTermAndConditionsAccepted, false);
    assert.equal(
      updatedVerificationForm!.lastStep,
      PROJECT_VERIFICATION_STEPS.MANAGING_FUNDS,
    );
  });

  it('should not change listed(false) status when unVerifying project', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: true,
      listed: false,
      reviewStatus: ReviewStatus.NotListed,
    });
    const adminUser = await findUserById(SEED_DATA.ADMIN_USER.id);
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

    const updatedProject = await findProjectById(project.id);
    assert.isOk(updatedProject);
    assert.isFalse(updatedProject?.verified);
    assert.isFalse(updatedProject?.listed);
    assert.equal(updatedProject?.reviewStatus, ReviewStatus.NotListed);
  });

  it('should create history when make project verified', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: false,
    });
    const adminUser = await findUserById(SEED_DATA.ADMIN_USER.id);
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

    const updatedProject = await findProjectById(project.id);
    assert.isOk(updatedProject);
    assert.isTrue(updatedProject?.verified);

    // because we didn't put await before creating history item
    await sleep(10);

    const history = await findOneProjectStatusHistory({
      projectId: project.id,
      userId: adminUser?.id,
    });
    assert.equal(
      history?.description,
      HISTORY_DESCRIPTIONS.CHANGED_TO_VERIFIED,
    );
  });

  it('should create history when make project unverified', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: true,
    });
    const adminUser = await findUserById(SEED_DATA.ADMIN_USER.id);
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

    const updatedProject = await findProjectById(project.id);
    assert.isOk(updatedProject);
    assert.isFalse(updatedProject?.verified);

    // because we didn't put await before creating history item
    await sleep(10);

    const history = await findOneProjectStatusHistory({
      projectId: project.id,
      userId: adminUser?.id,
    });
    assert.equal(
      history?.description,
      HISTORY_DESCRIPTIONS.CHANGED_TO_UNVERIFIED,
    );
  });
}

function exportProjectsWithFiltersToCsvTestCases() {
  it('should  return error because google api key is not set', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: true,
      listed: false,
      reviewStatus: ReviewStatus.NotListed,
    });
    const adminUser = await findUserById(SEED_DATA.ADMIN_USER.id);
    const result = await exportProjectsWithFiltersToCsv(
      {
        query: {
          recordIds: '',
        },
        payload: {},
        record: {},
      },
      {
        query: {
          recordIds: String(project.id),
        },
      },
      {
        currentAdmin: adminUser as User,
        h: {},
        resource: {},
        records: [],
      },
    );

    assert.equal(result?.notice.type, 'danger');
    // If we set GOOGLE_SPREADSHEETS_PRIVATE_KEY,GOOGLE_SPREADSHEETS_CLIENT_EMAIL,GOOGLE_PROJECT_EXPORTS_SPREADSHEET_ID
    // to .env.test we would not get this error anymore
    assert.equal(result?.notice.message, 'No key or keyFile set.');
  });
}

function addToFeaturedProjectUpdateTestCases() {
  it('should add a project and selected update to the featuredProject entity', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb(
      {
        ...createProjectData(),
        title: String(new Date().getTime()),
        slug: String(new Date().getTime()),
        verified: true,
        listed: true,
      },
      user,
    );

    const projectUpdate = await ProjectUpdate.create({
      userId: user!.id,
      projectId: project.id,
      content: 'TestProjectUpdate1',
      title: 'testEditProjectUpdate1',
      createdAt: new Date(),
      isMain: false,
    }).save();

    await addFeaturedProjectUpdate(
      {
        currentAdmin: user as User,
        h: {},
        resource: {},
        records: [],
      },
      {
        query: {
          recordIds: String(projectUpdate.id),
        },
      },
    );

    const featuredProjectUpdate = await FeaturedProject.createQueryBuilder(
      'featuredProject',
    )
      .where(
        'featuredProject.projectId = :projectId AND featuredProject.projectUpdateId = :projectUpdateId',
        { projectId: project.id, projectUpdateId: projectUpdate.id },
      )
      .getOne();
    assert.isOk(featuredProjectUpdate);
    assert.equal(featuredProjectUpdate?.projectId, project.id);
    assert.equal(featuredProjectUpdate?.projectUpdateId, projectUpdate.id);
  });

  it('should not add the same project twice to the featured project entity', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb(
      {
        ...createProjectData(),
        title: String(new Date().getTime()),
        slug: String(new Date().getTime()),
        verified: true,
        listed: true,
      },
      user,
    );

    const projectUpdate = await ProjectUpdate.create({
      userId: user!.id,
      projectId: project.id,
      content: 'TestProjectUpdate1',
      title: 'testEditProjectUpdate1',
      createdAt: new Date(),
      isMain: false,
    }).save();

    await addFeaturedProjectUpdate(
      {
        currentAdmin: user as User,
        h: {},
        resource: {},
        records: [],
      },
      {
        query: {
          recordIds: String(projectUpdate.id),
        },
      },
    );

    await addFeaturedProjectUpdate(
      {
        currentAdmin: user as User,
        h: {},
        resource: {},
        records: [],
      },
      {
        query: {
          recordIds: String(projectUpdate.id),
        },
      },
    );

    const featuredProjectUpdates = await FeaturedProject.find({
      where: { projectId: project.id, projectUpdateId: projectUpdate.id },
    });

    assert.isOk(featuredProjectUpdates);
    assert.equal(featuredProjectUpdates.length, 1);
    assert.equal(featuredProjectUpdates[0]?.projectId, project.id);
    assert.equal(featuredProjectUpdates[0]?.projectUpdateId, projectUpdate.id);
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
      reviewStatus: ReviewStatus.NotListed,
    });
    const adminUser = await User.findOne({
      where: { id: SEED_DATA.ADMIN_USER.id },
    });
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
      ReviewStatus.Listed,
    );

    const updatedProject = await Project.findOne({ where: { id: project.id } });
    assert.isOk(updatedProject);
    assert.isTrue(updatedProject?.listed);
    assert.equal(updatedProject?.reviewStatus, ReviewStatus.Listed);
  });

  it('should not change verified(false) status when listing project', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: false,
      listed: false,
      reviewStatus: ReviewStatus.NotListed,
    });
    const adminUser = await User.findOne({
      where: { id: SEED_DATA.ADMIN_USER.id },
    });
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
      ReviewStatus.Listed,
    );

    const updatedProject = await Project.findOne({ where: { id: project.id } });
    assert.isOk(updatedProject);
    assert.isFalse(updatedProject?.verified);
    assert.isTrue(updatedProject?.listed);
    assert.equal(updatedProject?.reviewStatus, ReviewStatus.Listed);
  });

  it('should not change verified(true) status when deListing project', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: true,
      listed: true,
      reviewStatus: ReviewStatus.Listed,
    });
    const adminUser = await User.findOne({
      where: { id: SEED_DATA.ADMIN_USER.id },
    });
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
      ReviewStatus.NotListed,
    );

    const updatedProject = await Project.findOne({ where: { id: project.id } });
    assert.isOk(updatedProject);
    assert.isTrue(updatedProject?.verified);
    assert.isFalse(updatedProject?.listed);
    assert.equal(updatedProject?.reviewStatus, ReviewStatus.NotListed);
  });

  it('should not change verified(false) status when deListing project', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: false,
      listed: false,
      reviewStatus: ReviewStatus.NotListed,
    });
    const adminUser = await User.findOne({
      where: { id: SEED_DATA.ADMIN_USER.id },
    });
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
      ReviewStatus.NotListed,
    );

    const updatedProject = await Project.findOne({ where: { id: project.id } });
    assert.isOk(updatedProject);
    assert.isFalse(updatedProject?.verified);
    assert.isFalse(updatedProject?.listed);
    assert.equal(updatedProject?.reviewStatus, ReviewStatus.NotListed);
  });

  it('should create history when make project listed', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: false,
      listed: false,
      reviewStatus: ReviewStatus.NotListed,
    });
    const adminUser = await User.findOne({
      where: { id: SEED_DATA.ADMIN_USER.id },
    });
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
      ReviewStatus.Listed,
    );

    const updatedProject = await Project.findOne({ where: { id: project.id } });
    assert.isOk(updatedProject);
    assert.isTrue(updatedProject?.listed);
    assert.equal(updatedProject?.reviewStatus, ReviewStatus.Listed);

    // because we didn't put await before creating history item
    await sleep(50);

    const history = await findOneProjectStatusHistory({
      projectId: project.id,
      userId: adminUser?.id,
    });
    assert.equal(history?.description, HISTORY_DESCRIPTIONS.CHANGED_TO_LISTED);
  });

  it('should create history when make project unlisted', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: false,
      listed: true,
      reviewStatus: ReviewStatus.Listed,
    });
    const adminUser = await User.findOne({
      where: { id: SEED_DATA.ADMIN_USER.id },
    });
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
      ReviewStatus.NotListed,
    );

    const updatedProject = await Project.findOne({ where: { id: project.id } });
    assert.isOk(updatedProject);
    assert.isFalse(updatedProject?.listed);
    assert.equal(updatedProject?.reviewStatus, ReviewStatus.NotListed);

    // because we didn't put await before creating history item
    await sleep(10);

    const history = await findOneProjectStatusHistory({
      projectId: project.id,
      userId: adminUser?.id,
    });
    assert.equal(
      history?.description,
      HISTORY_DESCRIPTIONS.CHANGED_TO_UNLISTED,
    );
  });
}

function sendBroadcastNotificationTestCases() {
  it('should update status of broadcastNotification after sending notifications', async () => {
    const bn = await BroadcastNotification.create({
      title: 'test',
      html: 'test',
      status: BROAD_CAST_NOTIFICATION_STATUS.PENDING,
    }).save();
    assert.equal(bn.status, BROAD_CAST_NOTIFICATION_STATUS.PENDING);
    await sendBroadcastNotification({
      record: {
        params: bn,
      },
    });
    const result = await findBroadcastNotificationById(bn.id);
    assert.equal(result?.status, BROAD_CAST_NOTIFICATION_STATUS.SUCCESS);
  });
}
// @ts-ignore-end
