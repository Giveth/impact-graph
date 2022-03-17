import { assert } from 'chai';
import {
  isTokenAcceptableForProject,
  updateTotalDonationsOfProject,
} from './donationService';
import { NETWORK_IDS } from '../provider';
import {
  createProjectData,
  DONATION_SEED_DATA,
  saveDonationDirectlyToDb,
  saveProjectDirectlyToDb,
  SEED_DATA,
} from '../../test/testUtils';
import { Token } from '../entities/token';
import { ORGANIZATION_LABELS } from '../entities/organization';
import { Project } from '../entities/project';
import { updateTotalReactionsOfAProject } from './reactionsService';
import { Reaction } from '../entities/reaction';

describe(
  'updateTotalReactionsOfAProject test cases',
  updateTotalReactionsOfAProjectTestCases,
);

function updateTotalReactionsOfAProjectTestCases() {
  it('should not change updatedAt', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    await updateTotalReactionsOfAProject(project.id);
    const updatedProject = (await Project.findOne({
      id: project.id,
    })) as Project;
    assert.equal(
      new Date(project.updatedAt).getTime(),
      new Date(updatedProject.updatedAt).getTime(),
    );
  });

  it('should update totalReaction of project', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const donation = await saveDonationDirectlyToDb(
      DONATION_SEED_DATA.FIRST_DONATION,
      SEED_DATA.FIRST_USER.id,
      project.id,
    );
    await Reaction.create({
      project,
      reaction: 'heart',
      userId: SEED_DATA.FIRST_USER.id,
    }).save();
    await updateTotalReactionsOfAProject(project.id);
    const updatedProject = (await Project.findOne({
      id: project.id,
    })) as Project;
    assert.equal(updatedProject.totalReactions, 1);
    assert.equal(
      new Date(updatedProject.updatedAt).getTime(),
      new Date(project.updatedAt).getTime(),
    );
  });
}
