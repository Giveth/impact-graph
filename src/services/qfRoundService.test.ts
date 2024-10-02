import { assert } from 'chai';
import moment from 'moment';
import {
  createProjectData,
  saveProjectDirectlyToDb,
} from '../../test/testUtils';
import { QfRound } from '../entities/qfRound';
import { relatedActiveQfRoundForProject } from './qfRoundService';

describe(
  'relatedActiveQfRoundForProject',
  relatedActiveQfRoundForProjectTestCases,
);

function relatedActiveQfRoundForProjectTestCases() {
  it('should return qfRound when project is listed, verified and there is qfRound', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      listed: true,
      verified: true,
    });

    const qfRound = await QfRound.create({
      isActive: true,
      name: 'test filter by qfRoundId',
      allocatedFund: 100,
      minimumPassportScore: 8,
      slug: new Date().getTime().toString(),
      beginDate: moment(),
      endDate: moment().add(2, 'day'),
    }).save();
    project.qfRounds = [qfRound];
    await project.save();

    const projectQfRound = await relatedActiveQfRoundForProject(project.id);
    assert.equal(qfRound.id, projectQfRound?.id);
    qfRound.isActive = false;
    await qfRound.save();
  });
  it('should return null, if qfRound is active but endDate has passed', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      listed: true,
      verified: true,
    });

    const qfRound = await QfRound.create({
      isActive: true,
      name: 'test filter by qfRoundId',
      allocatedFund: 100,
      minimumPassportScore: 8,
      slug: new Date().getTime().toString(),
      beginDate: moment().subtract(3, 'day'),
      endDate: moment().subtract(2, 'day'),
    }).save();
    project.qfRounds = [qfRound];
    await project.save();

    const projectQfRound = await relatedActiveQfRoundForProject(project.id);
    assert.isNull(projectQfRound);
    qfRound.isActive = false;
    await qfRound.save();
  });
  it('should return qfRound,  when project is not listed', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      listed: false,
      verified: true,
    });

    const qfRound = await QfRound.create({
      isActive: true,
      name: 'test filter by qfRoundId',
      allocatedFund: 100,
      minimumPassportScore: 8,
      slug: new Date().getTime().toString(),
      beginDate: moment(),
      endDate: moment().add(2, 'day'),
    }).save();
    project.qfRounds = [qfRound];
    await project.save();

    const projectQfRound = await relatedActiveQfRoundForProject(project.id);
    assert.isNotNull(projectQfRound);
    qfRound.isActive = false;
    await qfRound.save();
  });
  it('should return qfRound when project is not verified', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      listed: true,
      verified: false,
    });

    const qfRound = await QfRound.create({
      isActive: true,
      name: 'test filter by qfRoundId',
      allocatedFund: 100,
      minimumPassportScore: 8,
      slug: new Date().getTime().toString(),
      beginDate: moment(),
      endDate: moment().add(2, 'day'),
    }).save();
    project.qfRounds = [qfRound];
    await project.save();

    const projectQfRound = await relatedActiveQfRoundForProject(project.id);
    assert.isNotNull(projectQfRound);
    qfRound.isActive = false;
    await qfRound.save();
  });
  it('should return null when qfRound is not active', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      listed: true,
      verified: true,
    });

    const qfRound = await QfRound.create({
      isActive: false,
      name: 'test filter by qfRoundId',
      allocatedFund: 100,
      minimumPassportScore: 8,
      slug: new Date().getTime().toString(),
      beginDate: moment(),
      endDate: moment().add(2, 'day'),
    }).save();
    project.qfRounds = [qfRound];
    await project.save();

    const projectQfRound = await relatedActiveQfRoundForProject(project.id);
    assert.isNull(projectQfRound);
  });
}
