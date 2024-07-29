import { assert } from 'chai';

import {
  createProjectData,
  saveProjectDirectlyToDb,
  SEED_DATA,
} from '../../test/testUtils.js';
import { Project } from '../entities/project.js';
import { updateTotalReactionsOfAProject } from './reactionsService.js';
import { Reaction } from '../entities/reaction.js';
import { findProjectById } from '../repositories/projectRepository.js';

describe(
  'updateTotalReactionsOfAProject test cases',
  updateTotalReactionsOfAProjectTestCases,
);

function updateTotalReactionsOfAProjectTestCases() {
  it('should not change updatedAt', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    await updateTotalReactionsOfAProject(project.id);
    const updatedProject = (await findProjectById(project.id)) as Project;
    assert.equal(
      new Date(project.updatedAt).getTime(),
      new Date(updatedProject.updatedAt).getTime(),
    );
  });

  it('should update totalReaction of project', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    await Reaction.create({
      project,
      reaction: 'heart',
      userId: SEED_DATA.FIRST_USER.id,
    }).save();
    await updateTotalReactionsOfAProject(project.id);
    const updatedProject = (await findProjectById(project.id)) as Project;
    assert.equal(updatedProject.totalReactions, 1);
    assert.equal(
      new Date(updatedProject.updatedAt).getTime(),
      new Date(project.updatedAt).getTime(),
    );
  });
}
