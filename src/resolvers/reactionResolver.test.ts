import axios from 'axios';
import { assert } from 'chai';
import {
  generateTestAccessToken,
  graphqlUrl,
  PROJECT_UPDATE_SEED_DATA,
  SEED_DATA,
  dbIndependentTests,
} from '../../test/testUtils.js';
import {
  likeProjectQuery,
  likeProjectUpdateQuery,
  unlikeProjectQuery,
  unlikeProjectUpdateQuery,
} from '../../test/graphqlQueries.js';
import { Project, ProjectUpdate } from '../entities/project.js';
import { Reaction } from '../entities/reaction.js';

describe('like and unlike project test cases --->', likeUnlikeProjectTestCases);
describe(
  'like and unlike project update test cases --->',
  likeUnlikeProjectUpdateTestCases,
);

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

  beforeEach(async function () {
    const { title } = this.currentTest?.parent || {};

    if (title && dbIndependentTests.includes(title)) {
      return;
    }

    firstUserAccessToken = await generateTestAccessToken(USER_DATA.id);
    projectBefore = await Project.findOne({ where: { id: PROJECT_DATA.id } });
  });

  it('should create/delete reaction on like/unlike project', async () => {
    const likeResp = await sendLikeProjectQuery(
      PROJECT_DATA.id,
      firstUserAccessToken,
    );

    assert.isOk(likeResp);
    const reaction = likeResp?.data?.data?.likeProject;
    assert.isOk(reaction?.id);

    let [, count] = await Reaction.findAndCount({
      where: { userId: USER_DATA.id, projectId: PROJECT_DATA.id },
      take: 0,
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
      take: 0,
    });

    assert.equal(count, 0, 'Reaction should has been removed');
  });

  it('should increase/decrease project total reactions and score on like/unlike project', async () => {
    const likeResp = await sendLikeProjectQuery(
      PROJECT_DATA.id,
      firstUserAccessToken,
    );

    const reaction = likeResp?.data?.data?.likeProject;

    const projectAfterLike = await Project.findOne({
      where: { id: PROJECT_DATA.id },
    });

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
    const projectAfterUnlike = await Project.findOne({
      where: { id: PROJECT_DATA.id },
    });

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

function likeUnlikeProjectUpdateTestCases() {
  const USER_DATA = SEED_DATA.FIRST_USER;
  const PROJECT_UPDATE_DATA = PROJECT_UPDATE_SEED_DATA.SECOND_PROJECT_UPDATE;

  let projectUpdateBefore;
  let firstUserAccessToken;

  const sendLikeProjectUpdateQuery = (
    projectUpdateId: number | string,
    authenticationToken: string,
  ) =>
    axios.post(
      graphqlUrl,
      {
        query: likeProjectUpdateQuery,
        variables: {
          projectUpdateId: +projectUpdateId,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${authenticationToken}`,
        },
      },
    );

  const sendUnlikeProjectUpdateQuery = (
    reactionId: number | string,
    authenticationToken: string,
  ) =>
    axios.post(
      graphqlUrl,
      {
        query: unlikeProjectUpdateQuery,
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

  beforeEach(async function () {
    const { title } = this.currentTest?.parent || {};

    if (title && dbIndependentTests.includes(title)) {
      return;
    }

    firstUserAccessToken = await generateTestAccessToken(USER_DATA.id);
    projectUpdateBefore = await ProjectUpdate.findOne({
      where: {
        id: PROJECT_UPDATE_DATA.id,
      },
    });
  });

  it('should create/delete reaction on like/unlike project update', async () => {
    const likeResp = await sendLikeProjectUpdateQuery(
      PROJECT_UPDATE_DATA.id,
      firstUserAccessToken,
    );

    assert.isOk(likeResp);
    const reaction = likeResp?.data?.data?.likeProjectUpdate;
    assert.isOk(reaction?.id);

    let [, count] = await Reaction.findAndCount({
      where: { userId: USER_DATA.id, projectUpdateId: PROJECT_UPDATE_DATA.id },
      take: 0,
    });

    assert.equal(
      count,
      1,
      'Only one reaction should exists against the user and the project update',
    );

    const unlikeResp = await sendUnlikeProjectUpdateQuery(
      reaction!.id,
      firstUserAccessToken,
    );

    assert.isOk(unlikeResp);

    [, count] = await Reaction.findAndCount({
      where: { userId: USER_DATA.id, projectUpdateId: PROJECT_UPDATE_DATA.id },
      take: 0,
    });

    assert.equal(count, 0, 'Reaction should has been removed');
  });

  it('should increase/decrease project total reactions and score on like/unlike project update', async () => {
    const likeResp = await sendLikeProjectUpdateQuery(
      PROJECT_UPDATE_DATA.id,
      firstUserAccessToken,
    );

    const reaction = likeResp?.data?.data?.likeProjectUpdate;

    const projectUpdateAfterLike = await ProjectUpdate.findOne({
      where: {
        id: PROJECT_UPDATE_DATA.id,
      },
    });

    assert.equal(
      projectUpdateAfterLike!.totalReactions -
        projectUpdateBefore!.totalReactions,
      1,
      'Project update total reaction should be increased by 1',
    );

    const unlikeResp = await sendUnlikeProjectUpdateQuery(
      reaction!.id,
      firstUserAccessToken,
    );

    assert.isOk(unlikeResp);
    const projectUpdateAfterUnlike = await ProjectUpdate.findOne({
      where: {
        id: PROJECT_UPDATE_DATA.id,
      },
    });

    assert.equal(
      projectUpdateAfterUnlike!.totalReactions -
        projectUpdateBefore!.totalReactions,
      0,
      'Project update total reaction should be as before',
    );
  });
}
