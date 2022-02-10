import {
  generateTestAccessToken,
  graphqlUrl,
  SEED_DATA,
} from '../../test/testUtils';
import axios from 'axios';
import {
  likeProjectQuery,
  unlikeProjectQuery,
} from '../../test/graphqlQueries';
import { assert } from 'chai';
import { Project } from '../entities/project';
import { Reaction } from '../entities/reaction';

describe('like and unlike project test cases --->', likeUnlikeProjectTestCases);

function likeUnlikeProjectTestCases() {
  const USER_DATA = SEED_DATA.FIRST_USER;
  const PROJECT_DATA = SEED_DATA.SECOND_PROJECT;
  let projectBefore;
  let firstUserAccessToken;

  const sendLikeProjectQuery = (
    projectId: number | string,
    authenticationToken: string,
  ) =>
    axios.post(
      graphqlUrl,
      {
        query: likeProjectQuery,
        variables: {
          projectId: +projectId,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${authenticationToken}`,
        },
      },
    );

  const sendUnlikeProjectQuery = (
    reactionId: number | string,
    authenticationToken: string,
  ) =>
    axios.post(
      graphqlUrl,
      {
        query: unlikeProjectQuery,
        variables: {
          reactionId: +reactionId,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${authenticationToken}`,
        },
      },
    );

  beforeEach(async () => {
    firstUserAccessToken = await generateTestAccessToken(USER_DATA.id);
    projectBefore = await Project.findOne({ id: PROJECT_DATA.id });
  });

  it('should create/delete reaction on like/unlike', async () => {
    const likeResp = await sendLikeProjectQuery(
      PROJECT_DATA.id,
      firstUserAccessToken,
    );

    assert.isOk(likeResp);
    const reaction = likeResp?.data?.data?.likeProject;
    assert.isOk(reaction?.id);

    let [, count] = await Reaction.findAndCount({
      where: { userId: USER_DATA.id, projectId: PROJECT_DATA.id },
    });

    assert.equal(
      count,
      1,
      'Only one reaction should exists against the user and the project',
    );

    const unlikeResp = await sendUnlikeProjectQuery(
      reaction!.id,
      firstUserAccessToken,
    );

    assert.isOk(unlikeResp);

    [, count] = await Reaction.findAndCount({
      where: { userId: USER_DATA.id, projectId: PROJECT_DATA.id },
    });

    assert.equal(count, 0, 'Reaction should has been removed');
  });

  it('should increase/decrease project total reactions and score on like/unlike', async () => {
    const likeResp = await sendLikeProjectQuery(
      PROJECT_DATA.id,
      firstUserAccessToken,
    );

    const reaction = likeResp?.data?.data?.likeProject;

    const projectAfterLike = await Project.findOne({ id: PROJECT_DATA.id });

    assert.equal(
      projectAfterLike!.totalReactions - projectBefore!.totalReactions,
      1,
      'Project total reaction should be increased by 1',
    );
    assert.equal(
      projectAfterLike!.qualityScore - projectBefore!.qualityScore,
      10,
      'Project quality score should be increased by 10',
    );

    const unlikeResp = await sendUnlikeProjectQuery(
      reaction!.id,
      firstUserAccessToken,
    );

    assert.isOk(unlikeResp);
    const projectAfterUnlike = await Project.findOne({ id: PROJECT_DATA.id });

    assert.equal(
      projectAfterUnlike!.totalReactions - projectBefore!.totalReactions,
      0,
      'Project total reaction should be as before',
    );
    assert.equal(
      projectAfterUnlike!.qualityScore - projectBefore!.qualityScore,
      0,
      'Project quality score should be as before',
    );
  });
}
