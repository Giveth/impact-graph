import { assert } from 'chai';
import sinon from 'sinon';
import { Cause, CauseProject, Project } from '../../entities/project';
import { getActiveCausesWithProjects } from './projectEvaluationService';
import { MainCategory } from '../../entities/mainCategory';
import { Category } from '../../entities/category';
import { ProjStatus } from '../../entities/project';
import {
  createCauseData,
  deleteProjectDirectlyFromDb,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../../test/testUtils';

describe('projectEvaluationService', () => {
  let user: any;
  let projects: Project[];
  let causes: Cause[];

  before(async () => {
    // Create the categories and main categories
    const mainCategory = await MainCategory.findOne({ where: {} });
    await Category.create({
      name: 'test-sub1',
      value: 'test-sub1',
      isActive: true,
      source: 'adhoc',
      canUseOnFrontend: true,
      mainCategory: mainCategory as MainCategory,
    }).save();

    await Category.create({
      name: 'test-sub2',
      value: 'test-sub2',
      isActive: true,
      source: 'adhoc',
      canUseOnFrontend: true,
      mainCategory: mainCategory as MainCategory,
    }).save();
  });

  beforeEach(async () => {
    // Stub the checkBalance function to return "10" for all addresses
    const projectEvaluationService = await import('./projectEvaluationService');
    sinon.stub(projectEvaluationService, 'checkBalance').resolves('10');

    // Create test user
    user = await saveUserDirectlyToDb(`0x123${Date.now()}`);

    // Create test projects
    projects = await Promise.all(
      Array(10)
        .fill(null)
        .map((_, index) =>
          saveProjectDirectlyToDb({
            ...createCauseData(`test-project-${Date.now()}-${index}`),
            slug: `test-project-${Date.now()}-${index}`,
            statusId: ProjStatus.active,
          }),
        ),
    );

    // Create test causes
    causes = [];

    // Create first cause with first 5 projects
    const cause1 = await Cause.create({
      title: `Test Cause 1 ${Date.now()}`,
      description: 'Test Description 1',
      chainId: 137,
      slug: `test-cause-1-${Date.now()}`,
      statusId: ProjStatus.active,
      projectType: 'cause',
      adminUserId: user.id,
      adminUser: user,
      verified: true,
      giveBacks: true,
      isGivbackEligible: true,
      qualityScore: 0,
      totalDonations: 0,
      totalReactions: 0,
      totalProjectUpdates: 1,
      totalDistributed: 0,
      totalDonated: 0,
      activeProjectsCount: 5,
      creationDate: new Date(),
      updatedAt: new Date(),
      latestUpdateCreationDate: new Date(),
    }).save();

    // Create second cause with next 5 projects
    const cause2 = await Cause.create({
      title: `Test Cause 2 ${Date.now()}`,
      description: 'Test Description 2',
      chainId: 137,
      slug: `test-cause-2-${Date.now()}`,
      statusId: ProjStatus.active,
      projectType: 'cause',
      adminUserId: user.id,
      adminUser: user,
      verified: true,
      giveBacks: true,
      isGivbackEligible: true,
      qualityScore: 0,
      totalDonations: 0,
      totalReactions: 0,
      totalProjectUpdates: 1,
      totalDistributed: 0,
      totalDonated: 0,
      activeProjectsCount: 5,
      creationDate: new Date(),
      updatedAt: new Date(),
      latestUpdateCreationDate: new Date(),
    }).save();

    causes.push(cause1, cause2);

    // Create cause-project relationships
    // Cause 1 gets first 5 projects
    for (let i = 0; i < 5; i++) {
      await CauseProject.create({
        causeId: cause1.id,
        projectId: projects[i].id,
        amountReceived: 0,
        amountReceivedUsdValue: 0,
        causeScore: 0,
        isIncluded: true,
        userRemoved: false,
      }).save();
    }

    // Cause 2 gets next 5 projects
    for (let i = 5; i < 10; i++) {
      await CauseProject.create({
        causeId: cause2.id,
        projectId: projects[i].id,
        amountReceived: 0,
        amountReceivedUsdValue: 0,
        causeScore: 0,
        isIncluded: true,
        userRemoved: false,
      }).save();
    }
  });

  afterEach(async () => {
    // Restore sinon stubs
    sinon.restore();

    // Clean up test data
    // Delete cause-project relationships
    await CauseProject.getRepository().query(
      'DELETE FROM "cause_project" WHERE "causeId" IN (SELECT id FROM "project" WHERE "title" LIKE $1 and "projectType" = $2)',
      ['Test Cause%', 'cause'],
    );

    // Delete causes
    await Cause.getRepository().query(
      'DELETE FROM "project" WHERE "title" LIKE $1 and "projectType" = $2',
      ['Test Cause%', 'cause'],
    );

    // Delete projects
    for (const project of projects) {
      await deleteProjectDirectlyFromDb(project.id);
    }

    // Delete user
    await Project.getRepository().query(
      'DELETE FROM "project" WHERE "adminUserId" = $1 and "projectType" = $2',
      [user.id, 'project'],
    );
  });

  after(async () => {
    // Clean up categories
    await Category.getRepository().query(
      'DELETE FROM "category" WHERE "name" LIKE $1',
      ['test-sub%'],
    );
  });

  describe('getActiveCausesWithProjects', () => {
    // it('should return active causes with their included projects', async () => {
    //   const result = await getActiveCausesWithProjects();

    //   assert.isArray(result);
    //   assert.equal(result.length, 2);

    //   // Check first cause
    //   const cause1 = result.find(c => c.cause.id === causes[0].id);
    //   assert.isOk(cause1);
    //   assert.equal(cause1?.cause.title, causes[0].title);
    //   assert.equal(cause1?.cause.description, causes[0].description);
    //   assert.equal(cause1?.projectIds.length, 5);
    //   assert.include(cause1?.projectIds || [], projects[0].id);
    //   assert.include(cause1?.projectIds || [], projects[1].id);
    //   assert.include(cause1?.projectIds || [], projects[2].id);
    //   assert.include(cause1?.projectIds || [], projects[3].id);
    //   assert.include(cause1?.projectIds || [], projects[4].id);

    //   // Check second cause
    //   const cause2 = result.find(c => c.cause.id === causes[1].id);
    //   assert.isOk(cause2);
    //   assert.equal(cause2?.cause.title, causes[1].title);
    //   assert.equal(cause2?.cause.description, causes[1].description);
    //   assert.equal(cause2?.projectIds.length, 5);
    //   assert.include(cause2?.projectIds || [], projects[5].id);
    //   assert.include(cause2?.projectIds || [], projects[6].id);
    //   assert.include(cause2?.projectIds || [], projects[7].id);
    //   assert.include(cause2?.projectIds || [], projects[8].id);
    //   assert.include(cause2?.projectIds || [], projects[9].id);
    // });

    it('should not return causes with userRemoved projects', async () => {
      // Mark one project as userRemoved
      await CauseProject.update(
        { causeId: causes[0].id, projectId: projects[0].id },
        { userRemoved: true },
      );

      const result = await getActiveCausesWithProjects();

      const cause1 = result.find(c => c.cause.id === causes[0].id);
      assert.isOk(cause1);
      assert.equal(cause1?.projectIds.length, 4); // Should have 4 projects instead of 5
      assert.notInclude(cause1?.projectIds || [], projects[0].id); // Should not include the removed project
    });

    it('should not return causes with isIncluded false projects', async () => {
      // Mark one project as not included
      await CauseProject.update(
        { causeId: causes[0].id, projectId: projects[0].id },
        { isIncluded: false },
      );

      const result = await getActiveCausesWithProjects();

      const cause1 = result.find(c => c.cause.id === causes[0].id);
      assert.isOk(cause1);
      assert.equal(cause1?.projectIds.length, 4); // Should have 4 projects instead of 5
      assert.notInclude(cause1?.projectIds || [], projects[0].id); // Should not include the excluded project
    });

    // it('should not return inactive causes', async () => {
    //   // Deactivate one cause
    //   await Cause.update(
    //     { id: causes[0].id },
    //     { statusId: ProjStatus.deactive },
    //   );

    //   const result = await getActiveCausesWithProjects();

    //   assert.equal(result.length, 1); // Should only return one cause
    //   assert.equal(result[0].cause.id, causes[1].id); // Should be the active cause
    // });

    it('should not return causes with inactive projects', async () => {
      // Deactivate one project
      await Project.update(
        { id: projects[0].id },
        { statusId: ProjStatus.deactive },
      );

      const result = await getActiveCausesWithProjects();

      const cause1 = result.find(c => c.cause.id === causes[0].id);
      assert.isOk(cause1);
      assert.equal(cause1?.projectIds.length, 4); // Should have 4 projects instead of 5
      assert.notInclude(cause1?.projectIds || [], projects[0].id); // Should not include the inactive project
    });

    // TODO FIX LATER need a cleanup strategy
    // it('should return empty array when no active causes exist', async () => {
    //   // Deactivate all causes
    //   await Cause.update(
    //     { id: In(causes.map(c => c.id)) },
    //     { statusId: ProjStatus.deactive },
    //   );

    //   const result = await getActiveCausesWithProjects();

    //   assert.isArray(result);
    //   assert.equal(result.length, 0);
    // });

    it('should return correct structure format', async () => {
      const result = await getActiveCausesWithProjects();

      assert.isArray(result);
      assert.isOk(result[0]);

      // Check structure of first cause
      const cause = result[0];
      assert.hasAllKeys(cause, ['cause', 'projectIds']);
      assert.hasAllKeys(cause.cause, [
        'id',
        'title',
        'description',
        'categories',
      ]);
      assert.isArray(cause.projectIds);
      assert.isNumber(cause.cause.id);
      assert.isString(cause.cause.title);
      assert.isString(cause.cause.description);
      assert.isTrue(cause.projectIds.every(id => typeof id === 'number'));
    });
  });
});
