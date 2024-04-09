import { canAccessUserAction } from './adminJsPermissions';
import { assert } from 'chai';
import { UserRole } from '../../entities/user';

describe('canAccessUserAction test cases', canAccessUserActionTestCases);

function canAccessUserActionTestCases() {
  // admin
  it('should return true for admin --> new', function () {
    assert.isTrue(
      canAccessUserAction(
        {
          currentAdmin: { role: UserRole.ADMIN },
        },
        'new',
      ),
    );
  });

  // campaign manager
  it('should return false for campaignManager --> new', function () {
    assert.isFalse(
      canAccessUserAction(
        {
          currentAdmin: { role: UserRole.CAMPAIGN_MANAGER },
        },
        'new',
      ),
    );
  });

  // reviewer

  // operator
}
