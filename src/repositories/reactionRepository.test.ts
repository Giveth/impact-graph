import {
  createProjectData,
  generateRandomEtheriumAddress,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../test/testUtils';
import { assert } from 'chai';
import { findUsersWhoLikedProject } from './reactionRepository';
import { Reaction } from '../entities/reaction';

describe(
  'findUsersWhoLikedProject() test cases',
  findUsersWhoLikedProjectTestCases,
);

function findUsersWhoLikedProjectTestCases() {
  it('should find wallet addresses of who liked to a project', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const firstUser1 = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const firstUser2 = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const firstUser3 = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    await Reaction.create({
      project,
      userId: firstUser1.id,
      reaction: 'heart',
    }).save();
    await Reaction.create({
      project,
      userId: firstUser2.id,
      reaction: 'heart',
    }).save();
    await Reaction.create({
      project,
      userId: firstUser3.id,
      reaction: 'heart',
    }).save();

    const users = await findUsersWhoLikedProject(project.id);
    assert.equal(users.length, 3);
    assert.isOk(
      users.find(user => user.walletAddress === firstUser1.walletAddress),
    );
    assert.isOk(
      users.find(user => user.walletAddress === firstUser2.walletAddress),
    );
    assert.isOk(
      users.find(user => user.walletAddress === firstUser3.walletAddress),
    );
  });
}
