import { findProjectByWalletAddress } from './projectRepository';
import {
  createProjectData,
  saveProjectDirectlyToDb,
} from '../../test/testUtils';
import { assert } from 'chai';

describe(
  'findProjectByWalletAddress test cases',
  findProjectByWalletAddressTestCases,
);

function findProjectByWalletAddressTestCases() {
  it('should find project by walletAddress', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const fetchedProject = await findProjectByWalletAddress(
      project.walletAddress as string,
    );
    assert.isOk(fetchedProject);
    assert.equal(fetchedProject?.id, project.id);
  });
  it('should find project by walletAddress upper case', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const fetchedProject = await findProjectByWalletAddress(
      project.walletAddress?.toUpperCase() as string,
    );
    assert.isOk(fetchedProject);
    assert.equal(fetchedProject?.id, project.id);
  });
  it('should find project by walletAddress lower case', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const fetchedProject = await findProjectByWalletAddress(
      project.walletAddress?.toLowerCase() as string,
    );
    assert.isOk(fetchedProject);
    assert.equal(fetchedProject?.id, project.id);
  });
  it('should join with status successfully', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const fetchedProject = await findProjectByWalletAddress(
      project.walletAddress?.toLowerCase() as string,
    );
    assert.isOk(fetchedProject);
    assert.equal(fetchedProject?.id, project.id);
    assert.isOk(fetchedProject?.status?.id);
  });
}
import { findProjectById } from './projectRepository';

describe('findProjectById test cases', () => {
  it('Should find project by id', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const foundProject = await findProjectById(project.id);
    assert.isOk(foundProject);
    assert.equal(foundProject?.id, project.id);
  });

  it('should not find project when project doesnt exists', async () => {
    const foundProject = await findProjectById(1000000000);
    assert.isUndefined(foundProject);
  });
});
