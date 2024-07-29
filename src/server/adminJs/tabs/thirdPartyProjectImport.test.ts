import { assert } from 'chai';
import sinon from 'sinon';
import { findUserById } from '../../../repositories/userRepository.js';
import {
  generateRandomEtheriumAddress,
  SEED_DATA,
} from '../../../../test/testUtils.js';
import * as ChangeAPI from '../../../services/changeAPI/nonProfits.js';
import { errorMessages } from '../../../utils/errorMessages.js';
import { User } from '../../../entities/user.js';
import { Project } from '../../../entities/project.js';
import { ProjectAddress } from '../../../entities/projectAddress.js';
import { importThirdPartyProject } from './thirdPartProjectImportTab.js';

describe(
  'importThirdPartyProject() test cases',
  importThirdPartyProjectTestCases,
);

function importThirdPartyProjectTestCases() {
  it('should throw error when change api throws error', async () => {
    const adminUser = await findUserById(SEED_DATA.ADMIN_USER.id);
    const stub = sinon
      .stub(ChangeAPI, 'getChangeNonProfitByNameOrIEN')
      .rejects(errorMessages.CHANGE_API_INVALID_TITLE_OR_EIN);

    await importThirdPartyProject(
      {
        query: {},
        payload: {
          thirdPartyAPI: 'Change',
          projectName: 'ChangeApiTestProject',
        },
      },
      {
        send: () => {
          // ..
        },
      },
      {
        currentAdmin: adminUser as User,
        h: {},
        resource: {},
        records: [],
      },
    );

    const createdProject = await Project.findOne({
      where: {
        title: 'ChangeApiTestProject',
      },
    });
    assert.isNull(createdProject);
    stub.restore();
  });
  it('creates the project succesfully when changeAPI returns data', async () => {
    const adminUser = await findUserById(SEED_DATA.ADMIN_USER.id);
    sinon.stub(ChangeAPI, 'getChangeNonProfitByNameOrIEN').resolves({
      address_line: 'test',
      category: 'test',
      city: 'test',
      classification: 'test',
      crypto: {
        ethereum_address: generateRandomEtheriumAddress(),
        solana_address: generateRandomEtheriumAddress(),
      },
      ein: '1234',
      icon_url: 'test',
      id: 'test',
      mission: 'test',
      name: 'ChangeApiTestProject',
      socials: {
        facebook: 'test',
        instagram: 'instagram',
        twitter: 'twitter',
        youtube: 'youtube',
      },
      state: 'test',
      website: 'test',
      zip_code: 'test',
    });

    await importThirdPartyProject(
      {
        query: {},
        payload: {
          thirdPartyAPI: 'Change',
          projectName: 'ChangeApiTestProject',
        },
      },
      {
        send: () => {
          // ..
        },
      },
      {
        currentAdmin: adminUser as User,
        h: {},
        resource: {},
        records: [],
      },
    );

    const createdProject = await Project.findOne({
      where: {
        title: 'ChangeApiTestProject',
      },
    });
    assert.isOk(createdProject);
    assert.isTrue(createdProject?.title === 'ChangeApiTestProject');
    const address = await ProjectAddress.createQueryBuilder('address')
      .where('address.projectId = :projectId', {
        projectId: createdProject!.id,
      })
      .getOne();
    assert.equal(address?.address, createdProject!.walletAddress);
    assert.equal(address?.projectId, createdProject!.id);
    assert.equal(address?.userId, adminUser!.id);
  });
}
