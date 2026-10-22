import { cronJobGateTestCases } from '../../../test/cronJobGateTestUtils';
import { runCheckAndUpdateEndaomentProject } from './checkAndUpdateEndaomentProject';

describe(
  'runCheckAndUpdateEndaomentProject ENABLE_CHECK_AND_UPDATE_ENDAOMENT_PROJECTS gate',
  cronJobGateTestCases({
    envKey: 'ENABLE_CHECK_AND_UPDATE_ENDAOMENT_PROJECTS',
    run: runCheckAndUpdateEndaomentProject,
  }),
);
