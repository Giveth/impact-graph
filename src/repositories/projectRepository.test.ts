import {
  findProjectBySlug,
  findProjectByWalletAddress,
  projectsWithoutUpdateAfterTimeFrame,
  updateProjectWithVerificationForm,
  verifyMultipleProjects,
  verifyProject,
} from './projectRepository';
import {
  createProjectData,
  generateRandomEtheriumAddress,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../test/testUtils';
import { assert } from 'chai';
import { findProjectById } from './projectRepository';
import { createProjectVerificationForm } from './projectVerificationRepository';
import { PROJECT_VERIFICATION_STATUSES } from '../entities/projectVerificationForm';
import { NETWORK_IDS } from '../provider';
import moment from 'moment';
import { setPowerRound } from './powerRoundRepository';
import { refreshProjectPowerView } from './projectPowerViewRepository';
import {
  insertSinglePowerBoosting,
  takePowerBoostingSnapshot,
} from './powerBoostingRepository';
import { OrderField, Project } from '../entities/project';
import { User } from '../entities/user';
import {
  findInCompletePowerSnapShots,
  insertSinglePowerBalanceSnapshot,
} from './powerSnapshotRepository';
import { getConnection } from 'typeorm';
import { PowerBalanceSnapshot } from '../entities/powerBalanceSnapshot';
import { PowerBoostingSnapshot } from '../entities/powerBoostingSnapshot';

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

function projectsWithoutUpdateAfterTimeFrameTestCases() {
  it('should return projects created a long time ago', async () => {
    const superExpiredProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: true,
      updatedAt: moment().subtract(1001, 'days').endOf('day').toDate(),
      projectUpdateCreationDate: moment()
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

describe('verifyProject test cases', verifyProjectTestCases);
describe('verifyMultipleProjects test cases', verifyMultipleProjectsTestCases);
describe('findProjectById test cases', () => {
  it('Should find project by id', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const foundProject = await findProjectById(project.id);
    assert.isOk(foundProject);
    assert.equal(foundProject?.id, project.id);
  });

  it('should not find project when project doesnt exists', async () => {
    const foundProject = await findProjectById(1000000000);
    assert.isUndefined(foundProject);
  });
});
describe('findProjectBySlug test cases', () => {
  it('Should find project by id', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const foundProject = await findProjectBySlug(project.slug as string);
    assert.isOk(foundProject);
    assert.equal(foundProject?.id, project.id);
  });

  it('should not find project when project doesnt exists', async () => {
    const foundProject = await findProjectBySlug(new Date().toString());
    assert.isUndefined(foundProject);
  });
});

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
      admin: String(user.id),
      verified: false,
    });
    const fetchedProject = await findProjectById(project.id);
    assert.equal(
      fetchedProject?.addresses?.length,
      Object.keys(NETWORK_IDS).length,
    );
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
      Object.keys(NETWORK_IDS).length + 1,
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
      admin: String(user.id),
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
      admin: String(user.id),
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
      admin: String(user.id),
      verified: false,
    });
    const project2 = await saveProjectDirectlyToDb({
      ...createProjectData(),
      admin: String(user.id),
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
      admin: String(user.id),
      verified: true,
    });
    const project2 = await saveProjectDirectlyToDb({
      ...createProjectData(),
      admin: String(user.id),
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
    await getConnection().query('truncate power_snapshot cascade');
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
    const incompleteSnapshots = await findInCompletePowerSnapShots();
    const snapshot = incompleteSnapshots[0];

    snapshot.blockNumber = 1;
    snapshot.roundNumber = roundNumber;
    await snapshot.save();

    await insertSinglePowerBalanceSnapshot({
      userId: user1.id,
      powerSnapshotId: snapshot.id,
      balance: 10000,
    });
    await insertSinglePowerBalanceSnapshot({
      userId: user2.id,
      powerSnapshotId: snapshot.id,
      balance: 20000,
    });

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
