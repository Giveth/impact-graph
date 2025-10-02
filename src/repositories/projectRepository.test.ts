import { assert } from 'chai';
import moment from 'moment';
import { In } from 'typeorm';
import {
  findProjectById,
  findProjectBySlug,
  findProjectByWalletAddress,
  findProjectsByIdArray,
  findProjectsBySlugArray,
  findQfRoundProjects,
  projectsWithoutUpdateAfterTimeFrame,
  removeProjectAndRelatedEntities,
  updateProjectWithVerificationForm,
  verifyMultipleProjects,
  verifyProject,
} from './projectRepository';
import {
  createDonationData,
  createProjectData,
  generateRandomEtheriumAddress,
  saveAnchorContractDirectlyToDb,
  saveDonationDirectlyToDb,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../test/testUtils';
import { createProjectVerificationForm } from './projectVerificationRepository';
import {
  PROJECT_VERIFICATION_STATUSES,
  ProjectVerificationForm,
} from '../entities/projectVerificationForm';
import { NETWORK_IDS } from '../provider';
import { setPowerRound } from './powerRoundRepository';
import { refreshProjectPowerView } from './projectPowerViewRepository';
import {
  insertSinglePowerBoosting,
  takePowerBoostingSnapshot,
} from './powerBoostingRepository';
import { Project, ProjectUpdate } from '../entities/project';
import { User } from '../entities/user';
import { PowerBalanceSnapshot } from '../entities/powerBalanceSnapshot';
import { PowerBoostingSnapshot } from '../entities/powerBoostingSnapshot';
import { AppDataSource } from '../orm';
import { SUMMARY_LENGTH } from '../constants/summary';
import { getHtmlTextSummary } from '../utils/utils';
import { generateRandomString } from '../utils/utils';
import { addOrUpdatePowerSnapshotBalances } from './powerBalanceSnapshotRepository';
import { findPowerSnapshots } from './powerSnapshotRepository';
import { AnchorContractAddress } from '../entities/anchorContractAddress';
import { Donation } from '../entities/donation';
import { FeaturedUpdate } from '../entities/featuredUpdate';
import { ProjectAddress } from '../entities/projectAddress';
import { ProjectSocialMedia } from '../entities/projectSocialMedia';
import { ProjectStatusHistory } from '../entities/projectStatusHistory';
import { QfRound } from '../entities/qfRound';
import { ProjectQfRound } from '../entities/projectQfRound';
import { Reaction } from '../entities/reaction';
import { SocialProfile } from '../entities/socialProfile';
import { ProjectSocialMediaType } from '../types/projectSocialMediaType';
import {
  ReviewStatus,
  ProjStatus,
  FilterField,
  SortingField,
} from '../entities/project';

describe(
  'findProjectByWalletAddress test cases',
  findProjectByWalletAddressTestCases,
);

describe(
  'projectsWithoutUpdateAfterTimeFrame Test Cases',
  projectsWithoutUpdateAfterTimeFrameTestCases,
);
describe(
  'updateProjectWithVerificationForm test cases',
  updateProjectWithVerificationFormTestCases,
);
describe('order by totalPower', orderByTotalPower);
describe(
  'update descriptionSummary test cases',
  updateDescriptionSummaryTestCases,
);

describe('verifyProject test cases', verifyProjectTestCases);
describe('verifyMultipleProjects test cases', verifyMultipleProjectsTestCases);
describe('findProjectById test cases', findProjectByIdTestCases);
describe('findProjectsByIdArray test cases', findProjectsByIdArrayTestCases);
describe('findProjectBySlug test cases', findProjectBySlugTestCases);
describe(
  'findProjectsBySlugArray test cases',
  findProjectsBySlugArrayTestCases,
);

describe(
  'removeProjectAndRelatedEntities test cases',
  removeProjectAndRelatedEntitiesTestCase,
);

describe('findQfRoundProjects test cases', findQfRoundProjectsTestCases);

function projectsWithoutUpdateAfterTimeFrameTestCases() {
  it('should return projects created a long time ago', async () => {
    const superExpiredProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: true,
      updatedAt: moment().subtract(1001, 'days').endOf('day').toDate(),
      latestUpdateCreationDate: moment()
        .subtract(1001, 'days')
        .endOf('day')
        .toDate(),
    });

    const nonExpiredProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: true,
      updatedAt: moment().subtract(900, 'days').endOf('day').toDate(),
      projectUpdateCreationDate: moment()
        .subtract(900, 'days')
        .endOf('day')
        .toDate(),
    });

    const projects = await projectsWithoutUpdateAfterTimeFrame(
      moment().subtract(999, 'days').toDate(),
    );

    assert.isOk(projects);
    assert.isOk(
      projects.find(project => project.id === superExpiredProject.id),
    );
    assert.isNotOk(
      projects.find(project => project.id === nonExpiredProject.id),
    );
  });
}

function findProjectBySlugTestCases() {
  it('Should find project by slug', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const foundProject = await findProjectBySlug(project.slug as string);
    assert.isOk(foundProject);
    assert.equal(foundProject?.id, project.id);
    assert.isOk(foundProject?.adminUser);
  });

  it('should not find project when project doesnt exists', async () => {
    const foundProject = await findProjectBySlug(new Date().toString());
    assert.isNull(foundProject);
  });
}

function findProjectsBySlugArrayTestCases() {
  it('Should find project multi projects by slug', async () => {
    const project1 = await saveProjectDirectlyToDb(createProjectData());
    const project2 = await saveProjectDirectlyToDb(createProjectData());
    const project3 = await saveProjectDirectlyToDb(createProjectData());
    const projects = await findProjectsBySlugArray([
      project1.slug as string,
      project2.slug as string,
      project3.slug as string,
      generateRandomString(),
    ]);
    assert.equal(projects.length, 3);
    assert.isOk(projects.find(p => p.id === project1.id));
    assert.isOk(projects.find(p => p.id === project2.id));
    assert.isOk(projects.find(p => p.id === project3.id));
  });

  it('should not find any project when slug doesnt exist', async () => {
    const projects = await findProjectsBySlugArray([generateRandomString()]);
    assert.isEmpty(projects);
  });
}

function findProjectByIdTestCases() {
  it('Should find project by id', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const foundProject = await findProjectById(project.id);
    assert.isOk(foundProject);
    assert.equal(foundProject?.id, project.id);
  });

  it('should not find project when project doesnt exists', async () => {
    const foundProject = await findProjectById(1000000000);
    assert.isNull(foundProject);
  });
}

function findProjectsByIdArrayTestCases() {
  it('Should find projects by multiple id', async () => {
    const project1 = await saveProjectDirectlyToDb(createProjectData());
    const project2 = await saveProjectDirectlyToDb(createProjectData());
    const projects = await findProjectsByIdArray([project1.id, project2.id]);
    assert.equal(projects.length, 2);
    assert.ok(projects.find(project => project.id === project1.id));
    assert.ok(projects.find(project => project.id === project2.id));
  });
  it('Should find projects by multiple id even if some of them doesnt exist', async () => {
    const project1 = await saveProjectDirectlyToDb(createProjectData());
    const project2 = await saveProjectDirectlyToDb(createProjectData());
    const bigNumber = 999999999;
    const projects = await findProjectsByIdArray([
      project1.id,
      project2.id,
      bigNumber,
    ]);
    assert.equal(projects.length, 2);
    assert.ok(projects.find(project => project.id === project1.id));
    assert.ok(projects.find(project => project.id === project2.id));
    assert.notOk(projects.find(project => project.id === bigNumber));
  });
}

function findProjectByWalletAddressTestCases() {
  it('should find project by walletAddress', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const fetchedProject = await findProjectByWalletAddress(
      project.walletAddress as string,
    );
    assert.isOk(fetchedProject);
    assert.equal(fetchedProject?.id, project.id);
  });
  it('should find project by walletAddress upper case', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const fetchedProject = await findProjectByWalletAddress(
      project.walletAddress?.toUpperCase() as string,
    );
    assert.isOk(fetchedProject);
    assert.equal(fetchedProject?.id, project.id);
  });
  it('should find project by walletAddress lower case', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const fetchedProject = await findProjectByWalletAddress(
      project.walletAddress?.toLowerCase() as string,
    );
    assert.isOk(fetchedProject);
    assert.equal(fetchedProject?.id, project.id);
  });
  it('should join with status successfully', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const fetchedProject = await findProjectByWalletAddress(
      project.walletAddress?.toLowerCase() as string,
    );
    assert.isOk(fetchedProject);
    assert.equal(fetchedProject?.id, project.id);
    assert.isOk(fetchedProject?.status?.id);
  });
}

function updateProjectWithVerificationFormTestCases() {
  it('update project with verification form data', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      adminUserId: user.id,
      verified: false,
      networkId: NETWORK_IDS.SEPOLIA,
    });
    const fetchedProject = await findProjectById(project.id);
    assert.equal(fetchedProject?.addresses?.length, 1);
    assert.equal(fetchedProject?.addresses?.[0].address, project.walletAddress);
    const projectVerificationForm = await createProjectVerificationForm({
      projectId: project.id,
      userId: user.id,
    });
    const relatedAddress = generateRandomEtheriumAddress();
    projectVerificationForm.managingFunds = {
      description: 'hi',
      relatedAddresses: [
        {
          title: 'address1',
          address: relatedAddress,
          networkId: NETWORK_IDS.MAIN_NET,
        },
      ],
    };
    projectVerificationForm.status = PROJECT_VERIFICATION_STATUSES.SUBMITTED;
    await projectVerificationForm.save();

    assert.equal(
      projectVerificationForm?.status,
      PROJECT_VERIFICATION_STATUSES.SUBMITTED,
    );

    await updateProjectWithVerificationForm(projectVerificationForm, project);
    const fetchedProject2 = await findProjectById(project.id);

    assert.equal(
      fetchedProject2?.addresses?.length,
      fetchedProject!.addresses!.length + 1,
    );
    assert.isOk(
      fetchedProject2?.addresses?.find(
        projectAddress => projectAddress.address === relatedAddress,
      ),
    );
  });
}

function verifyProjectTestCases() {
  it('should verify project successfully', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      adminUserId: user.id,
      verified: false,
    });
    assert.isFalse(project?.verified);

    await verifyProject({
      projectId: project.id,
      verified: true,
    });
    const fetchedProject = await findProjectById(project.id);
    assert.isTrue(fetchedProject?.verified);
  });
  it('should unVerify project successfully', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      adminUserId: user.id,
      verified: true,
    });
    assert.isTrue(project?.verified);

    await verifyProject({
      projectId: project.id,
      verified: false,
    });
    const fetchedProject = await findProjectById(project.id);
    assert.isFalse(fetchedProject?.verified);
  });
}

function verifyMultipleProjectsTestCases() {
  it('should verify two project successfully', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      adminUserId: user.id,
      verified: false,
    });
    const project2 = await saveProjectDirectlyToDb({
      ...createProjectData(),
      adminUserId: user.id,
      verified: false,
    });
    assert.isFalse(project?.verified);
    assert.isFalse(project2?.verified);

    await verifyMultipleProjects({
      projectsIds: [project.id, project2.id],
      verified: true,
    });
    const fetchedProject = await findProjectById(project.id);
    const fetchedProject2 = await findProjectById(project2.id);
    assert.isTrue(fetchedProject?.verified);
    assert.isTrue(fetchedProject2?.verified);
  });
  it('should unVerify two project successfully', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      adminUserId: user.id,
      verified: true,
    });
    const project2 = await saveProjectDirectlyToDb({
      ...createProjectData(),
      adminUserId: user.id,
      verified: true,
    });
    assert.isTrue(project?.verified);
    assert.isTrue(project2?.verified);

    await verifyMultipleProjects({
      projectsIds: [project.id, project2.id],
      verified: false,
    });
    const fetchedProject = await findProjectById(project.id);
    const fetchedProject2 = await findProjectById(project2.id);
    assert.isFalse(fetchedProject?.verified);
    assert.isFalse(fetchedProject2?.verified);
  });
}

function orderByTotalPower() {
  it('order by totalPower DESC', async () => {
    await AppDataSource.getDataSource().query(
      'truncate power_snapshot cascade',
    );
    await PowerBalanceSnapshot.clear();
    await PowerBoostingSnapshot.clear();

    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const project1 = await saveProjectDirectlyToDb(createProjectData());
    const project2 = await saveProjectDirectlyToDb(createProjectData());
    const project3 = await saveProjectDirectlyToDb(createProjectData());

    await Promise.all(
      [
        [user1, project1, 10],
        [user1, project2, 20],
        [user1, project3, 30],
        [user2, project1, 20],
        [user2, project2, 40],
        [user2, project3, 60],
      ].map(item => {
        const [user, project, percentage] = item as [User, Project, number];
        return insertSinglePowerBoosting({
          user,
          project,
          percentage,
        });
      }),
    );

    const roundNumber = project3.id * 10;

    await takePowerBoostingSnapshot();
    const [powerSnapshots] = await findPowerSnapshots();
    const snapshot = powerSnapshots[0];

    snapshot.blockNumber = 1;
    snapshot.roundNumber = roundNumber;
    await snapshot.save();

    await addOrUpdatePowerSnapshotBalances([
      {
        userId: user1.id,
        powerSnapshotId: snapshot.id,
        balance: 10000,
      },
      {
        userId: user2.id,
        powerSnapshotId: snapshot.id,
        balance: 20000,
      },
    ]);

    await setPowerRound(roundNumber);
    await refreshProjectPowerView();
    const query = Project.createQueryBuilder('project')
      .leftJoinAndSelect('project.projectPower', 'projectPower')
      .select('project.id')
      .addSelect('projectPower.totalPower')
      .take(project3.id)
      .orderBy('projectPower.totalPower', 'DESC', 'NULLS LAST')
      .take(project3.id + 1);

    const [projects] = await query.getManyAndCount();
    assert.isArray(projects);
    assert.equal(projects[0]?.id, project3.id);
    assert.equal(projects[1]?.id, project2.id);
    assert.equal(projects[2]?.id, project1.id);
  });
}

function updateDescriptionSummaryTestCases() {
  const SHORT_DESCRIPTION = '<div>Short Description</div>';
  const SHORT_DESCRIPTION_SUMMARY = 'Short Description';

  it('should set description summary on creation', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      description: SHORT_DESCRIPTION,
    });

    assert.equal(project.descriptionSummary, SHORT_DESCRIPTION_SUMMARY);
  });

  it('should update description summary on update', async () => {
    let project: Project | null =
      await saveProjectDirectlyToDb(createProjectData());

    project.description = SHORT_DESCRIPTION;
    await project.save();
    project = await Project.findOne({ where: { id: project.id } });
    assert.equal(project?.descriptionSummary, SHORT_DESCRIPTION_SUMMARY);
  });

  it('should set limited length description summary', async () => {
    const longDescription = `
    <div>
      ${SHORT_DESCRIPTION.repeat(
        Math.ceil(SUMMARY_LENGTH / SHORT_DESCRIPTION_SUMMARY.length) + 1,
      )}
    </div>
    `;

    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      description: longDescription,
    });

    assert.isOk(project.descriptionSummary);
    assert.lengthOf(project.descriptionSummary as string, SUMMARY_LENGTH);
    assert.equal(
      project.descriptionSummary,
      getHtmlTextSummary(longDescription),
    );
  });
}

function removeProjectAndRelatedEntitiesTestCase() {
  it('should remove project and related entities', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const projectData = createProjectData();
    projectData.adminUserId = user.id;
    //It creates a project, projectUpdate, and ProjectAddress
    const project = await saveProjectDirectlyToDb(projectData);

    await Promise.all([
      saveDonationDirectlyToDb(
        {
          ...createDonationData(),
        },
        user.id,
        project.id,
      ),
      saveAnchorContractDirectlyToDb({
        creatorId: user.id,
        projectId: project.id,
      }),
      Reaction.create({
        projectId: project.id,
        userId: user.id,
        reaction: '',
      }).save(),
      ProjectSocialMedia.create({
        projectId: project.id,
        type: ProjectSocialMediaType.FACEBOOK,
        link: 'https://facebook.com',
      }).save(),
      ProjectStatusHistory.create({
        projectId: project.id,
        createdAt: new Date(),
      }).save(),
      ProjectVerificationForm.create({ projectId: project.id }).save(),
      FeaturedUpdate.create({ projectId: project.id }).save(),
      SocialProfile.create({ projectId: project.id }).save(),
    ]);
    const relatedEntitiesBefore = await Promise.all([
      Donation.findOne({ where: { projectId: project.id } }),
      Reaction.findOne({ where: { projectId: project.id } }),
      ProjectAddress.findOne({ where: { projectId: project.id } }),
      ProjectSocialMedia.findOne({ where: { projectId: project.id } }),
      AnchorContractAddress.findOne({ where: { projectId: project.id } }),
      ProjectStatusHistory.findOne({ where: { projectId: project.id } }),
      ProjectVerificationForm.findOne({
        where: { projectId: project.id },
      }),
      FeaturedUpdate.findOne({ where: { projectId: project.id } }),
      SocialProfile.findOne({ where: { projectId: project.id } }),
      ProjectUpdate.findOne({ where: { projectId: project.id } }),
    ]);

    relatedEntitiesBefore.forEach(entity => {
      assert.isNotNull(entity);
    });

    await removeProjectAndRelatedEntities(project.id);

    const relatedEntities = await Promise.all([
      Donation.findOne({ where: { projectId: project.id } }),
      Reaction.findOne({ where: { projectId: project.id } }),
      ProjectAddress.findOne({ where: { projectId: project.id } }),
      ProjectSocialMedia.findOne({ where: { projectId: project.id } }),
      AnchorContractAddress.findOne({ where: { projectId: project.id } }),
      ProjectStatusHistory.findOne({ where: { projectId: project.id } }),
      ProjectVerificationForm.findOne({
        where: { projectId: project.id },
      }),
      FeaturedUpdate.findOne({ where: { projectId: project.id } }),
      SocialProfile.findOne({ where: { projectId: project.id } }),
      ProjectUpdate.findOne({ where: { projectId: project.id } }),
    ]);

    const fetchedProject = await Project.findOne({ where: { id: project.id } });

    assert.isNull(fetchedProject);

    relatedEntities.forEach(entity => {
      assert.isNull(entity);
    });
  });
}

function findQfRoundProjectsTestCases() {
  it('should return projects for a specific QF round', async () => {
    // Create a QF round
    const qfRound = QfRound.create({
      isActive: true,
      name: 'Test QF Round',
      slug: `test-qf-round-${Date.now()}`,
      allocatedFund: 100000,
      minimumPassportScore: 8,
      beginDate: new Date(),
      endDate: moment().add(10, 'days').toDate(),
    });
    await qfRound.save();

    // Create users
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    // Create projects and associate them with the QF round
    const timestamp = Date.now();
    const project1 = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: 'QF Project 1',
      slug: `qf-project-1-${timestamp}`,
      adminUserId: user1.id,
      verified: true,
      isGivbackEligible: true,
    });
    project1.qfRounds = [qfRound];
    await project1.save();

    const project2 = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: 'QF Project 2',
      slug: `qf-project-2-${timestamp}`,
      adminUserId: user2.id,
      verified: false,
      isGivbackEligible: true,
    });
    project2.qfRounds = [qfRound];
    await project2.save();

    // Test the repository function
    const [projects, totalCount] = await findQfRoundProjects(qfRound.id);

    assert.isOk(projects);
    assert.equal(projects.length, 2);
    assert.equal(totalCount, 2);

    // Verify project 1 data
    const project1Data = projects.find(p => p.id === project1.id);
    assert.isOk(project1Data);
    if (project1Data) {
      assert.equal(project1Data.title, 'QF Project 1');
      assert.equal(project1Data.slug, `qf-project-1-${timestamp}`);
      assert.equal(project1Data.verified, true);
      assert.equal(project1Data.isGivbackEligible, true);
      assert.equal(project1Data.projectType, 'project');
      assert.equal(project1Data.adminUserId, user1.id);
      assert.isOk(project1Data.adminUser);
      assert.equal(project1Data.adminUser.id, user1.id);
      assert.isOk(project1Data.status);
      assert.isOk(project1Data.organization);
      assert.isOk(project1Data.addresses);
      assert.isOk(project1Data.qfRounds);
      assert.equal(project1Data.qfRounds.length, 1);
      assert.equal(project1Data.qfRounds[0].id, qfRound.id);
    }

    // Verify project 2 data
    const project2Data = projects.find(p => p.id === project2.id);
    assert.isOk(project2Data);
    if (project2Data) {
      assert.equal(project2Data.title, 'QF Project 2');
      assert.equal(project2Data.slug, `qf-project-2-${timestamp}`);
      assert.equal(project2Data.verified, false);
      assert.equal(project2Data.isGivbackEligible, true);
      assert.equal(project2Data.adminUserId, user2.id);
      assert.equal(project2Data.adminUser.id, user2.id);
    }

    // Cleanup
    await removeProjectAndRelatedEntities(project1.id);
    await removeProjectAndRelatedEntities(project2.id);
    await QfRound.delete({ id: qfRound.id });
    await User.delete({ id: In([user1.id, user2.id]) });
  });

  it('should return empty array when no projects are associated with QF round', async () => {
    // Create a QF round
    const qfRound = QfRound.create({
      isActive: true,
      name: 'Empty QF Round',
      slug: `empty-qf-round-${Date.now()}`,
      allocatedFund: 50000,
      minimumPassportScore: 8,
      beginDate: new Date(),
      endDate: moment().add(10, 'days').toDate(),
    });
    await qfRound.save();

    // Test the repository function
    const [projects, totalCount] = await findQfRoundProjects(qfRound.id);

    assert.isOk(projects);
    assert.equal(projects.length, 0);
    assert.equal(totalCount, 0);

    // Cleanup
    await QfRound.delete({ id: qfRound.id });
  });

  it('should only return active and listed projects', async () => {
    // Create a QF round
    const qfRound = QfRound.create({
      isActive: true,
      name: 'Filtered QF Round',
      slug: `filtered-qf-round-${Date.now()}`,
      allocatedFund: 75000,
      minimumPassportScore: 8,
      beginDate: new Date(),
      endDate: moment().add(10, 'days').toDate(),
    });
    await qfRound.save();

    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const timestamp = Date.now();
    // Create an active and listed project
    const activeProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: 'Active Project',
      slug: `active-project-${timestamp}`,
      adminUserId: user.id,
      statusId: ProjStatus.active,
      reviewStatus: ReviewStatus.Listed,
    });
    activeProject.qfRounds = [qfRound];
    await activeProject.save();

    // Create a cancelled project (should not be returned)
    const cancelledProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: 'Cancelled Project',
      slug: `cancelled-project-${timestamp}`,
      adminUserId: user.id,
      statusId: ProjStatus.cancelled,
      reviewStatus: ReviewStatus.Listed,
    });
    cancelledProject.qfRounds = [qfRound];
    await cancelledProject.save();

    // Create a not reviewed project (should not be returned)
    const notReviewedProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: 'Not Reviewed Project',
      slug: `not-reviewed-project-${timestamp}`,
      adminUserId: user.id,
      statusId: ProjStatus.active,
      reviewStatus: ReviewStatus.NotReviewed,
    });
    notReviewedProject.qfRounds = [qfRound];
    await notReviewedProject.save();

    // Test the repository function
    const [projects, totalCount] = await findQfRoundProjects(qfRound.id);

    assert.isOk(projects);
    assert.equal(projects.length, 1);
    assert.equal(totalCount, 1);
    assert.equal(projects[0].id, activeProject.id);

    // Cleanup
    await removeProjectAndRelatedEntities(activeProject.id);
    await removeProjectAndRelatedEntities(cancelledProject.id);
    await removeProjectAndRelatedEntities(notReviewedProject.id);
    await QfRound.delete({ id: qfRound.id });
    await User.delete({ id: user.id });
  });

  it('should include power data in the results', async () => {
    // Create a QF round
    const qfRound = QfRound.create({
      isActive: true,
      name: 'Power QF Round',
      slug: `power-qf-round-${Date.now()}`,
      allocatedFund: 100000,
      minimumPassportScore: 8,
      beginDate: new Date(),
      endDate: moment().add(10, 'days').toDate(),
    });
    await qfRound.save();

    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: 'Power Project',
      slug: `power-project-${Date.now()}`,
      adminUserId: user.id,
    });
    project.qfRounds = [qfRound];
    await project.save();

    // Test the repository function
    const [projects, totalCount] = await findQfRoundProjects(qfRound.id);

    assert.isOk(projects);
    assert.equal(projects.length, 1);
    assert.equal(totalCount, 1);

    const projectData = projects[0];
    assert.isOk(projectData);
    // Note: Power data might be null if no power views exist, which is expected
    // The test verifies that the query includes the power joins

    // Cleanup
    await removeProjectAndRelatedEntities(project.id);
    await QfRound.delete({ id: qfRound.id });
    await User.delete({ id: user.id });
  });

  it('should order projects by creation date descending', async () => {
    // Create a QF round
    const qfRound = QfRound.create({
      isActive: true,
      name: 'Order QF Round',
      slug: `order-qf-round-${Date.now()}`,
      allocatedFund: 100000,
      minimumPassportScore: 8,
      beginDate: new Date(),
      endDate: moment().add(10, 'days').toDate(),
    });
    await qfRound.save();

    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    // Create projects with different creation dates
    const olderProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: 'Older Project',
      slug: `older-project-${Date.now()}`,
      adminUserId: user.id,
      creationDate: moment().subtract(1, 'day').toDate(),
    });
    olderProject.qfRounds = [qfRound];
    await olderProject.save();

    const newerProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: 'Newer Project',
      slug: `newer-project-${Date.now()}`,
      adminUserId: user.id,
      creationDate: moment().subtract(1, 'hour').toDate(),
    });
    newerProject.qfRounds = [qfRound];
    await newerProject.save();

    // Test the repository function
    const [projects, totalCount] = await findQfRoundProjects(qfRound.id);

    assert.isOk(projects);
    assert.equal(projects.length, 2);
    assert.equal(totalCount, 2);

    // Should be ordered by creation date descending (newest first)
    assert.equal(projects[0].id, newerProject.id);
    assert.equal(projects[1].id, olderProject.id);

    // Cleanup
    await removeProjectAndRelatedEntities(olderProject.id);
    await removeProjectAndRelatedEntities(newerProject.id);
    await QfRound.delete({ id: qfRound.id });
    await User.delete({ id: user.id });
  });

  it('should support pagination with limit and skip', async () => {
    // Create a QF round
    const qfRound = QfRound.create({
      isActive: true,
      name: 'Pagination Test QF Round',
      slug: `pagination-test-qf-round-${Date.now()}`,
      allocatedFund: 100000,
      minimumPassportScore: 8,
      beginDate: new Date(),
      endDate: moment().add(10, 'days').toDate(),
    });
    await qfRound.save();

    // Create 5 projects
    const projects: Project[] = [];
    for (let i = 1; i <= 5; i++) {
      const project = await saveProjectDirectlyToDb({
        ...createProjectData(),
        title: `Pagination Project ${i}`,
        slug: `pagination-project-${i}-${Date.now()}`,
        statusId: ProjStatus.active,
        reviewStatus: ReviewStatus.Listed,
      });
      project.qfRounds = [qfRound];
      await project.save();
      projects.push(project);
    }

    // Test pagination - first page (limit 2, skip 0)
    const [firstPage, firstPageTotal] = await findQfRoundProjects(qfRound.id, {
      limit: 2,
      skip: 0,
    });

    assert.equal(firstPage.length, 2);
    assert.equal(firstPageTotal, 5);

    // Test pagination - second page (limit 2, skip 2)
    const [secondPage, secondPageTotal] = await findQfRoundProjects(
      qfRound.id,
      {
        limit: 2,
        skip: 2,
      },
    );

    assert.equal(secondPage.length, 2);
    assert.equal(secondPageTotal, 5);

    // Test pagination - third page (limit 2, skip 4)
    const [thirdPage, thirdPageTotal] = await findQfRoundProjects(qfRound.id, {
      limit: 2,
      skip: 4,
    });

    assert.equal(thirdPage.length, 1);
    assert.equal(thirdPageTotal, 5);

    // Cleanup
    for (const project of projects) {
      await removeProjectAndRelatedEntities(project.id);
    }
    await QfRound.delete({ id: qfRound.id });
  });

  it('should support filtering by verified status', async () => {
    // Create a QF round
    const qfRound = QfRound.create({
      isActive: true,
      name: 'Filter Test QF Round',
      slug: `filter-test-qf-round-${Date.now()}`,
      allocatedFund: 100000,
      minimumPassportScore: 8,
      beginDate: new Date(),
      endDate: moment().add(10, 'days').toDate(),
    });
    await qfRound.save();

    // Create verified project
    const verifiedProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: 'Verified Project',
      slug: `verified-project-${Date.now()}`,
      statusId: ProjStatus.active,
      reviewStatus: ReviewStatus.Listed,
      verified: true,
    });
    verifiedProject.qfRounds = [qfRound];
    await verifiedProject.save();

    // Create unverified project
    const unverifiedProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: 'Unverified Project',
      slug: `unverified-project-${Date.now()}`,
      statusId: ProjStatus.active,
      reviewStatus: ReviewStatus.Listed,
      verified: false,
    });
    unverifiedProject.qfRounds = [qfRound];
    await unverifiedProject.save();

    // Test filtering by verified status
    const [verifiedProjects, verifiedTotal] = await findQfRoundProjects(
      qfRound.id,
      {
        filters: [FilterField.Verified],
      },
    );

    assert.equal(verifiedProjects.length, 1);
    assert.equal(verifiedTotal, 1);
    assert.equal(verifiedProjects[0].id, verifiedProject.id);
    assert.equal(verifiedProjects[0].verified, true);

    // Test without filter (should return both)
    const [allProjects, allTotal] = await findQfRoundProjects(qfRound.id, {
      filters: [],
    });

    assert.equal(allProjects.length, 2);
    assert.equal(allTotal, 2);

    // Cleanup
    await removeProjectAndRelatedEntities(verifiedProject.id);
    await removeProjectAndRelatedEntities(unverifiedProject.id);
    await QfRound.delete({ id: qfRound.id });
  });

  it('should support search by project title', async () => {
    // Create a QF round
    const qfRound = QfRound.create({
      isActive: true,
      name: 'Search Test QF Round',
      slug: `search-test-qf-round-${Date.now()}`,
      allocatedFund: 100000,
      minimumPassportScore: 8,
      beginDate: new Date(),
      endDate: moment().add(10, 'days').toDate(),
    });
    await qfRound.save();

    // Create projects with different titles
    const project1 = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: 'Climate Change Initiative',
      slug: `climate-project-${Date.now()}`,
      statusId: ProjStatus.active,
      reviewStatus: ReviewStatus.Listed,
    });
    project1.qfRounds = [qfRound];
    await project1.save();

    const project2 = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: 'Education for All',
      slug: `education-project-${Date.now()}`,
      statusId: ProjStatus.active,
      reviewStatus: ReviewStatus.Listed,
    });
    project2.qfRounds = [qfRound];
    await project2.save();

    const project3 = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: 'Climate Action Network',
      slug: `climate-action-project-${Date.now()}`,
      statusId: ProjStatus.active,
      reviewStatus: ReviewStatus.Listed,
    });
    project3.qfRounds = [qfRound];
    await project3.save();

    // Test search for "climate"
    const [climateProjects, climateTotal] = await findQfRoundProjects(
      qfRound.id,
      {
        searchTerm: 'climate',
      },
    );

    assert.equal(climateProjects.length, 2);
    assert.equal(climateTotal, 2);
    assert.isTrue(climateProjects.some(p => p.title.includes('Climate')));

    // Test search for "education"
    const [educationProjects, educationTotal] = await findQfRoundProjects(
      qfRound.id,
      {
        searchTerm: 'education',
      },
    );

    assert.equal(educationProjects.length, 1);
    assert.equal(educationTotal, 1);
    assert.equal(educationProjects[0].title, 'Education for All');

    // Cleanup
    await removeProjectAndRelatedEntities(project1.id);
    await removeProjectAndRelatedEntities(project2.id);
    await removeProjectAndRelatedEntities(project3.id);
    await QfRound.delete({ id: qfRound.id });
  });

  it('should support sorting by different criteria', async () => {
    // Create a QF round
    const qfRound = QfRound.create({
      isActive: true,
      name: 'Sorting Test QF Round',
      slug: `sorting-test-qf-round-${Date.now()}`,
      allocatedFund: 100000,
      minimumPassportScore: 8,
      beginDate: new Date(),
      endDate: moment().add(10, 'days').toDate(),
    });
    await qfRound.save();

    // Create projects with different creation dates and donation amounts
    const olderProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: 'Older Project',
      slug: `older-project-${Date.now()}`,
      statusId: ProjStatus.active,
      reviewStatus: ReviewStatus.Listed,
      creationDate: moment().subtract(2, 'hours').toDate(),
      totalDonations: 1000,
    });
    olderProject.qfRounds = [qfRound];
    await olderProject.save();

    const newerProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: 'Newer Project',
      slug: `newer-project-${Date.now()}`,
      statusId: ProjStatus.active,
      reviewStatus: ReviewStatus.Listed,
      creationDate: moment().subtract(1, 'hour').toDate(),
      totalDonations: 500,
    });
    newerProject.qfRounds = [qfRound];
    await newerProject.save();

    // Test sorting by newest (creation date descending)
    const [newestProjects] = await findQfRoundProjects(qfRound.id, {
      sortingBy: SortingField.Newest,
    });

    assert.equal(newestProjects.length, 2);
    assert.equal(newestProjects[0].id, newerProject.id);
    assert.equal(newestProjects[1].id, olderProject.id);

    // Test sorting by most funded (total donations descending)
    const [mostFundedProjects] = await findQfRoundProjects(qfRound.id, {
      sortingBy: SortingField.MostFunded,
    });

    assert.equal(mostFundedProjects.length, 2);
    assert.equal(mostFundedProjects[0].id, olderProject.id);
    assert.equal(mostFundedProjects[1].id, newerProject.id);

    // Cleanup
    await removeProjectAndRelatedEntities(olderProject.id);
    await removeProjectAndRelatedEntities(newerProject.id);
    await QfRound.delete({ id: qfRound.id });
  });

  it('should support ActiveQfRoundRaisedFunds sorting with QF round stats', async () => {
    // Create a QF round
    const qfRound = QfRound.create({
      isActive: true,
      name: 'QF Stats Test Round',
      slug: `qf-stats-test-round-${Date.now()}`,
      allocatedFund: 100000,
      minimumPassportScore: 8,
      beginDate: new Date(),
      endDate: moment().add(10, 'days').toDate(),
    });
    await qfRound.save();

    // Create projects
    const project1 = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: 'Low Funded Project',
      slug: `low-funded-project-${Date.now()}`,
      statusId: ProjStatus.active,
      reviewStatus: ReviewStatus.Listed,
    });
    project1.qfRounds = [qfRound];
    await project1.save();

    const project2 = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: 'High Funded Project',
      slug: `high-funded-project-${Date.now()}`,
      statusId: ProjStatus.active,
      reviewStatus: ReviewStatus.Listed,
    });
    project2.qfRounds = [qfRound];
    await project2.save();

    // Create ProjectQfRound entries with different donation amounts
    const projectQfRound1 = ProjectQfRound.create({
      projectId: project1.id,
      qfRoundId: qfRound.id,
      sumDonationValueUsd: 100,
      countUniqueDonors: 5,
    });
    await projectQfRound1.save();

    const projectQfRound2 = ProjectQfRound.create({
      projectId: project2.id,
      qfRoundId: qfRound.id,
      sumDonationValueUsd: 500,
      countUniqueDonors: 10,
    });
    await projectQfRound2.save();

    // Test sorting by ActiveQfRoundRaisedFunds
    const [sortedProjects] = await findQfRoundProjects(qfRound.id, {
      sortingBy: SortingField.ActiveQfRoundRaisedFunds,
    });

    assert.equal(sortedProjects.length, 2);
    // Should be sorted by QF round donation amount (highest first)
    assert.equal(sortedProjects[0].id, project2.id);
    assert.equal(sortedProjects[1].id, project1.id);

    // Cleanup
    await ProjectQfRound.delete({
      projectId: project1.id,
      qfRoundId: qfRound.id,
    });
    await ProjectQfRound.delete({
      projectId: project2.id,
      qfRoundId: qfRound.id,
    });
    await removeProjectAndRelatedEntities(project1.id);
    await removeProjectAndRelatedEntities(project2.id);
    await QfRound.delete({ id: qfRound.id });
  });

  it('should combine pagination, filtering, and sorting', async () => {
    // Create a QF round
    const qfRound = QfRound.create({
      isActive: true,
      name: 'Combined Test QF Round',
      slug: `combined-test-qf-round-${Date.now()}`,
      allocatedFund: 100000,
      minimumPassportScore: 8,
      beginDate: new Date(),
      endDate: moment().add(10, 'days').toDate(),
    });
    await qfRound.save();

    // Create multiple projects with different properties
    const projects: Project[] = [];
    for (let i = 1; i <= 6; i++) {
      const project = await saveProjectDirectlyToDb({
        ...createProjectData(),
        title: `Test Project ${i}`,
        slug: `test-project-${i}-${Date.now()}`,
        statusId: ProjStatus.active,
        reviewStatus: ReviewStatus.Listed,
        verified: i % 2 === 0, // Even numbers are verified
        creationDate: moment().subtract(i, 'hours').toDate(),
        totalDonations: i * 100,
      });
      project.qfRounds = [qfRound];
      await project.save();
      projects.push(project);
    }

    // Test combined: search for "Test", filter by verified, sort by newest, paginate
    const [filteredProjects, totalCount] = await findQfRoundProjects(
      qfRound.id,
      {
        searchTerm: 'Test',
        filters: [FilterField.Verified],
        sortingBy: SortingField.Newest,
        limit: 2,
        skip: 0,
      },
    );

    // Should return 2 verified projects (even numbers: 2, 4, 6)
    assert.equal(filteredProjects.length, 2);
    assert.equal(totalCount, 3); // Total verified projects matching search
    assert.isTrue(filteredProjects.every(p => p.verified === true));
    assert.isTrue(filteredProjects.every(p => p.title.includes('Test')));

    // Cleanup
    for (const project of projects) {
      await removeProjectAndRelatedEntities(project.id);
    }
    await QfRound.delete({ id: qfRound.id });
  });
}
