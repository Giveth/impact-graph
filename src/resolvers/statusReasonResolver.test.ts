import { assert } from 'chai';
import axios from 'axios';
import { graphqlUrl } from '../../test/testUtils.js';
import { projectStatusReasonsQuery } from '../../test/graphqlQueries.js';
import { ProjStatus } from '../entities/project.js';
import { ProjectStatusReason } from '../entities/projectStatusReason.js';
import { ProjectStatus } from '../entities/projectStatus.js';
describe('getStatusReasons() test cases', getStatusReasonsTestCases);

function getStatusReasonsTestCases() {
  it('should return result', async () => {
    const result = await axios.post(graphqlUrl, {
      query: projectStatusReasonsQuery,
      variables: {},
    });
    assert.isArray(result.data.data.getStatusReasons);
    assert.isOk(result.data.data.getStatusReasons[0]);
    assert.isOk(result.data.data.getStatusReasons[0].description);
    assert.isOk(result.data.data.getStatusReasons[0].status);
    assert.isOk(result.data.data.getStatusReasons[0].status.id);
  });

  it('should return filtered result when sending sending statusId', async () => {
    const statusId = ProjStatus.pending;
    const status = (await ProjectStatus.findOne({
      where: { id: statusId },
    })) as ProjectStatus;
    await ProjectStatusReason.create({
      status,
      description: 'test',
    }).save();
    const result = await axios.post(graphqlUrl, {
      query: projectStatusReasonsQuery,
      variables: {
        statusId,
      },
    });
    assert.isArray(result.data.data.getStatusReasons);
    assert.isOk(result.data.data.getStatusReasons[0]);
    assert.isOk(result.data.data.getStatusReasons[0].description);
    assert.isOk(result.data.data.getStatusReasons[0].status);
    assert.equal(result.data.data.getStatusReasons[0].status.id, statusId);
  });

  it('should return no result with invalid statusID', async () => {
    const result = await axios.post(graphqlUrl, {
      query: projectStatusReasonsQuery,
      variables: {
        statusId: 1000000,
      },
    });
    assert.isArray(result.data.data.getStatusReasons);
    assert.equal(result.data.data.getStatusReasons.length, 0);
  });
}
