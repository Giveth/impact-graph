import { assert } from 'chai';
import moment from 'moment';
import {
  createProjectData,
  saveProjectDirectlyToDb,
} from '../../test/testUtils';
import { QfRound } from '../entities/qfRound';
import {
  selectQfRoundForProject,
  QfRoundSmartSelectError,
} from './qfRoundSmartSelectService';

describe('qfRoundSmartSelectService', () => {
  describe('selectQfRoundForProject', () => {
    it('should return the only eligible QF round when there is exactly one match', async () => {
      const project = await saveProjectDirectlyToDb({
        ...createProjectData(),
        listed: true,
        verified: true,
      });

      const qfRound = await QfRound.create({
        isActive: true,
        name: 'Test QF Round',
        title: 'Test QF Round Title',
        allocatedFund: 100000,
        allocatedFundUSD: 50000,
        minimumPassportScore: 8,
        slug: new Date().getTime().toString(),
        beginDate: new Date(),
        endDate: moment().add(30, 'days').toDate(),
        eligibleNetworks: [1, 137], // Ethereum and Polygon
        priority: 1,
      }).save();

      project.qfRounds = [qfRound];
      await project.save();

      const result = await selectQfRoundForProject(1, project.id);

      assert.equal(result.qfRoundId, qfRound.id);
      assert.equal(result.qfRoundName, 'Test QF Round');
      assert.equal(result.matchingPoolAmount, 100000);
      assert.equal(result.allocatedFundUSD, 50000);
      assert.deepEqual(result.eligibleNetworks, [1, 137]);

      // Cleanup
      qfRound.isActive = false;
      await qfRound.save();
    });

    it('should throw error when no active QF rounds exist for the project', async () => {
      const project = await saveProjectDirectlyToDb({
        ...createProjectData(),
        listed: true,
        verified: true,
      });

      try {
        await selectQfRoundForProject(1, project.id);
        assert.fail('Expected QfRoundSmartSelectError to be thrown');
      } catch (error) {
        assert.instanceOf(error, QfRoundSmartSelectError);
        assert.equal(
          error.message,
          'No eligible QF rounds found for this project',
        );
      }
    });

    it('should throw error when no QF rounds are eligible for the specified network', async () => {
      const project = await saveProjectDirectlyToDb({
        ...createProjectData(),
        listed: true,
        verified: true,
      });

      const qfRound = await QfRound.create({
        isActive: true,
        name: 'Test QF Round',
        allocatedFund: 100000,
        allocatedFundUSD: 50000,
        minimumPassportScore: 8,
        slug: new Date().getTime().toString(),
        beginDate: new Date(),
        endDate: moment().add(30, 'days').toDate(),
        eligibleNetworks: [137], // Only Polygon
        priority: 1,
      }).save();

      project.qfRounds = [qfRound];
      await project.save();

      try {
        await selectQfRoundForProject(1, project.id); // Ethereum network
        assert.fail('Expected QfRoundSmartSelectError to be thrown');
      } catch (error) {
        assert.instanceOf(error, QfRoundSmartSelectError);
        assert.equal(
          error.message,
          'No eligible QF rounds found for the specified network',
        );
      }

      // Cleanup
      qfRound.isActive = false;
      await qfRound.save();
    });

    it('should select QF round with highest allocatedFundUSD when multiple rounds are eligible', async () => {
      const project = await saveProjectDirectlyToDb({
        ...createProjectData(),
        listed: true,
        verified: true,
      });

      const qfRound1 = await QfRound.create({
        isActive: true,
        name: 'Lower Fund QF Round',
        allocatedFund: 50000,
        allocatedFundUSD: 25000,
        minimumPassportScore: 8,
        slug: `${new Date().getTime()}-1`,
        beginDate: new Date(),
        endDate: moment().add(30, 'days').toDate(),
        eligibleNetworks: [1],
        priority: 1,
      }).save();

      const qfRound2 = await QfRound.create({
        isActive: true,
        name: 'Higher Fund QF Round',
        allocatedFund: 100000,
        allocatedFundUSD: 75000,
        minimumPassportScore: 8,
        slug: `${new Date().getTime()}-2`,
        beginDate: new Date(),
        endDate: moment().add(30, 'days').toDate(),
        eligibleNetworks: [1],
        priority: 2,
      }).save();

      project.qfRounds = [qfRound1, qfRound2];
      await project.save();

      const result = await selectQfRoundForProject(1, project.id);

      assert.equal(result.qfRoundId, qfRound2.id);
      assert.equal(result.qfRoundName, 'Higher Fund QF Round');
      assert.equal(result.allocatedFundUSD, 75000);

      // Cleanup
      qfRound1.isActive = false;
      qfRound2.isActive = false;
      await qfRound1.save();
      await qfRound2.save();
    });

    it('should select QF round with closest endDate when allocatedFundUSD is equal', async () => {
      const project = await saveProjectDirectlyToDb({
        ...createProjectData(),
        listed: true,
        verified: true,
      });

      const now = new Date();
      const qfRound1 = await QfRound.create({
        isActive: true,
        name: 'Later End Date QF Round',
        allocatedFund: 100000,
        allocatedFundUSD: 50000,
        minimumPassportScore: 8,
        slug: `${new Date().getTime()}-1`,
        beginDate: now,
        endDate: moment(now).add(30, 'days').toDate(),
        eligibleNetworks: [1],
        priority: 1,
      }).save();

      const qfRound2 = await QfRound.create({
        isActive: true,
        name: 'Earlier End Date QF Round',
        allocatedFund: 100000,
        allocatedFundUSD: 50000,
        minimumPassportScore: 8,
        slug: `${new Date().getTime()}-2`,
        beginDate: now,
        endDate: moment(now).add(15, 'days').toDate(),
        eligibleNetworks: [1],
        priority: 2,
      }).save();

      project.qfRounds = [qfRound1, qfRound2];
      await project.save();

      const result = await selectQfRoundForProject(1, project.id);

      assert.equal(result.qfRoundId, qfRound2.id);
      assert.equal(result.qfRoundName, 'Earlier End Date QF Round');

      // Cleanup
      qfRound1.isActive = false;
      qfRound2.isActive = false;
      await qfRound1.save();
      await qfRound2.save();
    });

    it('should select QF round with highest priority when allocatedFundUSD and endDate are equal', async () => {
      const project = await saveProjectDirectlyToDb({
        ...createProjectData(),
        listed: true,
        verified: true,
      });

      const now = new Date();
      const endDate = moment(now).add(30, 'days').toDate();

      const qfRound1 = await QfRound.create({
        isActive: true,
        name: 'Lower Priority QF Round',
        allocatedFund: 100000,
        allocatedFundUSD: 50000,
        minimumPassportScore: 8,
        slug: `${new Date().getTime()}-1`,
        beginDate: now,
        endDate: endDate,
        eligibleNetworks: [1],
        priority: 2,
      }).save();

      const qfRound2 = await QfRound.create({
        isActive: true,
        name: 'Higher Priority QF Round',
        allocatedFund: 100000,
        allocatedFundUSD: 50000,
        minimumPassportScore: 8,
        slug: `${new Date().getTime()}-2`,
        beginDate: now,
        endDate: endDate,
        eligibleNetworks: [1],
        priority: 1,
      }).save();

      project.qfRounds = [qfRound1, qfRound2];
      await project.save();

      const result = await selectQfRoundForProject(1, project.id);

      assert.equal(result.qfRoundId, qfRound2.id);
      assert.equal(result.qfRoundName, 'Higher Priority QF Round');

      // Cleanup
      qfRound1.isActive = false;
      qfRound2.isActive = false;
      await qfRound1.save();
      await qfRound2.save();
    });

    it('should exclude QF rounds that have already ended', async () => {
      const project = await saveProjectDirectlyToDb({
        ...createProjectData(),
        listed: true,
        verified: true,
      });

      const now = new Date();
      const qfRound1 = await QfRound.create({
        isActive: true,
        name: 'Ended QF Round',
        allocatedFund: 100000,
        allocatedFundUSD: 50000,
        minimumPassportScore: 8,
        slug: `${new Date().getTime()}-1`,
        beginDate: moment(now).subtract(10, 'days').toDate(),
        endDate: moment(now).subtract(1, 'day').toDate(), // Already ended
        eligibleNetworks: [1],
        priority: 1,
      }).save();

      const qfRound2 = await QfRound.create({
        isActive: true,
        name: 'Active QF Round',
        allocatedFund: 50000,
        allocatedFundUSD: 25000,
        minimumPassportScore: 8,
        slug: `${new Date().getTime()}-2`,
        beginDate: now,
        endDate: moment(now).add(30, 'days').toDate(),
        eligibleNetworks: [1],
        priority: 2,
      }).save();

      project.qfRounds = [qfRound1, qfRound2];
      await project.save();

      const result = await selectQfRoundForProject(1, project.id);

      assert.equal(result.qfRoundId, qfRound2.id);
      assert.equal(result.qfRoundName, 'Active QF Round');

      // Cleanup
      qfRound1.isActive = false;
      qfRound2.isActive = false;
      await qfRound1.save();
      await qfRound2.save();
    });

    it('should handle QF rounds with empty eligibleNetworks (all networks eligible)', async () => {
      const project = await saveProjectDirectlyToDb({
        ...createProjectData(),
        listed: true,
        verified: true,
      });

      const qfRound = await QfRound.create({
        isActive: true,
        name: 'All Networks QF Round',
        allocatedFund: 100000,
        allocatedFundUSD: 50000,
        minimumPassportScore: 8,
        slug: new Date().getTime().toString(),
        beginDate: new Date(),
        endDate: moment().add(30, 'days').toDate(),
        eligibleNetworks: [], // Empty array means all networks are eligible
        priority: 1,
      }).save();

      project.qfRounds = [qfRound];
      await project.save();

      const result = await selectQfRoundForProject(999, project.id); // Non-standard network ID

      assert.equal(result.qfRoundId, qfRound.id);
      assert.equal(result.qfRoundName, 'All Networks QF Round');

      // Cleanup
      qfRound.isActive = false;
      await qfRound.save();
    });

    it('should use title as fallback when name is not provided', async () => {
      const project = await saveProjectDirectlyToDb({
        ...createProjectData(),
        listed: true,
        verified: true,
      });

      const qfRound = await QfRound.create({
        isActive: true,
        name: undefined, // No name
        title: 'QF Round Title',
        allocatedFund: 100000,
        allocatedFundUSD: 50000,
        minimumPassportScore: 8,
        slug: new Date().getTime().toString(),
        beginDate: new Date(),
        endDate: moment().add(30, 'days').toDate(),
        eligibleNetworks: [1],
        priority: 1,
      }).save();

      project.qfRounds = [qfRound];
      await project.save();

      const result = await selectQfRoundForProject(1, project.id);

      assert.equal(result.qfRoundName, 'QF Round Title');

      // Cleanup
      qfRound.isActive = false;
      await qfRound.save();
    });

    it('should use default name when both name and title are not provided', async () => {
      const project = await saveProjectDirectlyToDb({
        ...createProjectData(),
        listed: true,
        verified: true,
      });

      const qfRound = await QfRound.create({
        isActive: true,
        name: undefined,
        title: undefined,
        allocatedFund: 100000,
        allocatedFundUSD: 50000,
        minimumPassportScore: 8,
        slug: new Date().getTime().toString(),
        beginDate: new Date(),
        endDate: moment().add(30, 'days').toDate(),
        eligibleNetworks: [1],
        priority: 1,
      }).save();

      project.qfRounds = [qfRound];
      await project.save();

      const result = await selectQfRoundForProject(1, project.id);

      assert.equal(result.qfRoundName, 'Unnamed QF Round');

      // Cleanup
      qfRound.isActive = false;
      await qfRound.save();
    });

    it('should handle null allocatedFundUSD values', async () => {
      const project = await saveProjectDirectlyToDb({
        ...createProjectData(),
        listed: true,
        verified: true,
      });

      const qfRound1 = await QfRound.create({
        isActive: true,
        name: 'No USD Fund QF Round',
        allocatedFund: 100000,
        allocatedFundUSD: undefined,
        minimumPassportScore: 8,
        slug: `${new Date().getTime()}-1`,
        beginDate: new Date(),
        endDate: moment().add(30, 'days').toDate(),
        eligibleNetworks: [1],
        priority: 1,
      }).save();

      const qfRound2 = await QfRound.create({
        isActive: true,
        name: 'With USD Fund QF Round',
        allocatedFund: 100000,
        allocatedFundUSD: 50000,
        minimumPassportScore: 8,
        slug: `${new Date().getTime()}-2`,
        beginDate: new Date(),
        endDate: moment().add(30, 'days').toDate(),
        eligibleNetworks: [1],
        priority: 2,
      }).save();

      project.qfRounds = [qfRound1, qfRound2];
      await project.save();

      const result = await selectQfRoundForProject(1, project.id);

      assert.equal(result.qfRoundId, qfRound2.id);
      assert.equal(result.qfRoundName, 'With USD Fund QF Round');

      // Cleanup
      qfRound1.isActive = false;
      qfRound2.isActive = false;
      await qfRound1.save();
      await qfRound2.save();
    });
  });
});
