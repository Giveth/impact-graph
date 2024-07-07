import { assert } from 'chai';

import {
  createProjectData,
  saveProjectDirectlyToDb,
  SEED_DATA,
} from '../../test/testUtils';
import { Project } from '../entities/project';
import { updateTotalReactionsOfAProject } from './reactionsService';
import { Reaction } from '../entities/reaction';
import { findProjectById } from '../repositories/projectRepository';

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
